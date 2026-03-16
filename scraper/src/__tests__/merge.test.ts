import { describe, it, expect } from "vitest";
import type { Auction } from "../../../shared/types.js";

/**
 * Tests for the merge logic extracted from index.ts.
 * We import the functions directly — but since they're not exported,
 * we replicate the merge logic here for testing.
 */

// ─── Replicate merge logic for testing ──────────────────────────

function mergeAuctions(
  existingAuctions: Auction[],
  newAuctions: Auction[],
  scrapedIasIds: Set<string>,
): Auction[] {
  const newById = new Map<string, Auction>();
  for (const auction of newAuctions) {
    newById.set(auction.id, auction);
  }

  const merged = new Map<string, Auction>();

  for (const existing of existingAuctions) {
    if (newById.has(existing.id)) {
      merged.set(existing.id, newById.get(existing.id)!);
    } else if (scrapedIasIds.has(existing.ias)) {
      merged.set(existing.id, { ...existing, archived: true });
    } else {
      merged.set(existing.id, existing);
    }
  }

  for (const auction of newAuctions) {
    if (!merged.has(auction.id)) {
      merged.set(auction.id, auction);
    }
  }

  return Array.from(merged.values());
}

// ─── Test factory ───────────────────────────────────────────────

function makeAuction(overrides: Partial<Auction> = {}): Auction {
  return {
    id: "abc123",
    sourceUrl: "https://example.com/auction/1",
    ias: "Katowice",
    voivodeship: "śląskie",
    platform: "govpl",
    title: "Samochód osobowy",
    auctionNumber: 1,
    auctionType: "licytacja_ruchomosci",
    source: "IAS Katowice",
    auctionDate: "2026-04-15T10:00",
    location: "Katowice",
    bankAccount: null,
    items: [],
    documentUrls: [],
    imageUrls: [],
    rawContent: "test content",
    scrapedAt: "2026-03-15T08:00:00Z",
    lastSeenAt: "2026-03-15T08:00:00Z",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("mergeAuctions", () => {
  it("updates existing auctions when found in new data", () => {
    const existing = [makeAuction({ id: "aaa", title: "Old title" })];
    const fresh = [
      makeAuction({ id: "aaa", title: "New title", scrapedAt: "2026-03-16T08:00:00Z" }),
    ];

    const result = mergeAuctions(existing, fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("New title");
    expect(result[0]!.scrapedAt).toBe("2026-03-16T08:00:00Z");
  });

  it("marks auctions as archived when IAS was scraped but auction not found", () => {
    const existing = [
      makeAuction({ id: "aaa", ias: "Katowice" }),
      makeAuction({ id: "bbb", ias: "Katowice", title: "Stara aukcja" }),
    ];
    const fresh = [makeAuction({ id: "aaa", ias: "Katowice" })];

    const result = mergeAuctions(existing, fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(2);
    const archived = result.find((a) => a.id === "bbb");
    expect(archived!.archived).toBe(true);
    const active = result.find((a) => a.id === "aaa");
    expect(active!.archived).toBeUndefined();
  });

  it("preserves auctions from non-scraped IAS offices (partial scrape)", () => {
    const existing = [
      makeAuction({ id: "aaa", ias: "Katowice" }),
      makeAuction({ id: "bbb", ias: "Kraków", title: "Kraków auction" }),
    ];
    const fresh = [makeAuction({ id: "aaa", ias: "Katowice" })];

    // Only Katowice was scraped
    const result = mergeAuctions(existing, fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(2);
    const krakow = result.find((a) => a.id === "bbb");
    expect(krakow!.archived).toBeUndefined();
    expect(krakow!.title).toBe("Kraków auction");
  });

  it("adds genuinely new auctions", () => {
    const existing = [makeAuction({ id: "aaa", ias: "Katowice" })];
    const fresh = [
      makeAuction({ id: "aaa", ias: "Katowice" }),
      makeAuction({ id: "ccc", ias: "Katowice", title: "New auction" }),
    ];

    const result = mergeAuctions(existing, fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(2);
    expect(result.find((a) => a.id === "ccc")).toBeDefined();
  });

  it("handles empty existing data", () => {
    const fresh = [makeAuction({ id: "aaa" }), makeAuction({ id: "bbb" })];

    const result = mergeAuctions([], fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(2);
  });

  it("handles empty fresh data (all auctions archived)", () => {
    const existing = [
      makeAuction({ id: "aaa", ias: "Katowice" }),
      makeAuction({ id: "bbb", ias: "Katowice" }),
    ];

    const result = mergeAuctions(existing, [], new Set(["Katowice"]));

    expect(result).toHaveLength(2);
    expect(result.every((a) => a.archived)).toBe(true);
  });

  it("handles multiple IAS offices in partial scrape", () => {
    const existing = [
      makeAuction({ id: "a1", ias: "Katowice" }),
      makeAuction({ id: "b1", ias: "Kraków" }),
      makeAuction({ id: "c1", ias: "Wrocław" }),
    ];
    const fresh = [
      makeAuction({ id: "a1", ias: "Katowice", title: "Updated" }),
      makeAuction({ id: "b2", ias: "Kraków", title: "New Kraków" }),
    ];

    // Only Katowice and Kraków were scraped
    const result = mergeAuctions(existing, fresh, new Set(["Katowice", "Kraków"]));

    expect(result).toHaveLength(4);
    // a1 — updated
    expect(result.find((a) => a.id === "a1")!.title).toBe("Updated");
    // b1 — archived (Kraków was scraped but b1 not in fresh)
    expect(result.find((a) => a.id === "b1")!.archived).toBe(true);
    // b2 — new
    expect(result.find((a) => a.id === "b2")).toBeDefined();
    // c1 — preserved as-is (Wrocław not scraped)
    expect(result.find((a) => a.id === "c1")!.archived).toBeUndefined();
  });

  it("does not double-archive already archived auctions", () => {
    const existing = [makeAuction({ id: "aaa", ias: "Katowice", archived: true })];
    const fresh: Auction[] = [];

    const result = mergeAuctions(existing, fresh, new Set(["Katowice"]));

    expect(result).toHaveLength(1);
    expect(result[0]!.archived).toBe(true);
  });
});
