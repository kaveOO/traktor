import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Button, Callout, Eyebrow, SkipLink, SourceLine } from "@/components/brand/ui";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { CROPS } from "@/lib/analiza/crops";
import { SMSR_GROUP, SMSR_GROUP_PL, windowsOf } from "@/lib/analiza/smsr";
import { LEGAL } from "@/lib/traktor";
import { MethodRail } from "./MethodRail";

export const metadata: Metadata = {
  title: "Metoda i dane · TRAKTOR",
  description:
    "Jak TRAKTOR ocenia działkę: granice z ULDK, 10 lat pogody, progi suszy SMSR, gleba IUNG i SoilGrids, NMT, Sentinel-2, rowy z OpenStreetMap. Reguły zaleceń, niepewność i licencje.",
};

/* Everything below describes web/src/lib/analiza/*.ts as it is. Change the code, change this page. */

const WINDOWS = windowsOf(2000);
const W_FIRST = WINDOWS[0].labelPl;
const W_LAST = WINDOWS[WINDOWS.length - 1].labelPl;

const STEPS = [
  { id: "krok-1", short: "Działka" },
  { id: "krok-2", short: "Pogoda" },
  { id: "krok-3", short: "Bilans" },
  { id: "krok-4", short: "Gleba" },
  { id: "krok-5", short: "Teren" },
  { id: "krok-6", short: "Satelita" },
  { id: "krok-7", short: "Zalecenia" },
] as const;

type Src = { name: string; gives: string; res: string; license: string; live: "na żywo" | "tylko dziś" | "tylko link" };
const SOURCES: Src[] = [
  { name: "ULDK (GUGiK)", gives: "Granice i identyfikator działki", res: "działka ewidencyjna", license: "Dane publiczne GUGiK (art. 40a Pgik)", live: "na żywo" },
  { name: "NASA POWER (NASA LaRC)", gives: "Opad, temperatura, wilgotność, wiatr, promieniowanie: 10 lat dziennie", res: "ok. 0,5° (ok. 50 km)", license: "Domena publiczna", live: "na żywo" },
  { name: "Open-Meteo", gives: "Ostatnie dni i prognoza na 7 dni", res: "ok. 10 km", license: "CC BY 4.0", live: "na żywo" },
  { name: "IMGW-PIB", gives: "Ostrzeżenia meteorologiczne dla powiatu", res: "powiat", license: "Źródłem pochodzenia danych jest IMGW-PIB (dane przetworzone)", live: "tylko dziś" },
  { name: "IUNG-PIB (SMSR)", gives: "Kategoria podatności gleby na suszę I–IV, użytkowanie gruntu", res: "raster WCS", license: "IUNG-PIB; warunki ponownego wykorzystania do potwierdzenia", live: "na żywo" },
  { name: "SoilGrids 2.0 (ISRIC)", gives: "Piasek, ił, węgiel organiczny 0–30 cm", res: "250 m", license: "CC BY 4.0", live: "na żywo" },
  { name: "NMT (GUGiK)", gives: "Wysokości punktów w działce: spadek, najniższy punkt", res: "siatka punktów w działce", license: "Dane otwarte GUGiK", live: "na żywo" },
  { name: "Sentinel-2 L2A (Copernicus)", gives: "NDVI i NDMI działki, dziś i 5 poprzednich lat", res: "10–20 m", license: "Contains modified Copernicus Sentinel data (Legal Notice); katalog Microsoft Planetary Computer, zapas Earth Search (AWS Open Data)", live: "na żywo" },
  { name: "OpenStreetMap (Overpass)", gives: "Rowy, kanały i cieki w promieniu 1 km", res: "wektor", license: "© OpenStreetMap contributors, ODbL", live: "na żywo" },
  { name: "ISOK (Wody Polskie)", gives: "Strefy zagrożenia powodziowego", res: "mapa", license: "Wody Polskie / ISOK", live: "tylko link" },
];

const LEVELS: { word: string; rank: number; when: string }[] = [
  { word: "Niskie", rank: 1, when: "Bilans najgorszego okna sięga mniej niż 50% progu SMSR." },
  { word: "Umiarkowane", rank: 2, when: "50–75% progu." },
  { word: "Wysokie", rank: 3, when: "75–100% progu." },
  { word: "Bardzo wysokie", rank: 4, when: "Próg przekroczony: susza w rozumieniu SMSR." },
];

