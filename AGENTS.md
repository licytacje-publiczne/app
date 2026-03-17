# AGENTS.md

This file provides context and instructions for AI coding agents working on this project.

## Project overview

**Licytacje Publiczne** is a scraper + viewer for public auction announcements from all 16 Polish regional tax administration offices (Izba Administracji Skarbowej). A TypeScript scraper runs daily via GitHub Actions, collects auction listings from two different website platforms, parses detail pages (including PDF attachments), and writes structured JSON. A React SPA reads the JSON and presents it with filters.

**Language**: The codebase uses English for code (variable names, comments) and Polish for user-facing strings (UI labels, error messages). Communication with the project maintainer is in Polish.

## Architecture

- **Monorepo** with npm workspaces: `shared/`, `scraper/`, `frontend/`
- **Shared types** in `shared/types.ts` -- imported by both scraper and frontend via relative paths (`../../shared/types`)
- **Scraper** (Node.js, TypeScript) writes `data/auctions.json`
- **Frontend** (React + Vite) reads `data/auctions.json` at runtime, stores in IndexedDB via Dexie.js
- **No backend API** -- fully static. GitHub Actions commits data to repo, GitHub Pages serves the SPA.

## Tech stack

| Component | Technologies                                                                      |
| --------- | --------------------------------------------------------------------------------- |
| Shared    | TypeScript types                                                                  |
| Scraper   | TypeScript, cheerio (HTML parsing), pdf-parse (PDF text extraction), tsx (runner) |
| Frontend  | React 18, Vite 6, Tailwind CSS v4, Dexie.js (IndexedDB), TypeScript               |
| CI/CD     | GitHub Actions (ci.yml, scrape.yml, deploy.yml)                                   |
| Hosting   | GitHub Pages (base URL: `/`)                                                      |

## Key conventions

### TypeScript

- `"type": "module"` in all packages (ESM)
- Scraper imports use `.js` extensions (e.g., `from "./utils.js"`) as required by Node.js ESM resolution
- Frontend imports do NOT use `.js` extensions (Vite handles resolution)
- Shared types are imported via relative paths, not package aliases: `from "../../shared/types"` (frontend) or `from "../../shared/types.js"` (scraper)
- The `workspace:*` protocol does NOT work with npm -- use `"*"` for the shared dependency in package.json files

### Two scraping platforms

The 16 IAS offices use two different website platforms with completely different HTML structures:

**Platform A -- gov.pl (6 IAS):**

- Listing: `article.article-area__article > div.art-prev > ul > li > a[href]`
- Pagination: `?page=N&size=10`
- Detail: `div.editor-content` with `<table>` for items
- Content is in HTML

**Platform B -- BIP/Liferay (10 IAS):**

- Listing: `ul.article-list > table.taglib-search-iterator > tr.results-row > td > a`
- Pagination: `.taglib-page-iterator` with `cur=N` parameter
- Detail: `div.bip-article-content` with PDFs in `div.bip-article-files`
- Content is primarily in PDF attachments, parsed with pdf-parse
- Images are in `div.bip-article-images`

**When modifying parsers, always verify changes against live websites.** These are government sites and their HTML may change without notice.

### Data model

- `auctionNumber`: extracted from title (Roman numeral I->1, II->2, III->3), removed from display title
- `auctionType`: classified from title keywords into one of 6 types
- `auctionDate`: ISO format string with time (`2026-03-25T11:00`), parsed from Polish date formats
- `bankAccount`: 26-digit Polish bank account number (no spaces in stored form)
- `rawContent`: full text content capped at 10,000 chars, used for full-text search in frontend
- `id`: SHA-256 hash of the source URL, truncated to 16 hex characters
- `lastSeenAt`: ISO timestamp of when auction was last seen on the source website
- `archived`: boolean, `true` if auction disappeared from source site (not found during scrape)

### Incremental scraping (merge)

The scraper loads existing `data/auctions.json` and merges fresh data with old. Per-IAS merge logic:

- If an IAS was scraped and an auction was NOT found → mark `archived: true`
- If an IAS was NOT scraped (partial scrape with `--ias`/`--platform`) → preserve old data unchanged
- `--no-merge` flag skips merge and overwrites the file completely

### URL routing

Frontend uses History API (pushState/popstate) via a custom `useRouter` hook:

- `/` — listing page with filters
- `/ogloszenie/{id}` — detail view
- `AuctionCard` renders as `<a href>` for accessibility and ctrl+click support
- `404.html` (copy of `index.html`) provides SPA fallback on GitHub Pages

### Date parsing (`utils.ts: parsePolishDate`)

Polish dates come in two formats: `24.04.2026` and `24 kwietnia 2026 r.`. The parser:

1. First tries context-aware patterns (near keywords like "licytacja", "termin")
2. Falls back to finding valid `dd.mm.yyyy` patterns (validates month 1-12, day 1-31)
3. Looks for time (`godz. HH:MM`) within 100 characters after the date
   This is critical because PDF text often contains many number sequences that look like dates.

### Bank account extraction (`utils.ts: extractBankAccount`)

