import { createHash } from "node:crypto";
import { REQUEST_DELAY_MS, REQUEST_TIMEOUT_MS } from "./config.js";

export function generateId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LicytacjePubliczne/1.0; +https://github.com/licytacje-publiczne)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pl,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBinary(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LicytacjePubliczne/1.0; +https://github.com/licytacje-publiczne)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

export function delay(ms: number = REQUEST_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract auction number from title.
 * "I licytacja..." -> 1
 * "II licytacja..." -> 2
 * "III licytacja..." -> 3
 * "Pierwsza licytacja..." -> 1
 * "Druga licytacja..." -> 2
 * "Trzecia licytacja..." -> 3
 */
const ROMAN_MAP: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

const ORDINAL_MAP: Record<string, number> = {
  pierwsza: 1,
  druga: 2,
  trzecia: 3,
  czwarta: 4,
  piąta: 5,
  szósta: 6,
  pierwszy: 1,
  drugi: 2,
  trzeci: 3,
  czwarty: 4,
  piąty: 5,
  szósty: 6,
};

export function extractAuctionNumber(title: string): number | null {
  // Try Roman numerals: "III licytacja", "I licytacja"
  const romanMatch = title.match(/^(I{1,3}V?I{0,3})\s+licytacj/i);
  if (romanMatch) {
    const roman = romanMatch[1].toUpperCase();
    return ROMAN_MAP[roman] ?? null;
  }

  // Try ordinal words: "Pierwsza licytacja", "Druga licytacja"
  const ordinalMatch = title.match(
    /^(pierwsz[ay]|drug[aiy]|trzeci[ay]?|czwart[ay]|piąt[ay]|szóst[ay])\s+licytacj/i,
  );
  if (ordinalMatch) {
    const word = ordinalMatch[1].toLowerCase();
    for (const [key, val] of Object.entries(ORDINAL_MAP)) {
      if (word.startsWith(key.slice(0, 4))) return val;
    }
  }

  return null;
}

/**
 * Remove auction number prefix from title for cleaner display.
 * "I licytacja nieruchomości..." -> "nieruchomości..."
 * "Pierwsza licytacja ruchomości: samochód..." -> "ruchomości: samochód..."
 */
export function cleanTitle(title: string): string {
  return title
    .replace(/^(I{1,3}V?I{0,3})\s+licytacj[aię]\s*/i, "")
    .replace(
      /^(pierwsz[ay]|drug[aiy]|trzeci[ay]?|czwart[ay]|piąt[ay]|szóst[ay])\s+licytacj[aię]\s*/i,
      "",
    )
    .replace(/^[-–—:]\s*/, "")
    .replace(/^\s+/, "");
}

import type { AuctionType } from "../../shared/types.js";

/**
 * Classify the auction type from title text.
 */
export function classifyAuctionType(title: string): AuctionType {
  const lower = title.toLowerCase();

  if (lower.includes("odwoła") || lower.includes("odwołan")) {
    return "odwolanie";
  }
  if (lower.includes("opis i oszacowanie") || lower.includes("opis i oszacowani")) {
    return "opis_i_oszacowanie";
  }
  if (lower.includes("sprzedaż z wolnej ręki") || lower.includes("sprzedaz z wolnej reki")) {
    return "sprzedaz_z_wolnej_reki";
  }
  if (lower.includes("nieruchomości") || lower.includes("nieruchomosci")) {
    return "licytacja_nieruchomosci";
  }
  if (
    lower.includes("ruchomości") ||
    lower.includes("ruchomosci") ||
    lower.includes("samochód") ||
    lower.includes("samochod") ||
    lower.includes("pojazd") ||
    lower.includes("kopark") ||
    lower.includes("motocykl") ||
    lower.includes("przyczep")
  ) {
    return "licytacja_ruchomosci";
  }
  if (lower.includes("licytacj")) {
    // Generic licytacja - try to guess from context
    return "inne";
  }

  return "inne";
}

/**
 * Parse Polish date strings into ISO format.
 * Handles: "24.04.2026", "24 kwietnia 2026 r.", "24 kwietnia 2026 r. godz. 10:00"
 */
const MONTH_MAP: Record<string, string> = {
  stycznia: "01",
  lutego: "02",
  marca: "03",
  kwietnia: "04",
  maja: "05",
  czerwca: "06",
  lipca: "07",
  sierpnia: "08",
  września: "09",
  października: "10",
  listopada: "11",
  grudnia: "12",
};

export function parsePolishDate(text: string): string | null {
  // Try to find a date near auction-related keywords first
  const contextPatterns = [
    /(?:licytacj[aię]|termin|odbędzie się|odbedzie sie|wyznaczon[aey])\s*(?:na\s+)?(?:dzie[nń]\s+)?(\d{1,2})\.(\d{2})\.(\d{4})(?:\s*r\.?)?\s*(?:o\s+)?(?:godz\.?\s*(\d{1,2})[:.:](\d{2}))?/i,
    /(?:licytacj[aię]|termin|odbędzie się|odbedzie sie|wyznaczon[aey])\s*(?:na\s+)?(?:dzie[nń]\s+)?(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+(\d{4})(?:\s*r\.?)?\s*(?:o\s+)?(?:godz\.?\s*(\d{1,2})[:.:](\d{2}))?/i,
    /(\d{1,2})\.(\d{2})\.(\d{4})(?:\s*r\.?)?\s*(?:o\s+)?(?:godz\.?\s*(\d{1,2})[:.:](\d{2}))?\s*(?:w\s+\w+)/i,
    /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+(\d{4})(?:\s*r\.?)?\s*(?:o\s+)?(?:godz\.?\s*(\d{1,2})[:.:](\d{2}))?\s*(?:w\s+\w+)/i,
  ];

  for (const pattern of contextPatterns) {
    const match = text.match(pattern);
    if (match) {
      const result = buildDateFromMatch(match);
      if (result) return result;
    }
  }

  // Fallback: find ALL date-like patterns and return the first valid one
  const dotDates = [...text.matchAll(/(\d{1,2})\.(\d{2})\.(\d{4})/g)];
  for (const match of dotDates) {
    const day = parseInt(match[1]!, 10);
    const month = parseInt(match[2]!, 10);
    const year = parseInt(match[3]!, 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2020 && year <= 2030) {
      // Look for time in nearby text (within 100 chars after date)
      const afterDate = text.slice(
        match.index! + match[0].length,
        match.index! + match[0].length + 100,
      );
      const timeMatch = afterDate.match(/(?:o\s+)?godz\.?\s*(\d{1,2})[:.:](\d{2})/);
      const time = timeMatch ? `T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : "T00:00";
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}${time}`;
    }
  }

  // Format: "24 kwietnia 2026 r."
  const wordMatch = text.match(
    /(\d{1,2})\s+(stycznia|lutego|marca|kwietnia|maja|czerwca|lipca|sierpnia|września|października|listopada|grudnia)\s+(\d{4})/i,
  );
  if (wordMatch) {
    const [, day, monthWord, year] = wordMatch;
    const month = MONTH_MAP[monthWord!.toLowerCase()];
    if (month) {
      const timeMatch = text.match(/godz\.?\s*(\d{1,2})[:.:](\d{2})/);
      const time = timeMatch ? `T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : "T00:00";
      return `${year}-${month}-${day!.padStart(2, "0")}${time}`;
    }
  }

  return null;
}

function buildDateFromMatch(match: RegExpMatchArray): string | null {
  const g = match.slice(1).filter(Boolean);
  // Check if second capture is a month word or numeric
  const monthWord = MONTH_MAP[g[1]?.toLowerCase() ?? ""];

  let day: number, month: number, year: number;
  let hourIdx: number;

  if (monthWord) {
    day = parseInt(g[0]!, 10);
    month = parseInt(monthWord, 10);
    year = parseInt(g[2]!, 10);
    hourIdx = 3;
  } else {
    day = parseInt(g[0]!, 10);
    month = parseInt(g[1]!, 10);
    year = parseInt(g[2]!, 10);
    hourIdx = 3;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2020 || year > 2030) {
    return null;
  }

  const hour = g[hourIdx] ? g[hourIdx]!.padStart(2, "0") : "00";
  const minute = g[hourIdx + 1] || "00";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${hour}:${minute}`;
}

/**
 * Extract bank account number from text.
 * Polish bank accounts are 26 digits, often formatted with spaces.
 * Handles various prefixes and spacing patterns found in PDF text.
 */
export function extractBankAccount(text: string): string | null {
  // First, try to find account numbers near context keywords (more reliable)
  const contextPatterns = [
    /(?:rachunek|kont[oa]|wadium|wp[lł]at|nr\s*rachunku|nr\s*konta|rachunek\s*bankowy)[:\s]*(?:nr[:\s]*)?(?:PL\s*)?(\d[\d\s]{24,35}\d)/i,
    /(?:nr|numer)[:\s]+(?:PL\s*)?(\d[\d\s]{24,35}\d)/i,
  ];

  for (const pattern of contextPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const digits = match[1].replace(/\s/g, "");
      if (digits.length === 26) return digits;
    }
  }

  // Fallback: match any 26-digit sequence (with optional spaces) preceded by optional PL/nr prefix
  const fallbackMatch = text.match(
    /(?:PL\s*)?(\d{2}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4})/,
  );
  if (fallbackMatch) {
    const digits = fallbackMatch[1]!.replace(/\s/g, "");
    if (digits.length === 26) return digits;
  }

  // Also try continuous 26-digit string
  const continuousMatch = text.match(/(?:^|[^\d])(\d{26})(?:[^\d]|$)/);
  if (continuousMatch?.[1]) {
    return continuousMatch[1];
  }

  return null;
}

export function log(message: string): void {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${message}`);
}
