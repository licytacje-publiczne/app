import { describe, it, expect } from "vitest";
import {
  generateId,
  extractAuctionNumber,
  cleanTitle,
  classifyAuctionType,
  parsePolishDate,
  extractBankAccount,
} from "../utils.js";

// ─── generateId ─────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a 16-char hex hash", () => {
    const id = generateId("https://example.com/auction/123");
    expect(id).toMatch(/^[a-f0-9]{16}$/);
  });

  it("returns the same hash for the same URL", () => {
    const url = "https://example.com/auction/456";
    expect(generateId(url)).toBe(generateId(url));
  });

  it("returns different hashes for different URLs", () => {
    expect(generateId("https://a.com")).not.toBe(generateId("https://b.com"));
  });
});

// ─── extractAuctionNumber ───────────────────────────────────────

describe("extractAuctionNumber", () => {
  it("extracts I from title", () => {
    expect(extractAuctionNumber("I licytacja nieruchomości")).toBe(1);
  });

  it("extracts II from title", () => {
    expect(extractAuctionNumber("II licytacja samochodu")).toBe(2);
  });

  it("extracts III from title", () => {
    expect(extractAuctionNumber("III licytacja ruchomości")).toBe(3);
  });

  it("handles 'Pierwsza licytacja'", () => {
    expect(extractAuctionNumber("Pierwsza licytacja ruchomości")).toBe(1);
  });

  it("handles 'Druga licytacja'", () => {
    expect(extractAuctionNumber("Druga licytacja samochodu")).toBe(2);
  });

  it("handles 'Trzecia licytacja'", () => {
    expect(extractAuctionNumber("Trzecia licytacja nieruchomości")).toBe(3);
  });

  it("returns null when no auction number", () => {
    expect(extractAuctionNumber("Sprzedaż z wolnej ręki samochodu")).toBeNull();
  });

  it("returns null for 'Odwołanie licytacji'", () => {
    expect(extractAuctionNumber("Odwołanie licytacji samochodu")).toBeNull();
  });

  it("is case-insensitive for Roman numerals", () => {
    expect(extractAuctionNumber("i licytacja nieruchomości")).toBe(1);
  });
});

// ─── cleanTitle ─────────────────────────────────────────────────

describe("cleanTitle", () => {
  it("removes Roman numeral prefix", () => {
    expect(cleanTitle("I licytacja nieruchomości w Krakowie")).toBe("nieruchomości w Krakowie");
  });

  it("removes 'II licytacja' prefix", () => {
    expect(cleanTitle("II licytacja samochodu VW Golf")).toBe("samochodu VW Golf");
  });

  it("removes ordinal word prefix", () => {
    expect(cleanTitle("Pierwsza licytacja ruchomości: telewizor")).toBe("ruchomości: telewizor");
  });

  it("removes leading dashes after stripping prefix", () => {
    expect(cleanTitle("I licytacja - samochód osobowy")).toBe("samochód osobowy");
  });

  it("does not modify title without auction number", () => {
    const title = "Sprzedaż z wolnej ręki samochodu osobowego";
    expect(cleanTitle(title)).toBe(title);
  });
});

// ─── classifyAuctionType ────────────────────────────────────────

describe("classifyAuctionType", () => {
  it("classifies 'licytacja ruchomości'", () => {
    expect(classifyAuctionType("I licytacja ruchomości")).toBe("licytacja_ruchomosci");
  });

  it("classifies 'licytacja nieruchomości'", () => {
    expect(classifyAuctionType("II licytacja nieruchomości")).toBe("licytacja_nieruchomosci");
  });

  it("classifies 'sprzedaż z wolnej ręki'", () => {
    expect(classifyAuctionType("Sprzedaż z wolnej ręki samochodu")).toBe("sprzedaz_z_wolnej_reki");
  });

  it("classifies 'opis i oszacowanie'", () => {
    expect(classifyAuctionType("Opis i oszacowanie nieruchomości")).toBe("opis_i_oszacowanie");
  });

  it("classifies 'odwołanie'", () => {
    expect(classifyAuctionType("Odwołanie licytacji samochodu")).toBe("odwolanie");
  });

  it("classifies vehicle-related titles as ruchomosci", () => {
    expect(classifyAuctionType("I licytacja samochodu VW Golf")).toBe("licytacja_ruchomosci");
    expect(classifyAuctionType("II licytacja motocykla Honda")).toBe("licytacja_ruchomosci");
    expect(classifyAuctionType("I licytacja przyczepki")).toBe("licytacja_ruchomosci");
    expect(classifyAuctionType("I licytacja pojazdu ciężarowego")).toBe("licytacja_ruchomosci");
  });

  it("returns 'inne' for generic titles", () => {
    expect(classifyAuctionType("Informacja roczna")).toBe("inne");
  });

  it("returns 'inne' for generic licytacja without type context", () => {
    expect(classifyAuctionType("licytacja majątku")).toBe("inne");
  });
});

