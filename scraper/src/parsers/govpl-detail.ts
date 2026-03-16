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

export function parseGovplDetail(html: string, _pageUrl: string): GovplDetailResult {
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

  // Extract document/attachment URLs — scoped to the article element only
  const documentUrls: string[] = [];
  const imageUrls: string[] = [];

  // Gov.pl uses <a class="file-download"> for attachments inside the article.
  // Classify based on the link's visible label text:
  //   - "Zdjęcia", "zdjęcie", "foto" → imageUrls (photo archives/files)
  //   - everything else → documentUrls
  article.find('a[href*="/attachment/"], a[href*="/documents/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const fullUrl = href.startsWith("http") ? href : `https://www.gov.pl${href}`;
    // Get the label text (first text before <br/> and <span>)
    const labelText = $(el).clone().children().remove().end().text().trim().toLowerCase();

    if (labelText.match(/zdjęci|foto|galeri/)) {
      if (!imageUrls.includes(fullUrl)) {
        imageUrls.push(fullUrl);
      }
    } else {
      if (!documentUrls.includes(fullUrl)) {
        documentUrls.push(fullUrl);
      }
    }
  });

  // Also pick up any remaining <a> links to documents (PDF etc.) within the article
  article.find("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.match(/\.(pdf|docx?|xlsx?|odt)$/i)) {
      const fullUrl = href.startsWith("http") ? href : `https://www.gov.pl${href}`;
      if (!documentUrls.includes(fullUrl)) {
        documentUrls.push(fullUrl);
      }
    }
  });

  // Extract source from meta or breadcrumbs
  const source = $(".event-date").parent().find("p").not(".event-date").first().text().trim() || "";

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

function extractLocation($: cheerio.CheerioAPI, rawContent: string): string | null {
  // First try structured content - look for h3 containing "miejsce" followed by a paragraph
  // This is more reliable than raw text regex since we can isolate the paragraph content
  let location: string | null = null;
  $("h3").each((_, el) => {
    const headerText = $(el).text().trim().toLowerCase();
    if (headerText.includes("miejsce") && !location) {
      const nextText = $(el).nextAll("p").first().text().trim();
      if (nextText) {
        // Try to extract just the address from the paragraph
        const addressFromText = extractAddressFromText(nextText);
        location = addressFromText || nextText.replace(/\s+/g, " ");
      }
    }
  });

  if (location) return location;

  // Fall back to regex patterns on raw content
  const locationPatterns = [
    /(?:w siedzibie|siedzib[aę])\s+(.+?)(?:\.(?:\s|$)|\n)/im,
    /Miejsce\s*(?:licytacji)?[:\s]+(.+?)(?:\n|$)/i,
    /(?:pod adresem)\s+(.+?)(?:\.(?:\s|$)|\n)/im,
  ];

  for (const pattern of locationPatterns) {
    const match = rawContent.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return location;
}

/**
 * Tries to extract an address/location from a paragraph that may contain
 * other text (dates, preamble). Looks for patterns like "w siedzibie ...",
 * "pod adresem ...", or a postal code pattern.
 */
function extractAddressFromText(text: string): string | null {
  const patterns = [
    /(?:w siedzibie|siedzib[aę])\s+(.+)/im,
    /(?:pod adresem)\s+(.+)/im,
    /(\d{2}-\d{3}\s+\w+.*?(?:ul\.|ulica|al\.|plac).*)/im,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      // Trim trailing period and clean whitespace
      const loc = match[1].trim().replace(/\s+/g, " ").replace(/\.$/, "").trim();
      if (loc.length > 5 && loc.length < 300) {
        return loc;
      }
    }
  }
  return null;
}

function extractItemsFromTable(
  $: cheerio.CheerioAPI,
  article: cheerio.Cheerio<Element>,
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
      headers.some(
        (h) => h.includes("określenie") || h.includes("ruchomości") || h.includes("nazwa"),
      ) ||
      headers.some((h) => h.includes("wartość") || h.includes("szacunk")) ||
      headers.some((h) => h.includes("cena") || h.includes("wywołan"));

    if (!hasRelevantHeaders && headers.length > 0) return;

    // Map column indices
    const nameIdx = headers.findIndex(
      (h) =>
        h.includes("określenie") ||
        h.includes("ruchomości") ||
        h.includes("nazwa") ||
        h.includes("opis"),
    );
    const estimatedIdx = headers.findIndex(
      (h) => h.includes("szacunk") || (h.includes("wartość") && !h.includes("wywołan")),
    );
    const startingIdx = headers.findIndex((h) => h.includes("wywołan") || h.includes("wywoławcz"));
    const depositIdx = headers.findIndex((h) => h.includes("wadium"));
    const notesIdx = headers.findIndex((h) => h.includes("uwagi") || h.includes("informacj"));

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
      /(?:Sprzedawan[ey]\s+ruchomości|Przedmiot\s+licytacji)[:\s]+([\s\S]*?)(?:Termin|Miejsce|Pozostałe|Warunki|Wadium)/i,
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
