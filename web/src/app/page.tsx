import { Logo } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/brand/Icon";
import { PointCloud } from "@/components/brand/PointCloud";
import { Button, Card, Eyebrow, ProgressRail, SourceLine } from "@/components/brand/ui";
import { BoardStates } from "@/components/landing/BoardStates";
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
    text: "Pracujemy na rowach, które już są. Publiczne dane, bez nowych czujników w polu.",
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
    text: "Profil rowu co 5 m z NMT 1 m. Mówimy gdzie, ile centymetrów i kiedy.",
  },
];

const SOURCES: { name: string; role: string; icon: IconName }[] = [
  { name: "BDOT10k", role: "Rowy, drogi i budynki", icon: "ditch" },
  { name: "NMT LiDAR 1 m (GUGiK)", role: "Wysokość terenu i dna rowu", icon: "lidar" },
  { name: "ULDK", role: "Granice działek: czyja woda, czyje pole", icon: "pin" },
  { name: "IMGW-PIB", role: "Ostrzeżenia meteo i hydro dla powiatu", icon: "storm" },
  { name: "Open-Meteo", role: "Prognoza opadu i parowanie ET₀", icon: "water" },
  { name: "ISOK", role: "Strefy zagrożenia powodziowego", icon: "water" },
  { name: "IUNG-PIB", role: "Podatność gleby na suszę", icon: "drought" },
];

