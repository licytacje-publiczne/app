import * as cheerio from "cheerio";
import type { IASConfig, Auction, ScrapeError } from "../../../shared/types.js";
import { MAX_PAGES_PER_IAS } from "../config.js";
import {
  fetchPage,
  delay,
  generateId,
  extractAuctionNumber,
  cleanTitle,
  classifyAuctionType,
  parsePolishDate,
  log,
} from "../utils.js";
import { parseGovplDetail } from "../parsers/govpl-detail.js";

interface ListingEntry {
  title: string;
  date: string;
  source: string;
  detailUrl: string;
}

/**
 * Scrape auction listings from gov.pl platform.
 * URL pattern: https://www.gov.pl/web/ias-{city}/obwieszczenia-o-licytacjach?page=N&size=10
 */
export async function scrapeGovpl(
  config: IASConfig,
): Promise<{ auctions: Auction[]; errors: ScrapeError[] }> {
  const auctions: Auction[] = [];
  const errors: ScrapeError[] = [];

  log(`[gov.pl] Scraping ${config.city}...`);

  try {
    // Fetch first page to determine total pages
    const firstPageHtml = await fetchPage(config.listingUrl);
    const { entries, totalPages } = parseListingPage(firstPageHtml, config);

    log(`[gov.pl] ${config.city}: found ${totalPages} pages of listings`);

    // Process entries from first page
    for (const entry of entries) {
      try {
        const auction = await scrapeDetailPage(entry, config);
        auctions.push(auction);
        await delay();
      } catch (err) {
        errors.push({
          ias: config.city,
          url: entry.detailUrl,
          message: err instanceof Error ? err.message : String(err),
          phase: "detail",
        });
      }
    }

    // Fetch remaining pages
    for (let page = 2; page <= Math.min(totalPages, MAX_PAGES_PER_IAS); page++) {
      try {
        const pageUrl = `${config.listingUrl}?page=${page}&size=10`;
        const pageHtml = await fetchPage(pageUrl);
        const { entries: pageEntries } = parseListingPage(pageHtml, config);

        for (const entry of pageEntries) {
          try {
            const auction = await scrapeDetailPage(entry, config);
            auctions.push(auction);
            await delay();
          } catch (err) {
            errors.push({
              ias: config.city,
              url: entry.detailUrl,
              message: err instanceof Error ? err.message : String(err),
              phase: "detail",
            });
          }
        }

        await delay();
      } catch (err) {
        errors.push({
          ias: config.city,
          url: `${config.listingUrl}?page=${page}`,
          message: err instanceof Error ? err.message : String(err),
          phase: "listing",
        });
      }
    }
  } catch (err) {
    errors.push({
      ias: config.city,
      url: config.listingUrl,
      message: err instanceof Error ? err.message : String(err),
      phase: "listing",
    });
  }

  log(`[gov.pl] ${config.city}: scraped ${auctions.length} auctions, ${errors.length} errors`);
  return { auctions, errors };
}

function parseListingPage(
  html: string,
  _config: IASConfig,
): { entries: ListingEntry[]; totalPages: number } {
  const $ = cheerio.load(html);
  const entries: ListingEntry[] = [];

  // Gov.pl listing structure:
  // article.article-area__article > div.art-prev > ul > li > a
  //   Inside each <a>:
  //     div > div.event > span.date + span.location
  //     div > div.title (the auction title)
  //     div > div.intro (optional description)
  $("div.art-prev ul > li > a[href]").each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href");
    if (!href || href.startsWith("#")) return;

    const date = $el.find(".date").text().trim();
    const source = $el.find(".location").text().trim();
    const title = $el.find(".title").text().trim();

    if (!title) return;

    const detailUrl = href.startsWith("http") ? href : `https://www.gov.pl${href}`;

    entries.push({
      title,
      date,
      source,
      detailUrl,
    });
  });

  // Determine total pages from pagination
  let totalPages = 1;

  // Look for pagination links with page= parameter
  $('a[href*="page="]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const pageMatch = href.match(/page=(\d+)/);
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1]!, 10);
      if (pageNum > totalPages) totalPages = pageNum;
    }
  });

  // Also check pagination text for "z N" pattern (e.g., "Strona 1 z 5")
  const paginationText = $(".pagination, .pager, nav[aria-label]").text();
  const totalPagesMatch = paginationText.match(/z\s+(\d+)/);
  if (totalPagesMatch) {
    const parsed = parseInt(totalPagesMatch[1]!, 10);
    if (parsed > 0 && parsed < 1000) {
      totalPages = Math.max(totalPages, parsed);
    }
  }

  return { entries, totalPages };
}

async function scrapeDetailPage(entry: ListingEntry, config: IASConfig): Promise<Auction> {
  const html = await fetchPage(entry.detailUrl);
  const detail = parseGovplDetail(html, entry.detailUrl);

  const auctionNumber = extractAuctionNumber(entry.title);
  const auctionType = classifyAuctionType(entry.title);
  const title = cleanTitle(entry.title);

  // Try to get auction date from detail page first, then from listing
  let auctionDate = detail.auctionDate;
  if (!auctionDate) {
    auctionDate = parsePolishDate(entry.title) ?? parsePolishDate(entry.date);
  }

  return {
    id: generateId(entry.detailUrl),
    sourceUrl: entry.detailUrl,
    ias: config.city,
    voivodeship: config.voivodeship,
    platform: "govpl",
    title: title || entry.title,
    auctionNumber,
    auctionType,
    source: entry.source || detail.source || config.name,
    auctionDate,
    location: detail.location,
    bankAccount: detail.bankAccount,
    items: detail.items,
    documentUrls: detail.documentUrls,
    imageUrls: detail.imageUrls,
    rawContent: detail.rawContent,
    scrapedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };
}
