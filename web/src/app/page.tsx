import { Icon, type IconName } from "@/components/brand/Icon";
import { Button, Card, Eyebrow, ProgressRail, SkipLink, SourceLine } from "@/components/brand/ui";
import { BoardStates } from "@/components/landing/BoardStates";
import { DEMO_PARCELS } from "@/components/landing/Hero";
import { HeroFields } from "@/components/landing/HeroFields";
import { ParallaxHero } from "@/components/landing/ParallaxHero";
import { RefusalCounter, type RefusalRow } from "@/components/landing/RefusalCounter";
import { Section } from "@/components/landing/Section";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteNav } from "@/components/landing/SiteNav";
import { DEMO_NOTE, FACTS, GMINA, LEGAL, REFUSAL_LABEL, summary, type RefusalCode } from "@/lib/traktor";

const PROBLEM = [
  { value: FACTS.drainedHa, label: "gruntów rolnych zmeliorowanych", src: "NIK / GUS" },
  { value: "394 gminy", label: "z suszą rolniczą w 2025 (16%)", src: "IUNG-PIB" },
  { value: "do 3 000 zł/ha", label: "pomocy suszowej, wypłacanej po stracie", src: "pomoc suszowa 2024" },
  { value: "EMSR756", label: "powódź, wrzesień 2024", src: "Copernicus EMS" },
];

const PILLARS: { icon: IconName; title: string; en: string; text: string }[] = [
  {
    icon: "ditch",
    title: "Ugruntowany",
    en: "Grounded",
    text: "Pracujemy na rowach, które już są. Dane publiczne, bez nowych czujników w polu.",
  },
  {
    icon: "board",
    title: "Odwracalny",
    en: "Reversible",
    text: "Jedna drewniana zastawka. Deski w górę, gdy sucho. W dół przed burzą. Nic nie betonujemy.",
  },
  {
    icon: "lidar",
    title: "Precyzyjny",
    en: "Precise",
    text: "Punkt co 100 m rowu, wysokość z NMT 1 m. Mówimy gdzie, ile centymetrów i kiedy.",
  },
];

/** What actually feeds the app (lib/analiza + scripts/geo). ISOK is a link only, never queried. */
const SOURCES: { group: string; items: { name: string; role: string; icon: IconName }[] }[] = [
  {
    group: "Mapa miejsc",
    items: [
      { name: "BDOT10k (GUGiK)", role: "Rowy, cieki, drogi i budynki", icon: "ditch" },
      { name: "NMT 1 m (GUGiK)", role: "Wysokość terenu i dna rowu", icon: "lidar" },
      { name: "ULDK (GUGiK)", role: "Granice działek: czyja woda, czyje pole", icon: "pin" },
    ],
  },
  {
    group: "Analiza działki",
    items: [
      { name: "Open-Meteo, NASA POWER", role: "Opad, parowanie, prognoza 7 dni", icon: "water" },
      { name: "IMGW-PIB", role: "Ostrzeżenia meteo dla powiatu", icon: "storm" },
      { name: "IUNG-PIB, SoilGrids", role: "Kategoria i uziarnienie gleby", icon: "drought" },
      { name: "ISOK", role: "Strefy powodziowe: odnośnik do mapy", icon: "water" },
    ],
  },
];

const HONEST = [
  "Zakresy, nie pojedyncze liczby.",
  "Odmowa zamiast zgadywania. Każda odmowa ma powód.",
  LEGAL.permit,
  `${LEGAL.siteVisit} Każde miejsce sprawdza człowiek w terenie.`,
  "Nie obiecujemy wzrostu plonów. Zmierzy to pilotaż.",
];

const LITERATURE = [
  { value: "−30,5%", label: "odpływu z drenowanego pola (~71 mm)", src: "Kęsicka i in. 2022, PLoS ONE" },
  { value: "−33,6%", label: "azotanów w odpływie", src: "Kęsicka i in. 2022, PLoS ONE" },
  { value: "23% → 41%", label: "wykorzystanej retencji rowu z zastawkami", src: "Bajkowski i in. 2024, JWLD" },
];

