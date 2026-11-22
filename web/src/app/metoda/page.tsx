import type { Metadata } from "next";
import { Eyebrow, SkipLink, SourceLine } from "@/components/brand/ui";
import { OrderBadge } from "@/components/brand/StateTiles";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { CRESTS, DEMO_NOTE, LEGAL, THRESHOLDS, plural, summary, type OrderAction } from "@/lib/traktor";

export const metadata: Metadata = {
  title: "Metoda i dane · TRAKTOR",
  description: "Skąd TRAKTOR bierze dane, jak ocenia miejsca na zastawkę i kiedy mówi TRZYMAJ albo OTWÓRZ.",
};

const SOURCES = [
  ["BDOT10k (GUGiK)", "Rowy, cieki, kanały, drogi, budynki, pokrycie terenu", "wektor, 1:10 000", "Wczytane: TERYT 0403 i 0461"],
  ["NMT 1 m (GUGiK)", "Wysokość dna i brzegów rowu", "siatka 1 m", "Wczytane: próbki przy każdym punkcie"],
  ["ULDK (GUGiK)", "Działki po obu brzegach rowu", "działka ewidencyjna", "Wczytane: 9 m od osi rowu"],
  ["IMGW-PIB", "Ostrzeżenia meteorologiczne", "powiat", "Na żywo albo scenariusz"],
  ["Open-Meteo", "Prognoza opadu, ET₀, KBW z 60 dni", "siatka modelu", "Na żywo albo scenariusz"],
  ["ISOK (Wody Polskie)", "Obszary zagrożenia powodzią", "mapy zagrożenia", "Niewczytane. Zamiast tego: 80 m od cieku"],
  ["IUNG-PIB", "Kategoria gleby", "kompleks glebowy", "Niewczytane. Kategoria przykładowa"],
];

const STEPS = [
  ["Okno 10 × 6,4 km", "Z BDOT10k bierzemy warstwy dla TERYT 0403 i 0461. Wycinamy okno 10 × 6,4 km na zachód od Bydgoszczy."],
  ["Punkt co 100 m", "Na każdym rowie co 100 m stawiamy punkt kandydacki na zastawkę."],
  ["Dno i brzegi z NMT", "Dno to najniższa wysokość z osi rowu i 1,5 m oraz 3 m w bok. Brzegi czytamy 7 m od osi, po obu stronach."],
  ["Rów widoczny w NMT?", "Rów płytszy niż 0,3 m odpada jako „Rów niewidoczny w NMT”. Nie zgadujemy."],
  ["Reguły odmowy", "Droga bliżej niż 20 m. Budynek bliżej niż 60 m. Rzeka lub kanał bliżej niż 80 m albo punkt w wodzie. Spadek dna ponad 0,6%. Rów płytszy niż 0,4 m: woda wyjdzie do sąsiada."],
  ["Działki z ULDK", "Działki pobieramy 9 m od osi, po obu brzegach. Sąsiad to działka przy niższym brzegu."],
  ["Zastawka 20–60 cm", `Dla ${CRESTS.join(", ")} cm liczymy cofkę i retencję. Wysokość odpada, gdy woda podeszłaby bliżej niż 10 cm pod brzeg.`],
  ["Zakresy i ranking", "Retencję, hektary i dni zapasu podajemy jako zakres. To wstępne szacunki. Ranking: retencja przy najwyższej bezpiecznej zastawce."],
];

const months = (m: number[]) => {
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return `${roman[m[0] - 1]}–${roman[m[m.length - 1] - 1]}`;
};

const RULES: { action: OrderAction; consult?: boolean; when: string; then: string }[] = [
  {
    action: "OTWORZ",
    when: `Ostrzeżenie meteo IMGW stopnia ${THRESHOLDS.stormWarningLevel} lub wyższego albo prognoza ≥ ${THRESHOLDS.rain72hMm} mm opadu w 72 h.`,
    then: "Otwórz najpóźniej 12 h przed początkiem ostrzeżenia. Rów zrobi miejsce na deszcz.",
  },
  {
    action: "NIE_RUSZAJ",
    consult: true,
    when: "Jak wyżej, ale poniżej zastawki jest droga lub zabudowa.",
    then: "Nie ruszaj sam. Skonsultuj otwarcie ze spółką wodną.",
  },
  {
    action: "TRZYMAJ",
    when: `KBW z 60 dni ≤ ${THRESHOLDS.droughtKbwMm} mm w miesiącach ${months(THRESHOLDS.holdMonths)}. Albo wiosna (${months(THRESHOLDS.springMonths)}) i prognoza < ${THRESHOLDS.springPrecip7dMm} mm w 7 dni.`,
    then: "Trzymaj wodę w rowie. Deski w górze.",
  },
  {
    action: "NIE_RUSZAJ",
    when: "Żadna reguła powyżej nie pasuje.",
    then: "Warunki neutralne. Zostaw zastawkę bez zmian.",
  },
];

const NOT_CLAIMED = [
  "Nie obiecujemy wzrostu plonów. Zmierzy to pilotaż.",
  "Nie podajemy kosztu zastawki.",
  "Nie twierdzimy, że jesteśmy pierwsi. Nie znaleźliśmy istniejącego narzędzia, które robi to samo.",
  "NMT 1 m nie zawsze widzi rów. Wtedy odmawiamy, zamiast zgadywać.",
  "Nie znamy drenażu podziemnego. Każde miejsce oznaczamy do wizji lokalnej.",
  "Nie mamy map ISOK. Zamiast nich odrzucamy punkty bliżej niż 80 m od rzeki lub kanału.",
  "Kategoria gleby jest przykładowa. Danych IUNG jeszcze nie wczytaliśmy.",
  "Warunki pogodowe na mapie to nagrane scenariusze, chyba że wybierzesz „Na żywo”.",
  "Nie zastępujemy pozwolenia wodnoprawnego ani decyzji spółki wodnej.",
];

