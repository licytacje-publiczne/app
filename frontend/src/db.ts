import Dexie, { type EntityTable } from "dexie";
import type { Auction } from "../../shared/types";

// Dexie needs the id field to be the primary key
export type AuctionRecord = Auction;

export interface MetaRecord {
  key: string;
  value: string;
}

const db = new Dexie("LicytacjePubliczne") as Dexie & {
  auctions: EntityTable<AuctionRecord, "id">;
  meta: EntityTable<MetaRecord, "key">;
};

db.version(1).stores({
  auctions: "id, ias, voivodeship, platform, auctionType, auctionDate, auctionNumber, scrapedAt",
  meta: "key",
});

db.version(2).stores({
  auctions:
    "id, ias, voivodeship, platform, auctionType, auctionDate, auctionNumber, scrapedAt, archived, lastSeenAt",
  meta: "key",
});

export { db };
