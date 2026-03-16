# Licytacje Publiczne

Agregator obwieszczeń o licytacjach publicznych z wszystkich 16 Izb Administracji Skarbowej w Polsce. Scraper codziennie pobiera ogłoszenia ze stron IAS, parsuje szczegóły (w tym załączniki PDF) i zapisuje dane do pliku JSON. Frontend (React SPA) prezentuje je z filtrami i wyszukiwaniem.

## Architektura

```
GitHub Actions (cron/manual)
       │
       ▼
   Scraper (TypeScript + cheerio + pdf-parse)
       │
       ▼
   data/auctions.json  ◄──  commitowane do repozytorium
       │
       ▼
   Frontend (React + Vite + Dexie.js)  →  GitHub Pages
```

- **Scraper** działa jako GitHub Action (codziennie o 6:00 UTC + wyzwalacz ręczny). Scrapuje strony listingowe i szczegółowe wszystkich 16 IAS, pobiera i parsuje PDF-y z platformy BIP. Wynik zapisuje do `data/auctions.json`.
- **Frontend** to statyczna SPA hostowana na GitHub Pages. Pobiera `auctions.json`, przechowuje dane w IndexedDB (Dexie.js) do obsługi offline i cachowania. Oferuje filtrowanie po mieście, województwie, typie licytacji, wyszukiwanie pełnotekstowe oraz ukrywanie zakończonych licytacji.

## Obsługiwane platformy

Strony IAS działają na dwóch różnych platformach:

| Platforma | Liczba IAS | Domena | Uwagi |
|-----------|-----------|--------|-------|
| **gov.pl** | 6 | `www.gov.pl/web/ias-{miasto}/...` | Treść w HTML, tabele z pozycjami |
| **BIP (Liferay)** | 10 | `www.{województwo}.kas.gov.pl/...` | Treść głównie w załącznikach PDF |

### Gov.pl (6 IAS)
Białystok, Katowice, Kielce, Łódź, Rzeszów, Wrocław

### BIP (10 IAS)
Bydgoszcz, Gdańsk, Kraków, Lublin, Olsztyn, Opole, Poznań, Szczecin, Warszawa, Zielona Góra

## Struktura projektu

```
licytacje-publiczne/
├── package.json                     # Root workspace (npm workspaces)
├── shared/
│   ├── types.ts                     # Typy TypeScript + funkcje pomocnicze
│   └── tsconfig.json
├── scraper/
│   ├── src/
│   │   ├── index.ts                 # Entry point scrapera
│   │   ├── config.ts                # Konfiguracja 16 IAS + parametry scrapowania
│   │   ├── utils.ts                 # HTTP, parsowanie dat, ekstrakcja kont bankowych
│   │   ├── platforms/
│   │   │   ├── govpl.ts             # Scraper listingów gov.pl
│   │   │   └── bip.ts              # Scraper listingów BIP
│   │   └── parsers/
│   │       ├── govpl-detail.ts      # Parser stron szczegółowych gov.pl
│   │       ├── bip-detail.ts        # Parser stron szczegółowych BIP
│   │       └── pdf-parser.ts        # Ekstrakcja danych z PDF
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx                 # Entry point React
│   │   ├── App.tsx                  # Główny komponent z filtrami
│   │   ├── db.ts                    # Dexie.js (IndexedDB)
│   │   ├── styles.css               # CSS z responsive design
│   │   ├── hooks/
│   │   │   └── useAuctionData.ts    # Hook: fetch + cache w IndexedDB
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── Filters.tsx
│   │       ├── AuctionCard.tsx
│   │       └── AuctionDetail.tsx
│   ├── vite.config.ts               # base: /licytacje-publiczne/
│   └── tsconfig.json
├── data/
│   └── auctions.json                # Dane wygenerowane przez scraper
└── .github/workflows/
    ├── scrape.yml                   # Cron: codzienne scrapowanie
    └── deploy.yml                   # Deploy frontendu na GitHub Pages
```

## Wymagania

- Node.js >= 22
- npm >= 10

## Instalacja

```bash
npm install
```

Instaluje zależności wszystkich workspace'ów (`shared`, `scraper`, `frontend`).

