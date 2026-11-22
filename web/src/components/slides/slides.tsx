"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Logo } from "@/components/brand/Logo";
import { PointCloud } from "@/components/brand/PointCloud";
import { StateTiles } from "@/components/brand/StateTiles";
import { Button, SourceLine } from "@/components/brand/ui";
import { CROPS } from "@/lib/analiza";
import {
  FACTS,
  GMINA,
  LEGAL,
  REFUSAL_LABEL,
  SOURCES_MAP,
  TAGLINE_PL,
  summary,
  type RefusalCode,
} from "@/lib/traktor";

/* ---------- helpers ---------- */
const nbsp = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
/** Parcel for the demo fallback: real ULDK id from the /mapa example. */
const FALLBACK_PARCEL = "040307_2.0023.306/2";
/** KOWR area as stated in the official task description (pitch kit: 1,324 mln ha). */
const KOWR_HA_BRIEF = "ok. 1,4 mln ha";

function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`absolute inset-0 px-16 pt-28 pb-24 ${className}`}>{children}</div>;
}
function Sub({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[22px] leading-[1.4] opacity-85 ${className}`}>{children}</p>;
}

/* ---------- 01 Title ---------- */
function Title({ active }: { active: boolean }) {
  return (
    <>
      <div className="absolute inset-0">{active && <PointCloud water={0.7} />}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/80 to-forest/10" />
      <Shell className="flex flex-col justify-center">
        <div className="rise">
          <Logo height={56} color="cream" />
        </div>
        <h1 className="hd rise mt-14 max-w-[1150px] text-[120px]">{TAGLINE_PL}</h1>
        <p className="sh rise mt-6 text-[36px]">Asystent wody dla jednej działki rolnej.</p>
        <p className="eb rise mt-16 text-[14px] opacity-85">HackNation 2026 · KOWR „Zatrzymaj wodę, chroń plony”</p>
      </Shell>
    </>
  );
}

/* ---------- 02 Problem ---------- */
function Problem() {
  const stats: { v: string; l: string; s: string; icon: IconName }[] = [
    { v: "394 gminy", l: "z suszą w zbożach jarych w 2025 r. (16%)", s: "IUNG", icon: "drought" },
    { v: FACTS.drainedHa, l: "zmeliorowanych użytków rolnych", s: "NIK / GUS", icon: "ditch" },
    { v: "do 3 000 zł/ha", l: "pomocy suszowej, wypłacanej po stracie", s: "pomoc suszowa 2024", icon: "tractor" },
    { v: "EMSR756", l: "powódź, wrzesień 2024", s: "Copernicus EMS", icon: "storm" },
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Za dużo wody, potem za mało.</h2>
      <div className="mt-14 grid grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.v} className="rise border-t-2 border-forest pt-6">
            <Icon name={s.icon} size={32} className={s.icon === "storm" ? "text-water" : ""} />
            <p className="hd num mt-6 text-[60px]">{s.v}</p>
            <p className="mt-3 text-[20px] leading-[1.4]">{s.l}</p>
            <p className="mt-3 text-[13px] opacity-85">Źródło: {s.s}</p>
          </div>
        ))}
      </div>
      <div className="rise mt-auto max-w-[1300px] space-y-2">
        <p className="sh text-[34px]">Dane o wodzie leżą w osobnych serwisach.</p>
        <p className="sh text-[34px]">Rolnik nie jest analitykiem GIS.</p>
      </div>
    </Shell>
  );
}

/* ---------- 03 What the farmer does ---------- */
function Steps() {
  const steps: [string, string, string][] = [
    ["01", "Działka", "Numer ewidencyjny albo klik na mapie."],
    ["02", "Uprawa", `Jedna z ${CROPS.length} upraw na liście.`],
    ["03", "Data", "Dziś albo dowolny dzień do 10 lat wstecz."],
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Trzy pola. Jeden raport.</h2>
      <div className="mt-14 grid grid-cols-[1fr_1fr_1fr_1.15fr] gap-6">
        {steps.map(([n, t, d]) => (
          <div key={n} className="rise rounded-[4px] border-[1.5px] border-forest/30 p-8">
            <p className="eb num opacity-85">{n}</p>
            <p className="hd mt-4 text-[52px]">{t}</p>
            <p className="mt-4 text-[20px] leading-[1.45]">{d}</p>
          </div>
        ))}
        <div className="rise rounded-[4px] bg-forest p-8 text-cream">
          <Icon name="pin" size={28} />
          <p className="hd mt-4 text-[52px]">Raport</p>
          <ul className="mt-4 space-y-1.5 text-[18px] leading-[1.4]">
            <li>Stan wody na działce</li>
            <li>Przyczyny niedoboru</li>
            <li>Działania w kolejności</li>
            <li>Źródła z datą</li>
            <li>Poziom niepewności</li>
            <li>Druk albo PDF</li>
          </ul>
        </div>
      </div>
      <p className="rise mt-auto text-[22px] leading-[1.45]">
        Bez konta. Bez danych osobowych. Wynik liczony z danych pobranych w chwili zapytania.
      </p>
    </Shell>
  );
}

/* ---------- 04 How it decides ---------- */
function Chain() {
  const chain: { t: string; d: string; src: string }[] = [
    { t: "Ocena", d: "Bilans wody 60 dni i sezon na tle 10 lat. Stan roślin z satelity.", src: "Open-Meteo ERA5 · Sentinel-2" },
    { t: "Przyczyny", d: "Brak opadu, słaba retencja gleby, szybki odpływ, wrażliwa faza uprawy.", src: "ERA5 · IUNG · SoilGrids · NMT" },
    { t: "Retencja", d: "Zastawka na rowie, oczko w obniżeniu, pas buforowy.", src: "BDOT10k · NMT 1 m" },
    { t: "Agrotechnika", d: "Międzyplon, mulcz, uprawa uproszczona, materia organiczna.", src: "gleba · uprawa" },
    { t: "Nawadnianie", d: "ETc − opad − zapas w glebie. Nie teraz, rozważ albo tak, z dawką w mm.", src: "Kc FAO-56 · ET₀" },
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Najpierw przyczyna, potem rada.</h2>
      <Sub className="rise mt-4">Kolejność z Załącznika 1 do zadania. Nawadnianie jest opcjonalne.</Sub>
      <ol className="mt-12 grid grid-cols-5 gap-4">
        {chain.map((c, i) => (
          <li key={c.t} className="rise flex flex-col rounded-[4px] border-[1.5px] border-cream/30 p-6">
            <p className="eb num opacity-85">
              {String(i + 1).padStart(2, "0")} {i < chain.length - 1 ? "→" : ""}
            </p>
            <p className="hd mt-3 text-[38px]">{c.t}</p>
            <p className="mt-3 text-[17px] leading-[1.45] opacity-90">{c.d}</p>
            <p className="eb mt-auto pt-5 opacity-85">{c.src}</p>
          </li>
        ))}
      </ol>
      <p className="sh rise mt-auto text-[30px]">Bez przyczyny opartej na danych nie ma rekomendacji.</p>
    </Shell>
  );
}

/* ---------- 05 Data ---------- */
function Data() {
  const cats: { icon: IconName; t: string; src: string[]; use: string }[] = [
    { icon: "drought", t: "Meteorologiczne", src: ["Open-Meteo ERA5, 10 lat", "IMGW-PIB"], use: "opad, ET₀, temperatura, ostrzeżenia" },
    { icon: "lidar", t: "Satelitarne", src: ["Sentinel-2 L2A"], use: "NDVI i NDMI działki na tle lat poprzednich" },
    { icon: "tractor", t: "Glebowe", src: ["IUNG", "SoilGrids"], use: "kategoria gleby, piasek, glina, zapas wody" },
    { icon: "water", t: "Hydrologiczne", src: ["cieki i rowy BDOT10k", "ISOK"], use: "odległość do rowu, strefy zalewowe" },
    { icon: "pin", t: "Przestrzenne", src: ["ULDK", "NMT 1 m", "BDOT10k"], use: "granice działki, spadek, obniżenia" },
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Pięć kategorii danych. Wszystkie darmowe.</h2>
      <div className="mt-12 grid grid-cols-5 gap-5">
        {cats.map((c) => (
          <div key={c.t} className="rise border-t-2 border-forest pt-6">
            <Icon name={c.icon} size={30} className={c.icon === "water" ? "text-water" : ""} />
            <p className="sh mt-5 text-[28px]">{c.t}</p>
            <ul className="mt-4 space-y-1 text-[19px] font-semibold leading-[1.35]">
              {c.src.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="mt-4 text-[16px] leading-[1.45] opacity-85">{c.use}</p>
          </div>
        ))}
      </div>
      <p className="rise mt-auto text-[18px] leading-[1.45] opacity-85">
        Bez płatnych usług i bez kont. Licencje w README: Open-Meteo i SoilGrids CC BY 4.0, GUGiK, IMGW-PIB, IUNG,
        Copernicus.
      </p>
    </Shell>
  );
}

/* ---------- 06 Demo ---------- */
function Demo({ active }: { active: boolean }) {
  const steps = [
    "Jury podaje numer działki. Albo klikamy mapę.",
    "Wybieramy uprawę i datę. Może być sprzed lat.",
    "Analizuj. Lista źródeł pokazuje: pobrano albo brak danych.",
    "Ocena i przyczyny. Każda liczba ma źródło i datę.",
    "Retencja, agrotechnika, nawadnianie.",
    "Raport do druku z poziomem niepewności.",
  ];
  return (
    <>
      <div className="absolute inset-y-0 right-0 w-[46%]">{active && <PointCloud water={0.5} />}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-forest from-55% to-forest/0" />
      <Shell className="flex flex-col">
        <h2 className="hd rise text-[200px] leading-[0.85]">Demo</h2>
        <Sub className="rise mt-4">Na żywo, na działce wskazanej przez jury.</Sub>
        <ol className="mt-10 max-w-[860px] space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="rise flex gap-6 text-[24px] leading-[1.4]">
              <span className="num eb mt-2 w-8 shrink-0 text-[13px] opacity-85">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="rise mt-auto flex items-center gap-6">
          <Button href="/analiza" tone="onForest" className="text-[18px]">
            <Icon name="pin" size={20} /> Otwórz analizę działki
          </Button>
          <p className="text-[15px] opacity-85">
            Działka zapasowa: <span className="num">{FALLBACK_PARCEL}</span>
          </p>
        </div>
      </Shell>
    </>
  );
}

/* ---------- 07 Retention first ---------- */
function Retention() {
  const [mode, setMode] = useState<"TRZYMAJ" | "OTWORZ">("TRZYMAJ");
  const rows = (Object.entries(summary.refusalsByCode) as [RefusalCode, number][]).sort((a, b) => b[1] - a[1]);
  const top = rows.slice(0, 3);
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <Shell className="grid grid-cols-[1.05fr_1fr] gap-16">
      <div className="flex flex-col">
        <h2 className="hd rise text-[72px]">Zatrzymaj wodę tam, gdzie spadła.</h2>
        <ul className="mt-8 space-y-5 text-[20px] leading-[1.45]">
          <li className="rise">
            <p className="sh text-[28px]">Zastawka na rowie</p>
            <p>W suszy trzyma wodę w rowie. Przed burzą rów zostaje pusty.</p>
          </li>
          <li className="rise">
            <p className="sh text-[28px]">Oczko w obniżeniu</p>
            <p>NMT 1 m pokazuje najniższe miejsca działki. Tam zbiera się woda.</p>
          </li>
          <li className="rise">
            <p className="sh text-[28px]">Międzyplon</p>
            <p>Okryta gleba traci mniej wody.</p>
          </li>
        </ul>
        <div className="rise mt-auto" data-noadvance>
          <StateTiles active={mode} onChange={setMode} size="sm" />
        </div>
      </div>
      <div className="flex flex-col">
        <p className="eb rise opacity-85">Przykład: {GMINA.name} · /mapa</p>
        <p className="hd num rise mt-5 text-[96px]">
          {nbsp(summary.pointsAnalysed)} <span className="text-agri">→ {summary.sitesAccepted}</span>
        </p>
        <p className="sh rise text-[26px]">punktów na rowach → miejsc bezpiecznych</p>
        <ul className="mt-8 space-y-4">
          {top.map(([code, n]) => (
            <li key={code} className="rise">
              <div className="flex justify-between text-[18px]">
                <span>{REFUSAL_LABEL[code]}</span>
                <span className="num font-semibold">{nbsp(n)}</span>
              </div>
              <div className="mt-1.5 h-3 bg-forest/8">
                <div className="h-full bg-terra" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="rise mt-6 text-[20px] leading-[1.4]">
          Większość punktów nie przyjmie zastawki. Każda odmowa ma powód.
        </p>
        <SourceLine className="mt-auto">{SOURCES_MAP}</SourceLine>
      </div>
    </Shell>
  );
}

/* ---------- 08 Honest report ---------- */
function Honest() {
  const report: [string, string][] = [
    ["Źródła", "Każda liczba z nazwą źródła i datą pobrania."],
    ["Niepewność", "Poziom: niski, średni albo wysoki. Zależy od braków w danych."],
    ["Braki", "Podane wprost, np. „Brak danych satelitarnych: zachmurzenie”."],
    ["Szacunki", "Retencja i dawki jako zakres. Progi oznaczone „do kalibracji”."],
    ["Plon", "Nie obiecujemy wzrostu plonu. Zmierzy go pilot."],
  ];
  return (
    <Shell className="grid grid-cols-[1.15fr_0.85fr] gap-16">
      <div className="flex flex-col">
        <h2 className="hd rise text-[88px]">Raport mówi, czego nie wie.</h2>
        <ul className="mt-10 space-y-4">
          {report.map(([t, d]) => (
            <li key={t} className="rise grid grid-cols-[180px_1fr] gap-4 border-b border-forest/15 pb-3 text-[20px] leading-[1.4]">
              <span className="font-semibold">{t}</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-6">
        <div className="rise rounded-[4px] bg-cream-deep p-7">
          <p className="eb opacity-85">Ścieżka prawna zastawki</p>
          <p className="mt-3 text-[20px] leading-[1.45]">{LEGAL.permit}</p>
          <p className="mt-2 text-[18px] leading-[1.45] opacity-85">{LEGAL.maintenance}</p>
          <p className="sh mt-4 text-[24px]">{LEGAL.siteVisit}</p>
        </div>
        <div className="rise mt-auto rounded-[4px] border-[1.5px] border-forest/30 p-7">
          <p className="eb opacity-85">Gdzie jest AI</p>
          <p className="mt-3 text-[18px] leading-[1.45]">
            Liczby i reguły są deterministyczne. Model językowy może tylko opisać wynik prostym polskim. Liczb nie zmienia.
          </p>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- 09 Scale ---------- */
function Scale() {
  const rows: [string, string][] = [
    ["Zasięg", "Każda działka w ULDK"],
    ["Dane", "Publiczne, bez licencji"],
    ["Czas analizy", "Cel: ≤ 30 s"],
    ["Pamięć podręczna", "Działka · uprawa · data"],
    ["Pierwszy użytkownik", `KOWR, ${KOWR_HA_BRIEF}`],
  ];
  return (
    <Shell className="grid grid-cols-[1fr_1fr] gap-20">
      <div className="flex flex-col">
        <h2 className="hd rise text-[96px]">Każda działka w Polsce.</h2>
        <p className="rise mt-8 max-w-[640px] text-[22px] leading-[1.45]">
          Nie znaleźliśmy narzędzia, które łączy pięć kategorii danych dla jednej działki i jednej uprawy.
        </p>
        <p className="rise mt-5 max-w-[640px] text-[22px] leading-[1.45]">
          Retencja idzie przed nawadnianiem. Najpierw zatrzymujemy wodę, która już spadła.
        </p>
        <p className="rise mt-auto text-[13px] opacity-85">Powierzchnia KOWR wg opisu zadania.</p>
      </div>
      <dl className="flex flex-col justify-center">
        {rows.map(([k, v]) => (
          <div key={k} className="rise flex items-baseline justify-between gap-6 border-b border-forest/15 py-4">
            <dt className="text-[19px] opacity-85">{k}</dt>
            <dd className="sh num text-right text-[34px]">{v}</dd>
          </div>
        ))}
      </dl>
    </Shell>
  );
}

/* ---------- 10 Ask ---------- */
function Ask({ active }: { active: boolean }) {
  const path: [string, string, string][] = [
    ["01", "Pilot z KOWR", "Jeden oddział i jego działki. Raporty porównane z obserwacją w polu."],
    ["02", "Kalibracja z IUNG", "Progi bilansu wody i reguły przyczyn dla każdej kategorii gleby."],
    ["03", "Integracja", "API dla systemów KOWR. Raport PDF dla dzierżawcy."],
  ];
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-[40%] opacity-60">{active && <PointCloud water={0.8} />}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-forest from-55% to-forest/30" />
      <Shell className="flex flex-col">
        <div className="grid grid-cols-3 gap-6">
          {path.map(([n, t, d], i) => (
            <div key={n} className="rise border-t-2 border-cream/60 pt-5">
              <p className="eb num opacity-85">
                {n} {i < 2 ? "→" : ""}
              </p>
              <p className="hd mt-3 text-[44px]">{t}</p>
              <p className="mt-3 text-[18px] leading-[1.45] opacity-85">{d}</p>
            </div>
          ))}
        </div>
        <p className="eb rise mt-20 opacity-85">Prośba</p>
        <p className="sh rise mt-4 max-w-[1300px] text-[54px] leading-[1.1]">
          „Dajcie nam jeden oddział KOWR. Policzymy jego działki i w sezonie porównamy raporty z polem.”
        </p>
        <div className="rise mt-auto flex items-end justify-between pb-6">
          <Logo height={44} color="cream" />
          <p className="sh text-[26px] opacity-90">{TAGLINE_PL}</p>
        </div>
      </Shell>
    </>
  );
}

/* ---------- registry ---------- */
export type SlideDef = {
  id: string;
  eyebrow: string;
  /** spoken by screen readers on slide change */
  title: string;
  ground: "forest" | "cream";
  Body: (p: { active: boolean }) => ReactNode;
  notes: string;
};

export const SLIDES: SlideDef[] = [
  {
    id: "title",
    eyebrow: "01 — TRAKTOR",
    title: "TRAKTOR. Niech ziemia zatrzyma swoją wodę.",
    ground: "forest",
    Body: Title,
    notes: "TRAKTOR to asystent wody dla jednej działki. Podajesz działkę, uprawę i datę. Dostajesz raport: co się dzieje z wodą, dlaczego i co zrobić.",
  },
  {
    id: "problem",
    eyebrow: "02 — Problem",
    title: "Za dużo wody, potem za mało.",
    ground: "cream",
    Body: Problem,
    notes: `W 2025 r. IUNG wskazał suszę w 394 gminach, to 16%. ${FACTS.drainedHa} jest zmeliorowanych. Pomoc suszowa, do 3 000 zł/ha, przychodzi po stracie. We wrześniu 2024 r. była powódź, EMSR756. Dane o wodzie są w osobnych serwisach. Rolnik nie jest analitykiem GIS.`,
  },
  {
    id: "steps",
    eyebrow: "03 — Co robi rolnik",
    title: "Trzy pola. Jeden raport.",
    ground: "cream",
    Body: Steps,
    notes: `Trzy pola. Numer działki albo klik. Uprawa z listy ${CROPS.length}. Data: dziś albo do 10 lat wstecz. Wynik to raport. Wszystko liczymy z danych pobranych w chwili zapytania.`,
  },
  {
    id: "chain",
    eyebrow: "04 — Jak decyduje",
    title: "Najpierw przyczyna, potem rada.",
    ground: "forest",
    Body: Chain,
    notes: "Kolejność z Załącznika 1. Ocena, przyczyny, retencja, agrotechnika, nawadnianie. Każdy krok ma swoje dane. Nie dajemy rady bez przyczyny opartej na danych.",
  },
  {
    id: "data",
    eyebrow: "05 — Dane",
    title: "Pięć kategorii danych. Wszystkie darmowe.",
    ground: "cream",
    Body: Data,
    notes: "Pięć kategorii z zadania. Meteo: Open-Meteo ERA5, 10 lat, i IMGW. Satelita: Sentinel-2. Gleba: IUNG i SoilGrids. Hydrologia: rowy BDOT10k i ISOK. Przestrzenne: ULDK, NMT 1 m, BDOT10k. Wszystko darmowe, bez kont.",
  },
  {
    id: "demo",
    eyebrow: "06 — Demo",
    title: "Demo na żywo.",
    ground: "forest",
    Body: Demo,
    notes: `Kliknij przycisk. Poproś jury o numer działki i datę. Pokaż listę źródeł podczas analizy, potem zakładki w kolejności i raport. Jeśli sieć zawiedzie: działka ${FALLBACK_PARCEL}. Wróć klawiszem 7.`,
  },
  {
    id: "retention",
    eyebrow: "07 — Retencja",
    title: "Zatrzymaj wodę tam, gdzie spadła.",
    ground: "cream",
    Body: Retention,
    notes: `Najpierw zatrzymać wodę, która spadła. Zastawka: TRZYMAJ w suszy, OTWÓRZ przed burzą. Oczko w obniżeniu. Międzyplon. Przykład spod Bydgoszczy: ${nbsp(summary.pointsAnalysed)} punktów na rowach, ${summary.sitesAccepted} bezpiecznych. Każda odmowa ma powód.`,
  },
  {
    id: "honest",
    eyebrow: "08 — Uczciwy raport",
    title: "Raport mówi, czego nie wie.",
    ground: "cream",
    Body: Honest,
    notes: "Każda liczba ma źródło i datę. Raport podaje poziom niepewności i braki danych. Szacunki jako zakres. Zastawka wymaga pozwolenia wodnoprawnego, art. 389 pkt 6, i wizji lokalnej. Model językowy liczb nie zmienia.",
  },
  {
    id: "scale",
    eyebrow: "09 — Skala",
    title: "Każda działka w Polsce.",
    ground: "cream",
    Body: Scale,
    notes: `Działa dla każdej działki w ULDK. Dane publiczne. Cel: wynik w 30 s. Wyniki zapisujemy dla trójki działka, uprawa, data. Pierwszy użytkownik: KOWR, ${KOWR_HA_BRIEF} według opisu zadania.`,
  },
  {
    id: "ask",
    eyebrow: "10 — Następny krok",
    title: "Następny krok: pilot z KOWR.",
    ground: "forest",
    Body: Ask,
    notes: "Pilot w jednym oddziale KOWR. Kalibracja progów z IUNG. Integracja z systemami KOWR. Prośba: jeden oddział, jeden sezon, raporty porównane z polem.",
  },
];

export const TOTAL = SLIDES.length;
