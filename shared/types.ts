export interface AuctionItem {
  name: string;
  estimatedValue: string | null;
  startingPrice: string | null;
  deposit: string | null;
  notes: string | null;
}

export interface Auction {
  id: string;
  sourceUrl: string;
  ias: string;
  voivodeship: string;
  platform: "bip" | "govpl";

  title: string;
  auctionNumber: number | null;
  auctionType: AuctionType;
  source: string;

  auctionDate: string | null;

  location: string | null;
  bankAccount: string | null;

  items: AuctionItem[];

  documentUrls: string[];
  imageUrls: string[];

  rawContent: string;
  scrapedAt: string;

  /** ISO timestamp of when this auction was last seen on the source website */
  lastSeenAt: string;
  /** true if the auction was previously scraped but is no longer on the source website */
  archived?: boolean;
}

export type AuctionType =
  | "licytacja_ruchomosci"
  | "licytacja_nieruchomosci"
  | "sprzedaz_z_wolnej_reki"
  | "opis_i_oszacowanie"
  | "odwolanie"
  | "inne";

export interface ScrapeResult {
  auctions: Auction[];
  scrapedAt: string;
  errors: ScrapeError[];
}

export interface ScrapeError {
  ias: string;
  url: string;
  message: string;
  phase: "listing" | "detail";
}

export interface IASConfig {
  id: string;
  name: string;
  city: string;
  voivodeship: string;
  platform: "bip" | "govpl";
  listingUrl: string;
}

// --- Utility functions shared between frontend components ---

export function toRoman(n: number): string {
  const map: [number, string][] = [
    [6, "VI"],
    [5, "V"],
    [4, "IV"],
    [3, "III"],
    [2, "II"],
    [1, "I"],
  ];
  for (const [val, roman] of map) {
    if (n >= val) return roman;
  }
  return String(n);
}

export function formatBankAccount(account: string): string {
  const clean = account.replace(/\s/g, "");
  return clean.replace(/(\d{2})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/, "$1 $2 $3 $4 $5 $6 $7");
}
