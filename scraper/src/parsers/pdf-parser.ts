import pdfParse from "pdf-parse";
import type { AuctionItem } from "../../../shared/types.js";
import { parsePolishDate, extractBankAccount } from "../utils.js";

export interface PdfParseResult {
  text: string;
  auctionDate: string | null;
  location: string | null;
  bankAccount: string | null;
  items: AuctionItem[];
}

export async function parsePdfContent(buffer: Buffer): Promise<PdfParseResult> {
  let text = "";

  try {
    const data = await pdfParse(buffer);
    text = data.text || "";
  } catch {
    // PDF parsing may fail for some documents
    return {
      text: "",
      auctionDate: null,
      location: null,
      bankAccount: null,
      items: [],
    };
  }

  // Clean up the extracted text
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const auctionDate = parsePolishDate(text);
  const bankAccount = extractBankAccount(text);
  const location = extractLocationFromPdf(text);
  const items = extractItemsFromPdf(text);

  return {
    text,
    auctionDate,
    location,
    bankAccount,
    items,
  };
}

function extractLocationFromPdf(text: string): string | null {
  const patterns = [
    /[Mm]iejsce\s*(?:licytacji)?[:\s]+(.+?)(?:\n)/,
    /(?:w siedzibie|siedzib[aę])\s+(.+?)(?:\n)/,
    /(?:pod adresem|adres)[:\s]+(.+?)(?:\n)/,
    /(\d{2}-\d{3}\s+\w+.*?(?:ul\.|ulica|al\.|plac).*?)(?:\n)/,
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

function extractItemsFromPdf(text: string): AuctionItem[] {
  const items: AuctionItem[] = [];

  // Try to find table-like structures in PDF text
  // PDF tables often get extracted as lines with values separated by spaces or tabs

  // Price pattern: digits (with optional spaces) followed by comma and 2 decimal places
  // Supports single-digit prices like "5,00" as well as "18 000,00"
  const PRICE_RE = /(\d[\d\s]*,\d{2})\s*(?:zł\.?|PLN)?/g;

  const lines = text.split("\n").map((l) => l.trim());

  // Find the section about auctioned items
  let inItemsSection = false;
  let itemText = "";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("sprzedawan") ||
      lower.includes("określenie ruchomości") ||
      lower.includes("przedmiot licytacji") ||
      lower.includes("wykaz ruchomości") ||
      lower.includes("l.p.") ||
      lower.includes("lp.")
    ) {
      inItemsSection = true;
      continue;
    }

    if (
      inItemsSection &&
      (lower.includes("termin") ||
        lower.includes("miejsce") ||
        lower.includes("warunki") ||
        lower.includes("osoba przystępująca") ||
        lower.includes("pozostałe informacje") ||
        lower.includes("pouczenie") ||
        lower.includes("podstawa prawna"))
    ) {
      inItemsSection = false;
      continue;
    }

    if (inItemsSection && line.length > 3) {
      itemText += `${line}\n`;
    }
  }

  if (itemText) {
    // Try to parse structured item data from the text
    // Look for patterns like: "1. Samochód osobowy ... 18000,00 zł 13500,00 zł 1800,00 zł"
    const itemLines = itemText.split("\n").filter((l) => l.trim());

    let currentItemParts: string[] = [];

    for (const line of itemLines) {
      // Count price patterns on this line
      const linePs: string[] = [];
      let match;
      const tempPattern = /(\d[\d\s]*,\d{2})\s*(?:zł\.?|PLN)?/g;
      while ((match = tempPattern.exec(line)) !== null) {
        linePs.push(`${match[1]!.replace(/\s/g, "")} zł`);
      }

      if (linePs.length >= 2) {
        // This line likely contains item prices
        // Extract the item name: text before the first price pattern
        const nameFromLine = line.replace(/(\d[\d\s]*,\d{2})\s*(?:zł\.?|PLN)?/g, "").trim();
        // Remove leading numbering like "1." or "1)"
        const cleanedLineName = nameFromLine.replace(/^\d+[.)]\s*/, "").trim();

        // Combine accumulated description lines with this line's text
        const accumulatedName = currentItemParts.join(" ").trim();
        const name = accumulatedName
          ? `${accumulatedName} ${cleanedLineName}`.trim()
          : cleanedLineName;

        if (name) {
          items.push({
            name: name.replace(/\s+/g, " ").replace(/^\d+[.)]\s*/, ""),
            estimatedValue: linePs[0] || null,
            startingPrice: linePs[1] || null,
            deposit: linePs[2] || null,
            notes: linePs[3] || null,
          });
        }
        currentItemParts = [];
      } else if (line.match(/^\d+[.)]\s/)) {
        // New numbered item starts — flush accumulated text if any
        if (currentItemParts.length > 0) {
          // Previous item had no prices — save it as-is
          const name = currentItemParts
            .join(" ")
            .replace(/^\d+[.)]\s*/, "")
            .trim();
          if (name) {
            items.push({
              name: name.replace(/\s+/g, " "),
              estimatedValue: null,
              startingPrice: null,
              deposit: null,
              notes: null,
            });
          }
        }
        currentItemParts = [line];
      } else {
        // Continuation line (description text)
        currentItemParts.push(line);
      }
    }

    // Flush remaining accumulated text
    if (currentItemParts.length > 0 && items.length > 0) {
      // Append remaining text as notes to the last item
      const remaining = currentItemParts.join(" ").replace(/\s+/g, " ").trim();
      if (remaining && items[items.length - 1]) {
        items[items.length - 1]!.notes = items[items.length - 1]!.notes
          ? `${items[items.length - 1]!.notes}; ${remaining}`
          : remaining;
      }
    } else if (currentItemParts.length > 0 && items.length === 0) {
      // No items parsed yet — create one from accumulated text
      const name = currentItemParts
        .join(" ")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/\s+/g, " ")
        .trim();
      if (name) {
        items.push({
          name: name.slice(0, 500),
          estimatedValue: null,
          startingPrice: null,
          deposit: null,
          notes: null,
        });
      }
    }

    // If we collected item text but no structured items, create a single item with prices
    if (items.length === 0 && itemText.trim()) {
      const allPrices: string[] = [];
      let m;
      while ((m = PRICE_RE.exec(itemText)) !== null) {
        allPrices.push(`${m[1]!.replace(/\s/g, "")} zł`);
      }

      const cleanedName = itemText
        .replace(/\d[\d\s]*,\d{2}\s*(?:zł\.?|PLN)?/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      if (cleanedName) {
        items.push({
          name: cleanedName,
          estimatedValue: allPrices[0] || null,
          startingPrice: allPrices[1] || null,
          deposit: allPrices[2] || null,
          notes: null,
        });
      }
    }
  }

  return items;
}
