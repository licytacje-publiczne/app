import { useState, useEffect, useCallback } from "react";

interface RouterState {
  /** ID aukcji z URL /ogloszenie/{id}, lub null gdy strona glowna */
  auctionId: string | null;
}

function parseLocation(): RouterState {
  const path = window.location.pathname;
  const match = path.match(/^\/ogloszenie\/([a-f0-9]+)$/);
  return { auctionId: match ? match[1]! : null };
}

export function useRouter() {
  const [state, setState] = useState<RouterState>(parseLocation);

  useEffect(() => {
    const onPopState = () => setState(parseLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setState(parseLocation());
  }, []);

  const openAuction = useCallback((id: string) => navigate(`/ogloszenie/${id}`), [navigate]);

  const goHome = useCallback(() => navigate("/"), [navigate]);

  return {
    auctionId: state.auctionId,
    navigate,
    openAuction,
    goHome,
  };
}
