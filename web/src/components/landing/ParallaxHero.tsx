"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/brand/ui";

/*
 * Landing hero: a layered Blender render (docs/blender/scripts/traktor_parallax.py) that drifts with scroll.
 * - Static composite first (LCP image, also the only image under prefers-reduced-motion).
 * - After hydration, if motion is allowed, 7 transparent layers load, decode, then cross-fade in (400 ms).
 * - Only `transform` is animated: horizontal drift uses the 10 % overscan baked into every layer,
 *   vertical drift is gap-free because farther layers only move down behind nearer ones.
 * - Headline, buttons and caption are HTML, never baked into the render.
 */

const W = 1760; // rendered width incl. 10 % overscan (visible 1600)
const H = 900;
const BASE = "/landing";

type Layer = { file: string; f: number; drive?: boolean };
const LAYERS: Layer[] = [
  { file: "layer-1-sky", f: 0.1 },
  { file: "layer-2-trees", f: 0.25 },
  { file: "layer-3-field", f: 0.45 },
  { file: "layer-4-track", f: 0.7 },
  { file: "layer-5-tractor", f: 0.7, drive: true },
  { file: "layer-6-ditch", f: 1.0 },
  { file: "layer-7-foreground", f: 1.2 },
];

/** Shared placement for every image so all layers stay pixel-aligned with the composite. */
const IMG_CLS = "absolute top-0 left-[-5%] h-full w-[110%] max-w-none select-none object-cover object-[50%_72%]";

export function ParallaxHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [motion, setMotion] = useState(false);
  const [ready, setReady] = useState(false);

  // Motion only when the user allows it. Default (SSR, reduced motion) = static composite.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMotion(!mq.matches);
      if (mq.matches) setReady(false);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Preload + decode all layers, then cross-fade. Any failure keeps the composite.
  useEffect(() => {
    if (!motion) return;
    let cancelled = false;
    Promise.all(
      LAYERS.map((l) => {
        const img = new Image();
        img.decoding = "async";
        img.src = `${BASE}/${l.file}.webp`;
        return img.decode();
      }),
    )
      .then(() => !cancelled && setReady(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [motion]);

  // Scroll-linked transforms: passive listener + one rAF per frame.
  useEffect(() => {
    if (!motion || !ready) return;
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const s = Math.min(Math.max(-rect.top, 0), rect.height); // px scrolled into the hero
      const p = rect.height ? s / rect.height : 0; // 0..1
      const w = rect.width;
      LAYERS.forEach((l, i) => {
        const node = layerRefs.current[i];
        if (!node) return;
        let x = (-p * l.f * 0.05 * w) / 1.2; // f = 1.2 uses exactly the 5 % overscan
        if (l.drive) x += p * 0.18 * w; // tractor drives right while the scene drifts left
        const y = l.f < 1 ? s * (1 - l.f) * 0.5 : 0;
        node.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    // Slow, camera-like drive-in for the tractor sprite (on the img, separate from the scroll transform).
    const tractor = layerRefs.current[LAYERS.findIndex((l) => l.drive)]?.querySelector("img");
    const drive = tractor?.animate(
      // starts where the composite shows it, so the cross-fade never jumps
      [{ transform: "translate3d(0, 0, 0)" }, { transform: "translate3d(3%, 0, 0)" }],
      { duration: 9000, easing: "cubic-bezier(.45,0,.55,1)", fill: "both" },
    );
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      drive?.cancel();
    };
  }, [motion, ready]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative -mt-16 h-[100svh] min-h-[620px] overflow-hidden bg-forest text-cream [contain:paint]"
    >
      {/* Static composite: LCP poster, reduced-motion image, and fallback if any layer fails. */}
      <img
        src={`${BASE}/composite.webp`}
        alt=""
        aria-hidden
        width={W}
        height={H}
        fetchPriority="high"
        decoding="async"
        className={`${IMG_CLS} transition-opacity duration-[400ms] ${ready ? "opacity-0" : "opacity-100"}`}
      />

      {motion && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-[400ms] ${ready ? "opacity-100" : "opacity-0"}`}
        >
          {LAYERS.map((l, i) => (
            <div
              key={l.file}
              ref={(n) => {
                layerRefs.current[i] = n;
              }}
              className="absolute inset-0 will-change-transform"
            >
              <img
                src={`${BASE}/${l.file}.webp`}
                alt=""
                width={W}
                height={H}
                sizes="110vw"
                decoding="async"
                loading={i < 2 ? "eager" : "lazy"}
                draggable={false}
                className={IMG_CLS}
              />
            </div>
          ))}
        </div>
      )}

      {/* Forest scrims so cream text passes contrast over the light field (decorative). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-forest/90 via-forest/55 to-transparent md:via-forest/40"
      />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-forest/70 to-transparent" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-forest/85 to-transparent md:hidden"
      />

      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pt-24 pb-14 md:justify-center md:px-8 md:pb-24">
        <div className="max-w-2xl">
          <div className="rise">
            <Logo color="cream" height={26} />
          </div>
          <h1 id="hero-title" className="hd rise mt-6 text-[46px] [animation-delay:60ms] sm:text-[60px] md:text-[88px]">
            Przyszłość wody jest już w polu.
          </h1>
          <p className="rise mt-5 max-w-xl text-[18px] leading-[1.5] [animation-delay:140ms] md:text-[20px]">
            Rowy już są. Wystarczy w nich zatrzymać wodę. Wpisz numer działki, uprawę i datę: dostaniesz raport o wodzie
            na tym polu.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3 [animation-delay:220ms]">
            <Button tone="onForest" href="/analiza">
              Sprawdź działkę
            </Button>
            <Button variant="secondary" tone="onForest" href="#jak">
              Jak to działa
            </Button>
          </div>
          <p className="eb rise mt-8 flex flex-wrap items-center gap-2 text-cream-muted [animation-delay:300ms]">
            <span className="rounded-[2px] bg-forest px-2 py-1 text-cream ring-1 ring-cream/40">TRZYMAJ</span>
            woda zatrzymana przed zastawką
          </p>
        </div>
      </div>

      <p className="eb absolute right-4 bottom-3 rounded-[2px] bg-forest/85 px-2 py-1 text-cream md:right-6 md:bottom-4">
        Wizualizacja · render poglądowy
      </p>
    </section>
  );
}
