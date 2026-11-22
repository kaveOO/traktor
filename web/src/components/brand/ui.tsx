import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

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
  className = "",
  children,
  ...rest
}: {
  variant?: "primary" | "secondary";
  tone?: Tone;
  href?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">) {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-[2px] px-6 text-[15px] font-medium transition-[filter,background-color] duration-200 hover:brightness-[.94] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
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
      <Link href={href} className={cls}>
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
    <div className={`rounded-[4px] bg-cream/95 p-6 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)] ${className}`}>
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
        ok ? "bg-agri text-cream" : "bg-terra text-cream"
      } ${className}`}
    >
      <span className="inline-block size-1.5 rounded-full bg-cream" />
      {ok ? "Przyjęte" : "Odrzucone"}
    </span>
  );
}

/** Thin progress line: the only allowed loading indicator. */
export function ProgressLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-full overflow-hidden bg-forest/15 ${className}`} role="progressbar" aria-label="Ładowanie">
      <div className="h-full origin-left bg-forest [animation:progress-line_1.2s_ease-in-out_infinite]" />
    </div>
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

export function ProgressRail({ current = 3, tone = "onCream" }: { current?: number; tone?: Tone }) {
  const c = tone === "onForest" ? "text-cream" : "text-forest";
  return (
    <ol className={`flex w-full items-start ${c}`}>
      {RAIL_STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className="absolute top-[11px] right-1/2 h-px w-full bg-current opacity-40" />}
            <span
              className={`num relative z-10 grid size-6 place-items-center rounded-full border-2 border-current text-[10px] font-semibold ${
                state === "todo" ? (tone === "onForest" ? "bg-forest" : "bg-cream") : "bg-current"
              } ${state === "current" ? "ring-4 ring-current/25" : ""}`}
            >
              <span className={state === "todo" ? "" : tone === "onForest" ? "text-forest" : "text-cream"}>
                {String(n).padStart(2, "0")}
              </span>
            </span>
            <span className="mt-2 text-[11px] leading-tight">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Source line: required on every map and data surface. */
export function SourceLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] leading-snug opacity-75 ${className}`}>Źródło: {children}</p>;
}
