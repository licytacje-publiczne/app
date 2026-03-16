interface HeaderProps {
  lastUpdated: string | null;
  loading: boolean;
  onRefresh: () => void;
  auctionCount: number;
}

export function Header({
  lastUpdated,
  loading,
  onRefresh,
  auctionCount,
}: HeaderProps) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Licytacje Publiczne</h1>
        <p className="header-subtitle">
          Obwieszczenia o licytacjach skarbowych z 16 Izb Administracji
          Skarbowej
        </p>
      </div>
      <div className="header-right">
        <div className="header-meta">
          {formattedDate && (
            <span className="header-updated">
              Dane z: {formattedDate}
            </span>
          )}
          <span className="header-count">{auctionCount} ogloszen</span>
        </div>
        <button
          className="btn btn-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Pobieranie..." : "Odswiez dane"}
        </button>
      </div>
    </header>
  );
}
