import { useCallback, useEffect, useState } from "react";
import type { ScrapeResult } from "../../../shared/types";
import { db } from "../db";

const DATA_URL = import.meta.env.BASE_URL + "data/auctions.json";

export function useAuctionData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        throw new Error(`Nie udało się pobrać danych: HTTP ${response.status}`);
      }

      const data: ScrapeResult = await response.json();

      // Clear and repopulate the database
      await db.transaction("rw", db.auctions, db.meta, async () => {
        await db.auctions.clear();
        await db.auctions.bulkPut(data.auctions);
        await db.meta.put({
          key: "lastUpdated",
          value: data.scrapedAt,
        });
        await db.meta.put({
          key: "errorCount",
          value: String(data.errors.length),
        });
      });

      setLastUpdated(data.scrapedAt);
    } catch (err) {
      // Try to use cached data from Dexie
      const count = await db.auctions.count();
      if (count > 0) {
        const meta = await db.meta.get("lastUpdated");
        setLastUpdated(meta?.value ?? null);
        setError(
          `Nie udało się pobrać nowych danych. Używam danych z cache (${count} ogłoszeń).`
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Nieznany błąd podczas pobierania danych"
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if we have cached data first
    (async () => {
      const count = await db.auctions.count();
      if (count > 0) {
        const meta = await db.meta.get("lastUpdated");
        setLastUpdated(meta?.value ?? null);
        setLoading(false);

        // Still fetch fresh data in background
        loadData();
      } else {
        await loadData();
      }
    })();
  }, [loadData]);

  return { loading, error, lastUpdated, refresh: loadData };
}
