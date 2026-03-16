interface HeaderProps {
  lastUpdated: string | null;
  loading: boolean;
  onRefresh: () => void;
  auctionCount: number;
}

export function Header({ lastUpdated, loading, onRefresh, auctionCount }: HeaderProps) {
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
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 py-5 mb-5">
      <div className="min-w-[200px] flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Licytacje Publiczne</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Obwieszczenia o licytacjach skarbowych z 16 Izb Administracji Skarbowej
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="flex flex-col items-end gap-0.5 text-xs text-gray-500">
          {formattedDate && <span>Dane z: {formattedDate}</span>}
          <span className="font-semibold text-gray-900">{auctionCount} ogloszen</span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Pobieranie..." : "Odswiez dane"}
        </button>
      </div>
    </header>
  );
}
