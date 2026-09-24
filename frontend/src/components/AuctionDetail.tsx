import type { AuctionRecord } from "../db";
import { toRoman, formatBankAccount } from "../../../shared/types";

interface AuctionDetailProps {
  auction: AuctionRecord;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

export function AuctionDetail({
  auction,
  isFavorite,
  onToggleFavorite,
  onBack,
}: AuctionDetailProps) {
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 no-underline shadow-xs transition hover:bg-gray-50 hover:border-gray-300"
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
          Powrót do listy
        </a>

        <button
          type="button"
          onClick={() => onToggleFavorite(auction.id)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition shadow-xs ${
            isFavorite
              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          }`}
        >
          <svg
            className={`size-4.5 ${isFavorite ? "fill-amber-400 text-amber-500" : "text-gray-400"}`}
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
          {isFavorite ? "W ulubionych" : "Dodaj do ulubionych"}
        </button>
      </div>

      <div
        className={`overflow-hidden rounded-xl border bg-white shadow-md ${
          isArchived
            ? "border-gray-300 opacity-85"
            : isExpired
              ? "border-red-200"
              : "border-gray-200"
        }`}
      >
        {isArchived && (
          <div className="border-b border-gray-300 bg-gray-100 px-6 py-3 text-sm font-medium text-gray-600">
            To ogłoszenie nie jest już dostępne na stronie źródłowej urzędu (zostało zarchiwizowane).
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
                Zakończona
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
          <MetaItem label="Źródło" value={auction.source} />
          {auction.bankAccount && (
            <MetaItem
              label="Konto do wpłaty wadium"
              value={formatBankAccount(auction.bankAccount)}
              mono
            />
          )}
        </div>

        {/* Items table */}
        {auction.items.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">
              Sprzedawane ruchomości / nieruchomości
            </h3>
            <div className="-mx-6 overflow-x-auto px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Lp.
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Określenie
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Wartość szacunkowa
                    </th>
                    <th className="whitespace-nowrap bg-gray-50 px-3 py-2 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
                      Cena wywołania
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
            <h3 className="mb-2 text-sm font-semibold text-gray-900">Dokumenty</h3>
            {(isArchived || isExpired) && (
              <p className="mb-3 text-xs text-amber-700 bg-amber-50 rounded-md p-2.5 border border-amber-200">
                Informacja: W przypadku ogłoszeń archiwalnych lub zakończonych, pliki na serwerach KAS mogą być już wycofane z publicznego dostępu (wymagając logowania do systemu urzędu).
              </p>
            )}
            <ul className="flex flex-col gap-1.5">
              {auction.documentUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 break-all hover:underline inline-flex items-center gap-1.5"
                  >
                    <svg className="size-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
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
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Zdjęcia</h3>
            <ul className="flex flex-col gap-1.5">
              {auction.imageUrls.map((url, idx) => (
                <li key={idx}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 break-all hover:underline inline-flex items-center gap-1.5"
                  >
                    <svg className="size-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    {decodeURIComponent(url.split("/").pop() || `Zdjęcia ${idx + 1}`)}
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
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white no-underline shadow-xs transition hover:bg-blue-700"
          >
            Zobacz oryginalne ogłoszenie w serwisie urzędu
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
