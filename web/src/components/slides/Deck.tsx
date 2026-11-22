"use client";

import { use, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { TAGLINE_EN } from "@/lib/traktor";
import { SLIDES, TOTAL } from "./slides";
import "./slides.css";

const pad = (n: number) => String(n).padStart(2, "0");

function readHash() {
  const n = parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= TOTAL ? n - 1 : 0;
}

export default function Deck() {
  use(browser("The slide deck is browser-only."));
  const [index, setIndex] = useState(readHash);
  const [scale, setScale] = useState(1);
  const [notes, setNotes] = useState(false);

  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(TOTAL - 1, n))), []);

  // fit the 1600x900 stage into the viewport
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // keep the position in the URL hash
  useEffect(() => {
    const h = `#${index + 1}`;
    if (window.location.hash !== h) window.history.replaceState(null, "", h);
  }, [index]);

  useEffect(() => {
    const onHash = () => setIndex(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) {
        e.preventDefault();
        setIndex((i) => Math.min(TOTAL - 1, i + 1));
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (k === "Home") go(0);
      else if (k === "End") go(TOTAL - 1);
      else if (/^[0-9]$/.test(k)) go(k === "0" ? 9 : Number(k) - 1);
      else if (k === "f" || k === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.();
      } else if (k === "p" || k === "P") setNotes((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const onClick = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest("a,button,input,[data-noadvance]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.25) go(index - 1);
    else go(index + 1);
  };

  return (
    <div className="deck-root" onClick={onClick}>
      <div
        className="deck-stage"
        style={{ transform: `scale(${scale}) translate(-50%, -50%)` }}
        aria-roledescription="prezentacja"
      >
        {SLIDES.map((s, i) => {
          const active = i === index;
          const dark = s.ground === "forest";
          return (
            <section
              key={s.id}
              className={`deck-slide ${active ? "is-active" : ""} ${dark ? "bg-forest text-cream" : "bg-cream text-forest"}`}
              aria-hidden={!active}
              aria-label={`Slajd ${i + 1} z ${TOTAL}`}
            >
              <s.Body active={active} />
              {/* chrome: logo, eyebrow, footer, progress */}
              <header className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-16 pt-12">
                {i === 0 ? <span /> : <Logo height={18} color={dark ? "cream" : "forest"} />}
                <p className="eb opacity-70">{s.eyebrow}</p>
              </header>
              <footer className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between px-16 pb-10 text-[14px]">
                <span className="opacity-70">{TAGLINE_EN}</span>
                <span className="num eb opacity-70">
                  {pad(i + 1)} / {TOTAL}
                </span>
              </footer>
              <div className="absolute right-0 bottom-0 left-0 h-[3px] bg-current/10">
                <div className="h-full bg-current/60" style={{ width: `${((i + 1) / TOTAL) * 100}%` }} />
              </div>
            </section>
          );
        })}
      </div>

      {notes && (
        <aside
          data-noadvance
          className="no-print fixed right-6 bottom-6 left-6 max-h-[40vh] overflow-auto rounded-[4px] bg-cream/95 p-6 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]"
        >
          <div className="flex items-baseline justify-between">
            <p className="eb">
              Notatki · {pad(index + 1)} / {TOTAL} · {SLIDES[index].eyebrow}
            </p>
            <p className="eb opacity-60">P zamyka · ← → · 1–0 · F pełny ekran</p>
          </div>
          <p className="mt-3 text-[18px] leading-[1.5]">{SLIDES[index].notes}</p>
          {index < TOTAL - 1 && (
            <p className="mt-3 text-[13px] opacity-60">Dalej: {SLIDES[index + 1].eyebrow}</p>
          )}
        </aside>
      )}
    </div>
  );
}
