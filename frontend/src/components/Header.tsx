interface HeaderProps {
  lastUpdated: string | null;
  auctionCount: number;
  favoriteCount: number;
  activeTab: "all" | "favorites";
  onTabChange: (tab: "all" | "favorites") => void;
}

export function Header({
  lastUpdated,
  auctionCount,
  favoriteCount,
  activeTab,
  onTabChange,
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
    <header className="mb-6 border-b border-gray-200 pt-5 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[200px] flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Licytacje Publiczne</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Obwieszczenia o licytacjach skarbowych z 16 Izb Administracji Skarbowej
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex flex-col items-end gap-0.5 text-xs text-gray-500">
            {formattedDate && <span>Dane z: {formattedDate}</span>}
            <span className="font-semibold text-gray-900">{auctionCount} ogłoszeń na liście</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="mt-5 flex gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => onTabChange("all")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            activeTab === "all"
              ? "bg-blue-50 text-blue-700 shadow-xs"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
          Wszystkie ogłoszenia
        </button>

        <button
          type="button"
          onClick={() => onTabChange("favorites")}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
            activeTab === "favorites"
              ? "bg-amber-50 text-amber-700 shadow-xs"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          <svg
            className={`size-4 ${activeTab === "favorites" ? "fill-amber-400 text-amber-500" : "text-gray-400"}`}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            fill="none"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
          Ulubione
          {favoriteCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === "favorites"
                  ? "bg-amber-200 text-amber-900"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {favoriteCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
