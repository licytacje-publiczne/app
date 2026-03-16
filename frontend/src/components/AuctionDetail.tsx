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
    <div className="pt-2">
      <a
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 no-underline shadow-sm transition hover:bg-gray-50 hover:border-gray-300"
        onClick={(e) => {
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onBack();
          }
        }}
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Powrot do listy
      </a>

      <div
        className={`overflow-hidden rounded-xl border bg-white shadow-md ${
          isArchived
            ? "border-gray-300 opacity-75"
            : isExpired
              ? "border-red-200"
              : "border-gray-200"
        }`}
      >
        {isArchived && (
          <div className="border-b border-gray-300 bg-gray-100 px-6 py-3 text-sm font-medium text-gray-500">
            To ogloszenie nie jest juz dostepne na stronie zrodlowej.
            {formattedLastSeen && ` Ostatnio widziane: ${formattedLastSeen}.`}
          </div>
        )}

        {/* Header */}
        <div className="border-b border-gray-200 px-6 pt-6 pb-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {auction.auctionNumber && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold tracking-wide text-blue-800 uppercase">
                {toRoman(auction.auctionNumber)} licytacja
              </span>
            )}
            {isArchived && (
              <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                Archiwalna
              </span>
            )}
            {isExpired && !isArchived && (
              <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold tracking-wide text-red-600 uppercase">
                Zakonczona
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold leading-snug text-gray-900">{auction.title}</h2>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-1 gap-4 border-b border-gray-200 bg-gray-50/60 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label="Data licytacji" value={formattedDate} />
          {auction.location && <MetaItem label="Miejsce" value={auction.location} />}
          <MetaItem
            label="Izba Administracji Skarbowej"
            value={`${auction.ias} (${auction.voivodeship})`}
          />
          <MetaItem label="Zrodlo" value={auction.source} />
          {auction.bankAccount && (
            <MetaItem
              label="Konto do wplaty wadium"
              value={formatBankAccount(auction.bankAccount)}
              mono
            />
          )}
        </div>

        {/* Items table */}
        {auction.items.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Sprzedawane ruchomosci / nieruchomosci
            </h3>
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Lp.
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Okreslenie
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Wartosc szacunkowa
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Cena wywolania
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Wadium
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Uwagi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auction.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50"
                    >
                      <td className="px-3 py-2.5 align-top text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 align-top text-gray-900">{item.name}</td>
                      <td className="px-3 py-2.5 align-top text-gray-700">
                        {item.estimatedValue ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top font-semibold text-emerald-600">
                        {item.startingPrice ?? "-"}
                      </td>
                      <td className="px-3 py-2.5 align-top text-gray-700">{item.deposit ?? "-"}</td>
                      <td className="px-3 py-2.5 align-top text-gray-500">{item.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Documents */}
        {auction.documentUrls.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Dokumenty</h3>
            <ul className="flex flex-col gap-1.5">
              {auction.documentUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 break-all hover:underline"
                  >
                    {decodeURIComponent(url.split("/").pop() || url)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Photos */}
        {auction.imageUrls.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Zdjecia</h3>
            <ul className="flex flex-col gap-1.5">
              {auction.imageUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 break-all hover:underline"
                  >
                    {decodeURIComponent(url.split("/").pop() || `Zdjecia ${idx + 1}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-center px-6 py-5">
          <a
            href={auction.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white no-underline shadow-sm transition hover:bg-blue-700"
          >
            Zobacz oryginalne ogloszenie
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
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.7rem] font-semibold tracking-wider text-gray-400 uppercase">
        {label}
      </span>
      <span
        className={`text-sm text-gray-900 ${mono ? "font-mono text-[0.82rem] tracking-wide" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
