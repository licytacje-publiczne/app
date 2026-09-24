import type { Auction } from "../../shared/types.js";
import { log } from "./utils.js";

/**
 * Merge newly scraped auctions with existing data.
 *
 * Strategy:
 * - If an auction exists in new data → replace with new version (update lastSeenAt)
 * - If an auction exists in old data but NOT in new data AND its IAS was scraped → mark as archived
 * - If an auction exists in old data but its IAS was NOT scraped (partial scrape) → keep as-is
 * - New auctions → add normally
 *
 * @param existingAuctions - Previously saved auctions
 * @param newAuctions - Freshly scraped auctions
 * @param scrapedIasIdentifiers - Set of IAS identifiers (cities and/or IDs) included in this scrape run
 */
export function mergeAuctions(
  existingAuctions: Auction[],
  newAuctions: Auction[],
  scrapedIasIdentifiers: Set<string>,
): Auction[] {
  const newById = new Map<string, Auction>();
  for (const auction of newAuctions) {
    newById.set(auction.id, auction);
  }

  // Normalize set of scraped identifiers for case-insensitive and city/id matching
  const normalizedScraped = new Set<string>();
  for (const id of scrapedIasIdentifiers) {
    normalizedScraped.add(id);
    normalizedScraped.add(id.toLowerCase());
  }

  const isIasScraped = (ias: string) => {
    return (
      scrapedIasIdentifiers.has(ias) ||
      normalizedScraped.has(ias.toLowerCase())
    );
  };

  const merged = new Map<string, Auction>();

  // First: process existing auctions
  for (const existing of existingAuctions) {
    if (newById.has(existing.id)) {
      // Auction still exists on source — use new version (already has lastSeenAt set)
      merged.set(existing.id, newById.get(existing.id)!);
    } else if (isIasScraped(existing.ias)) {
      // Auction's IAS was scraped but auction wasn't found — mark as archived
      if (!existing.archived) {
        log(`  Archiving: [${existing.ias}] ${existing.title.substring(0, 60)}...`);
      }
      merged.set(existing.id, {
        ...existing,
        archived: true,
        // Keep original lastSeenAt — it reflects the last time it was actually on the site
      });
    } else {
      // Auction's IAS was NOT scraped in this run (partial scrape) — keep as-is
      merged.set(existing.id, existing);
    }
  }

  // Second: add any genuinely new auctions (not seen before)
  let newCount = 0;
  for (const auction of newAuctions) {
    if (!merged.has(auction.id)) {
      merged.set(auction.id, auction);
      newCount++;
    }
  }

  if (newCount > 0) {
    log(`  ${newCount} new auctions added`);
  }

  return Array.from(merged.values());
}
