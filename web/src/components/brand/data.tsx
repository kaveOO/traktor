import type { ReactNode } from "react";
import { TAGLINE_EN } from "@/lib/traktor/copy";
import { Icon, type IconName } from "./Icon";

/*
 * Data primitives shared by /analiza, /raport, /karta and /mapa.
 * Rules: status is never colour alone (word + icon + segments), small coloured text uses the -ink tokens,
 * terracotta only for warnings / rejected / missing data.
 */

type Tone = "onForest" | "onCream";

/* ---------- Step rail ---------- */

export type StepState = "done" | "current" | "todo";
export type Step = { label: string; state?: StepState };

const STATE_PL: Record<StepState, string> = { done: "gotowe", current: "teraz", todo: "do zrobienia" };

/**
 * Numbered step rail (01, 02, 03...). Done: filled. Current: filled with a soft ring. To do: outline.
 * `current` derives the states when a step has no explicit `state` (steps before it are done).
 */
export function StepRail({
  steps,
  current = 1,
  tone = "onCream",
  label,
  size = "sm",
  className = "",
}: {
  steps: readonly (string | Step)[];
  current?: number;
  tone?: Tone;
  label?: string;
  /** "sm" = compact 24px steps joined by a hairline (forms); "md" = brand artwork, 34px steps, 12px numbers, no joins */
  size?: "sm" | "md";
  className?: string;
}) {
  const c = tone === "onForest" ? "text-cream" : "text-forest";
  const md = size === "md";
  return (
    <ol className={`flex w-full items-start ${md ? "gap-2" : ""} ${c} ${className}`} aria-label={label}>
      {steps.map((s, i) => {
        const step = typeof s === "string" ? { label: s } : s;
        const n = i + 1;
        const state: StepState = step.state ?? (n < current ? "done" : n === current ? "current" : "todo");
        return (
          <li
            key={step.label}
            className={`relative flex flex-1 flex-col ${md ? "items-start gap-2.5 text-left" : "items-center text-center"}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            {!md && i > 0 && <span aria-hidden className="absolute top-[11px] right-1/2 h-px w-full bg-current opacity-40" />}
            <span
              aria-hidden
              className={`num relative z-10 grid place-items-center rounded-full border-2 border-current font-semibold transition-colors duration-[400ms] ${
                md ? "size-[34px] text-[12px]" : "size-6 text-[10px]"
              } ${state === "todo" ? (md ? "bg-transparent" : tone === "onForest" ? "bg-forest" : "bg-cream") : "bg-current"} ${
                state === "current" ? "ring-4 ring-current/30" : ""
              }`}
            >
              <span className={state === "todo" ? "" : tone === "onForest" ? "text-forest" : "text-cream"}>
                {String(n).padStart(2, "0")}
              </span>
            </span>
            <span className={md ? "type-caption" : "mt-2 text-[11px] leading-tight"}>
              <span className="sr-only">Krok {n}: </span>
              {step.label}
              <span className="sr-only">, {STATE_PL[state]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- Level meter ---------- */

/** Brand colour for a rank on a 1..of risk scale: low = agri, middle = soil, top = terracotta (warning). */
function rankTone(rank: number, of: number) {
  if (rank <= 1) return { fill: "bg-agri", border: "border-agri", text: "text-agri-ink" };
  if (rank >= Math.min(3, of)) return { fill: "bg-terra", border: "border-terra", text: "text-terra-ink" };
  return { fill: "bg-soil", border: "border-soil", text: "text-soil" };
}

/** Segmented meter: filled segments carry the level (shape, not colour alone). */
export function LevelMeter({
  rank,
  of = 4,
  label,
  size = "md",
  className = "",
}: {
  rank: number | null;
  of?: number;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const t = rank ? rankTone(rank, of) : null;
  const seg = size === "sm" ? "h-[9px] w-[14px]" : "h-2.5 w-6";
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} role="img" aria-label={label}>
      {Array.from({ length: of }, (_, i) => {
        const on = rank !== null && i < rank;
        return (
          <span
            key={i}
            className={`inline-block rounded-[1px] border-[1.5px] ${seg} ${on && t ? `${t.fill} ${t.border}` : "border-forest/45 bg-transparent"}`}
          />
        );
      })}
    </span>
  );
}

/**
 * Level as word + icon + meter. `rank` 1..of (null = brak danych).
 * Use for drought risk (of 4) and uncertainty (of 3).
 */
export function LevelTag({
  word,
  rank,
  of = 4,
  icon,
  size = "md",
  meterLabel,
}: {
  word: string | null;
  rank: number | null;
  of?: number;
  icon?: IconName;
  size?: "sm" | "md" | "lg";
  meterLabel?: string;
}) {
  const t = rank ? rankTone(rank, of) : null;
  const ico = icon ?? (rank && rank >= 2 ? "drought" : "water");
  const big = size === "lg" ? "text-[30px]" : size === "md" ? "text-[22px]" : "text-[17px]";
  return (
    <span className="inline-flex flex-col gap-1.5">
      <span className={`inline-flex items-center gap-2 ${t ? t.text : "text-forest-muted"}`}>
        <Icon name={ico} size={size === "sm" ? 18 : 22} />
        <span className={`hd ${big}`}>{word ?? "Brak danych"}</span>
      </span>
      <LevelMeter
        rank={rank}
        of={of}
        size={size === "sm" ? "sm" : "md"}
        label={meterLabel ?? (rank ? `Poziom ${rank} z ${of}` : "Poziom nieznany")}
      />
    </span>
  );
}

/* ---------- Source chips ---------- */

export type ChipStatus = "ok" | "partial" | "missing";

/** Source tag. Missing or partial data: dashed terracotta outline + the word, never colour alone. */
export function SourceChip({ label, status = "ok", size = "md" }: { label: string; status?: ChipStatus; size?: "sm" | "md" }) {
  const bad = status !== "ok";
  const sz = size === "sm" ? "px-1 text-[9px] leading-[14px]" : "px-1.5 py-0.5 text-[10px] leading-[14px]";
  return (
    <span
      className={`num inline-flex items-center gap-1 rounded-[2px] border font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${sz} ${
        bad ? "border-dashed border-terra text-terra-ink" : "border-forest/40 text-forest"
      }`}
    >
      {label}
      {status === "missing" && <span className="normal-case">· brak</span>}
      {status === "partial" && <span className="normal-case">· częściowe</span>}
    </span>
  );
}

export function SourceChipList({
  items,
  size = "md",
  className = "",
}: {
  items: { id: string; label: string; status?: ChipStatus }[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="Źródła">
      {items.map((x) => (
        <li key={x.id}>
          <SourceChip label={x.label} status={x.status} size={size} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- Recommendation card ---------- */

/**
 * Brand card pattern for a recommendation: eyebrow (kind · priority), .sh title, why/how lines, source chips.
 * `n` shows the map marker number. `active` = selected on the map (2px water outline, 400ms).
 */
export function RecCard({
  id,
  eyebrow,
  title,
  rows,
  legal,
  chips,
  n,
  active = false,
  icon,
  children,
  as = "li",
  className = "",
}: {
  id?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  rows: { k: string; v: ReactNode }[];
  legal?: ReactNode;
  chips?: ReactNode;
  n?: number;
  active?: boolean;
  icon?: IconName;
  children?: ReactNode;
  as?: "li" | "div";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag
      id={id}
      className={`rounded-[4px] border-2 bg-cream p-5 transition-colors duration-[400ms] ${
        active ? "border-water" : "border-forest/15"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        {n ? (
          <span className="num grid size-8 shrink-0 place-items-center rounded-full border-2 border-cream bg-forest text-[14px] font-bold text-cream shadow-[0_0_0_1px_rgba(31,58,34,.4)]" aria-hidden>
            {n}
          </span>
        ) : icon ? (
          <Icon name={icon} size={24} className="mt-0.5 shrink-0" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="eb text-forest-muted">{eyebrow}</p>
          <h4 className="sh mt-1 text-[20px] leading-[1.15]">{title}</h4>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-[15px] leading-[1.45]">
        {rows.map((r) => (
          <div key={r.k} className="grid grid-cols-[88px_1fr] gap-x-2">
            <dt className="eb pt-[3px] text-forest-muted">{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>
      {legal && (
        <p className="mt-3 flex items-start gap-2 border-l-2 border-terra pl-2 text-[14px] leading-snug text-terra-ink">
          <span className="eb pt-[2px]">Prawo</span>
          <span className="text-forest">{legal}</span>
        </p>
      )}
      {chips && <div className="mt-3">{chips}</div>}
      {children}
    </Tag>
  );
}

/* ---------- Callout ---------- */

/** Boxed note. `warning` = terracotta (warnings, missing data, demo data); `note` = forest. */
export function Callout({
  tone = "note",
  icon,
  title,
  children,
  className = "",
  role,
}: {
  tone?: "note" | "warning";
  icon?: IconName;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: "note" | "alert" | "status";
}) {
  const warn = tone === "warning";
  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-[4px] border-l-4 bg-cream px-4 py-3 text-[15px] leading-[1.45] ${
        warn ? "border-terra" : "border-forest"
      } ${className}`}
    >
      {icon && <Icon name={icon} size={20} className={`mt-0.5 shrink-0 ${warn ? "text-terra-ink" : ""}`} />}
      <div className="min-w-0">
        {title && <p className={`font-semibold ${warn ? "text-terra-ink" : ""}`}>{title}</p>}
        {children}
      </div>
    </div>
  );
}

/* ---------- Footer line ---------- */

/** Footer line required on every page. */
export function FooterLine({ className = "", tone = "onCream" }: { className?: string; tone?: Tone }) {
  return (
    <p lang="en" className={`sh text-[13px] ${tone === "onForest" ? "text-cream" : "text-forest"} ${className}`}>
      {TAGLINE_EN}
    </p>
  );
}

/** Section eyebrow "01 — OCENA". */
export function SectionEyebrow({ no, children, className = "" }: { no: number; children: ReactNode; className?: string }) {
  return (
    <p className={`eb num ${className}`}>
      {String(no).padStart(2, "0")} — {children}
    </p>
  );
}