## Uruchomienie scrapera

```bash
# Wszystkie 16 IAS
cd scraper && npm run scrape

# Tylko platforma gov.pl (6 IAS)
cd scraper && npm run scrape:govpl

# Tylko platforma BIP (10 IAS)
cd scraper && npm run scrape:bip

# Pojedynczy urząd (do testowania)
cd scraper && npx tsx src/index.ts --ias katowice
cd scraper && npx tsx src/index.ts --ias krakow

# Kombinacja filtrów
cd scraper && npx tsx src/index.ts --platform govpl --ias kielce
```

Wynik zapisywany jest do `data/auctions.json`.

## Uruchomienie frontendu

```bash
# Development (z hot reload)
cd frontend && npm run dev

# Build produkcyjny
cd frontend && npm run build

# Podgląd buildu
cd frontend && npm run preview
```

## Sprawdzanie typów

```bash
# Scraper
cd scraper && npx tsc --noEmit

# Frontend
cd frontend && npx tsc --noEmit
```

## Model danych

Każda aukcja (`Auction`) zawiera:

| Pole | Typ | Opis |
|------|-----|------|
| `id` | `string` | SHA-256 hash URL-a (16 znaków) |
| `sourceUrl` | `string` | Oryginalny URL ogłoszenia |
| `ias` | `string` | Nazwa miasta IAS |
| `voivodeship` | `string` | Województwo |
| `platform` | `"bip" \| "govpl"` | Platforma źródłowa |
| `title` | `string` | Tytuł (bez prefiksu numeru licytacji) |
| `auctionNumber` | `number \| null` | Numer licytacji (I=1, II=2, III=3) |
| `auctionType` | `AuctionType` | Klasyfikacja typu |
| `auctionDate` | `string \| null` | Data/czas w formacie ISO |
| `location` | `string \| null` | Miejsce licytacji |
| `bankAccount` | `string \| null` | 26-cyfrowy numer konta do wpłaty wadium |
| `items` | `AuctionItem[]` | Pozycje do sprzedaży |
| `documentUrls` | `string[]` | URL-e dokumentów (PDF, DOCX) |
| `imageUrls` | `string[]` | URL-e zdjęć |
| `rawContent` | `string` | Pełna treść do wyszukiwania (max 10 000 znaków) |

Typy aukcji (`AuctionType`):
- `licytacja_ruchomosci` -- licytacja ruchomości (samochody, sprzęt, itp.)
- `licytacja_nieruchomosci` -- licytacja nieruchomości
- `sprzedaz_z_wolnej_reki` -- sprzedaż z wolnej ręki
- `opis_i_oszacowanie` -- opis i oszacowanie wartości
- `odwolanie` -- odwołanie licytacji
- `inne` -- pozostałe

## GitHub Actions

### Scrape (`scrape.yml`)
- Uruchamiany codziennie o 6:00 UTC + ręcznie
- Scrapuje wszystkie 16 IAS
- Commituje `data/auctions.json` jeśli dane się zmieniły

### Deploy (`deploy.yml`)
- Uruchamiany przy push na `main` (gdy zmienią się `frontend/`, `shared/` lub `data/`)
- Buduje frontend i kopiuje `data/auctions.json` do `dist/data/`
- Deployuje na GitHub Pages

## Znane ograniczenia

- **Brak scrapowania przyrostowego** -- każde uruchomienie generuje pełny zestaw danych. Ogłoszenia usunięte ze stron źródłowych znikają z danych.
- **Parsowanie PDF** -- ekstrakcja danych z PDF-ów jest heurystyczna. Dokumenty skanowane (obrazy) nie są obsługiwane (brak OCR).
- **Daty z PDF** -- parser priorytetyzuje daty blisko słów kluczowych ("licytacja", "termin"), ale w nielicznych przypadkach może wybrać złą datę z tekstu.
- **Zdjęcia** -- ładowane bezpośrednio z serwerów rządowych. Mogą być niedostępne lub blokowane przez CORS.

## Licencja

Dane źródłowe są informacją publiczną udostępnianą przez Izby Administracji Skarbowej.