const RECS: { icon: IconName; title: string; when: string; kind: string }[] = [
  { kind: "Retencja", icon: "board", title: "Zastawka na rowie", when: "Niedobór wody albo słaba gleba, rów lub ciek do 300 m od działki, teren płaski (spadek poniżej 1%)." },
  { kind: "Retencja", icon: "water", title: "Oczko lub niecka w najniższym miejscu", when: "Niedobór wody albo spływ po stoku, spadek co najmniej 1%, znany najniższy punkt z NMT." },
  { kind: "Retencja", icon: "ditch", title: "Pas zieleni w poprzek spadku", when: "Spadek działki co najmniej 2%: woda spływa po opadach." },
  { kind: "Retencja", icon: "board", title: "Regulowany odpływ z drenowania", when: "Niedobór wody lub słaba gleba, a w pobliżu nie ma rowu. Tylko gdy pole jest zdrenowane: do sprawdzenia w terenie." },
  { kind: "Agrotechnika", icon: "tractor", title: "Zabiegi pod uprawę", when: "Zależnie od uprawy i przyczyny: materia organiczna, międzyplony, resztki na powierzchni, mniej uprawek, wałowanie, odmiana i termin siewu; na łące wyższe koszenie i podsiew; w sadzie mulcz." },
  { kind: "Nawadnianie", icon: "water", title: "Nawadnianie (opcjonalne)", when: "Bilans wody w strefie korzeni (FAO-56) przekracza próg stresu albo przekroczy go w 7 dni. Nie w dojrzewaniu i po zbiorze." },
];

const UNCERTAINTY = [
  "Bilans blisko progu SMSR (różnica poniżej 25 mm lub 15% progu).",
  "Werdykt zmienia się zależnie od wzoru parowania (ETP SMSR wobec ET₀ FAO).",
  "Działka na zachód od 17,5° E: NASA POWER bywa tam za mokry względem stacji IMGW.",
  "Brak kategorii gleby IUNG w punkcie (szacunek z SoilGrids albo kategoria III).",
  "Mapa IUNG nie potwierdziła, że to grunt rolny.",
  "Brak zdjęcia satelitarnego albo zdjęcie przeczy bilansowi.",
  "Ostatnie dni z modelu prognostycznego lub z opóźnieniem archiwum.",
  "Użytki zielone: SMSR nie ma dla nich progu.",
];

const LIMITS = [
  "Pogoda pochodzi z modeli dla rejonu, nie z pomiaru na polu.",
  "Na zachodzie kraju NASA POWER bywa za mokry. W 2018 r. o 35–60 mm na 60 dni w Lubuskiem i Wielkopolsce. Suszę możemy tam niedoszacować.",
  "SMSR liczy bilans z danych stacji IMGW. My liczymy go tym samym wzorem, ale z danych modelowych.",
  "Wilgotność o 13:00 szacujemy z temperatury maksymalnej, usłonecznienie z promieniowania.",
  "Gleba pochodzi z map (IUNG, SoilGrids 250 m). To szacunek, nie odkrywka.",
  "Model wody w glebie zaczyna od gleby pełnej po zimie. Po suchej zimie ubytek wychodzi za mały.",
  "Mediana NDVI z poprzednich lat może dotyczyć innej uprawy na tej działce.",
  "Rowy bierzemy z OpenStreetMap. BDOT10k nie jest odpytywany na żywo, więc mapa rowów bywa niepełna.",
  "Strefy powodziowej ISOK nie sprawdzamy. Każdy wynik ma link do mapy ISOK.",
  "Nie znamy drenażu podziemnego, poziomu wody gruntowej ani zabiegów na działce.",
  "Progi poziomów i reguł są do kalibracji w pilotażu.",
];

const NOT_CLAIMED = [
  "Nie obiecujemy wzrostu plonów. Zmierzy to pilotaż.",
  "Nie podajemy kosztu zastawki ani nawadniania.",
  "Nie zastępujemy pozwolenia wodnoprawnego ani decyzji spółki wodnej.",
  "Nie twierdzimy, że jesteśmy pierwsi. Nie znaleźliśmy narzędzia, które robi to samo.",
];