// ─── parsePolishDate ────────────────────────────────────────────

describe("parsePolishDate", () => {
  it("parses dd.mm.yyyy format", () => {
    expect(parsePolishDate("Termin licytacji: 24.04.2026 r.")).toBe("2026-04-24T00:00");
  });

  it("parses dd.mm.yyyy with time", () => {
    expect(parsePolishDate("licytacja 24.04.2026 r. godz. 10:00")).toBe("2026-04-24T10:00");
  });

  it("parses Polish month name format", () => {
    expect(parsePolishDate("licytacja 24 kwietnia 2026 r. o godz. 11:30")).toBe("2026-04-24T11:30");
  });

  it("parses date near context keyword 'termin'", () => {
    expect(parsePolishDate("Termin: 15.06.2026 godz. 9:00 w Krakowie")).toBe("2026-06-15T09:00");
  });

  it("parses date near 'odbędzie się'", () => {
    expect(parsePolishDate("Licytacja odbędzie się dnia 10.03.2026 o godz. 12:00")).toBe(
      "2026-03-10T12:00",
    );
  });

  it("rejects invalid months (e.g. month=55)", () => {
    // Only contains an invalid date-like pattern with month > 12
    const text = "numer 12345.55.2026 coś tam";
    expect(parsePolishDate(text)).toBeNull();
  });

  it("validates day range (1-31)", () => {
    const text = "licytacja 00.04.2026 r.";
    expect(parsePolishDate(text)).toBeNull();
  });

  it("validates year range (2020-2030)", () => {
    const text = "licytacja 15.04.2019 r.";
    expect(parsePolishDate(text)).toBeNull();
  });

  it("picks the first valid date, not invalid patterns", () => {
    const text = "Informacja nr 99.99.2025 Termin licytacji: 20.03.2026 godz. 10:00";
    expect(parsePolishDate(text)).toBe("2026-03-20T10:00");
  });

  it("returns null for text without dates", () => {
    expect(parsePolishDate("Informacja o sprzedaży ruchomości")).toBeNull();
  });

  it("handles time with dot separator (godz. 10.30)", () => {
    expect(parsePolishDate("licytacja 15.05.2026 godz. 10.30")).toBe("2026-05-15T10:30");
  });

  it("parses all Polish month names", () => {
    const months = [
      ["stycznia", "01"],
      ["lutego", "02"],
      ["marca", "03"],
      ["kwietnia", "04"],
      ["maja", "05"],
      ["czerwca", "06"],
      ["lipca", "07"],
      ["sierpnia", "08"],
      ["września", "09"],
      ["października", "10"],
      ["listopada", "11"],
      ["grudnia", "12"],
    ];
    for (const [name, num] of months) {
      const result = parsePolishDate(`licytacja 15 ${name} 2026 r.`);
      expect(result).toBe(`2026-${num}-15T00:00`);
    }
  });
});

// ─── extractBankAccount ─────────────────────────────────────────

describe("extractBankAccount", () => {
  it("extracts 26-digit account with spaces", () => {
    const text = "Wadium należy wpłacić na rachunek: 12 1234 5678 9012 3456 7890 1234";
    expect(extractBankAccount(text)).toBe("12123456789012345678901234");
  });

  it("extracts continuous 26-digit account", () => {
    const text = "Nr konta: 12345678901234567890123456";
    expect(extractBankAccount(text)).toBe("12345678901234567890123456");
  });

  it("extracts account near 'wadium' keyword", () => {
    const text =
      "Wadium w wysokości 1000 zł wpłacić na nr rachunku 12 3456 7890 1234 5678 9012 3456";
    expect(extractBankAccount(text)).toBe("12345678901234567890123456");
  });

  it("extracts account with PL prefix", () => {
    const text = "Nr konta: PL 12 3456 7890 1234 5678 9012 3456";
    expect(extractBankAccount(text)).toBe("12345678901234567890123456");
  });

  it("returns null when no account found", () => {
    expect(extractBankAccount("Wadium: 500 zł")).toBeNull();
  });

  it("does not match numbers that are not 26 digits", () => {
    const text = "NIP: 1234567890, REGON: 12345678901234";
    expect(extractBankAccount(text)).toBeNull();
  });
});
