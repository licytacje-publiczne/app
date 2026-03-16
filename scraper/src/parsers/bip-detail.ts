import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AuctionItem } from "../../../shared/types.js";
import {
  parsePolishDate,
  extractBankAccount,
  fetchBinary,
  log,
} from "../utils.js";
import { parsePdfContent } from "./pdf-parser.js";

export interface BipDetailResult {
  auctionDate: string | null;
  location: string | null;
  bankAccount: string | null;
  source: string;
  items: AuctionItem[];
  documentUrls: string[];
  imageUrls: string[];
  rawContent: string;
}

export async function parseBipDetail(
  html: string,
  pageUrl: string,
  origin: string
): Promise<BipDetailResult> {
  const $ = cheerio.load(html);

  // BIP detail pages have content in .bip-article-content or .journal-content-article
  const articleContent = $(".bip-article-content, .journal-content-article");
  const rawHtmlContent = articleContent.text().trim();

  // Extract source
  const source = $(".bip-article-source").text().replace(/^Źródło:\s*/i, "").trim();

  // Find document attachments
  const documentUrls: string[] = [];
  const imageUrls: string[] = [];

  // BIP stores files under /documents/{groupId}/{folderId}/{filename}
  $(".bip-article-files a[href], .bip-article a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (
      href.includes("/documents/") ||
      href.match(/\.(pdf|docx?|xlsx?|odt)$/i)
    ) {
      const fullUrl = href.startsWith("http") ? href : `${origin}${href}`;
      if (!documentUrls.includes(fullUrl)) {
        documentUrls.push(fullUrl);
      }
    }
  });

  // Also scan all links in the page for document references
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (
      href.includes("/documents/") &&
      (href.match(/\.(pdf|docx?)$/i) || href.includes(".docx.pdf"))
    ) {
      const fullUrl = href.startsWith("http") ? href : `${origin}${href}`;
      if (!documentUrls.includes(fullUrl)) {
        documentUrls.push(fullUrl);
      }
    }
  });

  // Try to extract content from PDF attachments
  let pdfContent = "";
  let pdfItems: AuctionItem[] = [];
  let pdfBankAccount: string | null = null;
  let pdfLocation: string | null = null;
  let pdfDate: string | null = null;

  const pdfUrls = documentUrls.filter(
    (url) => url.endsWith(".pdf") || url.includes(".docx.pdf")
  );

  for (const pdfUrl of pdfUrls) {
    try {
      log(`  Downloading PDF: ${pdfUrl.split("/").pop()}`);
      const pdfBuffer = await fetchBinary(pdfUrl);
      const parsed = await parsePdfContent(pdfBuffer);

      if (parsed.text) {
        pdfContent += parsed.text + "\n";
      }
      if (parsed.items.length > 0 && pdfItems.length === 0) {
        pdfItems = parsed.items;
      }
      if (parsed.bankAccount && !pdfBankAccount) {
        pdfBankAccount = parsed.bankAccount;
      }
      if (parsed.location && !pdfLocation) {
        pdfLocation = parsed.location;
      }
      if (parsed.auctionDate && !pdfDate) {
        pdfDate = parsed.auctionDate;
      }

      // Extract image URLs from image-containing documents
      // (DOCX files may have images linked)
    } catch (err) {
      log(
        `  Failed to parse PDF ${pdfUrl}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Check for image documents (DOCX with photos)
  const imageDocUrls = documentUrls.filter(
    (url) =>
      url.match(/zdj[eę]ci|photo|image|foto/i) &&
      url.match(/\.docx?$/i)
  );
  // We just keep these as document URLs - the user can download them

  // Extract image URLs from bip-article-images (full-size links)
  $(".bip-article-images a[href], .bip-article-image a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.includes("/image/") || href.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      const fullUrl = href.startsWith("http") ? href : `${origin}${href}`;
      const normalized = normalizeImageUrl(fullUrl);
      if (!imageUrls.some((u) => normalizeImageUrl(u) === normalized) && !fullUrl.includes("/icons/")) {
        imageUrls.push(fullUrl);
      }
    }
  });

  // Also check for images in article content (skip thumbnails)
  $(".bip-article-content img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    // Skip thumbnails (Liferay serves thumbnails with t= or width= params)
    const width = $(el).attr("width");
    if (width && parseInt(width, 10) <= 200) return;
    if (src.includes("/image/") || src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
      const fullUrl = src.startsWith("http") ? src : `${origin}${src}`;
      const normalized = normalizeImageUrl(fullUrl);
      if (!imageUrls.some((u) => normalizeImageUrl(u) === normalized) && !fullUrl.includes("/icons/")) {
        imageUrls.push(fullUrl);
      }
    }
  });

  // Combine HTML content and PDF content
  const fullContent = [rawHtmlContent, pdfContent].filter(Boolean).join("\n");

  // Extract data from combined content
  const auctionDate =
    pdfDate || parsePolishDate(fullContent) || parsePolishDate(rawHtmlContent);
  const location =
    pdfLocation || extractLocationFromText(fullContent);
  const bankAccount =
    pdfBankAccount ||
    extractBankAccount(fullContent) ||
    extractBankAccount(rawHtmlContent);
  const items =
    pdfItems.length > 0
      ? pdfItems
      : extractItemsFromHtml($, articleContent);

  return {
    auctionDate,
    location,
    bankAccount,
    source,
    items,
    documentUrls,
    imageUrls,
    rawContent: fullContent.slice(0, 10000),
  };
}

/**
 * Normalize BIP image URL for deduplication.
 * Strips query params like t=, width=, height= that distinguish thumbnails from full-size.
 * Extracts the base img_id for Liferay /image/ URLs.
 */
function normalizeImageUrl(url: string): string {
  try {
    const u = new URL(url);
    // For Liferay /image/journal_article?img_id=... URLs, the img_id is the key
    const imgId = u.searchParams.get("img_id");
    if (imgId) {
      return `${u.origin}${u.pathname}?img_id=${imgId}`;
    }
    // For regular image file URLs, strip all query params
    return `${u.origin}${u.pathname}`;
  } catch {
    // If URL parsing fails, just compare as-is
    return url;
  }
}

function extractLocationFromText(text: string): string | null {
  const patterns = [
    /[Mm]iejsce\s*(?:licytacji)?[:\s]+(.+?)(?:\n|\.(?:\s|$))/,
    /(?:w siedzibie|siedzib[aę])\s+(.+?)(?:\n|\.(?:\s|$))/,
    /(?:odbędzie się|pod adresem)[:\s]+(.+?)(?:\.(?:\s|$)|\n)/,
    /(?:sala\s+\w+|pok(?:ój|\.)\s*\d+).+?(\d{2}-\d{3}\s+\w+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const loc = match[1].trim().replace(/\s+/g, " ");
      if (loc.length > 5 && loc.length < 300) {
        return loc;
      }
    }
  }

  return null;
}

function extractItemsFromHtml(
  $: cheerio.CheerioAPI,
  article: cheerio.Cheerio<Element>
): AuctionItem[] {
  const items: AuctionItem[] = [];

  article.find("table").each((_, table) => {
    const $table = $(table);
    const headers: string[] = [];

    $table
      .find("thead th, thead td, tr:first-child th, tr:first-child td")
      .each((_, th) => {
        headers.push($(th).text().trim().toLowerCase());
      });

    const hasRelevantHeaders =
      headers.some(
        (h) =>
          h.includes("określenie") ||
          h.includes("ruchomości") ||
          h.includes("nazwa")
      ) ||
      headers.some((h) => h.includes("wartość") || h.includes("szacunk"));

    if (!hasRelevantHeaders && headers.length > 0) return;

    const nameIdx = headers.findIndex(
      (h) =>
        h.includes("określenie") ||
        h.includes("ruchomości") ||
        h.includes("nazwa") ||
        h.includes("opis")
    );
    const estimatedIdx = headers.findIndex(
      (h) =>
        h.includes("szacunk") ||
        (h.includes("wartość") && !h.includes("wywołan"))
    );
    const startingIdx = headers.findIndex(
      (h) => h.includes("wywołan") || h.includes("wywoławcz")
    );
    const depositIdx = headers.findIndex((h) => h.includes("wadium"));
    const notesIdx = headers.findIndex(
      (h) => h.includes("uwagi") || h.includes("informacj")
    );

    const rows = $table.find("tbody tr, tr").toArray();
    const startRow = headers.length > 0 ? 1 : 0;

    for (let i = startRow; i < rows.length; i++) {
      const cells = $(rows[i]!)
        .find("td")
        .toArray()
        .map((td) => $(td).text().trim());

      if (cells.length < 2) continue;

      const effectiveNameIdx =
        nameIdx >= 0 ? nameIdx : cells[0]?.match(/^\d+\.?$/) ? 1 : 0;

      const name = cells[effectiveNameIdx] || "";
      if (!name || name.match(/^\d+\.?$/)) continue;

      items.push({
        name,
        estimatedValue: estimatedIdx >= 0 ? cells[estimatedIdx] || null : null,
        startingPrice: startingIdx >= 0 ? cells[startingIdx] || null : null,
        deposit: depositIdx >= 0 ? cells[depositIdx] || null : null,
        notes: notesIdx >= 0 ? cells[notesIdx] || null : null,
      });
    }
  });

  return items;
}
