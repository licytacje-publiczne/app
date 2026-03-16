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
import { parseBipDetail } from "../parsers/bip-detail.js";

interface ListingEntry {
  title: string;
  source: string;
  detailUrl: string;
}

/**
 * Scrape auction listings from old BIP (Liferay) platform.
 * Pagination uses `cur=N` parameter, 20 items per page.
 */
export async function scrapeBip(
  config: IASConfig
): Promise<{ auctions: Auction[]; errors: ScrapeError[] }> {
  const auctions: Auction[] = [];
  const errors: ScrapeError[] = [];

  log(`[BIP] Scraping ${config.city}...`);

  try {
    // Fetch first page
    const firstPageHtml = await fetchPage(config.listingUrl);
    const { entries, totalPages, baseUrl } = parseListingPage(
      firstPageHtml,
      config
    );

    log(`[BIP] ${config.city}: found ${totalPages} pages, ${entries.length} entries on page 1`);

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
        // BIP pagination URL pattern
        const pageUrl = buildPaginationUrl(config.listingUrl, baseUrl, page);
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
          url: config.listingUrl,
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

  log(`[BIP] ${config.city}: scraped ${auctions.length} auctions, ${errors.length} errors`);
  return { auctions, errors };
}

function parseListingPage(
  html: string,
  config: IASConfig
): { entries: ListingEntry[]; totalPages: number; baseUrl: string } {
  const $ = cheerio.load(html);
  const entries: ListingEntry[] = [];
  const origin = new URL(config.listingUrl).origin;

  // BIP Liferay listing structure:
  // ul.article-list > table.taglib-search-iterator > tr.results-row > td > a
  // Each row has a link with full title text
  $("table.taglib-search-iterator tr.results-row").each((_, el) => {
    const $row = $(el);
    const link = $row.find("td a").first();
    const title = link.text().trim();
    let href = link.attr("href") || "";

    if (!title || !href) return;

    // Clean up the URL - remove redirect parameter
    if (href.includes("?redirect=")) {
      href = href.split("?redirect=")[0]!;
    }

    // Make absolute
    const detailUrl = href.startsWith("http") ? href : `${origin}${href}`;

    // BIP listing doesn't have a separate source field
    entries.push({ title, source: "", detailUrl });
  });

  // Determine total pages from pagination
  let totalPages = 1;
  let baseUrl = "";

  // BIP uses taglib-page-iterator with page links like "Strona 2", "Strona 3"
  $(".taglib-page-iterator a, .page-selector a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim();

    // Look for page number in link text or cur= parameter
    const curMatch = href.match(/cur=(\d+)/);
    if (curMatch) {
      const cur = parseInt(curMatch[1]!, 10);
      if (cur > totalPages) totalPages = cur;
      if (!baseUrl) baseUrl = href;
    }

    // Also check title attribute "Strona N"
    const titleAttr = $(el).attr("title") || "";
    const pageMatch = titleAttr.match(/Strona\s+(\d+)/);
    if (pageMatch) {
      const pageNum = parseInt(pageMatch[1]!, 10);
      if (pageNum > totalPages) totalPages = pageNum;
      if (!baseUrl) baseUrl = href;
    }
  });

  return { entries, totalPages, baseUrl };
}

function buildPaginationUrl(
  listingUrl: string,
  baseUrl: string,
  page: number
): string {
  // If we have a base URL from parsing, use its pattern
  if (baseUrl) {
    // Replace cur=N with the new page number
    return baseUrl.replace(/cur=\d+/, `cur=${page}`);
  }

  // Fallback: construct URL with standard Liferay pagination
  const url = new URL(listingUrl);
  url.searchParams.set("cur", String(page));
  return url.toString();
}

async function scrapeDetailPage(
  entry: ListingEntry,
  config: IASConfig
): Promise<Auction> {
  const html = await fetchPage(entry.detailUrl);
  const origin = new URL(config.listingUrl).origin;
  const detail = await parseBipDetail(html, entry.detailUrl, origin);

  const auctionNumber = extractAuctionNumber(entry.title);
  const auctionType = classifyAuctionType(entry.title);
  const title = cleanTitle(entry.title);

  let auctionDate = detail.auctionDate;
  if (!auctionDate) {
    auctionDate = parsePolishDate(entry.title);
  }

  return {
    id: generateId(entry.detailUrl),
    sourceUrl: entry.detailUrl,
    ias: config.city,
    voivodeship: config.voivodeship,
    platform: "bip",
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