function H2({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <>
      <Eyebrow className="text-forest-muted">{eyebrow}</Eyebrow>
      <h2 className="sh mt-3 text-[30px] md:text-[40px]">{children}</h2>
    </>
  );
}

export default function MetodaPage() {
  return (
    <>
      <SkipLink href="#main">Przejdź do treści</SkipLink>
      <SiteNav solid />
      <main id="main" tabIndex={-1} className="flex-1 bg-cream text-forest focus:outline-none">
        <div className="bg-forest text-cream">
          <div className="mx-auto max-w-4xl px-5 pt-14 pb-16 md:px-8 md:pt-20">
            <Eyebrow className="text-cream-muted">Metoda i dane</Eyebrow>
            <h1 className="hd rise mt-4 text-[48px] md:text-[64px]">Jak TRAKTOR liczy.</h1>
            <p className="mt-5 max-w-2xl text-[18px] leading-[1.5]">
              Dane publiczne GUGiK dla obszaru na zachód od Bydgoszczy. Stałe reguły. Zakresy zamiast pojedynczych liczb.
              Gdy czegoś nie wiemy, mówimy nie.
            </p>
            <p className="num mt-3 text-[16px] text-cream-muted">
              {summary.pointsAnalysed.toLocaleString("pl-PL")} punktów na rowach → {summary.sitesAccepted}{" "}
              {plural(summary.sitesAccepted, "miejsce bezpieczne", "miejsca bezpieczne", "miejsc bezpiecznych")}.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-20 px-5 py-16 md:px-8 md:py-20">
          <section>
            <H2 eyebrow="01 — Źródła">Dane publiczne</H2>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
                <caption className="sr-only">Źródła danych: co dają, rozdzielczość i status wczytania</caption>
                <thead>
                  <tr className="border-b-2 border-forest">
                    {["Źródło", "Co daje", "Rozdzielczość", "Status"].map((h) => (
                      <th key={h} scope="col" className="eb py-3 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SOURCES.map(([s, w, r, st]) => (
                    <tr key={s} className="border-b border-forest/15 align-top">
                      <th scope="row" className="py-3 pr-4 font-semibold">
                        {s}
                      </th>
                      <td className="py-3 pr-4">{w}</td>
                      <td className="num py-3 pr-4">{r}</td>
                      <td className="py-3 text-[13px] text-forest-muted">{st}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SourceLine tone="onCream" className="mt-4">{DEMO_NOTE}</SourceLine>
          </section>

          <section>
            <H2 eyebrow="02 — Potok">Osiem kroków od rowu do rankingu</H2>
            <ol className="mt-8 grid gap-px overflow-hidden rounded-[4px] border border-forest/15 bg-forest/15 sm:grid-cols-2">
              {STEPS.map(([t, d], i) => (
                <li key={t} className="bg-cream p-5">
                  <p className="eb num text-forest-muted">{String(i + 1).padStart(2, "0")}</p>
                  <p className="sh mt-2 text-[20px]">{t}</p>
                  <p className="mt-2 text-[15px] leading-[1.5]">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <H2 eyebrow="03 — Polecenie na dziś">Reguły: pierwsza pasująca wygrywa</H2>
            <p className="mt-4 text-[16px] leading-[1.5]">
              Progi w wersji <span className="num">{THRESHOLDS.version}</span>, do kalibracji w pilotażu. Te same
              reguły działają na mapie i na karcie miejsca.
            </p>
            <ol className="mt-8 space-y-4">
              {RULES.map((r, i) => (
                <li
                  key={i}
                  className="grid gap-4 rounded-[4px] bg-cream-deep p-5 md:grid-cols-[200px_1fr] md:items-start"
                >
                  <div className="flex flex-col items-start gap-2">
                    <span className="eb num text-forest-muted">Reguła {i + 1}</span>
                    <OrderBadge action={r.action} />
                    {r.consult && <span className="eb text-forest-muted">+ konsultacja</span>}
                  </div>
                  <div>
                    <p className="text-[16px] leading-[1.5]">
                      <span className="font-semibold">Gdy: </span>
                      {r.when}
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.5]">
                      <span className="font-semibold">Wtedy: </span>
                      {r.then}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <SourceLine tone="onCream" className="mt-4">IMGW-PIB (ostrzeżenia), Open-Meteo (opad, ET₀), KBW: opad minus ET₀</SourceLine>
          </section>

          <section>
            <H2 eyebrow="04 — Prawo">Ścieżka formalna</H2>
            <ul className="mt-6 space-y-3 text-[16px] leading-[1.5]">
              <li className="border-l-2 border-forest pl-4">{LEGAL.permit}</li>
              <li className="border-l-2 border-forest/40 pl-4">{LEGAL.lighter}</li>
              <li className="border-l-2 border-forest/40 pl-4">{LEGAL.maintenance}</li>
              <li className="border-l-2 border-terra pl-4 font-semibold">{LEGAL.siteVisit}</li>
            </ul>
          </section>

          <section>
            <H2 eyebrow="05 — Granice">Czego nie twierdzimy</H2>
            <ul className="mt-6 space-y-3">
              {NOT_CLAIMED.map((n) => (
                <li key={n} className="border-b border-forest/15 pb-3 text-[16px] leading-[1.5]">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
