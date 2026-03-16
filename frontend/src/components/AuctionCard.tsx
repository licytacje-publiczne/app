import type { AuctionRecord } from "../db";
import { toRoman } from "../../../shared/types";

interface AuctionCardProps {
  auction: AuctionRecord;
  onClick: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  licytacja_ruchomosci: "Ruchomosci",
  licytacja_nieruchomosci: "Nieruchomosci",
  sprzedaz_z_wolnej_reki: "Wolna reka",
  opis_i_oszacowanie: "Opis i oszac.",
  odwolanie: "Odwolanie",
  inne: "Inne",
};

const TYPE_BADGE: Record<string, string> = {
  licytacja_ruchomosci: "bg-blue-100 text-blue-800",
  licytacja_nieruchomosci: "bg-emerald-100 text-emerald-800",
  sprzedaz_z_wolnej_reki: "bg-amber-100 text-amber-800",
  opis_i_oszacowanie: "bg-purple-100 text-purple-800",
  odwolanie: "bg-red-100 text-red-800",
  inne: "bg-gray-100 text-gray-600",
};

export function AuctionCard({ auction, onClick }: AuctionCardProps) {
  const now = new Date().toISOString();
  const isExpired = auction.auctionDate ? auction.auctionDate < now : false;
  const isArchived = auction.archived === true;

  const formattedDate = auction.auctionDate
    ? new Date(auction.auctionDate).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Brak daty";

  const firstItem = auction.items[0];

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.button === 1) return;
    e.preventDefault();
    onClick();
  };

  return (
    <a
      href={`/ogloszenie/${auction.id}`}
      className={`block overflow-hidden no-underline rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 ${
        isArchived
          ? "opacity-45 border-l-[3px] border-l-gray-400 bg-gray-50"
          : isExpired
            ? "opacity-55 bg-gray-50/50"
            : ""
      }`}
      onClick={handleClick}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {auction.auctionNumber && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-blue-800 uppercase">
              {toRoman(auction.auctionNumber)} licytacja
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide uppercase ${TYPE_BADGE[auction.auctionType] || "bg-gray-100 text-gray-600"}`}
          >
            {TYPE_LABELS[auction.auctionType] || auction.auctionType}
          </span>
          {isArchived && (
            <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-gray-500 uppercase">
              Archiwalna
            </span>
          )}
          {isExpired && !isArchived && (
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-red-600 uppercase">
              Zakonczona
            </span>
          )}
        </div>
        <span className="whitespace-nowrap text-xs text-gray-400">{formattedDate}</span>
      </div>

      <h3 className="mb-2 text-[0.95rem] font-semibold leading-snug text-gray-900">
        {auction.title}
      </h3>

      <div className="mb-2 flex gap-3 text-xs text-gray-500">
        <span className="font-semibold text-blue-600">{auction.ias}</span>
        <span>{auction.source}</span>
      </div>

      {firstItem && (
        <div className="flex items-baseline gap-4 border-t border-gray-100 pt-2 text-[0.82rem] text-gray-500">
          <span className="min-w-0 flex-1 truncate">{firstItem.name}</span>
          {firstItem.startingPrice && (
            <span className="shrink-0 font-semibold text-emerald-600">
              Cena wyw.: {firstItem.startingPrice}
            </span>
          )}
          {firstItem.estimatedValue && (
            <span className="shrink-0 whitespace-nowrap">
              Wart. szac.: {firstItem.estimatedValue}
            </span>
          )}
        </div>
      )}

      {auction.items.length > 1 && (
        <div className="mt-1.5 text-xs font-medium text-blue-600">
          + {auction.items.length - 1} wiecej pozycji
        </div>
      )}
    </a>
  );
}
