import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { useAuctionData } from "./hooks/useAuctionData";
import { useRouter } from "./hooks/useRouter";
import { useFavorites } from "./hooks/useFavorites";
import { AuctionCard } from "./components/AuctionCard";
import { AuctionDetail } from "./components/AuctionDetail";
import { Filters, type FilterState } from "./components/Filters";
import { Header } from "./components/Header";
import type { AuctionType } from "../../shared/types";

const PAGE_SIZE = 30;

function parseUrlParams(searchStr: string): {
  tab: "all" | "favorites";
  filters: FilterState;
} {
  const params = new URLSearchParams(searchStr);
  const tab = params.get("tab") === "favorites" ? "favorites" : "all";

  return {
    tab,
    filters: {
      search: params.get("q") ?? "",
      ias: params.get("ias") || null,
      voivodeship: params.get("woj") || null,
      auctionType: (params.get("typ") as AuctionType) || null,
      hideExpired: params.get("expired") !== "0", // default true
      hideArchived: params.get("archived") !== "0", // default true
    },
  };
}

function buildQueryString(tab: "all" | "favorites", filters: FilterState, debouncedSearch: string): string {
  const params = new URLSearchParams();

  if (tab === "favorites") {
    params.set("tab", "favorites");
  }

  const query = debouncedSearch.trim();
  if (query) {
    params.set("q", query);
  }

  if (filters.ias) {
    params.set("ias", filters.ias);
  }

  if (filters.voivodeship) {
    params.set("woj", filters.voivodeship);
  }

  if (filters.auctionType) {
    params.set("typ", filters.auctionType);
  }

  if (!filters.hideExpired) {
    params.set("expired", "0");
  }

  if (!filters.hideArchived) {
    params.set("archived", "0");
  }

  const str = params.toString();
  return str ? `?${str}` : "";
}

