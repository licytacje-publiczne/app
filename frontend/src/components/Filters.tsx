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

export function Filters({ filters, onChange, options }: FiltersProps) {
  return (
    <div className="filters">
      <div className="filters-row">
        <div className="filter-group">
          <input
            type="text"
            className="filter-search"
            placeholder="Szukaj w ogloszeniach..."
            value={filters.search}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value })
            }
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
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

        <div className="filter-group">
          <select
            className="filter-select"
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

        <div className="filter-group">
          <select
            className="filter-select"
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

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.hideExpired}
              onChange={(e) =>
                onChange({ ...filters, hideExpired: e.target.checked })
              }
            />
            Ukryj przeterminowane
          </label>
        </div>

        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.hideArchived}
              onChange={(e) =>
                onChange({ ...filters, hideArchived: e.target.checked })
              }
            />
            Ukryj archiwalne
          </label>
        </div>
      </div>
    </div>
  );
}