Searches for 26-digit sequences near context keywords (`rachunek`, `konto`, `wadium`), then falls back to pattern matching. No IBAN checksum validation.

## Development workflow

### Install dependencies

```bash
npm install  # from project root -- installs all workspaces
```

### Type checking

```bash
cd scraper && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

Always run both checks after changes. The scraper and frontend have separate tsconfig files.

### Testing the scraper

```bash
# Single IAS office (fast, recommended for testing)
cd scraper && npx tsx src/index.ts --ias katowice     # gov.pl, ~2 min
cd scraper && npx tsx src/index.ts --ias krakow        # BIP with PDFs, ~5 min

# Platform filter
cd scraper && npx tsx src/index.ts --platform govpl

# Full scrape (all 16 IAS -- takes 15-30 minutes due to PDF downloads)
cd scraper && npm run scrape
```

Output goes to `data/auctions.json`.

### Building the frontend

```bash
cd frontend && npm run build    # produces frontend/dist/
cd frontend && npm run dev      # development server with HMR
```

### Running tests

```bash
npm test                        # all 89 tests (from project root)
npx vitest run scraper/         # scraper tests only
```

Tests cover: date parsing, bank account extraction, auction type classification, gov.pl detail parser, BIP detail parser, PDF parser, and merge logic.

## File-level guidance

| File                                        | Notes                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `shared/types.ts`                           | All shared types + `toRoman()` and `formatBankAccount()` utilities                                     |
| `scraper/src/config.ts`                     | URLs for all 16 IAS offices. If an IAS site changes URL, update here                                   |
| `scraper/src/utils.ts`                      | HTTP fetching (with User-Agent), date parsing, bank account extraction, auction type classification    |
| `scraper/src/platforms/govpl.ts`            | Gov.pl listing scraper. Uses `?page=N&size=10` pagination                                              |
| `scraper/src/platforms/bip.ts`              | BIP listing scraper. Uses `cur=N` pagination (Liferay)                                                 |
| `scraper/src/parsers/govpl-detail.ts`       | Parses gov.pl detail HTML. Items from `<table>`, attachments classified by label (images vs documents) |
| `scraper/src/parsers/bip-detail.ts`         | Parses BIP detail pages. Downloads PDFs, extracts images. Has `normalizeImageUrl()` for deduplication  |
| `scraper/src/parsers/pdf-parser.ts`         | PDF text extraction + heuristic parsing for items, dates, locations, bank accounts                     |
| `frontend/src/db.ts`                        | Dexie IndexedDB schema with indexes                                                                    |
| `frontend/src/hooks/useAuctionData.ts`      | Fetches JSON, uses `bulkPut` (not `bulkAdd`) to avoid duplicate key errors                             |
| `frontend/src/hooks/useRouter.ts`           | Custom History API router (pushState/popstate), used for `/ogloszenie/{id}` routes                     |
| `frontend/src/App.tsx`                      | Main component. Search is debounced (300ms). Sorting: soonest auction first                            |
| `frontend/src/components/Filters.tsx`       | Filter UI: search, IAS, voivodeship, auction type, hide expired toggle                                 |
| `frontend/src/components/AuctionCard.tsx`   | List card with badges, first item preview                                                              |
| `frontend/src/components/AuctionDetail.tsx` | Full detail view with items table, documents, image gallery. Broken images auto-hidden via `onError`   |
| `frontend/vite.config.ts`                   | Base path `/` for GitHub Pages                                                                         |

## Common pitfalls

1. **cheerio v1 types**: `Element` type must be imported from `domhandler`, not from `cheerio`
2. **ESM imports in scraper**: Must use `.js` extensions in import paths (TypeScript compiles `.ts` to `.js`)
3. **PDF parsing warnings**: `pdf-parse` emits `TT: undefined function` warnings for some fonts -- these are harmless
4. **Scraper timeout**: Full scrape of all 16 IAS takes 15-30 min (BIP sites download many PDFs). Use `--ias` filter for quick testing
5. **IndexedDB**: Use `bulkPut` not `bulkAdd` when upserting auctions -- duplicate IDs from re-fetching cause `bulkAdd` to throw
6. **BIP image duplication**: BIP/Liferay serves both full-size and thumbnail versions of images. `normalizeImageUrl()` in `bip-detail.ts` handles deduplication by normalizing Liferay `img_id` parameters

## Known limitations that may need future work

- **PDF item extraction is heuristic**: Works well for tabular PDFs but produces mixed-quality names for free-text announcements. Could be improved with better section boundary detection.
- **No OCR**: Scanned/image PDFs produce empty text. Would need Tesseract or similar.
- **Not all 16 IAS URLs are verified**: Only Katowice (gov.pl) and Kraków (BIP) have been tested end-to-end. Other BIP sites may have slightly different HTML structures.
- **No debouncing on dropdown filters**: Only the search input is debounced. Dropdown changes apply immediately (which is fine for small datasets but could be optimized).
- **Gov.pl photo attachments**: Often ZIP archives, rendered as download links (not `<img>` tags) in the frontend.
