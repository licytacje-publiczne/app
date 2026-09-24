import { useState, useEffect, useCallback, useRef } from "react";

interface RouterState {
  /** ID aukcji z URL /ogloszenie/{id}, lub null gdy strona glowna */
  auctionId: string | null;
  /** Aktualne parametry wyszukiwania URL (np. "?q=bmw&tab=ulubione") */
  search: string;
}

function parseLocation(): RouterState {
  const path = window.location.pathname;
  const match = path.match(/^\/ogloszenie\/([a-f0-9]+)$/);
  return {
    auctionId: match?.[1] ?? null,
    search: window.location.search,
  };
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(parseLocation);
  const lastListSearchRef = useRef<string>(window.location.search);

  useEffect(() => {
    // Update lastListSearchRef whenever we are on the listing page
    if (!state.auctionId) {
      lastListSearchRef.current = state.search;
    }
  }, [state.auctionId, state.search]);

  useEffect(() => {
    const onPopState = () => setState(parseLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((url: string) => {
    window.history.pushState(null, "", url);
    setState(parseLocation());
  }, []);

  const updateSearch = useCallback((newSearch: string) => {
    const base = window.location.pathname;
    const cleanSearch = newSearch.startsWith("?") || !newSearch ? newSearch : `?${newSearch}`;
    const newUrl = `${base}${cleanSearch}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (newUrl !== currentUrl) {
      window.history.replaceState(null, "", newUrl);
      setState(parseLocation());
    }
  }, []);

  const openAuction = useCallback(
    (id: string) => {
      // Remember current search params for when returning
      lastListSearchRef.current = window.location.search;
      navigate(`/ogloszenie/${id}`);
    },
    [navigate],
  );

  const goHome = useCallback(() => {
    const returnSearch = lastListSearchRef.current || "";
    navigate(`/${returnSearch}`);
  }, [navigate]);

  return {
    auctionId: state.auctionId,
    search: state.search,
    navigate,
    updateSearch,
    openAuction,
    goHome,
  };
}