export function App() {
  const { loading, error, lastUpdated } = useAuctionData();
  const { auctionId, search, updateSearch, openAuction, goHome } = useRouter();
  const { favorites, isFavorite, toggleFavorite, favoriteCount } = useFavorites();

  // Initialize filters and tab from current URL
  const initialUrlState = useMemo(() => parseUrlParams(search), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeTab, setActiveTab] = useState<"all" | "favorites">(initialUrlState.tab);
  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters);

  // Pagination / slice limit for DOM performance
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

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

  // Reset visible count when filters or tab change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, filters.ias, filters.voivodeship, filters.auctionType, filters.hideExpired, filters.hideArchived, activeTab]);

  // Sync state to URL search params
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!auctionId) {
      const newQuery = buildQueryString(activeTab, filters, debouncedSearch);
      updateSearch(newQuery);
    }
  }, [activeTab, filters, debouncedSearch, auctionId, updateSearch]);

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setFilters({
      search: "",
      ias: null,
      voivodeship: null,
      auctionType: null,
      hideExpired: true,
      hideArchived: true,
    });
    setDebouncedSearch("");
  }, []);

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.ias ||
    filters.voivodeship ||
    filters.auctionType ||
    !filters.hideExpired ||
    !filters.hideArchived
  );

  const filteredAuctions = useMemo(() => {
    if (!allAuctions) return [];

    const now = new Date().toISOString();
    const query = debouncedSearch.toLowerCase().trim();

    return allAuctions
      .filter((a) => {
        // Tab filter
        if (activeTab === "favorites" && !favorites.has(a.id)) {
          return false;
        }

        if (filters.hideExpired && a.auctionDate && a.auctionDate < now) {
          return false;
        }
        if (filters.hideArchived && a.archived) {
          return false;
        }
        if (filters.ias && a.ias !== filters.ias) return false;
        if (filters.voivodeship && a.voivodeship !== filters.voivodeship) return false;
        if (filters.auctionType && a.auctionType !== filters.auctionType) return false;

        if (query) {
          // Optimized hierarchical search: check fast fields first
          if (a.title.toLowerCase().includes(query)) return true;
          if (a.ias.toLowerCase().includes(query)) return true;
          if (a.source.toLowerCase().includes(query)) return true;
          if (a.location && a.location.toLowerCase().includes(query)) return true;
          if (a.items.some((item) => item.name.toLowerCase().includes(query))) return true;

          // Search in raw content as fallback
          if (a.rawContent && a.rawContent.toLowerCase().includes(query)) return true;

          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.auctionDate && !b.auctionDate) return 0;
        if (!a.auctionDate) return 1;
        if (!b.auctionDate) return -1;
        return a.auctionDate.localeCompare(b.auctionDate);
      });
  }, [
    allAuctions,
    activeTab,
    favorites,
    filters.hideExpired,
    filters.hideArchived,
    filters.ias,
    filters.voivodeship,
    filters.auctionType,
    debouncedSearch,
  ]);

  const selectedAuction = useMemo(
    () => (auctionId ? (allAuctions?.find((a) => a.id === auctionId) ?? null) : null),
    [allAuctions, auctionId],
  );

  // Unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    if (!allAuctions) return { cities: [], voivodeships: [], types: [] };

    const cities = [...new Set(allAuctions.map((a) => a.ias))].sort();
    const voivodeships = [...new Set(allAuctions.map((a) => a.voivodeship))].sort();
    const types = [...new Set(allAuctions.map((a) => a.auctionType))].sort();

    return { cities, voivodeships, types };
  }, [allAuctions]);

  const visibleAuctions = useMemo(
    () => filteredAuctions.slice(0, visibleCount),
    [filteredAuctions, visibleCount],
  );

  const hasMore = visibleCount < filteredAuctions.length;
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  if (auctionId) {
    return (
      <div className="mx-auto min-h-screen max-w-5xl px-4 pb-10">
        <Header
          lastUpdated={lastUpdated}
          auctionCount={filteredAuctions.length}
          favoriteCount={favoriteCount}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            goHome();
          }}
        />
        {loading && !allAuctions?.length ? (
          <div className="py-16 text-center text-gray-400">Pobieranie danych...</div>
        ) : selectedAuction ? (
          <AuctionDetail
            auction={selectedAuction}
            isFavorite={isFavorite(selectedAuction.id)}
            onToggleFavorite={toggleFavorite}
            onBack={goHome}
          />
        ) : (
          <div className="py-16 text-center text-gray-400">
            Nie znaleziono ogłoszenia o podanym ID.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-10">
      <Header
        lastUpdated={lastUpdated}
        auctionCount={filteredAuctions.length}
        favoriteCount={favoriteCount}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Filters
        filters={filters}
        onChange={setFilters}
        options={filterOptions}
        onReset={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <main className="grid gap-3">
        {loading && !allAuctions?.length ? (
          <div className="py-16 text-center text-gray-400">Pobieranie danych...</div>
        ) : activeTab === "favorites" && favoriteCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <svg
              className="mx-auto size-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
              />
            </svg>
            <h3 className="mt-3 text-base font-medium text-gray-900">Brak ulubionych ogłoszeń</h3>
            <p className="mt-1 text-sm text-gray-500">
              Kliknij ikonę gwiazdki przy dowolnym ogłoszeniu, aby zapisać je na liście ulubionych.
            </p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-gray-500">
            Brak ogłoszeń spełniających wybrane kryteria filtrowania.
          </div>
        ) : (
          <>
            {visibleAuctions.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isFavorite={isFavorite(auction.id)}
                onToggleFavorite={toggleFavorite}
                onClick={() => openAuction(auction.id)}
              />
            ))}

            {hasMore && (
              <div className="mt-4 flex flex-col items-center gap-2 py-3">
                <button
                  type="button"
                  onClick={loadMore}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 hover:border-gray-400"
                >
                  Załaduj więcej ({filteredAuctions.length - visibleCount} pozostało)
                </button>
                <span className="text-xs text-gray-400">
                  Wyświetlono {visibleCount} z {filteredAuctions.length} ogłoszeń
                </span>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
