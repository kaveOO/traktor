"use client";

import { useEffect, useRef, useState } from "react";
import { fmtInt } from "./fmt";

export type RefusalRow = { label: string; count: number; accepted?: boolean };

const DURATION = 1500;
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/** Counts from points analysed down to safe sites when scrolled into view. Bars grow with it. */
export function RefusalCounter({ points, accepted, rows }: { points: number; accepted: number; rows: RefusalRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setK(1);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / DURATION);
          setK(ease(p));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const shown = Math.round(points - (points - accepted) * k);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div ref={ref} className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-end">
      <div>
        <p className="eb text-cream-muted">Punkty kandydackie → miejsca bezpieczne</p>
        <p className="hd num mt-3 text-[88px] md:text-[128px]" aria-live="off">
          {fmtInt(shown)}
        </p>
        <p className="sh num mt-2 text-[22px]">
          {fmtInt(points)} punktów sprawdzonych. {fmtInt(accepted)} miejsc bezpiecznych.
        </p>
      </div>
      <ul className="space-y-3" aria-label="Powody odmowy">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="flex items-baseline justify-between gap-4 text-[14px]">
              <span>{r.label}</span>
              <span className="num font-semibold">{fmtInt(Math.round(r.count * k))}</span>
            </div>
            <div className="mt-1 h-2 w-full bg-cream/10">
              <div
                className={`h-full ${r.accepted ? "bg-agri" : "bg-terra"}`}
                style={{ width: `${((r.count / max) * 100 * k).toFixed(2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