function Section({ id, no, title, lead, children }: { id: string; no: number; title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-40">
      <p className="eb num text-forest-muted">
        Krok {String(no).padStart(2, "0")} z 07
      </p>
      <h2 id={`${id}-h`} className="sh mt-2 text-[28px] md:text-[40px]">
        {title}
      </h2>
      {lead && <p className="mt-4 max-w-2xl text-[18px] leading-[1.5]">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Facts({ rows }: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-forest/15 rounded-[4px] border border-forest/15 bg-cream-deep">
      {rows.map((r) => (
        <div key={r.k} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
          <dt className="eb pt-[3px] text-forest-muted">{r.k}</dt>
          <dd className="num text-[16px] leading-[1.5]">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

function H2({ eyebrow, id, children }: { eyebrow: string; id: string; children: ReactNode }) {
  return (
    <>
      <Eyebrow className="text-forest-muted">{eyebrow}</Eyebrow>
      <h2 id={id} className="sh mt-2 text-[28px] md:text-[40px]">
        {children}
      </h2>
    </>
  );
}

export default function MetodaPage() {
  const crops = CROPS.map((c) => ({ name: c.namePl, group: SMSR_GROUP[c.id] }));
  return (
    <>
      <SkipLink href="#main">Przejdź do treści</SkipLink>
      <SiteNav solid />
      <main id="main" tabIndex={-1} className="flex-1 bg-cream text-forest focus:outline-none">
        <div className="bg-forest text-cream">
          <div className="mx-auto max-w-4xl px-5 pt-14 pb-16 md:px-8 md:pt-20">
            <Eyebrow className="text-cream-muted">Metoda i dane</Eyebrow>
            <h1 className="hd rise mt-4 text-[44px] leading-[0.94] md:text-[64px]">Jak liczymy suszę na działce</h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.5]">
              Podajesz działkę, uprawę i dzień. Pobieramy dane w chwili zapytania i liczymy. Nie mamy gotowych odpowiedzi.
              Każda liczba ma źródło i datę. Gdy danych brak, piszemy to wprost.
            </p>
            <p className="mt-4 max-w-2xl text-[16px] leading-[1.5] text-cream-muted">
              Kolejność jest stała: ocena sytuacji wodnej, przyczyny, retencja, agrotechnika, nawadnianie. Bez przyczyny
              z danych nie ma zalecenia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/analiza" tone="onForest">
                Sprawdź działkę
              </Button>
              <Button href="#zrodla" variant="secondary" tone="onForest">
                Źródła i licencje
              </Button>
            </div>
          </div>
        </div>

        <MethodRail steps={STEPS} />

        <div className="mx-auto max-w-4xl space-y-20 px-5 py-16 md:px-8 md:py-20">
          <Section
            id="krok-1"
            no={1}
            title="Działka z ULDK"
            lead="Numer działki albo punkt na mapie zamieniamy na granice z ULDK. Wszystko dalej liczymy dla tego kształtu."
          >
            <Facts
              rows={[
                { k: "Wejście", v: "pełny identyfikator (np. 040307_2.0023.306/2), obręb z numerem albo kliknięcie na mapie" },
                { k: "Limit", v: "do 500 ha; większą działkę odrzucamy" },
                { k: "Grunt rolny?", v: "mapa IUNG z użytkowaniem gruntu. Las, woda lub zabudowa: analizy nie robimy i mówimy dlaczego" },
                { k: "Czas", v: "wszystkie źródła po ULDK pobieramy równolegle, z limitem ok. 20 s" },
              ]}
            />
            <SourceLine tone="onCream" className="mt-3">
              ULDK (GUGiK), GetParcelById / GetParcelByXY; IUNG-PIB, WCS katgl_landuse2024
            </SourceLine>
          </Section>

          <Section
            id="krok-2"
            no={2}
            title="Pogoda: 10 lat i ostatnie dni"
            lead="Historia pochodzi z NASA POWER, dzień po dniu, od 10 sezonów wstecz. Ostatnie ok. 85 dni i prognozę dokłada Open-Meteo."
          >
            <Facts
              rows={[
                { k: "Historia", v: "NASA POWER: opad, Tmax, Tmin, wilgotność, wiatr, promieniowanie; 10 lat + zapas na okna" },
                { k: "Ostatnie dni", v: "Open-Meteo dla dat do 85 dni wstecz; archiwum ma kilka dni opóźnienia" },
                { k: "Prognoza", v: "7 dni, tylko gdy analizujesz dzień dzisiejszy" },
                { k: "Data w przeszłości", v: "używamy wyłącznie danych do tego dnia. Pogoda, która przyszła później, nie wchodzi do wyniku" },
                { k: "Ostrzeżenia", v: "IMGW-PIB dla powiatu działki, tylko dla dnia dzisiejszego" },
              ]}
            />
            <SourceLine tone="onCream" className="mt-3">
              NASA POWER Project (LaRC), domena publiczna; Open-Meteo.com, CC BY 4.0; IMGW-PIB (dane przetworzone)
            </SourceLine>
          </Section>

          <Section
            id="krok-3"
            no={3}
            title="Bilans wody wg SMSR"
            lead="Liczymy klimatyczny bilans wodny (KBW): opad minus parowanie w oknach 60-dniowych, jak System Monitoringu Suszy Rolniczej IUNG-PIB."
          >
            <Facts
              rows={[
                { k: "Okna", v: `14 okien po 6 dekad, od ${W_FIRST} do ${W_LAST}` },
                { k: "Parowanie", v: "ETP wzorem SMSR (Doroszewski i in. 2012). Dla porównania także ET₀ FAO-56 (Penman-Monteith)" },
                { k: "Progi", v: "progi suszy SMSR z rozporządzenia MRiRW z 2019 r., dla grupy uprawy i kategorii gleby I–IV" },
                { k: "Werdykt", v: "najgorsze okno sezonu od 21.III do dnia analizy. Trwające okno doliczamy prognozą (tylko dziś) albo pogodą z ostatnich 7 dni" },
                { k: "Tło", v: "percentyl bilansu na tle 10 poprzednich lat w tych samych dniach" },
                { k: "Historia", v: "w ilu z 10 ostatnich sezonów był przekroczony próg SMSR" },
              ]}
            />

            <h3 className="sh mt-10 text-[22px] md:text-[26px]">Poziom ryzyka: słowo, nie liczba</h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {LEVELS.map((l) => (
                <li key={l.word} className="rounded-[4px] border border-forest/15 bg-cream p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="hd text-[22px]">{l.word}</span>
                    <span className="flex gap-[3px]" aria-hidden>
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`inline-block h-2.5 w-5 rounded-[1px] border-[1.5px] ${
                            i <= l.rank ? (l.rank <= 1 ? "border-agri bg-agri" : l.rank >= 3 ? "border-terra bg-terra" : "border-soil bg-soil") : "border-forest/45"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-[1.45]">{l.when}</p>
                </li>
              ))}
            </ul>
            <ul className="mt-5 space-y-2 text-[16px] leading-[1.5]">
              <li className="border-l-2 border-forest pl-4">Sama prognoza trwającego okna nigdy nie daje „bardzo wysokie”.</li>
              <li className="border-l-2 border-forest pl-4">
                Poziom rośnie o jeden, gdy NDVI i NDMI są wyraźnie niższe niż w poprzednich latach (o 0,1 lub więcej), a
                bilans sięga co najmniej połowy progu.
              </li>
              <li className="border-l-2 border-forest pl-4">
                Bez progu SMSR (użytki zielone, burak na glebie kat. I) ocena idzie z percentyla: do 5. percentyla
                bardzo wysokie, do 10. wysokie, do 25. umiarkowane.
              </li>
              <li className="border-l-2 border-forest pl-4">
                Poza sezonem SMSR (X–III) nie oceniamy suszy na dziś: niskie albo umiarkowane, z ostatniego sezonu i gleby.
              </li>
            </ul>

            <details className="mt-6 rounded-[4px] border border-forest/15 bg-cream-deep px-4 py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-medium">Uprawy i grupy SMSR</summary>
              <ul className="mt-2 grid gap-x-6 gap-y-1 pb-2 text-[15px] sm:grid-cols-2">
                {crops.map((c) => (
                  <li key={c.name}>
                    {c.name}: <span className="text-forest-muted">{c.group ? SMSR_GROUP_PL[c.group] : "brak progu SMSR"}</span>
                  </li>
                ))}
              </ul>
            </details>
            <SourceLine tone="onCream" className="mt-3">
              IUNG-PIB, progi SMSR (susza.iung.pulawy.pl/progi); Doroszewski i in. 2012; FAO-56. Progi poziomów do kalibracji
            </SourceLine>
          </Section>

          <Section
            id="krok-4"
            no={4}
            title="Gleba: kategoria i uziarnienie"
            lead="Kategoria gleby decyduje o progu suszy. Uziarnienie mówi, ile wody gleba utrzyma w strefie korzeni."
          >
            <Facts
              rows={[
                { k: "Kategoria I–IV", v: "IUNG-PIB: przeważająca kategoria pikseli w granicach działki (I = najbardziej podatna)" },
                { k: "Brak IUNG", v: "szacunek kategorii z uziarnienia SoilGrids; bez danych przyjmujemy kat. III i to zaznaczamy" },
                { k: "Torf, mursz", v: "IUNG nie nadaje kategorii: przyjmujemy kat. III" },
                { k: "Woda dostępna", v: "piasek, ił i węgiel organiczny z SoilGrids (0–30 cm) → woda dostępna wzorem Saxtona i Rawlsa, do głębokości korzeni uprawy" },
              ]}
            />
            <SourceLine tone="onCream" className="mt-3">IUNG-PIB (SMSR); SoilGrids 2.0, ISRIC, CC BY 4.0</SourceLine>
          </Section>

          <Section
            id="krok-5"
            no={5}
            title="Teren i woda obok"
            lead="Z NMT bierzemy wysokości na siatce punktów w działce. Z OpenStreetMap rowy i cieki w promieniu 1 km."
          >
            <Facts
              rows={[
                { k: "Spadek", v: "płaszczyzna dopasowana do wysokości punktów; używamy go tylko przy pełnym pokryciu NMT" },
                { k: "Najniższy punkt", v: "miejsce na oczko lub nieckę, pokazane na mapie" },
                { k: "Rowy i cieki", v: "rów, kanał, ciek, rzeka w promieniu 1 km; odległość od granicy działki" },
                { k: "ISOK", v: "nie odpytujemy. To nie błąd: wynik zawiera link do mapy ISOK do sprawdzenia" },
              ]}
            />
            <SourceLine tone="onCream" className="mt-3">
              NMT (GUGiK), GetHByPointList; © OpenStreetMap contributors, ODbL (Overpass API)
            </SourceLine>
          </Section>

          <Section
            id="krok-6"
            no={6}
            title="Satelita: stan roślin"
            lead="Sentinel-2 potwierdza albo podważa bilans. Sam nie wywołuje alarmu."
          >
            <Facts
              rows={[
                { k: "Wskaźniki", v: "NDVI (B08, B04, 10 m) i NDMI (B8A, B11, 20 m), średnia z pikseli w granicach działki" },
                { k: "Chmury", v: "maska SCL: tylko roślinność i goła gleba; co najmniej 60% czystych pikseli" },
                { k: "Zdjęcie", v: "najnowsze do 20 dni przed datą (X–III: 40 dni), w razie braku do 45 dni" },
                { k: "Porównanie", v: "mediana z 5 poprzednich lat, ±15 dni od tej samej daty; co najmniej 2 lata i spójne wartości" },
                { k: "Dojrzewanie, zima", v: "spadek NDVI w dojrzewaniu, po zbiorze i w spoczynku zimowym nie jest stresem wodnym" },
              ]}
            />
            <SourceLine tone="onCream" className="mt-3">
              Contains modified Copernicus Sentinel data; Microsoft Planetary Computer, zapas Earth Search (Element 84, AWS Open Data)
            </SourceLine>
          </Section>

          <Section
            id="krok-7"
            no={7}
            title="Przyczyny, potem zalecenia"
            lead="Każde zalecenie wskazuje przyczynę z danych. Przyczyny: niedobór opadów, upał i parowanie, słaba gleba, spływ po stoku, stres roślin na zdjęciu. Okres krytyczny uprawy tylko je wzmacnia."
          >
            <ol className="space-y-3">
              {RECS.map((r, i) => (
                <li key={r.title} className="grid gap-3 rounded-[4px] bg-cream-deep p-5 sm:grid-cols-[150px_1fr]">
                  <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                    <span className="eb num text-forest-muted">
                      {String(i + 1).padStart(2, "0")} · {r.kind}
                    </span>
                    <Icon name={r.icon} size={24} />
                  </div>
                  <div>
                    <h3 className="sh text-[20px]">{r.title}</h3>
                    <p className="mt-1 text-[16px] leading-[1.5]">
                      <span className="font-semibold">Gdy: </span>
                      {r.when}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5" />
            <Facts
              rows={[
                { k: "Dawka", v: "jednorazowo 10 mm do 20 / 25 / 30 / 35 mm netto dla gleby kat. I / II / III / IV; większa spłynie lub przesiąknie" },
                { k: "Prawo", v: "piętrzenie i pobór wody: pozwolenie wodnoprawne lub uzgodnienie z Wodami Polskimi albo spółką wodną" },
              ]}
            />
            <div className="mt-5">
              <Callout tone="warning" icon="pin" title={LEGAL.siteVisit}>
                Każde zalecenie retencyjne. Dane zdalne nie widzą drenów, przepustów ani stanu rowu.
              </Callout>
            </div>
          </Section>

          <section aria-labelledby="niepewnosc-h">
            <H2 eyebrow="Niepewność" id="niepewnosc-h">
              Ile ufać wynikowi
            </H2>
            <p className="mt-4 max-w-2xl text-[18px] leading-[1.5]">
              Liczymy punkty za każde zastrzeżenie poniżej. 0 punktów: niepewność niska. 1–2: średnia. 3 i więcej: wysoka.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {UNCERTAINTY.map((u) => (
                <li key={u} className="rounded-[4px] border border-forest/15 px-4 py-3 text-[15px] leading-[1.45]">
                  {u}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="granice-h">
            <H2 eyebrow="Ograniczenia" id="granice-h">
              Czego dane nie widzą
            </H2>
            <ul className="mt-6 space-y-3">
              {LIMITS.map((n) => (
                <li key={n} className="border-b border-forest/15 pb-3 text-[16px] leading-[1.5]">
                  {n}
                </li>
              ))}
            </ul>
            <h3 className="sh mt-10 text-[22px] md:text-[26px]">Czego nie twierdzimy</h3>
            <ul className="mt-4 space-y-2">
              {NOT_CLAIMED.map((n) => (
                <li key={n} className="border-l-2 border-terra pl-4 text-[16px] leading-[1.5]">
                  {n}
                </li>
              ))}
            </ul>
          </section>

          <section id="zrodla" aria-labelledby="zrodla-h" className="scroll-mt-40">
            <H2 eyebrow="Źródła i licencje" id="zrodla-h">
              Dane publiczne, pobierane w chwili zapytania
            </H2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {SOURCES.map((s) => (
                <li key={s.name} className="flex flex-col rounded-[4px] border border-forest/15 bg-cream-deep p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="sh text-[19px]">{s.name}</h3>
                    <span
                      className={`eb shrink-0 rounded-[2px] border px-1.5 py-0.5 ${
                        s.live === "tylko link" ? "border-dashed border-terra text-terra-ink" : "border-forest/40"
                      }`}
                    >
                      {s.live}
                    </span>
                  </div>
                  <p className="mt-2 text-[15px] leading-[1.45]">{s.gives}</p>
                  <dl className="mt-3 space-y-1 text-[13px] leading-snug">
                    <div className="flex gap-2">
                      <dt className="eb pt-px text-forest-muted">Skala</dt>
                      <dd className="num">{s.res}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="eb pt-px text-forest-muted">Licencja</dt>
                      <dd>{s.license}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] leading-[1.5]">
              Metoda: <span className="num">traktor-analiza 0.2</span>. Wersja metody jest zapisana w każdym wyniku i w
              raporcie. Wcześniejszy przykład z mapą rowów pod Bydgoszczą (BDOT10k, NMT 1 m) opisujemy na{" "}
              <Link href="/mapa" className="font-medium underline underline-offset-4">
                mapie przykładu
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
