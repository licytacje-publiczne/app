import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for BIP detail parser.
 *
 * parseBipDetail is async and calls fetchBinary for PDF downloads.
 * We mock fetchBinary and pdf-parse to avoid network calls.
 */

// Mock utils module to prevent actual HTTP requests
vi.mock("../utils.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchBinary: vi.fn().mockResolvedValue(Buffer.from("mock-pdf")),
    log: vi.fn(), // silence logs in tests
  };
});

// Mock pdf-parse to avoid actually parsing PDFs
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockResolvedValue({
    text: `Obwieszczenie o I licytacji ruchomości

Naczelnik Urzędu Skarbowego w Wieliczce informuje, że w dniu 19.03.2026 r.
o godz. 10:00 w siedzibie Urzędu Skarbowego w Wieliczce, ul. Pocztowa 2,
32-020 Wieliczka, sala konferencyjna (pokój nr 12) odbędzie się I licytacja
publiczna niżej wymienionych ruchomości:

Określenie ruchomości:
1. Samochód osobowy Skoda Fabia 1.2 TSI, 2015 r., srebrny metalik, przebieg 120 000 km
Wartość szacunkowa: 25000,00 zł
Cena wywołania (75%): 18750,00 zł
Wadium (10%): 2500,00 zł

Warunki uczestnictwa:
Wadium należy wpłacić na rachunek bankowy nr 11 2222 3333 4444 5555 6666 7777
do dnia 18.03.2026 r.

Miejsce licytacji: Urząd Skarbowy w Wieliczce, ul. Pocztowa 2`,
  }),
}));

// Import after mocks are set up
const { parseBipDetail } = await import("../parsers/bip-detail.js");

// ─── Fixtures ───────────────────────────────────────────────────

const BIP_DETAIL_WITH_PDF = `
<html>
<body>
<div class="bip-article-content">
  <h2>Obwieszczenie o I licytacji samochodu Skoda Fabia, 19.03.2026r. o godz. 10.00 w Wieliczce</h2>
  <p>Treść obwieszczenia w załączniku PDF.</p>
</div>
<div class="bip-article-files">
  <a href="/documents/12345/0/obwieszczenie-skoda.pdf">Obwieszczenie o licytacji</a>
</div>
<div class="bip-article-images">
  <a href="/image/journal_article?img_id=1001&width=800">
    <img src="/image/journal_article?img_id=1001&width=200" alt="Skoda Fabia" width="200" />
  </a>
  <a href="/image/journal_article?img_id=1002&width=800">
    <img src="/image/journal_article?img_id=1002&width=200" alt="Skoda Fabia tył" width="200" />
  </a>
</div>
<div class="bip-article-source">Źródło: Urząd Skarbowy w Wieliczce</div>
</body>
</html>
`;

const BIP_DETAIL_HTML_ONLY = `
<html>
<body>
<div class="bip-article-content">
  <h2>Informacja roczna o ruchomościach sprzedanych</h2>
  <p>Naczelnik Urzędu Skarbowego informuje o ruchomościach sprzedanych
  w trybie egzekucji administracyjnej w 2025 roku.</p>
  <table class="items-table">
    <thead>
      <tr>
        <th>Lp.</th>
        <th>Określenie ruchomości</th>
        <th>Wartość szacunkowa</th>
        <th>Cena wywołania</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1.</td>
        <td>Peugeot 206, 2005 r.</td>
        <td>5 000,00 zł</td>
        <td>3 750,00 zł</td>
      </tr>
    </tbody>
  </table>
</div>
</body>
</html>
`;

const BIP_DETAIL_WITH_IMAGES_DEDUP = `
<html>
<body>
<div class="bip-article-content">
  <h2>Obwieszczenie</h2>
  <p>Treść</p>
  <img src="/image/journal_article?img_id=5001&width=150&height=100" width="150" alt="thumb" />
  <img src="/image/journal_article?img_id=5001&width=800&height=600" alt="full" />
</div>
<div class="bip-article-images">
  <a href="/image/journal_article?img_id=5001&width=800&height=600">
    <img src="/image/journal_article?img_id=5001&width=200" width="200" />
  </a>
  <a href="/image/journal_article?img_id=5002&width=800">
    <img src="/image/journal_article?img_id=5002&width=200" width="200" />
  </a>
</div>
</body>
</html>
`;

// ─── Tests ──────────────────────────────────────────────────────

describe("parseBipDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with PDF attachment", () => {
    it("extracts auction date from PDF content", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.auctionDate).toBe("2026-03-19T10:00");
    });

    it("extracts bank account from PDF content", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.bankAccount).toBe("11222233334444555566667777");
    });

    it("extracts location from PDF content", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.location).toContain("Wieliczce");
      expect(result.location).toContain("Pocztowa");
    });

    it("extracts items from PDF content", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      if (result.items.length > 0) {
        expect(result.items[0]!.name).toContain("Skoda Fabia");
      }
    });

    it("extracts document URLs", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.documentUrls).toHaveLength(1);
      expect(result.documentUrls[0]).toContain("obwieszczenie-skoda.pdf");
    });

    it("extracts full-size image URLs from bip-article-images links", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      // Should get full-size images from <a> links, not thumbnails
      expect(result.imageUrls.length).toBeGreaterThanOrEqual(1);
      for (const url of result.imageUrls) {
        expect(url).toContain("img_id=");
      }
    });

    it("extracts source attribution", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.source).toContain("Wieliczce");
    });

    it("caps rawContent at 10000 chars", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_PDF,
        "https://www.malopolskie.kas.gov.pl/licytacja-123",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.rawContent.length).toBeLessThanOrEqual(10000);
    });
  });

  describe("with HTML-only content (no PDFs)", () => {
    it("extracts items from HTML table", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_HTML_ONLY,
        "https://www.malopolskie.kas.gov.pl/info-456",
        "https://www.malopolskie.kas.gov.pl",
      );
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      if (result.items.length > 0) {
        expect(result.items[0]!.name).toContain("Peugeot");
      }
    });
  });

  describe("image deduplication", () => {
    it("deduplicates images by img_id", async () => {
      const result = await parseBipDetail(
        BIP_DETAIL_WITH_IMAGES_DEDUP,
        "https://www.malopolskie.kas.gov.pl/dedup-test",
        "https://www.malopolskie.kas.gov.pl",
      );
      // img_id=5001 appears in both article-content and article-images
      // Should be deduplicated; img_id=5002 is unique
      // Also thumbnail (width=150) should be skipped in article content
      const img5001Count = result.imageUrls.filter((u) => u.includes("img_id=5001")).length;
      expect(img5001Count).toBeLessThanOrEqual(1);

      // img_id=5002 should appear once
      const img5002Count = result.imageUrls.filter((u) => u.includes("img_id=5002")).length;
      expect(img5002Count).toBe(1);
    });
  });
});
