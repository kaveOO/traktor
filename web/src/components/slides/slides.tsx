"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/brand/Icon";
import { Logo } from "@/components/brand/Logo";
import { PointCloud } from "@/components/brand/PointCloud";
import { OrderBadge, StateTiles } from "@/components/brand/StateTiles";
import { Button, ProgressRail, SourceLine } from "@/components/brand/ui";
import {
  DEMO_NOTE,
  FACTS,
  FEATURED_SITE_ID,
  GMINA,
  LEGAL,
  REFUSAL_LABEL,
  SOURCES_MAP,
  TAGLINE_EN,
  TAGLINE_PL,
  decideOrder,
  fmtRange,
  getScenario,
  getSite,
  summary,
  type RefusalCode,
} from "@/lib/traktor";

/* ---------- helpers ---------- */
const nbsp = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const site = getSite(FEATURED_SITE_ID)!;
const maxCrest = site.crests.find((c) => c.heightCm === site.maxAcceptedCrestCm)!;

function Shell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`absolute inset-0 px-16 pt-28 pb-24 ${className}`}>{children}</div>;
}
function En({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[20px] leading-[1.4] opacity-65 ${className}`}>{children}</p>;
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
        <h1 className="hd rise mt-14 max-w-[1100px] text-[132px]">Let the land hold its water.</h1>
        <p className="sh rise mt-6 text-[40px]">{TAGLINE_PL}</p>
        <p className="eb rise mt-16 text-[14px] opacity-80">
          Hackathon final · Jury pitch · KOWR „Zatrzymaj wodę, chroń plony”
        </p>
      </Shell>
    </>
  );
}

/* ---------- 02 Problem ---------- */
function Problem() {
  const stats: { v: string; l: string; s: string; icon: IconName }[] = [
    { v: "6,4 mln ha", l: "zmeliorowanych użytków rolnych", s: "NIK / GUS", icon: "ditch" },
    { v: "394 gminy", l: "z suszą w zbożach jarych w 2025 (16%)", s: "IUNG", icon: "drought" },
    { v: "do 3 000 zł/ha", l: "pomocy suszowej, wypłacanej po stracie", s: "pomoc suszowa 2024", icon: "tractor" },
    { v: "EMSR756", l: "powódź, wrzesień 2024", s: "Copernicus EMS", icon: "storm" },
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Za dużo, potem za mało.</h2>
      <En className="rise mt-4">Too much, then too little — the same ditch.</En>
      <div className="mt-auto grid grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.v} className="rise border-t-2 border-forest pt-6">
            <Icon name={s.icon} size={32} className={s.icon === "storm" ? "text-water" : ""} />
            <p className="hd num mt-6 text-[64px]">{s.v}</p>
            <p className="mt-3 text-[20px] leading-[1.4]">{s.l}</p>
            <p className="mt-3 text-[13px] opacity-60">Źródło: {s.s}</p>
          </div>
        ))}
      </div>
      <p className="sh rise mt-12 text-[30px]">
        Ten sam rów odprowadza wodę wiosną i nie ma jej w sierpniu. Działa tylko w jedną stronę: na zewnątrz.
      </p>
    </Shell>
  );
}

/* ---------- 03 Insight ---------- */
function DitchProfile({ mode }: { mode: "TRZYMAJ" | "OTWORZ" }) {
  // side view of a ditch: bank above, bed sloping downstream (left -> right), board at x = 470
  const bedY = (x: number) => 190 + ((x - 40) / 680) * 90;
  const bankY = (x: number) => 70 + ((x - 40) / 680) * 90;
  const bx = 470;
  const hold = mode === "TRZYMAJ";
  const level = hold ? 0 : 85; // translateY of the water rect
  const bed = Array.from({ length: 18 }, (_, i) => 40 + (i * 680) / 17).map((x) => `${x},${bedY(x)}`).join(" ");
  return (
    <svg viewBox="0 0 760 360" className="w-full" role="img" aria-label="Przekrój podłużny rowu z zastawką">
      <defs>
        <clipPath id="deck-up">
          <polygon
            points={`40,0 ${bx - 4},0 ${bx - 4},${bedY(bx - 4)} ${bed
              .split(" ")
              .filter((p) => Number(p.split(",")[0]) < bx - 4)
              .reverse()
              .join(" ")}`}
          />
        </clipPath>
      </defs>
      {/* field / bank */}
      <polygon points={`40,${bankY(40)} 720,${bankY(720)} 720,340 40,340`} fill="#EFE6D3" />
      <line x1="40" y1={bankY(40)} x2="720" y2={bankY(720)} stroke="#4F7A3A" strokeWidth="3" />
      {/* channel cut */}
      <polygon points={`40,${bankY(40) + 6} 720,${bankY(720) + 6} ${bed.split(" ").reverse().join(" ")}`} fill="#F3ECDD" />
      {/* held water upstream of the board */}
      <g clipPath="url(#deck-up)">
        <rect
          className="deck-water"
          x="40"
          y="150"
          width={bx}
          height="200"
          fill="#3B7FA3"
          opacity="0.85"
          style={{ transform: `translateY(${level}px)` }}
        />
      </g>
      {/* low flow along the bed, always there */}
      <polyline points={bed.split(" ").map((p) => { const [x, y] = p.split(",").map(Number); return `${x},${y - 5}`; }).join(" ")} fill="none" stroke="#3B7FA3" strokeWidth="6" opacity="0.85" />
      {/* bed */}
      <polyline points={bed} fill="none" stroke="#6B4A2E" strokeWidth="4" />
      {/* the board */}
      <rect
        className="deck-board"
        x={bx - 6}
        y={150}
        width="12"
        height={bedY(bx) - 150}
        fill="#6B4A2E"
        style={{ transform: `translateY(${hold ? 0 : bedY(bx) - 150 - 14}px)` }}
      />
      <rect x={bx - 10} y={bankY(bx) - 6} width="20" height="10" fill="#1F3A22" />
      <text x={bx + 18} y={bankY(bx) - 14} className="eb" fill="#1F3A22">
        Zastawka
      </text>
      <text x="48" y={bankY(40) - 14} className="eb" fill="#1F3A22">
        Pole
      </text>
      <text x="640" y="330" className="eb" fill="#1F3A22">
        Odpływ →
      </text>
      <text x="60" y="330" className="eb" fill="#3B7FA3">
        {hold ? "Woda zatrzymana w rowie" : "Rów opróżniony przed burzą"}
      </text>
    </svg>
  );
}

function Insight() {
  const [mode, setMode] = useState<"TRZYMAJ" | "OTWORZ">("TRZYMAJ");
  return (
    <Shell className="grid grid-cols-[1fr_1.1fr] gap-16">
      <div className="flex flex-col">
        <h2 className="hd rise text-[110px]">Jedna zastawka. Dwa tryby.</h2>
        <En className="rise mt-5">One board. Two states.</En>
        <p className="rise mt-8 max-w-[560px] text-[22px] leading-[1.45]">
          Drewniana deska w istniejącym rowie melioracyjnym. Bez koparki, bez nowego zbiornika. W suszy trzyma wodę
          przy korzeniach. Przed burzą zwalnia miejsce w rowie.
        </p>
        <div className="rise mt-auto" data-noadvance>
          <StateTiles active={mode} onChange={setMode} size="md" showEnglish />
          <p className="mt-3 text-[13px] opacity-60">Kliknij, aby przełączyć.</p>
        </div>
      </div>
      <div className="rise flex flex-col justify-center" data-noadvance onClick={() => setMode((m) => (m === "TRZYMAJ" ? "OTWORZ" : "TRZYMAJ"))}>
        <DitchProfile mode={mode} />
        <p className="mt-2 text-[13px] opacity-60">Schemat, nie w skali.</p>
      </div>
    </Shell>
  );
}

/* ---------- 04 How it works ---------- */
function How() {
  const pillars: { icon: IconName; t: string; en: string; d: string }[] = [
    { icon: "lidar", t: "Uziemione", en: "Grounded", d: "Istniejące rowy z BDOT10k i teren z NMT LiDAR 1 m. Żadnych nowych wykopów." },
    { icon: "board", t: "Odwracalne", en: "Reversible", d: "Deska w górę, deska w dół. Jedno polecenie na tydzień. Nic nie betonujemy." },
    { icon: "pin", t: "Precyzyjne", en: "Precise", d: "Każde miejsce ma wysokość deski, objętość w przedziale i powód odmowy." },
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[96px]">Od rowu do decyzji.</h2>
      <En className="rise mt-4">From every ditch to one weekly order.</En>
      <div className="rise mt-16 [&_li>span:last-child]:text-[15px]">
        <ProgressRail current={8} tone="onForest" />
      </div>
      <div className="mt-auto grid grid-cols-3 gap-6">
        {pillars.map((p) => (
          <div key={p.t} className="rise rounded-[4px] border-[1.5px] border-cream/30 p-8">
            <Icon name={p.icon} size={32} />
            <p className="hd mt-6 text-[48px]">{p.t}</p>
            <p className="eb mt-2 opacity-60">{p.en}</p>
            <p className="mt-4 text-[19px] leading-[1.45] opacity-90">{p.d}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

/* ---------- 05 Refusal ---------- */
function Refusal() {
  const rows = (Object.entries(summary.refusalsByCode) as [RefusalCode, number][]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]));
  const refused = rows.reduce((t, r) => t + r[1], 0);
  return (
    <Shell className="grid grid-cols-[1fr_1fr] gap-20">
      <div className="flex flex-col">
        <p className="eb rise opacity-70">{GMINA.name} · dane demonstracyjne</p>
        <p className="hd num rise mt-6 text-[150px]">{nbsp(summary.pointsAnalysed)}</p>
        <p className="sh rise text-[32px]">punktów na rowach</p>
        <p className="hd num rise mt-8 text-[150px] text-agri">→ {summary.sitesAccepted}</p>
        <p className="sh rise text-[32px]">bezpiecznych miejsc</p>
        <p className="rise mt-auto max-w-[620px] text-[24px] leading-[1.4]">
          Większość miejsc nie przyjmie zastawki. TRAKTOR mówi „nie” i mówi dlaczego.
        </p>
        <En className="rise mt-2 text-[18px]">Most places cannot take a board. TRAKTOR says no, and says why.</En>
      </div>
      <div className="flex flex-col justify-center">
        <p className="eb rise mb-6 opacity-70">
          Odrzucone: <span className="num">{nbsp(refused)}</span> · powód odmowy
        </p>
        <ul className="space-y-5">
          {rows.map(([code, n]) => (
            <li key={code} className="rise">
              <div className="flex justify-between text-[19px]">
                <span>{REFUSAL_LABEL[code]}</span>
                <span className="num font-semibold">{nbsp(n)}</span>
              </div>
              <div className="mt-1.5 h-4 bg-forest/8">
                <div className="h-full bg-terra" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
          <li className="rise pt-3">
            <div className="flex justify-between text-[19px] font-semibold text-agri">
              <span>Przyjęte: miejsce bezpieczne</span>
              <span className="num">{summary.sitesAccepted}</span>
            </div>
            <div className="mt-1.5 h-4 bg-forest/8">
              <div className="h-full bg-agri" style={{ width: `${(summary.sitesAccepted / max) * 100}%` }} />
            </div>
          </li>
        </ul>
        <SourceLine className="mt-8">{SOURCES_MAP}</SourceLine>
        <p className="mt-1 text-[11px] opacity-60">{DEMO_NOTE}</p>
      </div>
    </Shell>
  );
}

/* ---------- 06 Demo ---------- */
function Demo({ active }: { active: boolean }) {
  const steps = [
    `Mapa: ${GMINA.name}, każdy rów. ${nbsp(summary.pointsAnalysed)} punktów → ${summary.sitesAccepted} bezpiecznych.`,
    "Szukamy działki. Jej miejsca się podświetlają.",
    `${FEATURED_SITE_ID}: deska 20 → 40 cm. m³, cofka, ha, dni zapasu. 60 cm: działka sąsiada. Odmowa.`,
    "Polecenie: TRZYMAJ. „Dlaczego?” → KBW −86 mm, brak opadu, gleba kat. I.",
    "Scenariusz: ostrzeżenie burzowe → OTWÓRZ, z terminem i zwolnionymi m³.",
    "Karta miejsca: do druku, ścieżka prawna, „Wymaga wizji lokalnej”.",
  ];
  return (
    <>
      <div className="absolute inset-y-0 right-0 w-[46%]">{active && <PointCloud water={0.5} />}</div>
      <div className="absolute inset-0 bg-gradient-to-r from-forest from-55% to-forest/0" />
      <Shell className="flex flex-col">
        <h2 className="hd rise text-[200px] leading-[0.85]">Demo</h2>
        <En className="rise mt-4">Live, ~1:45. Dane demonstracyjne.</En>
        <ol className="mt-10 max-w-[860px] space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="rise flex gap-6 text-[22px] leading-[1.4]">
              <span className="num eb mt-1.5 w-8 shrink-0 text-[13px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <div className="rise mt-auto">
          <Button href="/mapa?site=S-007&crest=60&scenario=drought-aug" tone="onForest" className="text-[18px]">
            <Icon name="pin" size={20} /> Otwórz mapę: {FEATURED_SITE_ID}
          </Button>
        </div>
      </Shell>
    </>
  );
}

/* ---------- 07 Flip ---------- */
function Flip() {
  const dry = getScenario("drought-aug");
  const wet = getScenario("storm-warning");
  const oDry = decideOrder(site, dry);
  const oWet = decideOrder(site, wet);
  const w = wet.warnings[0];
  const col = (
    o: typeof oDry,
    label: string,
    rows: [string, string][],
    tone: "forest" | "water",
    extra?: ReactNode,
  ) => (
    <div className={`rise rounded-[4px] border-2 p-10 ${tone === "water" ? "border-water" : "border-forest"}`}>
      <p className="eb opacity-70">{label}</p>
      <OrderBadge action={o.action} className="mt-5 !px-5 !py-3 !text-[56px]" />
      <dl className="mt-8 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-forest/15 pb-2 text-[20px]">
            <dt className="opacity-70">{k}</dt>
            <dd className="num font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-6 space-y-1.5 text-[17px] leading-[1.45]">
        {o.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {extra}
      <p className="eb mt-6 opacity-50">Reguła {o.ruleId}</p>
    </div>
  );
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[88px]">Ta sama deska. Inne polecenie.</h2>
      <En className="rise mt-3">
        Same site, same board. The weather flips the order. Miejsce {FEATURED_SITE_ID}, deska {site.maxAcceptedCrestCm} cm.
      </En>
      <div className="mt-10 grid grid-cols-2 gap-8">
        {col(
          oDry,
          "Scenariusz: susza · sierpień",
          [
            ["KBW 60 dni", `${dry.kbw60Mm} mm`],
            ["Opad 72 h", `${dry.precip72hMm} mm`],
            ["Ostrzeżenia IMGW", "brak"],
          ],
          "forest",
        )}
        {col(
          oWet,
          "Scenariusz: ostrzeżenie burzowe",
          [
            ["Ostrzeżenie IMGW", `st. ${w?.level ?? "–"}`],
            ["Opad 72 h", `${wet.precip72hMm} mm`],
            ["Zwolnione w rowie", oWet.capacityFreedM3 ? fmtRange(oWet.capacityFreedM3, "m³") : "–"],
          ],
          "water",
        )}
      </div>
      <p className="mt-auto text-[11px] opacity-60">
        Scenariusze demonstracyjne (nagrania IMGW-PIB, Open-Meteo). Progi do kalibracji. {DEMO_NOTE}
      </p>
    </Shell>
  );
}

/* ---------- 08 Data & honesty ---------- */
function Data() {
  const src: [string, string][] = [
    ["BDOT10k", "rowy, drogi, przepusty, budynki"],
    ["NMT LiDAR 1 m · GUGiK", "teren, spadek, cofka"],
    ["ULDK", "działki ewidencyjne"],
    ["IMGW-PIB", "ostrzeżenia, opady"],
    ["Open-Meteo", "prognoza, ET₀"],
    ["ISOK", "obszary zalewowe"],
    ["IUNG", "susza rolnicza, gleby"],
  ];
  const honest: [string, string][] = [
    ["Przedziały", "Objętość i hektary zawsze jako zakres, nie jedna liczba."],
    ["Odmowy", "Każde odrzucone miejsce ma nazwany powód."],
    ["Ścieżka prawna", LEGAL.permit],
    ["Wizja lokalna", "Każda karta: „Wymaga wizji lokalnej”. Drenaż podziemny oznaczamy do sprawdzenia."],
    ["Bez obietnic plonu", "Nie podajemy wzrostu plonów. Pilot to zmierzy."],
  ];
  return (
    <Shell className="grid grid-cols-[0.9fr_1.1fr] gap-16">
      <div className="flex flex-col">
        <h2 className="hd rise text-[80px]">7 darmowych źródeł publicznych.</h2>
        <En className="rise mt-3">Seven free public datasets. No licences.</En>
        <ul className="mt-8 divide-y divide-forest/15 border-y border-forest/15">
          {src.map(([n, d]) => (
            <li key={n} className="rise flex items-baseline justify-between py-3">
              <span className="sh text-[24px]">{n}</span>
              <span className="text-[16px] opacity-70">{d}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col">
        <p className="hd rise text-[48px]">Uczciwe z założenia</p>
        <En className="rise mt-1 text-[18px]">Honest by design</En>
        <ul className="mt-6 space-y-4">
          {honest.map(([t, d]) => (
            <li key={t} className="rise grid grid-cols-[200px_1fr] gap-4 text-[18px] leading-[1.4]">
              <span className="font-semibold">{t}</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <div className="rise mt-auto rounded-[4px] bg-cream-deep p-6">
          <p className="eb opacity-70">Gdzie jest AI</p>
          <p className="mt-2 text-[18px] leading-[1.45]">
            Geometria i reguły są deterministyczne: nie stać nas na wymyśloną powódź. Prognozy z IMGW i Open-Meteo.
            Model językowy tylko tłumaczy wynik na prosty polski, z kontrolą liczb.
          </p>
        </div>
      </div>
    </Shell>
  );
}

/* ---------- 09 Impact ---------- */
function Block({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rise">
      <p className="eb opacity-70">{title}</p>
      <dl className="mt-4 space-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between border-b border-forest/15 pb-2">
            <dt className="text-[19px] opacity-75">{k}</dt>
            <dd className="hd num text-[44px]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Impact() {
  const perSite: [string, string][] = [
    ["Wysokość deski", `${maxCrest.heightCm} cm`],
    ["Retencja w rowie", fmtRange(maxCrest.storageM3, "m³")],
    ["Cofka", `~${nbsp(maxCrest.backwaterM)} m`],
    ["Nawodnione pasy pól", fmtRange(maxCrest.rehydratedHa, "ha")],
  ];
  const gmina: [string, string][] = [
    ["Bezpieczne miejsca", String(summary.sitesAccepted)],
    ["Retencja łącznie", fmtRange(summary.totalStorageM3, "m³")],
    ["Nawodnione łącznie", fmtRange(summary.totalRehydratedHa, "ha")],
  ];
  const cited: [string, string, string][] = [
    ["−30,5%", "odpływu (~71 mm)", "Kęsicka i in. 2022, PLoS ONE"],
    ["−33,6%", "azotanów", "Kęsicka i in. 2022, PLoS ONE"],
    ["23% → 41%", "wykorzystania pojemności rowu", "Bajkowski i in. 2024, JWLD"],
  ];
  return (
    <Shell className="flex flex-col">
      <h2 className="hd rise text-[88px]">Woda zostaje tam, gdzie spadła.</h2>
      <En className="rise mt-3">What one board, and one gmina, can hold (dane demonstracyjne).</En>
      <div className="mt-10 grid grid-cols-2 gap-16">
        <Block title={`Miejsce ${FEATURED_SITE_ID} · ${site.name} · dane demonstracyjne`} rows={perSite} />
        <Block title={`${GMINA.name} · ${summary.sitesAccepted} miejsc · dane demonstracyjne`} rows={gmina} />
      </div>
      <div className="mt-auto grid grid-cols-3 gap-6 rounded-[4px] bg-cream-deep p-8">
        {cited.map(([v, l, s]) => (
          <div key={v} className="rise">
            <p className="hd num text-[56px] text-water">{v}</p>
            <p className="text-[18px]">{l}</p>
            <p className="mt-1 text-[12px] opacity-60">{s}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] opacity-60">
        Efekty z badań terenowych drenażu sterowanego, nie prognoza dla tej gminy. Bez deklaracji plonów. {DEMO_NOTE}
      </p>
    </Shell>
  );
}

/* ---------- 10 Path & ask ---------- */
function Ask({ active }: { active: boolean }) {
  const path: [string, string, string][] = [
    ["01", "Pilot KOWR", `${FACTS.kowrHa} gruntów państwowych. Jeden właściciel, jedna decyzja.`],
    ["02", "Spółki wodne", "Utrzymanie rowów (art. 205). Zastawki w sieci, którą już prowadzą."],
    ["03", "Cała Polska", `${FACTS.drainedHa} zmeliorowanych. Dane krajowe, liczone per powiat.`],
  ];
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 h-[40%] opacity-60">{active && <PointCloud water={0.8} />}</div>
      <div className="absolute inset-0 bg-gradient-to-b from-forest from-55% to-forest/30" />
      <Shell className="flex flex-col">
        <div className="grid grid-cols-3 gap-6">
          {path.map(([n, t, d], i) => (
            <div key={n} className="rise border-t-2 border-cream/60 pt-5">
              <p className="eb num opacity-60">
                {n} {i < 2 ? "→" : ""}
              </p>
              <p className="hd mt-3 text-[44px]">{t}</p>
              <p className="mt-3 text-[18px] leading-[1.45] opacity-85">{d}</p>
            </div>
          ))}
        </div>
        <p className="eb rise mt-20 opacity-70">Prośba · The ask</p>
        <p className="sh rise mt-4 max-w-[1300px] text-[54px] leading-[1.1]">
          „Dajcie nam jeden oddział KOWR i jego dzierżawy. Zindeksujemy je i zweryfikujemy 10 miejsc ze spółką wodną tej
          wiosny.”
        </p>
        <En className="rise mt-4">
          Give us one KOWR branch and its leased land. We&apos;ll index it and validate ten sites with one spółka wodna
          this spring.
        </En>
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
  ground: "forest" | "cream";
  Body: (p: { active: boolean }) => ReactNode;
  notes: string;
};

export const SLIDES: SlideDef[] = [
  {
    id: "title",
    eyebrow: "01 — TRAKTOR",
    ground: "forest",
    Body: Title,
    notes: `Polska zbudowała już maszynę wodną na ${FACTS.drainedHa}. Działa tylko w jedną stronę: na zewnątrz. TRAKTOR sprawia, że działa w obie. ${TAGLINE_EN}`,
  },
  {
    id: "problem",
    eyebrow: "02 — Problem",
    ground: "cream",
    Body: Problem,
    notes:
      "6,4 mln ha zmeliorowane. W 2025 IUNG: susza w 394 gminach (16%). Pomoc suszowa do 3 000 zł/ha przychodzi po stracie. Wrzesień 2024: powódź EMSR756. Ten sam rów.",
  },
  {
    id: "insight",
    eyebrow: "03 — Pomysł",
    ground: "cream",
    Body: Insight,
    notes: "Jedna deska w istniejącym rowie. Dwa tryby: TRZYMAJ w suszy, OTWÓRZ przed burzą. Kliknij kafelek, pokaż poziom wody.",
  },
  {
    id: "how",
    eyebrow: "04 — Jak to działa",
    ground: "forest",
    Body: How,
    notes: "Siedem kroków: od sieci rowów przez LiDAR i kontrolę bezpieczeństwa do cotygodniowego polecenia i monitoringu. Uziemione, odwracalne, precyzyjne.",
  },
  {
    id: "refusal",
    eyebrow: "05 — Odmowa",
    ground: "cream",
    Body: Refusal,
    notes: `Dane demonstracyjne: ${nbsp(summary.pointsAnalysed)} punktów, ${summary.sitesAccepted} bezpiecznych. Najczęstsze powody: spadek i woda na działce sąsiada. Odmowa to produkt, nie błąd.`,
  },
  {
    id: "demo",
    eyebrow: "06 — Demo",
    ground: "forest",
    Body: Demo,
    notes: "Kliknij przycisk. Mapa → działka → S-007 → 60 cm odmowa → TRZYMAJ i „Dlaczego?” → burza → OTWÓRZ → karta. Wróć klawiszem 7.",
  },
  {
    id: "flip",
    eyebrow: "07 — Przełączenie",
    ground: "cream",
    Body: Flip,
    notes: "Ta sama deska. Susza: KBW −86 mm, TRZYMAJ. Ostrzeżenie IMGW st. 2, 42 mm w 72 h: OTWÓRZ z terminem i zwolnioną pojemnością. Reguły, nie zgadywanie.",
  },
  {
    id: "data",
    eyebrow: "08 — Dane i uczciwość",
    ground: "cream",
    Body: Data,
    notes: "Siedem darmowych źródeł publicznych. Przedziały, odmowy, pozwolenie wodnoprawne art. 389 pkt 6, wizja lokalna. AI tylko tłumaczy, nie liczy.",
  },
  {
    id: "impact",
    eyebrow: "09 — Efekt",
    ground: "cream",
    Body: Impact,
    notes: `S-007 przy ${maxCrest.heightCm} cm: ${fmtRange(maxCrest.storageM3, "m³")}. Gmina: ${fmtRange(summary.totalStorageM3, "m³")} (dane demonstracyjne). Badania: −30,5% odpływu, −33,6% azotanów, 23% → 41%.`,
  },
  {
    id: "ask",
    eyebrow: "10 — Droga i prośba",
    ground: "forest",
    Body: Ask,
    notes: "KOWR: 1,324 mln ha, jeden właściciel. Potem spółki wodne, potem kraj. Prośba: jeden oddział KOWR, 10 miejsc ze spółką wodną tej wiosny.",
  },
];

export const TOTAL = SLIDES.length;
