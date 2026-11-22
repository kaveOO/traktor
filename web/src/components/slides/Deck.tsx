"use client";

import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { browser } from "react-dom";
import { Logo } from "@/components/brand/Logo";
import { TAGLINE_EN } from "@/lib/traktor";
import { SLIDES, TOTAL } from "./slides";
import "./slides.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** Space / Enter / letters on these elements belong to the element, not to the deck. */
const INTERACTIVE =
  'a,button,input,select,textarea,summary,[contenteditable="true"],[role="radio"],[role="button"],[role="checkbox"],[role="switch"],[role="tab"],[role="slider"],[role="textbox"]';
/** Arrow keys belong to these elements (radio groups, sliders, text fields). */
const USES_ARROWS = 'input,select,textarea,[contenteditable="true"],[role="radio"],[role="tab"],[role="slider"],[role="textbox"]';
/** PageUp/PageDown/Home/End belong only to text fields, so a presenter clicker keeps working. */
const TEXT_FIELD = 'input,select,textarea,[contenteditable="true"],[role="textbox"]';

function readHash() {
  const n = parseInt(window.location.hash.replace("#", ""), 10);
  return Number.isFinite(n) && n >= 1 && n <= TOTAL ? n - 1 : 0;
}

export default function Deck() {
  use(browser("The slide deck is browser-only."));
  const rootRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(readHash);
  const [scale, setScale] = useState(1);
  const [notes, setNotes] = useState(false);
  // WCAG 2.1.4: single-character shortcuts (digits, F, P) can be switched off.
  const [shortcuts, setShortcuts] = useState(true);

  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(TOTAL - 1, n))), []);

  // fit the 1600x900 stage into the viewport
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // the deck takes focus on load so its keys work without a click
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
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

  // keys are handled on the deck element only, so they work while the deck has focus
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as Element;
    const k = e.key;
    if (t.closest(TEXT_FIELD)) return;
    if (k.startsWith("Arrow") && t.closest(USES_ARROWS)) return;
    if (!["PageUp", "PageDown", "Home", "End"].includes(k) && !k.startsWith("Arrow") && t.closest(INTERACTIVE)) return;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) {
      e.preventDefault();
      setIndex((i) => Math.min(TOTAL - 1, i + 1));
    } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (k === "Home") go(0);
    else if (k === "End") go(TOTAL - 1);
    else if (!shortcuts) return;
    else if (/^[0-9]$/.test(k)) go(k === "0" ? 9 : Number(k) - 1);
    else if (k === "f" || k === "F") {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } else if (k === "p" || k === "P") setNotes((v) => !v);
  };

  const onClick = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest("a,button,input,[data-noadvance]")) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - rect.left < rect.width * 0.25) go(index - 1);
    else go(index + 1);
  };

  const current = SLIDES[index];

  return (
    <main
      ref={rootRef}
      tabIndex={-1}
      className="deck-root outline-none"
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label="Prezentacja TRAKTOR"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Slajd {index + 1} z {TOTAL}: {current.title}
      </p>
      <div className="deck-stage" style={{ transform: `scale(${scale}) translate(-50%, -50%)` }}>
        {SLIDES.map((s, i) => {
          const active = i === index;
          const dark = s.ground === "forest";
          return (
            <section
              key={s.id}
              className={`deck-slide ${active ? "is-active" : ""} ${dark ? "bg-forest text-cream" : "bg-cream text-forest"}`}
              aria-hidden={!active}
              aria-roledescription="slajd"
              aria-label={`Slajd ${i + 1} z ${TOTAL}: ${s.title}`}
            >
              <s.Body active={active} />
              {/* chrome: logo, eyebrow, footer, progress */}
              <header className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-16 pt-12">
                {i === 0 ? <span /> : <Logo height={18} color={dark ? "cream" : "forest"} />}
                <p className="eb opacity-85">{s.eyebrow}</p>
              </header>
              <footer className="pointer-events-none absolute right-0 bottom-0 left-0 flex items-end justify-between px-16 pb-10 text-[14px]">
                <span lang="en" className="opacity-85">
                  {TAGLINE_EN}
                </span>
                <span className="num eb opacity-85">
                  {pad(i + 1)} / {TOTAL}
                </span>
              </footer>
              <div className="absolute right-0 bottom-0 left-0 h-[3px] bg-current/10" aria-hidden>
                <div className="h-full bg-current/60" style={{ width: `${((i + 1) / TOTAL) * 100}%` }} />
              </div>
            </section>
          );
        })}
      </div>

      {notes && (
        <aside
          data-noadvance
          aria-label="Notatki prelegenta"
          className="no-print fixed right-6 bottom-6 left-6 max-h-[40vh] overflow-auto rounded-[4px] bg-cream/95 p-6 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]"
        >
          <div className="flex items-baseline justify-between gap-6">
            <p className="eb">
              Notatki · {pad(index + 1)} / {TOTAL} · {current.eyebrow}
            </p>
            <p className="eb opacity-85">P zamyka · ← → · 1–0 · F pełny ekran</p>
          </div>
          <p className="mt-3 text-[18px] leading-[1.5]">{current.notes}</p>
          {index < TOTAL - 1 && <p className="mt-3 text-[13px] opacity-85">Dalej: {SLIDES[index + 1].eyebrow}</p>}
        </aside>
      )}

      <button
        type="button"
        aria-pressed={shortcuts}
        onClick={() => setShortcuts((v) => !v)}
        className="no-print sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-10 focus:rounded-[2px] focus:bg-cream focus:px-4 focus:py-3 focus:text-forest"
      >
        Skróty jednoklawiszowe (cyfry, F, P): {shortcuts ? "włączone" : "wyłączone"}
      </button>
    </main>
  );
}
