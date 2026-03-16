import type { AuctionType } from "../../../shared/types";

export interface FilterState {
  hideExpired: boolean;
  hideArchived: boolean;
  ias: string | null;
  voivodeship: string | null;
  auctionType: AuctionType | null;
  search: string;
}

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  options: {
    cities: string[];
    voivodeships: string[];
    types: string[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  licytacja_ruchomosci: "Licytacja ruchomosci",
  licytacja_nieruchomosci: "Licytacja nieruchomosci",
  sprzedaz_z_wolnej_reki: "Sprzedaz z wolnej reki",
  opis_i_oszacowanie: "Opis i oszacowanie",
  odwolanie: "Odwolanie licytacji",
  inne: "Inne",
};

const selectClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

export function Filters({ filters, onChange, options }: FiltersProps) {
  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[160px] flex-1">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            placeholder="Szukaj w ogloszeniach..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <select
            className={selectClass}
            value={filters.ias ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                ias: e.target.value || null,
              })
            }
          >
            <option value="">Wszystkie miasta</option>
            {options.cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px] flex-1">
          <select
            className={selectClass}
            value={filters.voivodeship ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                voivodeship: e.target.value || null,
              })
            }
          >
            <option value="">Wszystkie wojewodztwa</option>
            {options.voivodeships.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px] flex-1">
          <select
            className={selectClass}
            value={filters.auctionType ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                auctionType: (e.target.value as AuctionType) || null,
              })
            }
          >
            <option value="">Wszystkie typy</option>
            {options.types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-500 select-none">
          <input
            type="checkbox"
            className="size-4 accent-blue-600"
            checked={filters.hideExpired}
            onChange={(e) => onChange({ ...filters, hideExpired: e.target.checked })}
          />
          Ukryj przeterminowane
        </label>

        <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-gray-500 select-none">
          <input
            type="checkbox"
            className="size-4 accent-blue-600"
            checked={filters.hideArchived}
            onChange={(e) => onChange({ ...filters, hideArchived: e.target.checked })}
          />
          Ukryj archiwalne
        </label>
      </div>
    </div>
  );
}
