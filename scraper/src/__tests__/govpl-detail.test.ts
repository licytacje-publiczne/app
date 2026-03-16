import { describe, it, expect } from "vitest";
import { parseGovplDetail } from "../parsers/govpl-detail.js";

// ─── Fixtures ───────────────────────────────────────────────────

/**
 * Simulates a real gov.pl detail page with structured content.
 * Based on actual Katowice IAS auction page HTML structure.
 */
const GOVPL_DETAIL_WITH_TABLE = `
<html>
<body>
<article class="article-area__article">
  <div class="editor-content">
    <h2>Obwieszczenie o I licytacji ruchomości</h2>
    <p class="event-date">25 marca 2026</p>

    <h3>Termin i miejsce licytacji</h3>
    <p>Licytacja odbędzie się dnia 25.03.2026 r. o godz. 10:00
    w siedzibie Urzędu Skarbowego w Katowicach, ul. Damrota 25, 40-022 Katowice, sala 201.</p>

    <h3>Sprzedawane ruchomości</h3>
    <table>
      <thead>
        <tr>
          <th>Lp.</th>
          <th>Określenie ruchomości</th>
          <th>Wartość szacunkowa</th>
          <th>Cena wywołania</th>
          <th>Wadium</th>
          <th>Uwagi</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1.</td>
          <td>Samochód osobowy Volkswagen Golf VII, 2018 r., przebieg 85 000 km</td>
          <td>45 000,00 zł</td>
          <td>33 750,00 zł</td>
          <td>4 500,00 zł</td>
          <td>kolor srebrny</td>
        </tr>
        <tr>
          <td>2.</td>
          <td>Telewizor Samsung 55" QLED</td>
          <td>3 200,00 zł</td>
          <td>2 400,00 zł</td>
          <td>320,00 zł</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <h3>Warunki uczestnictwa</h3>
    <p>Wadium należy wpłacić na rachunek bankowy: 12 1234 5678 9012 3456 7890 1234 w terminie do dnia 24.03.2026 r.</p>

    <h3>Dokumenty</h3>
    <a href="/attachment/abc123.pdf">Obwieszczenie o licytacji.pdf</a>
    <a href="/attachment/def456.pdf">Operat szacunkowy.pdf</a>

    <img src="/photo/img123.jpg" alt="Samochód VW Golf" />
  </div>
</article>
</body>
</html>
`;

const GOVPL_DETAIL_MINIMAL = `
<html>
<body>
<article class="article-area__article">
  <div class="editor-content">
    <h2>Informacja o sprzedaży z wolnej ręki</h2>
    <p>Naczelnik Urzędu Skarbowego w Gliwicach ogłasza sprzedaż z wolnej ręki
    następujących ruchomości. Oferty należy składać do 30.04.2026 r.</p>
    <p>Miejsce: siedziba Urzędu Skarbowego w Gliwicach, ul. Jasna 31A</p>
  </div>
</article>
</body>
</html>
`;

const GOVPL_DETAIL_WITH_TEXT_ITEMS = `
<html>
<body>
<article class="article-area__article">
  <div class="editor-content">
    <h2>Obwieszczenie o II licytacji nieruchomości</h2>
    <p>Termin licytacji: 15.05.2026 r. godz. 11:00</p>
    <p>Miejsce licytacji: Urząd Skarbowy w Sosnowcu, ul. 3 Maja 20</p>
    <p>Przedmiot licytacji: lokal mieszkalny o powierzchni 65 m2
    położony w Sosnowcu przy ul. Modrzewiowej 10/4</p>
    <p>Konto do wpłaty wadium: 98 7654 3210 9876 5432 1098 7654</p>
  </div>
</article>
</body>
</html>
`;

// ─── Tests ──────────────────────────────────────────────────────

describe("parseGovplDetail", () => {
  describe("with structured table", () => {
    const result = parseGovplDetail(
      GOVPL_DETAIL_WITH_TABLE,
      "https://www.gov.pl/web/ias-katowice/licytacja-123",
    );

    it("extracts auction date with time", () => {
      expect(result.auctionDate).toBe("2026-03-25T10:00");
    });

    it("extracts location", () => {
      expect(result.location).toContain("Katowice");
    });

    it("extracts bank account", () => {
      expect(result.bankAccount).toBe("12123456789012345678901234");
    });

    it("extracts 2 items from table", () => {
      expect(result.items).toHaveLength(2);
    });

    it("parses first item correctly", () => {
      expect(result.items[0]!.name).toContain("Volkswagen Golf");
      expect(result.items[0]!.estimatedValue).toBe("45 000,00 zł");
      expect(result.items[0]!.startingPrice).toBe("33 750,00 zł");
      expect(result.items[0]!.deposit).toBe("4 500,00 zł");
      expect(result.items[0]!.notes).toBe("kolor srebrny");
    });

    it("parses second item correctly", () => {
      expect(result.items[1]!.name).toContain("Samsung");
      expect(result.items[1]!.estimatedValue).toBe("3 200,00 zł");
      expect(result.items[1]!.startingPrice).toBe("2 400,00 zł");
      expect(result.items[1]!.deposit).toBe("320,00 zł");
    });

    it("extracts document URLs", () => {
      expect(result.documentUrls).toHaveLength(2);
      expect(result.documentUrls[0]).toContain("abc123.pdf");
      expect(result.documentUrls[1]).toContain("def456.pdf");
    });

    it("extracts image URLs", () => {
      expect(result.imageUrls).toHaveLength(1);
      expect(result.imageUrls[0]).toContain("img123.jpg");
    });

    it("has rawContent with the full text", () => {
      expect(result.rawContent).toContain("Volkswagen Golf");
      expect(result.rawContent).toContain("Wadium");
      expect(result.rawContent.length).toBeGreaterThan(100);
    });
  });

  describe("with minimal content (no table)", () => {
    const result = parseGovplDetail(
      GOVPL_DETAIL_MINIMAL,
      "https://www.gov.pl/web/ias-katowice/sprzedaz-456",
    );

    it("extracts date from text", () => {
      expect(result.auctionDate).toBe("2026-04-30T00:00");
    });

    it("extracts location from 'siedziba' pattern", () => {
      expect(result.location).toContain("Gliwic");
    });

    it("returns empty items array", () => {
      expect(result.items).toEqual([]);
    });

    it("returns empty document/image arrays", () => {
      expect(result.documentUrls).toEqual([]);
      expect(result.imageUrls).toEqual([]);
    });
  });

  describe("with text-based items", () => {
    const result = parseGovplDetail(
      GOVPL_DETAIL_WITH_TEXT_ITEMS,
      "https://www.gov.pl/web/ias-katowice/licytacja-789",
    );

    it("extracts date with time", () => {
      expect(result.auctionDate).toBe("2026-05-15T11:00");
    });

    it("extracts bank account", () => {
      expect(result.bankAccount).toBe("98765432109876543210987654");
    });

    it("extracts items from text", () => {
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      if (result.items.length > 0) {
        expect(result.items[0]!.name).toContain("lokal mieszkalny");
      }
    });
  });
});
