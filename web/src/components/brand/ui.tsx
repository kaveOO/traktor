import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { StepRail } from "./data";

export type { ChipStatus, Step, StepState } from "./data";
export { FieldPattern, type FieldTone } from "./FieldPattern";
export { Logo, LogoMark, LogoSymbol, type LogoColor, type LogoLockup } from "./Logo";
export { Callout, FooterLine, LevelMeter, LevelTag, RecCard, SectionEyebrow, SourceChip, SourceChipList, StepRail } from "./data";

/* Shared brand primitives (13 UI elements). Keep these dumb and reusable. */

type Tone = "onForest" | "onCream";

/**
 * Buttons. Primary: cream fill + forest text on forest grounds (inverted on cream). 2px radius, 48px min height.
 * Secondary: 1.5px outline. Hover darkens 6%.
 */
export function Button({
  variant = "primary",
  tone = "onCream",
  href,
  target,
  rel,
  className = "",
  children,
  ...rest
}: {
  variant?: "primary" | "secondary";
  tone?: Tone;
  href?: string;
  /** links only, e.g. "_blank" (add an sr-only "otwiera się w nowej karcie" to the label) */
  target?: string;
  rel?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">) {
  // SPEC §09 artwork: Inter Medium 16, padding 14/24, 2px radius, 48px min height.
  // Focus (WCAG 2.2 2.4.11/2.4.13): 2px solid outline, 2px offset, in the contrasting ground colour (≥ 3:1).
  const base =
    "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[2px] px-6 py-3.5 text-[16px] leading-[1.25] font-medium transition-[filter,background-color,color] duration-200 hover:brightness-[.94] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? tone === "onForest"
        ? "bg-cream text-forest focus-visible:outline-cream"
        : "bg-forest text-cream focus-visible:outline-forest"
      : tone === "onForest"
        ? "border-[1.5px] border-cream text-cream focus-visible:outline-cream"
        : "border-[1.5px] border-forest text-forest focus-visible:outline-forest";
  const cls = `${base} ${styles} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} target={target} rel={rel ?? (target === "_blank" ? "noopener" : undefined)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

/** Eyebrow / data label: Inter SemiBold 11, +14% tracking, uppercase. */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eb ${className}`}>{children}</p>;
}

/** Card: cream at 94% over imagery, 4px radius, soft forest shadow, 24px padding. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[4px] bg-cream/94 p-6 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] ${className}`}>
      {children}
    </div>
  );
}

/** Status chip: accepted (agri green) or rejected (terracotta). Terracotta only marks rejection or warnings. */
export function StatusChip({ status, className = "" }: { status: "accepted" | "refused"; className?: string }) {
  const ok = status === "accepted";
  return (
    <span
      className={`eb inline-flex items-center gap-1.5 rounded-[2px] px-2 py-1 ${
        ok ? "bg-agri-ink text-cream" : "bg-terra-ink text-cream"
      } ${className}`}
    >
      <span className="inline-block size-1.5 rounded-full bg-cream" aria-hidden />
      {ok ? "Przyjęte" : "Odrzucone"}
    </span>
  );
}

/**
 * Thin progress line: the ONLY loading indicator in TRAKTOR (SPEC §10, never a spinner).
 * Indeterminate by default; pass `value` (0..1) for a determinate line (it moves with the water easing).
 * `tone="onForest"` draws it in cream.
 */
export function ProgressLine({
  className = "",
  label = "Ładowanie…",
  value,
  tone = "onCream",
}: {
  className?: string;
  label?: string;
  value?: number;
  tone?: Tone;
}) {
  const bar = tone === "onForest" ? "bg-cream" : "bg-forest";
  const track = tone === "onForest" ? "bg-cream/20" : "bg-forest/15";
  const v = value === undefined ? undefined : Math.max(0, Math.min(1, value));
  return (
    <div
      className={`h-0.5 w-full overflow-hidden ${track} ${className}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={v === undefined ? undefined : 0}
      aria-valuemax={v === undefined ? undefined : 100}
      aria-valuenow={v === undefined ? undefined : Math.round(v * 100)}
    >
      {v === undefined ? (
        <div className={`progress-line h-full origin-left ${bar}`} />
      ) : (
        <div className={`water-level h-full origin-left ${bar}`} style={{ transform: `scaleX(${v})` }} />
      )}
    </div>
  );
}

/** Skip link (WCAG 2.4.1): first focusable element on a page. */
export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only z-[100] rounded-[2px] bg-forest px-4 py-3 font-medium text-cream focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus-visible:outline-cream"
    >
      {children}
    </a>
  );
}

/** Progress rail, steps 01-07. Done: filled. Current: filled with soft ring. To do: outline. */
export const RAIL_STEPS = [
  "Sieć rowów",
  "Teren LiDAR",
  "Ocena miejsc",
  "Kontrola bezpieczeństwa",
  "Montaż zastawki",
  "TRZYMAJ / OTWÓRZ",
  "Monitoring",
] as const;

/** The brand rail at artwork size (34px steps, SPEC §09). `size="sm"` gives the compact 24px rail. */
export function ProgressRail({
  current = 3,
  tone = "onCream",
  size = "md",
  className,
}: {
  current?: number;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  return <StepRail steps={RAIL_STEPS} current={current} tone={tone} size={size} className={className} label="Etapy pracy TRAKTOR" />;
}

/**
 * Source line: required on every map and data surface. Informative text, so never faded:
 * `onCream` = forest-muted, `onForest` = cream-muted, no tone = inherits the current colour.
 */
export function SourceLine({ children, className = "", tone }: { children: ReactNode; className?: string; tone?: Tone }) {
  const c = tone === "onCream" ? "text-forest-muted" : tone === "onForest" ? "text-cream-muted" : "";
  return <p className={`text-[11px] leading-snug ${c} ${className}`}>Źródło: {children}</p>;
}