const HONEST = [
  "Zakresy, nie pojedyncze liczby.",
  "Odmowa zamiast zgadywania. Każda odmowa ma powód.",
  `Zastawka wymaga pozwolenia wodnoprawnego (art. 389 pkt 6 Prawa wodnego).`,
  LEGAL.siteVisit + " Każde miejsce sprawdza człowiek w terenie.",
  "Nie obiecujemy wzrostu plonów. Zmierzy to pilotaż.",
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
      <SiteNav />
      <main className="flex-1">
        {/* 01 HERO: layered Blender render, scroll parallax (static composite under reduced motion) */}
        <ParallaxHero />

        {/* 02 PROBLEM */}
        <Section
          ground="cream"
          eyebrow="02 — Problem"
          title="Za dużo wody, potem za mało."
          lead="Ten sam rów odpowiada za oba problemy. Wiosną wyprowadza wodę z pola. Latem pole schnie."
        >
          <dl className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEM.map((p) => (
              <div key={p.value} className="border-t-2 border-forest pt-5">
                <dt className="hd num text-[44px] md:text-[52px]">{p.value}</dt>
                <dd className="mt-3 text-[16px] leading-[1.45]">{p.label}</dd>
                <dd className="mt-2 text-[11px] opacity-70">Źródło: {p.src}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* 03 ONE BOARD, TWO STATES */}
        <Section
          ground="cream-deep"
          eyebrow="03 — Jedna zastawka. Dwa tryby."
          title="Jedna zastawka. Dwa tryby."
          lead="Drewniana zastawka w stalowej ramie, w rowie, który już istnieje. Zawsze tylko jeden tryb: TRZYMAJ albo OTWÓRZ."
        >
          <BoardStates />
        </Section>

        {/* 04 JAK TO DZIAŁA */}
        <Section
          id="jak"
          ground="cream"
          eyebrow="04 — Jak to działa"
          title="Od rowu do decyzji w siedmiu krokach."
          lead="Mapa rowów, teren z LiDAR, ocena każdego miejsca, kontrola bezpieczeństwa. Potem montaż i jedna decyzja dziennie: TRZYMAJ albo OTWÓRZ."
        >
          <div className="overflow-x-auto pb-2">
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
                  <p className="eb mt-1 opacity-60">{p.en}</p>
                </div>
                <p className="text-[16px] leading-[1.5]">{p.text}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* 05 ODMOWA */}
        <Section
          ground="forest"
          eyebrow="05 — Odmowa"
          title="Większość miejsc nie nadaje się na zastawkę."
          lead="TRAKTOR mówi nie i mówi dlaczego. Droga, budynek, strefa zalewowa, woda na działce sąsiada: takie miejsce odpada."
        >
          <RefusalCounter points={summary.pointsAnalysed} accepted={summary.sitesAccepted} rows={rows} />
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <p className="eb opacity-75">dane demonstracyjne · {GMINA.name}</p>
            <Button tone="onForest" href="/mapa">
              Zobacz mapę miejsc
            </Button>
          </div>
          <SourceLine className="mt-6">{DEMO_NOTE}</SourceLine>
        </Section>

        {/* 06 DANE */}
        <Section
          ground="cream"
          eyebrow="06 — Dane"
          title="Siedem publicznych źródeł. Zero licencji."
          lead="Wszystko, czego używamy, jest bezpłatne i dostępne dla całej Polski."
        >
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <ul className="grid gap-px overflow-hidden rounded-[4px] border border-forest/15 bg-forest/15 sm:grid-cols-2">
              {SOURCES.map((s) => (
                <li key={s.name} className="flex gap-4 bg-cream p-5">
                  <Icon name={s.icon} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="sh text-[18px]">{s.name}</p>
                    <p className="mt-1 text-[15px] leading-[1.45] opacity-85">{s.role}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="rounded-[4px] bg-forest p-7 text-cream">
              <Eyebrow className="opacity-80">Gdzie jest AI</Eyebrow>
              <p className="sh mt-4 text-[26px]">Hydrologia jest deterministyczna. Celowo.</p>
              <p className="mt-4 text-[16px] leading-[1.5]">
                Geometria i reguły liczą się zawsze tak samo. Na zmyśloną powódź nikogo nie stać.
              </p>
              <p className="mt-3 text-[16px] leading-[1.5]">
                Model językowy tylko tłumaczy wynik na prosty polski. Strażnik liczb sprawdza, że nie zmienił żadnej
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
        <Section ground="cream-deep" eyebrow="07 — Uczciwie" title="Co wiemy. Czego nie obiecujemy.">
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
              <Eyebrow className="opacity-75">Co mówi literatura</Eyebrow>
              <dl className="mt-5 grid gap-6">
                <div>
                  <dt className="hd num text-[48px]">−30,5%</dt>
                  <dd className="text-[16px]">odpływu z drenowanego pola (~71 mm)</dd>
                </div>
                <div>
                  <dt className="hd num text-[48px]">−33,6%</dt>
                  <dd className="text-[16px]">azotanów w odpływie</dd>
                  <dd className="mt-1 text-[11px] opacity-70">Źródło: Kęsicka i in. 2022, PLoS ONE</dd>
                </div>
                <div>
                  <dt className="hd num text-[48px]">23% → 41%</dt>
                  <dd className="text-[16px]">wykorzystanej retencji rowu z zastawkami</dd>
                  <dd className="mt-1 text-[11px] opacity-70">Źródło: Bajkowski i in. 2024, JWLD</dd>
                </div>
              </dl>
            </div>
          </div>
        </Section>

        {/* 08 KOWR CTA */}
        <section className="relative overflow-hidden bg-forest text-cream">
          <div className="absolute inset-x-0 top-0 h-40 opacity-60 md:h-56">
            <PointCloud water={0.5} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-transparent to-forest md:h-56" />
          <div className="relative mx-auto max-w-6xl px-5 pt-44 pb-24 md:px-8 md:pt-60 md:pb-32">
            <Eyebrow className="opacity-80">08 — Pilotaż KOWR</Eyebrow>
            <h2 className="hd mt-4 max-w-5xl text-[44px] md:text-[80px]">Dajcie nam jeden oddział KOWR.</h2>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.5] md:text-[20px]">
              Zindeksujemy jego dzierżawy i zweryfikujemy 10 miejsc ze spółką wodną tej wiosny.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button tone="onForest" href="/analiza">
                Sprawdź działkę
              </Button>
              <Button variant="secondary" tone="onForest" href="/mapa">
                Zobacz miejsca
              </Button>
              <Button variant="secondary" tone="onForest" href="/slides">
                Prezentacja
              </Button>
            </div>
            <div className="mt-20">
              <Logo color="cream" height={40} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
