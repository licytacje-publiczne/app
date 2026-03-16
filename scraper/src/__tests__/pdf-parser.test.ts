import { describe, it, expect, vi } from "vitest";

// Mock pdf-parse to avoid needing a real PDF buffer
vi.mock("pdf-parse", () => ({
  default: vi.fn().mockImplementation(async (_buffer: Buffer) => {
    // Return a controllable text for testing
    return {
      text: (globalThis as Record<string, unknown>).__pdfMockText ?? "",
    };
  }),
}));

const { parsePdfContent } = await import("../parsers/pdf-parser.js");

// Helper to set mock PDF text
function setPdfText(text: string) {
  (globalThis as Record<string, unknown>).__pdfMockText = text;
}

// ─── Tests ──────────────────────────────────────────────────────

describe("parsePdfContent", () => {
  describe("date extraction from PDF text", () => {
    it("extracts date near 'licytacja' keyword", async () => {
      setPdfText("I licytacja ruchomości odbędzie się 25.03.2026 r. o godz. 10:00");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.auctionDate).toBe("2026-03-25T10:00");
    });

    it("extracts date in Polish word format", async () => {
      setPdfText("Termin licytacji: 15 kwietnia 2026 r. godz. 11:30");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.auctionDate).toBe("2026-04-15T11:30");
    });

    it("returns null for text without dates", async () => {
      setPdfText("Informacja ogólna o sprzedaży ruchomości.");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.auctionDate).toBeNull();
    });
  });

  describe("bank account extraction from PDF text", () => {
    it("extracts account near 'rachunek' keyword", async () => {
      setPdfText(
        "Wadium wpłacić na rachunek bankowy nr 12 1234 5678 9012 3456 7890 1234 do dnia...",
      );
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.bankAccount).toBe("12123456789012345678901234");
    });

    it("returns null when no account found", async () => {
      setPdfText("Brak informacji o koncie.");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.bankAccount).toBeNull();
    });
  });

  describe("location extraction from PDF text", () => {
    it("extracts location from 'Miejsce licytacji' pattern", async () => {
      setPdfText("Miejsce licytacji: Urząd Skarbowy w Krakowie, ul. Krowoderska 32\nTermin...");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.location).toContain("Krakowie");
      expect(result.location).toContain("Krowoderska");
    });

    it("extracts location from 'w siedzibie' pattern", async () => {
      setPdfText(
        "Licytacja odbędzie się w siedzibie Urzędu Skarbowego w Wieliczce, ul. Pocztowa 2\nDnia 19.03.2026",
      );
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.location).toContain("Wieliczce");
      expect(result.location).toContain("Pocztowa");
    });
  });

  describe("item extraction from PDF text", () => {
    it("extracts items from tabular PDF format", async () => {
      setPdfText(`Obwieszczenie o licytacji

Sprzedawane ruchomości:
1. Samochód osobowy VW Golf VII          45000,00 zł    33750,00 zł    4500,00 zł
2. Telewizor Samsung 55" QLED            3200,00 zł     2400,00 zł     320,00 zł

Termin licytacji: 25.03.2026 r.`);
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.items.length).toBe(2);
      expect(result.items[0]!.name).toContain("VW Golf");
      expect(result.items[0]!.estimatedValue).toContain("45000");
      expect(result.items[0]!.startingPrice).toContain("33750");
      expect(result.items[1]!.name).toContain("Samsung");
    });

    it("extracts single item with prices", async () => {
      setPdfText(`Obwieszczenie o I licytacji

Określenie ruchomości:
1. Samochód osobowy Skoda Fabia 1.2 TSI, rok prod. 2015
Wartość szacunkowa: 25000,00 zł Cena wywołania: 18750,00 zł Wadium: 2500,00 zł

Warunki uczestnictwa w licytacji:`);
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0]!.name).toContain("Skoda Fabia");
    });

    it("handles multi-line item description", async () => {
      setPdfText(`Obwieszczenie

Wykaz ruchomości:
1. Koparka gąsienicowa CAT 320D
   rok produkcji 2010, nr seryjny ABC123,
   przebieg motogodzin: 12500 h
   stan techniczny: dobry          120000,00 zł    90000,00 zł    12000,00 zł

Pozostałe informacje:`);
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0]!.name).toContain("Koparka");
      expect(result.items[0]!.name).toContain("CAT 320D");
    });

    it("returns empty items for informational PDFs", async () => {
      setPdfText(`Informacja ogólna

Naczelnik Urzędu Skarbowego informuje o zasadach
prowadzenia licytacji publicznych ruchomości.

Podstawa prawna: art. 105 ustawy...`);
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.items).toEqual([]);
    });

    it("handles empty PDF text gracefully", async () => {
      setPdfText("");
      const result = await parsePdfContent(Buffer.from("dummy"));
      expect(result.items).toEqual([]);
      expect(result.auctionDate).toBeNull();
      expect(result.bankAccount).toBeNull();
    });
  });
});
