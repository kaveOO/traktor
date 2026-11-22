"use client";

import { useEffect, useState } from "react";

/**
 * Progress rail 01–07 for /metoda (brand 09 UI elements): each step links to its section.
 * Passed steps: filled. Current (in view): filled with a soft ring. Later: outline.
 * Colour changes in 400 ms; nothing moves.
 */
export function MethodRail({ steps }: { steps: readonly { id: string; short: string }[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const els = steps.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(els.indexOf(hit.target as HTMLElement));
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [steps]);

  return (
    <nav aria-label="Kroki analizy" className="no-print sticky top-16 z-30 border-b border-forest/15 bg-cream">
      <ol className="mx-auto flex max-w-4xl items-start px-3 py-3 md:px-8">
        {steps.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={s.id} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && <span aria-hidden className="absolute top-[13px] right-1/2 h-px w-full bg-forest/40" />}
              <a
                href={`#${s.id}`}
                aria-current={state === "current" ? "step" : undefined}
                className="group relative z-10 flex min-h-11 min-w-11 flex-col items-center rounded-[2px] focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span
                  aria-hidden
                  className={`num grid size-7 place-items-center rounded-full border-2 border-forest text-[11px] font-semibold transition-colors duration-[400ms] ${
                    state === "todo" ? "bg-cream text-forest" : "bg-forest text-cream"
                  } ${state === "current" ? "ring-4 ring-forest/25" : ""}`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-1.5 text-[10px] leading-tight group-hover:underline sm:text-[11px]">
                  <span className="sr-only">Krok {i + 1}: </span>
                  {s.short}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