export default function Home() {
  const codes = Object.keys(summary.refusalsByCode) as RefusalCode[];
  const rows: RefusalRow[] = [
    ...codes
      .map((c) => ({ label: REFUSAL_LABEL[c], count: summary.refusalsByCode[c] }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count),
    { label: "Miejsca bezpieczne", count: summary.sitesAccepted, accepted: true },
  ];

  return (
    <>
      <SkipLink href="#main">Przejdź do treści</SkipLink>
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* 01 HERO: layered Blender render (docs/blender/scripts/traktor_parallax.py), scroll parallax, static composite under reduced motion */}
        <ParallaxHero />

        {/* 02 PROBLEM */}
        <Section
          ground="cream"
          eyebrow="02 · Problem"
          title="Za dużo wody, potem za mało."
          lead="Ten sam rów robi jedno i drugie. Wiosną wyprowadza wodę z pola. Latem pole schnie."
        >
          <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM.map((p) => (
              <div key={p.value} className="border-t-2 border-forest pt-5">
                <dt className="hd num text-[44px] md:text-[52px]">{p.value}</dt>
                <dd className="mt-3 text-[16px] leading-[1.45]">{p.label}</dd>
                <dd className="mt-2">
                  <SourceLine tone="onCream">{p.src}</SourceLine>
                </dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* 03 ONE BOARD, TWO STATES */}
        <Section
          ground="cream-deep"
          eyebrow="03 · Zastawka"
          title="Jedna zastawka. Dwa tryby."
          lead="Drewniane deski w stalowej ramie, w rowie, który już istnieje. Zawsze tylko jeden tryb: TRZYMAJ albo OTWÓRZ."
        >
          <BoardStates />
        </Section>

        {/* 04 JAK TO DZIAŁA */}
        <Section
          id="jak"
          ground="cream"
          eyebrow="04 · Jak to działa"
          title="Od rowu do decyzji w siedmiu krokach."
          lead="Mapa rowów, teren z NMT, ocena każdego miejsca, kontrola bezpieczeństwa. Potem montaż i jedna decyzja: TRZYMAJ albo OTWÓRZ."
        >
          <div className="overflow-x-auto pb-2" tabIndex={0} aria-label="Etapy pracy, przewiń w poziomie">
            <div className="min-w-[640px]">
              <ProgressRail current={6} />
            </div>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PILLARS.map((p) => (
              <Card key={p.title} className="flex flex-col gap-4">
                <Icon name={p.icon} size={32} />
                <div>
                  <h3 className="sh text-[26px]">{p.title}</h3>
                  <p lang="en" className="eb mt-1 text-forest-muted">
                    {p.en}
                  </p>
                </div>
                <p className="text-[16px] leading-[1.5]">{p.text}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* 05 ODMOWA */}
        <Section
          ground="forest"
          eyebrow="05 · Odmowa"
          title="Większość miejsc nie nadaje się na zastawkę."
          lead="TRAKTOR mówi nie i mówi dlaczego. Droga, budynek, rzeka obok, woda na działce sąsiada: takie miejsce odpada."
        >
          <RefusalCounter points={summary.pointsAnalysed} accepted={summary.sitesAccepted} rows={rows} />
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="eb text-cream-muted">Dane rzeczywiste · {GMINA.name}</p>
            <Button tone="onForest" href="/mapa">
              Zobacz mapę miejsc
            </Button>
          </div>
          <SourceLine tone="onForest" className="mt-6">
            {DEMO_NOTE}
          </SourceLine>
        </Section>

        {/* 06 DANE */}
        <Section
          ground="cream"
          eyebrow="06 · Dane"
          title="Dane publiczne. Bez czujników w polu."
          lead="Każda liczba w raporcie ma źródło. Gdy źródło nie odpowie, mówimy to wprost."
        >
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="grid gap-8">
              {SOURCES.map((g) => (
                <div key={g.group}>
                  <h3 className="sh text-[22px]">{g.group}</h3>
                  <ul className="mt-4 grid gap-px overflow-hidden rounded-[4px] border border-forest/15 bg-forest/15 sm:grid-cols-2">
                    {g.items.map((s) => (
                      <li key={s.name} className="flex gap-4 bg-cream p-5">
                        <Icon name={s.icon} className="mt-0.5 shrink-0" />
                        <div>
                          <p className="sh text-[18px]">{s.name}</p>
                          <p className="mt-1 text-[15px] leading-[1.45]">{s.role}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="self-start rounded-[4px] bg-forest p-7 text-cream">
              <Eyebrow className="text-cream-muted">Gdzie jest AI</Eyebrow>
              <h3 className="sh mt-4 text-[26px]">Hydrologia jest deterministyczna. Celowo.</h3>
              <p className="mt-4 text-[16px] leading-[1.5]">
                Geometria i reguły liczą się zawsze tak samo. Na zmyśloną powódź nikogo nie stać.
              </p>
              <p className="mt-3 text-[16px] leading-[1.5]">
                Model językowy tylko przepisuje wynik na prosty polski. Strażnik liczb sprawdza, że nie zmienił żadnej
                wartości.
              </p>
              <div className="mt-6">
                <Button variant="secondary" tone="onForest" href="/metoda">
                  Metoda i dane
                </Button>
              </div>
            </div>
          </div>
        </Section>

        {/* 07 UCZCIWIE */}
        <Section ground="cream-deep" eyebrow="07 · Uczciwie" title="Co wiemy. Czego nie obiecujemy.">
          <div className="grid gap-10 md:grid-cols-2">
            <ul className="space-y-4">
              {HONEST.map((h) => (
                <li key={h} className="flex gap-3 border-b border-forest/15 pb-4 text-[17px] leading-[1.45]">
                  <Icon name="board" size={20} className="mt-0.5 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
            <div>
              <h3 className="eb text-forest-muted">Co mówi literatura</h3>
              <dl className="mt-5 grid gap-6">
                {LITERATURE.map((l) => (
                  <div key={l.value} className="flex flex-col">
                    <dt className="hd num text-[48px]">{l.value}</dt>
                    <dd className="text-[16px]">{l.label}</dd>
                    <dd className="mt-1">
                      <SourceLine tone="onCream">{l.src}</SourceLine>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>

        {/* 08 KOWR CTA: forest block for words, a band of the field pattern for image */}
        <section aria-labelledby="pilot-title" className="bg-forest text-cream">
          <HeroFields parcels={DEMO_PARCELS} tone="color" focus={[0.62, 0.5]} seed={3} className="h-36 md:h-52" />
          <div className="mx-auto max-w-6xl px-5 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
            <Eyebrow className="text-cream-muted">08 · Pilotaż KOWR</Eyebrow>
            <h2 id="pilot-title" className="hd mt-4 max-w-5xl text-[44px] md:text-[80px]">
              Dajcie nam jeden oddział KOWR.
            </h2>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.5] md:text-[20px]">
              Zindeksujemy jego dzierżawy i tej wiosny sprawdzimy 10 miejsc w terenie, razem ze spółką wodną. KOWR ma{" "}
              <span className="num">{FACTS.kowrHa}</span> gruntów. Jeden oddział wystarczy na start.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button tone="onForest" href="/analiza">
                Sprawdź działkę
              </Button>
              <Button variant="secondary" tone="onForest" href="/mapa">
                Zobacz miejsca
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
