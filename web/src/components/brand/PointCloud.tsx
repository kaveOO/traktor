"use client";

import { useEffect, useRef } from "react";

/**
 * LiDAR point-cloud field (09 Imagery: "Points, never surfaces"). Forest ground; points coloured by class:
 * cream field rows, soil-brown banks, water-blue ditch, birch-green trees. No glow, no sci-fi grid.
 * Motion: slow camera push-in (8-12 s, scale <= 1.12). Respects reduced motion.
 */
export function PointCloud({
  className = "",
  water = 0.6,
  animate = true,
}: {
  className?: string;
  /** 0..1 water level in the ditch, rises smoothly when changed */
  water?: number;
  animate?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const waterRef = useRef(water);
  waterRef.current = water;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || !animate;
    let raf = 0;
    let shownWater = waterRef.current;
    const start = performance.now();

    // pre-generate a world of points: x in [-1,1] across, z in [0,1] depth
    type P = { x: number; z: number; h: number; c: string; s: number };
    const pts: P[] = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const ditchX = (z: number) => 0.18 + Math.sin(z * 3.2) * 0.12 - z * 0.25;
    for (let row = 0; row < 150; row++) {
      const z = row / 150;
      const n = 260;
      for (let i = 0; i < n; i++) {
        const x = -1.6 + (i / n) * 3.2 + (rand() - 0.5) * 0.01;
        const d = Math.abs(x - ditchX(z));
        let c = "#F3ECDD";
        let h = 0;
        let s = 1;
        if (d < 0.025) {
          c = "#3B7FA3";
          h = -0.012;
          s = 2;
        } else if (d < 0.06) {
          c = "#6B4A2E";
          h = -0.006;
        } else if (row % 3 === 0) {
          c = "#EFE6D3";
          s = 0.8;
        } else {
          c = rand() < 0.15 ? "#C9BF86" : "#F3ECDD";
          s = 0.7;
        }
        if (d < 0.06 || row % 2 === 0) pts.push({ x, z, h, c, s });
      }
    }
    // tree line at the horizon (birch green)
    for (let i = 0; i < 1400; i++) {
      const x = -1.8 + rand() * 3.6;
      const z = 0.96 + rand() * 0.04;
      const trunk = Math.abs(Math.sin(x * 37)) > 0.4 ? 1 : 0.4;
      pts.push({ x, z, h: rand() * 0.09 * trunk, c: rand() < 0.5 ? "#8FA86A" : "#4F7A3A", s: 1.1 });
    }

    const draw = (t: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const hgt = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(hgt * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#1F3A22";
      ctx.fillRect(0, 0, w, hgt);
      // camera push-in, 10 s ease-in-out loop, scale <= 1.12
      const phase = reduce ? 0 : ((t - start) / 10000) % 2;
      const k = phase < 1 ? phase : 2 - phase;
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const zoom = 1 + ease * 0.12;
      // water rises smoothly toward target (no overshoot)
      shownWater += (waterRef.current - shownWater) * 0.04;
      const horizon = hgt * 0.36;
      const cx = w / 2;
      for (const p of pts) {
        const depth = 0.12 + p.z * 2.2; // camera distance
        const sx = cx + ((p.x * w * 0.55) / depth) * zoom;
        let lift = p.h;
        if (p.c === "#3B7FA3") lift += (shownWater - 0.5) * 0.01;
        const sy = horizon + ((hgt * 0.42) / depth) * zoom - (lift * hgt) / depth;
        if (sx < -4 || sx > w + 4 || sy < 0 || sy > hgt + 4) continue;
        const size = Math.max(0.6, (p.s * 1.6) / depth);
        ctx.globalAlpha = Math.min(1, 0.35 + 0.9 / depth);
        ctx.fillStyle = p.c;
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onResize = () => reduce && requestAnimationFrame(draw);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [animate]);

  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}
