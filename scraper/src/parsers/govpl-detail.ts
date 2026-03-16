import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { AuctionItem } from "../../../shared/types.js";
import { parsePolishDate, extractBankAccount } from "../utils.js";

export interface GovplDetailResult {
  auctionDate: string | null;
  location: string | null;
  bankAccount: string | null;
  source: string;
  items: AuctionItem[];
  documentUrls: string[];
  imageUrls: string[];
  rawContent: string;
}

export function parseGovplDetail(
  html: string,
  pageUrl: string
): GovplDetailResult {
  const $ = cheerio.load(html);

  const article = $(".editor-content, .article-area__article, article");
  const rawContent = article.text().trim();

  // Extract auction date from content
  const auctionDate = parsePolishDate(rawContent);

  // Extract location - look for headers like "Miejsce" or address patterns
  const location = extractLocation($, rawContent);

  // Extract bank account
  const bankAccount = extractBankAccount(rawContent);

  // Extract items from tables
  const items = extractItemsFromTable($, article);

  // Extract document/attachment URLs
  const documentUrls: string[] = [];
  const imageUrls: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr("href") || "";
    if (
      href.match(/\.(pdf|docx?|xlsx?|odt)$/i) ||
      href.includes("/attachment/") ||
      href.includes("/documents/")
    ) {
      const fullUrl = href.startsWith("http")
        ? href
        : `https://www.gov.pl${href}`;
      if (!documentUrls.includes(fullUrl)) {
        documentUrls.push(fullUrl);
      }
    }
  });

  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") || "";
    if (
      src.includes("/photo/") ||
      src.includes("/attachment/") ||
      src.match(/\.(jpg|jpeg|png|gif|webp)/i)
    ) {
      const fullUrl = src.startsWith("http")
        ? src
        : `https://www.gov.pl${src}`;
      if (
        !imageUrls.includes(fullUrl) &&
        !fullUrl.includes("/icons/") &&
        !fullUrl.includes("/img/")
      ) {
        imageUrls.push(fullUrl);
      }
    }
  });

  // Extract source from meta or breadcrumbs
  const source =
    $(".event-date")
      .parent()
      .find("p")
      .not(".event-date")
      .first()
      .text()
      .trim() || "";

  return {
    auctionDate,
    location,
    bankAccount,
    source,
    items,
    documentUrls,
    imageUrls,
    rawContent,
  };
}

function extractLocation(
  $: cheerio.CheerioAPI,
  rawContent: string
): string | null {
  // Look for "Miejsce" header followed by text
  const locationPatterns = [
    /Miejsce\s*(?:licytacji)?[:\n]\s*(.+?)(?:\n|$)/i,
    /(?:odbędzie się|pod adresem)[:\s]+(.+?)(?:\.|,\s*w\s+obecności)/i,
    /(?:w siedzibie|siedzib[aę])\s+(.+?)(?:\.|$)/im,
  ];

  for (const pattern of locationPatterns) {
    const match = rawContent.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  // Try structured content - look for h3 "Miejsce" followed by content
  let location: string | null = null;
  $("h3").each((_, el) => {
    const headerText = $(el).text().trim().toLowerCase();
    if (headerText.includes("miejsce") && !location) {
      const nextText = $(el).nextAll("p").first().text().trim();
      if (nextText) {
        location = nextText.replace(/\s+/g, " ");
      }
    }
  });

  return location;
}

function extractItemsFromTable(
  $: cheerio.CheerioAPI,
  article: cheerio.Cheerio<Element>
): AuctionItem[] {
  const items: AuctionItem[] = [];

  article.find("table").each((_, table) => {
    const $table = $(table);
    const headers: string[] = [];

    // Get headers
    $table.find("thead th, thead td, tr:first-child th, tr:first-child td").each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    // Check if this looks like an items table
    const hasRelevantHeaders =
      headers.some((h) => h.includes("określenie") || h.includes("ruchomości") || h.includes("nazwa")) ||
      headers.some((h) => h.includes("wartość") || h.includes("szacunk")) ||
      headers.some((h) => h.includes("cena") || h.includes("wywołan"));

    if (!hasRelevantHeaders && headers.length > 0) return;

    // Map column indices
    const nameIdx = headers.findIndex(
      (h) => h.includes("określenie") || h.includes("ruchomości") || h.includes("nazwa") || h.includes("opis")
    );
    const estimatedIdx = headers.findIndex(
      (h) => h.includes("szacunk") || (h.includes("wartość") && !h.includes("wywołan"))
    );
    const startingIdx = headers.findIndex(
      (h) => h.includes("wywołan") || h.includes("wywoławcz")
    );
    const depositIdx = headers.findIndex((h) => h.includes("wadium"));
    const notesIdx = headers.findIndex(
      (h) => h.includes("uwagi") || h.includes("informacj")
    );

    // Parse rows (skip header row)
    const rows = $table.find("tbody tr, tr").toArray();
    const startRow = headers.length > 0 ? 1 : 0;

    for (let i = startRow; i < rows.length; i++) {
      const cells = $(rows[i]!)
        .find("td")
        .toArray()
        .map((td) => $(td).text().trim());

      if (cells.length < 2) continue;

      // Skip if first cell is just a number (row index)
      const effectiveNameIdx = nameIdx >= 0 ? nameIdx : cells[0]?.match(/^\d+\.?$/) ? 1 : 0;

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

  // If no table found, try to extract from text
  if (items.length === 0) {
    const rawText = article.text();
    const itemMatch = rawText.match(
      /(?:Sprzedawan[ey]\s+ruchomości|Przedmiot\s+licytacji)[:\s]+([\s\S]*?)(?:Termin|Miejsce|Pozostałe|Warunki|Wadium)/i
    );
    if (itemMatch?.[1]) {
      const text = itemMatch[1].trim();
      if (text.length > 5) {
        items.push({
          name: text.replace(/\s+/g, " ").slice(0, 500),
          estimatedValue: null,
          startingPrice: null,
          deposit: null,
          notes: null,
        });
      }
    }
  }

  return items;
}
