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

const TYPE_COLORS: Record<string, string> = {
  licytacja_ruchomosci: "badge-blue",
  licytacja_nieruchomosci: "badge-green",
  sprzedaz_z_wolnej_reki: "badge-orange",
  opis_i_oszacowanie: "badge-purple",
  odwolanie: "badge-red",
  inne: "badge-gray",
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

  return (
    <article
      className={`auction-card ${isExpired ? "auction-card--expired" : ""} ${isArchived ? "auction-card--archived" : ""}`}
      onClick={onClick}
    >
      <div className="auction-card-header">
        <div className="auction-card-badges">
          {auction.auctionNumber && (
            <span className="badge badge-number">
              {toRoman(auction.auctionNumber)} licytacja
            </span>
          )}
          <span
            className={`badge ${TYPE_COLORS[auction.auctionType] || "badge-gray"}`}
          >
            {TYPE_LABELS[auction.auctionType] || auction.auctionType}
          </span>
          {isArchived && <span className="badge badge-archived">Archiwalna</span>}
          {isExpired && !isArchived && <span className="badge badge-expired">Zakonczona</span>}
        </div>
        <span className="auction-card-date">{formattedDate}</span>
      </div>

      <h3 className="auction-card-title">{auction.title}</h3>

      <div className="auction-card-meta">
        <span className="auction-card-ias">{auction.ias}</span>
        <span className="auction-card-source">{auction.source}</span>
      </div>

      {firstItem && (
        <div className="auction-card-item">
          <span className="auction-card-item-name">{firstItem.name}</span>
          {firstItem.startingPrice && (
            <span className="auction-card-price">
              Cena wyw.: {firstItem.startingPrice}
            </span>
          )}
          {firstItem.estimatedValue && (
            <span className="auction-card-estimated">
              Wart. szac.: {firstItem.estimatedValue}
            </span>
          )}
        </div>
      )}

      {auction.items.length > 1 && (
        <div className="auction-card-more">
          + {auction.items.length - 1} wiecej pozycji
        </div>
      )}
    </article>
  );
}
