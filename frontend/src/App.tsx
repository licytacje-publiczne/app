import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { useAuctionData } from "./hooks/useAuctionData";
import { AuctionCard } from "./components/AuctionCard";
import { AuctionDetail } from "./components/AuctionDetail";
import { Filters, type FilterState } from "./components/Filters";
import { Header } from "./components/Header";

export function App() {
  const { loading, error, lastUpdated, refresh } = useAuctionData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    hideExpired: true,
    hideArchived: true,
    ias: null,
    voivodeship: null,
    auctionType: null,
    search: "",
  });

  const allAuctions = useLiveQuery(() => db.auctions.toArray(), []);

  // Debounce search input (300ms)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  const filteredAuctions = useMemo(() => {
    if (!allAuctions) return [];

    const now = new Date().toISOString();

    return allAuctions
      .filter((a) => {
        if (filters.hideExpired && a.auctionDate && a.auctionDate < now) {
          return false;
        }
        if (filters.hideArchived && a.archived) {
          return false;
        }
        if (filters.ias && a.ias !== filters.ias) return false;
        if (filters.voivodeship && a.voivodeship !== filters.voivodeship)
          return false;
        if (filters.auctionType && a.auctionType !== filters.auctionType)
          return false;
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          return (
            a.title.toLowerCase().includes(q) ||
            a.source.toLowerCase().includes(q) ||
            a.rawContent.toLowerCase().includes(q) ||
            a.ias.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (!a.auctionDate && !b.auctionDate) return 0;
        if (!a.auctionDate) return 1;
        if (!b.auctionDate) return -1;
        return a.auctionDate.localeCompare(b.auctionDate);
      });
  }, [allAuctions, filters.hideExpired, filters.hideArchived, filters.ias, filters.voivodeship, filters.auctionType, debouncedSearch]);

  const selectedAuction = useMemo(
    () => filteredAuctions.find((a) => a.id === selectedId) ?? null,
    [filteredAuctions, selectedId]
  );

  // Unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    if (!allAuctions) return { cities: [], voivodeships: [], types: [] };

    const cities = [...new Set(allAuctions.map((a) => a.ias))].sort();
    const voivodeships = [...new Set(allAuctions.map((a) => a.voivodeship))].sort();
    const types = [...new Set(allAuctions.map((a) => a.auctionType))].sort();

    return { cities, voivodeships, types };
  }, [allAuctions]);

  const handleBack = useCallback(() => setSelectedId(null), []);

  if (selectedAuction) {
    return (
      <div className="app">
        <Header
          lastUpdated={lastUpdated}
          loading={loading}
          onRefresh={refresh}
          auctionCount={filteredAuctions.length}
        />
        <AuctionDetail auction={selectedAuction} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        lastUpdated={lastUpdated}
        loading={loading}
        onRefresh={refresh}
        auctionCount={filteredAuctions.length}
      />

      {error && <div className="error-banner">{error}</div>}

      <Filters
        filters={filters}
        onChange={setFilters}
        options={filterOptions}
      />

      <main className="auction-list">
        {loading && !allAuctions?.length ? (
          <div className="loading">Pobieranie danych...</div>
        ) : filteredAuctions.length === 0 ? (
          <div className="empty">
            Brak ogłoszeń spełniających kryteria filtrowania.
          </div>
        ) : (
          filteredAuctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              onClick={() => setSelectedId(auction.id)}
            />
          ))
        )}
      </main>
    </div>
  );
}
