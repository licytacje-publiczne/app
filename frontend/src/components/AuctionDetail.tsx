import type { AuctionRecord } from "../db";
import { toRoman, formatBankAccount } from "../../../shared/types";

interface AuctionDetailProps {
  auction: AuctionRecord;
  onBack: () => void;
}

export function AuctionDetail({ auction, onBack }: AuctionDetailProps) {
  const now = new Date().toISOString();
  const isExpired = auction.auctionDate ? auction.auctionDate < now : false;
  const isArchived = auction.archived === true;

  const formattedDate = auction.auctionDate
    ? new Date(auction.auctionDate).toLocaleString("pl-PL", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Brak daty";

  const formattedLastSeen = auction.lastSeenAt
    ? new Date(auction.lastSeenAt).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="detail">
      <button className="btn btn-back" onClick={onBack}>
        Powrot do listy
      </button>

      <div
        className={`detail-card ${isExpired ? "detail-card--expired" : ""} ${isArchived ? "detail-card--archived" : ""}`}
      >
        {isArchived && (
          <div className="detail-archived-banner">
            To ogloszenie nie jest juz dostepne na stronie zrodlowej.
            {formattedLastSeen && ` Ostatnio widziane: ${formattedLastSeen}.`}
          </div>
        )}

        <div className="detail-header">
          <div className="detail-badges">
            {auction.auctionNumber && (
              <span className="badge badge-number badge-lg">
                {toRoman(auction.auctionNumber)} licytacja
              </span>
            )}
            {isArchived && <span className="badge badge-archived badge-lg">Archiwalna</span>}
            {isExpired && !isArchived && (
              <span className="badge badge-expired badge-lg">Zakonczona</span>
            )}
          </div>
          <h2 className="detail-title">{auction.title}</h2>
        </div>

        <div className="detail-meta">
          <div className="detail-meta-item">
            <span className="detail-label">Data licytacji</span>
            <span className="detail-value">{formattedDate}</span>
          </div>

          {auction.location && (
            <div className="detail-meta-item">
              <span className="detail-label">Miejsce</span>
              <span className="detail-value">{auction.location}</span>
            </div>
          )}

          <div className="detail-meta-item">
            <span className="detail-label">Izba Administracji Skarbowej</span>
            <span className="detail-value">
              {auction.ias} ({auction.voivodeship})
            </span>
          </div>

          <div className="detail-meta-item">
            <span className="detail-label">Zrodlo</span>
            <span className="detail-value">{auction.source}</span>
          </div>

          {auction.bankAccount && (
            <div className="detail-meta-item">
              <span className="detail-label">Konto do wplaty wadium</span>
              <span className="detail-value detail-value--mono">
                {formatBankAccount(auction.bankAccount)}
              </span>
            </div>
          )}
        </div>

        {auction.items.length > 0 && (
          <div className="detail-section">
            <h3>Sprzedawane ruchomosci / nieruchomosci</h3>
            <div className="detail-items-table-wrapper">
              <table className="detail-items-table">
                <thead>
                  <tr>
                    <th>Lp.</th>
                    <th>Okreslenie</th>
                    <th>Wartosc szacunkowa</th>
                    <th>Cena wywolania</th>
                    <th>Wadium</th>
                    <th>Uwagi</th>
                  </tr>
                </thead>
                <tbody>
                  {auction.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.estimatedValue ?? "-"}</td>
                      <td className="price-cell">{item.startingPrice ?? "-"}</td>
                      <td>{item.deposit ?? "-"}</td>
                      <td>{item.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {auction.documentUrls.length > 0 && (
          <div className="detail-section">
            <h3>Dokumenty</h3>
            <ul className="detail-docs">
              {auction.documentUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-doc-link"
                  >
                    {decodeURIComponent(url.split("/").pop() || url)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {auction.imageUrls.length > 0 && (
          <div className="detail-section">
            <h3>Zdjecia</h3>
            <ul className="detail-docs">
              {auction.imageUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="detail-doc-link"
                  >
                    {decodeURIComponent(url.split("/").pop() || `Zdjecia ${idx + 1}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="detail-footer">
          <a
            href={auction.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Zobacz oryginalne ogloszenie
          </a>
        </div>
      </div>
    </div>
  );
}
