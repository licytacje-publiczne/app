import type { IASConfig } from "../../shared/types.js";

export const IAS_CONFIGS: IASConfig[] = [
  // ===== gov.pl platform (6 IAS) =====
  {
    id: "bialystok",
    name: "Izba Administracji Skarbowej w Białymstoku",
    city: "Białystok",
    voivodeship: "podlaskie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-bialystok/obwieszczenia-o-licytacjach",
  },
  {
    id: "katowice",
    name: "Izba Administracji Skarbowej w Katowicach",
    city: "Katowice",
    voivodeship: "śląskie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-katowice/obwieszczenia-o-licytacjach",
  },
  {
    id: "kielce",
    name: "Izba Administracji Skarbowej w Kielcach",
    city: "Kielce",
    voivodeship: "świętokrzyskie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-kielce/obwieszczenia-o-licytacjach",
  },
  {
    id: "lodz",
    name: "Izba Administracji Skarbowej w Łodzi",
    city: "Łódź",
    voivodeship: "łódzkie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-lodz/obwieszczenia-o-licytacjach",
  },
  {
    id: "rzeszow",
    name: "Izba Administracji Skarbowej w Rzeszowie",
    city: "Rzeszów",
    voivodeship: "podkarpackie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-rzeszow/obwieszczenia-o-licytacjach",
  },
  {
    id: "wroclaw",
    name: "Izba Administracji Skarbowej we Wrocławiu",
    city: "Wrocław",
    voivodeship: "dolnośląskie",
    platform: "govpl",
    listingUrl: "https://www.gov.pl/web/ias-wroclaw/obwieszczenia-o-licytacjach",
  },

  // ===== old BIP platform (10 IAS) =====
  {
    id: "bydgoszcz",
    name: "Izba Administracji Skarbowej w Bydgoszczy",
    city: "Bydgoszcz",
    voivodeship: "kujawsko-pomorskie",
    platform: "bip",
    listingUrl:
      "https://www.kujawsko-pomorskie.kas.gov.pl/izba-administracji-skarbowej-w-bydgoszczy/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "gdansk",
    name: "Izba Administracji Skarbowej w Gdańsku",
    city: "Gdańsk",
    voivodeship: "pomorskie",
    platform: "bip",
    listingUrl:
      "https://www.pomorskie.kas.gov.pl/izba-administracji-skarbowej-w-gdansku/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "krakow",
    name: "Izba Administracji Skarbowej w Krakowie",
    city: "Kraków",
    voivodeship: "małopolskie",
    platform: "bip",
    listingUrl:
      "https://www.malopolskie.kas.gov.pl/izba-administracji-skarbowej-w-krakowie/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "lublin",
    name: "Izba Administracji Skarbowej w Lublinie",
    city: "Lublin",
    voivodeship: "lubelskie",
    platform: "bip",
    listingUrl:
      "https://www.lubelskie.kas.gov.pl/izba-administracji-skarbowej-w-lublinie/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "olsztyn",
    name: "Izba Administracji Skarbowej w Olsztynie",
    city: "Olsztyn",
    voivodeship: "warmińsko-mazurskie",
    platform: "bip",
    listingUrl:
      "https://www.warminsko-mazurskie.kas.gov.pl/izba-administracji-skarbowej-w-olsztynie/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "opole",
    name: "Izba Administracji Skarbowej w Opolu",
    city: "Opole",
    voivodeship: "opolskie",
    platform: "bip",
    listingUrl:
      "https://www.opolskie.kas.gov.pl/izba-administracji-skarbowej-w-opolu/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "poznan",
    name: "Izba Administracji Skarbowej w Poznaniu",
    city: "Poznań",
    voivodeship: "wielkopolskie",
    platform: "bip",
    listingUrl:
      "https://www.wielkopolskie.kas.gov.pl/izba-administracji-skarbowej-w-poznaniu/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "szczecin",
    name: "Izba Administracji Skarbowej w Szczecinie",
    city: "Szczecin",
    voivodeship: "zachodniopomorskie",
    platform: "bip",
    listingUrl:
      "https://www.zachodniopomorskie.kas.gov.pl/izba-administracji-skarbowej-w-szczecinie/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "warszawa",
    name: "Izba Administracji Skarbowej w Warszawie",
    city: "Warszawa",
    voivodeship: "mazowieckie",
    platform: "bip",
    listingUrl:
      "https://www.mazowieckie.kas.gov.pl/izba-administracji-skarbowej-w-warszawie/ogloszenia/obwieszczenia-o-licytacjach",
  },
  {
    id: "zielona-gora",
    name: "Izba Administracji Skarbowej w Zielonej Górze",
    city: "Zielona Góra",
    voivodeship: "lubuskie",
    platform: "bip",
    listingUrl:
      "https://www.lubuskie.kas.gov.pl/izba-administracji-skarbowej-w-zielonej-gorze/ogloszenia/obwieszczenia-o-licytacjach",
  },
];

export const SCRAPE_CONCURRENCY = 5;
export const REQUEST_DELAY_MS = 300;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_PAGES_PER_IAS = 50;
