"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CrestHeight, Order, RefusalCode, Site, XY } from "@/lib/traktor";
import { candidates, ditches, mapFeatures, sites } from "@/lib/traktor";
import { C, ORDER_COLOR, centroid, neighbourParcel, ownParcel, path, pts, retentionPath } from "./geo";
import { OsmTiles } from "./OsmTiles";

export type Basemap = "osm" | "google-roadmap" | "google-satellite" | "ortho" | "schema";
const isTiles = (b: Basemap) => b === "osm" || b === "google-roadmap" || b === "google-satellite";

/* ---- static real layers, computed once ---- */
const LAND_STYLE: Record<string, [string, number]> = {
  field: ["#C9BF86", 0.42],
  orchard: ["#8FA86A", 0.45],
  forest: ["#4F7A3A", 0.42],
  builtup: ["#B98D5F", 0.28],
  water: ["#3B7FA3", 0.8],
};
const LAND_ORDER = ["field", "orchard", "builtup", "forest", "water"];
const LAND = [...(mapFeatures.land ?? [])].sort((a, b) => LAND_ORDER.indexOf(a.kind) - LAND_ORDER.indexOf(b.kind));
const RIVERS = mapFeatures.rivers ?? [];
// one label per named river/canal, at the midpoint of its longest piece
const RIVER_LABELS = Object.values(
  RIVERS.filter((r) => r.name).reduce<Record<string, { name: string; xy: XY; n: number }>>((acc, r) => {
    if ((acc[r.name]?.n ?? 0) < r.points.length) acc[r.name] = { name: r.name, xy: r.points[Math.floor(r.points.length / 2)], n: r.points.length };
    return acc;
  }, {}),
);
const MAJOR = /ekspresowa|główna|zbiorcza/;
const roadWidth = (cls?: string) => (!cls ? 1 : /ekspresowa|przyśpieszonego/.test(cls) ? 4.5 : /główna/.test(cls) ? 3.5 : /zbiorcza/.test(cls) ? 2.5 : 1);
const ROADS = [...mapFeatures.roads].sort((a, b) => roadWidth(a.cls) - roadWidth(b.cls));
const ROAD_LABELS = Object.values(
  ROADS.filter((r) => r.name && MAJOR.test(r.cls ?? "")).reduce<Record<string, { name: string; xy: XY; n: number }>>((acc, r) => {
    const name = r.name.split(" / ").find((s) => /^S?\d+$/.test(s)) ?? r.name;
    if ((acc[name]?.n ?? 0) < r.points.length) acc[name] = { name, xy: centroid(r.points), n: r.points.length };
    return acc;
  }, {}),
);
const FOOTPRINTS = (mapFeatures.footprints ?? []).map((f) => `${path(f)}Z`).join(" ");

type VB = { x: number; y: number; w: number; h: number };
const FULL: VB = { x: 0, y: 0, w: 1000, h: 640 };
export type Focus = { xy: XY; w: number; key: number };

const clampVB = (v: VB): VB => {
  const w = Math.min(1400, Math.max(110, v.w));
  const h = (w * 640) / 1000;
  return {
    w,
    h,
    x: Math.min(1000 - w * 0.3, Math.max(-w * 0.7, v.x)),
    y: Math.min(640 - h * 0.3, Math.max(-h * 0.7, v.y)),
  };
};

export function MapCanvas({
  orders,
  selected,
  crest,
  showFlood,
  showRefused,
  refusalFilter,
  kowrOnly,
  parcelHl,
  candId,
  focus,
  onSelectSite,
  onSelectCandidate,
  basemap = "osm",
}: {
  basemap?: Basemap;
  orders: Record<string, Order>;
  selected: Site | null;
  crest: CrestHeight;
  showFlood: boolean;
  showRefused: boolean;
  refusalFilter: RefusalCode | null;
  kowrOnly: boolean;
  parcelHl: string | null;
  candId: string | null;
  focus: Focus | null;
  onSelectSite: (id: string) => void;
  onSelectCandidate: (id: string) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [vb, setVb] = useState<VB>(FULL);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const [size, setSize] = useState({ w: 1000, h: 640 });
  const anim = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width || 1, h: e.contentRect.height || 1 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // px per map unit (preserveAspectRatio slice)
  const scale = Math.max(size.w / vb.w, size.h / vb.h);
  const u = 1 / scale;

  const animateTo = (target: VB, ms = 900) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = vbRef.current;
    const to = clampVB(target);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return setVb(to);
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const k = ease(t);
      setVb({
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
        w: from.w + (to.w - from.w) * k,
        h: from.h + (to.h - from.h) * k,
      });
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!focus) return;
    const w = focus.w;
    const h = (w * 640) / 1000;
    animateTo({ x: focus.xy[0] - w / 2, y: focus.xy[1] - h / 2, w, h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key]);

  const zoomBy = (f: number, at?: XY) => {
    const v = vbRef.current;
    const p = at ?? [v.x + v.w / 2, v.y + v.h / 2];
    setVb(clampVB({ x: p[0] - (p[0] - v.x) * f, y: p[1] - (p[1] - v.y) * f, w: v.w * f, h: v.h * f }));
  };

  const toUser = (cx: number, cy: number): XY => {
    const el = wrap.current!;
    const r = el.getBoundingClientRect();
    const v = vbRef.current;
    const s = Math.max(r.width / v.w, r.height / v.h);
    return [v.x + v.w / 2 + (cx - r.left - r.width / 2) / s, v.y + v.h / 2 + (cy - r.top - r.height / 2) / s];
  };

  // wheel zoom (non-passive)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (anim.current) cancelAnimationFrame(anim.current);
      zoomBy(e.deltaY > 0 ? 1.15 : 1 / 1.15, toUser(e.clientX, e.clientY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drag = useRef<{ x: number; y: number; vb: VB; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);

  const selCrest = selected?.crests.find((k) => k.heightCm === crest);
  const refusedHere = selCrest?.status === "refused";
  const retention = useMemo(() => {
    if (!selected || !selCrest) return null;
    const d = ditches.find((q) => q.id === selected.ditchId);
    return d ? retentionPath(d, selected.xy, Math.max(8, selCrest.backwaterM / 10)) : null;
  }, [selected, selCrest]);
  const own = selected ? ownParcel(selected) : undefined;
  const neigh = selected ? neighbourParcel(selected, selCrest?.refusal?.objectRef) : undefined;
  const hlParcel = parcelHl ? mapFeatures.parcels.find((p) => p.id === parcelHl) : undefined;

  const refusedCands = useMemo(() => candidates.filter((c) => c.status === "refused"), []);
  const fs = (px: number) => px * u;

  // scale bar
  const pxPerM = scale / 10;
  const barM = [50, 100, 200, 500, 1000, 2000, 5000].find((m) => m * pxPerM >= 70) ?? 5000;
  const barPx = barM * pxPerM;

  return (
    <div
      ref={wrap}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-cream"
      style={{ cursor: drag.current?.moved ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-ui]")) return;
        if (anim.current) cancelAnimationFrame(anim.current);
        suppressClick.current = false;
        drag.current = { x: e.clientX, y: e.clientY, vb: vbRef.current, moved: false, id: e.pointerId };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) {
          d.moved = true;
          wrap.current?.setPointerCapture(d.id);
        }
        const r = wrap.current!.getBoundingClientRect();
        const s = Math.max(r.width / d.vb.w, r.height / d.vb.h);
        setVb(clampVB({ ...d.vb, x: d.vb.x - dx / s, y: d.vb.y - dy / s }));
      }}
      onPointerUp={() => {
        suppressClick.current = !!drag.current?.moved;
        drag.current = null;
      }}
      onPointerCancel={() => (drag.current = null)}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <svg
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        role="img"
        aria-label="Mapa gminy: rowy, miejsca bezpieczne i odrzucone"
      >
        <defs>
          <pattern id="isok" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={C.water} fillOpacity="0.2" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={C.water} strokeWidth="1.6" strokeOpacity="0.55" />
          </pattern>
        </defs>

        <rect x={-1000} y={-1000} width={3000} height={2640} fill={C.cream} />
        {/* GUGiK orthophoto (WMS, EPSG:2180, exact AOI bbox) or real land cover (BDOT10k PT*) */}
        {isTiles(basemap) ? (
          <>
            <OsmTiles vb={vb} source={basemap as "osm" | "google-roadmap" | "google-satellite"} />
            <rect
              x={-1000}
              y={-1000}
              width={3000}
              height={2640}
              fill={basemap === "google-satellite" ? C.forest : C.cream}
              fillOpacity={basemap === "google-satellite" ? 0.15 : 0.12}
            />
          </>
        ) : basemap === "ortho" ? (
          <>
            <image href="/maps/orto-bydgoszcz-west.jpg" x={0} y={0} width={1000} height={640} preserveAspectRatio="none" />
            <rect x={0} y={0} width={1000} height={640} fill={C.forest} fillOpacity={0.18} />
          </>
        ) : (
          LAND.map((l, i) => (
            <polygon key={i} points={pts(l.points)} fill={LAND_STYLE[l.kind][0]} fillOpacity={LAND_STYLE[l.kind][1]} />
          ))
        )}
        {/* 80 m corridor along rivers and canals (stand-in for ISOK, which is not loaded) */}
        {showFlood &&
          RIVERS.map((r, i) => (
            <path key={`f${i}`} d={path(r.points)} fill="none" stroke="url(#isok)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        {/* rivers and canals (OSM tiles already draw them) */}
        {!isTiles(basemap) && RIVERS.map((r, i) => (
          <path key={`r${i}`} d={path(r.points)} fill="none" stroke={C.water} strokeWidth={3.5} strokeOpacity={0.9} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
        {!isTiles(basemap) && RIVER_LABELS.map((r) => (
          <text key={r.name} x={r.xy[0]} y={r.xy[1] - 4} textAnchor="middle" fill={C.water} style={{ fontSize: fs(10.5), fontWeight: 600, fontStyle: "italic" }}>
            {r.name}
          </text>
        ))}

        {/* parcel highlight from search */}
        {hlParcel && (
          <polygon points={pts(hlParcel.points)} fill={C.forest} fillOpacity="0.08" stroke={C.forest} strokeWidth={2} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />
        )}

        {/* selected site parcels */}
        {own && (
          <polygon points={pts(own.points)} fill={C.agri} fillOpacity="0.1" stroke={C.agri} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        )}
        {neigh && (
          <polygon
            points={pts(neigh.points)}
            fill={refusedHere ? C.terra : C.cream}
            fillOpacity={refusedHere ? 0.18 : 0.12}
            stroke={refusedHere ? C.terra : C.cream}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            style={{ transition: "fill 400ms, stroke 400ms" }}
          />
        )}

        {/* roads */}
        {/* roads by class: minor first, major on top */}
        {!isTiles(basemap) && ROADS.map((r) => {
          const w = roadWidth(r.cls);
          return (
            <g key={r.id}>
              {w > 1.5 && <path d={path(r.points)} fill="none" stroke={C.forest} strokeOpacity="0.35" strokeWidth={w + 2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
              <path d={path(r.points)} fill="none" stroke={w > 1.5 ? "#FFFFFF" : C.forest} strokeOpacity={w > 1.5 ? 1 : 0.25} strokeWidth={w} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {!isTiles(basemap) && ROAD_LABELS.map((r) => (
          <g key={r.name}>
            <rect x={r.xy[0] - fs(14)} y={r.xy[1] - fs(7)} width={fs(28)} height={fs(13)} rx={fs(2)} fill={C.forest} />
            <text x={r.xy[0]} y={r.xy[1] + fs(3.5)} textAnchor="middle" fill={C.cream} style={{ fontSize: fs(9.5), fontWeight: 700 }}>
              {r.name}
            </text>
          </g>
        ))}

        {/* building footprints (BDOT10k BUBD) */}
        {basemap === "schema" && <path d={FOOTPRINTS} fill={C.soil} fillOpacity="0.75" />}
        <text x={985} y={630} textAnchor="end" fill={C.forest} opacity={0.6} style={{ fontSize: fs(11), fontWeight: 600 }}>
          Bydgoszcz →
        </text>

        {/* retention zone */}
        {retention && (
          <path
            d={path(retention)}
            fill="none"
            stroke={C.water}
            strokeOpacity="0.28"
            strokeWidth={12 /* rehydration band: 2 x 60 m, as in the pipeline mock */}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* ditches */}
        {ditches.map((d) => (
          <path
            key={d.id}
            d={path(d.points)}
            fill="none"
            stroke={C.water}
            strokeOpacity={d.resolvable ? 0.95 : 0.5}
            strokeWidth={d.resolvable ? 2 : 1.5}
            strokeDasharray={d.resolvable ? undefined : "4 4"}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* refused candidates */}
        {showRefused &&
          refusedCands.map((c) => {
            const hl = refusalFilter === c.refusalCode;
            const dim = refusalFilter && !hl;
            const isSel = candId === c.id;
            return (
              <circle
                key={c.id}
                cx={c.xy[0]}
                cy={c.xy[1]}
                r={(isSel ? 5 : hl ? 3.2 : 1.5) * u}
                fill={C.terra}
                fillOpacity={isSel ? 1 : dim ? 0.12 : hl ? 0.95 : 0.32}
                stroke={isSel ? C.cream : undefined}
                strokeWidth={isSel ? 1.5 : undefined}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer"
                onClick={() => onSelectCandidate(c.id)}
              >
                <title>{c.id}</title>
              </circle>
            );
          })}

        {/* accepted sites */}
        {sites.map((s) => {
          const o = orders[s.id];
          const isSel = selected?.id === s.id;
          const hidden = kowrOnly && !s.kowr;
          const r = (isSel ? 9 : 5.5) * u;
          return (
            <g
              key={s.id}
              opacity={hidden ? 0.18 : 1}
              className="cursor-pointer"
              onClick={() => onSelectSite(s.id)}
              role="button"
              aria-label={`Miejsce ${s.id}`}
            >
              <circle cx={s.xy[0]} cy={s.xy[1]} r={r + 2.6 * u} fill="none" stroke={o ? ORDER_COLOR[o.action] : C.forest} strokeWidth={2.4 * u} style={{ transition: "stroke 400ms" }} />
              <circle cx={s.xy[0]} cy={s.xy[1]} r={r} fill={C.agri} stroke={C.cream} strokeWidth={1.6 * u} />
              <circle cx={s.xy[0]} cy={s.xy[1]} r={r + 10 * u} fill="transparent" />
              {isSel && (
                <g style={{ fontSize: fs(12) }}>
                  <rect x={s.xy[0] + r + 6 * u} y={s.xy[1] - 9 * u} width={44 * u} height={18 * u} rx={2 * u} fill={C.forest} />
                  <text x={s.xy[0] + r + 28 * u} y={s.xy[1] + 4 * u} textAnchor="middle" fill={C.cream} className="num" style={{ fontWeight: 700 }}>
                    {s.id}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* zoom controls, north arrow, scale bar */}
      <div data-ui className="no-print absolute right-4 bottom-12 flex flex-col overflow-hidden rounded-[4px] bg-cream/95 shadow-[0_8px_24px_rgba(31,58,34,.18)] ">
        <button type="button" aria-label="Przybliż" className="grid size-10 place-items-center text-xl text-forest hover:bg-cream-deep" onClick={() => zoomBy(1 / 1.4)}>
          +
        </button>
        <span className="h-px bg-forest/15" />
        <button type="button" aria-label="Oddal" className="grid size-10 place-items-center text-xl text-forest hover:bg-cream-deep" onClick={() => zoomBy(1.4)}>
          −
        </button>
        <span className="h-px bg-forest/15" />
        <button type="button" aria-label="Cała gmina" title="Cała gmina" className="eb grid h-10 w-10 place-items-center text-[9px] text-forest hover:bg-cream-deep" onClick={() => animateTo(FULL, 700)}>
          CAŁA
        </button>
      </div>
      <div data-ui className="pointer-events-none absolute right-[25px] bottom-[11.5rem] flex flex-col items-center text-forest">
        <svg width="22" height="30" viewBox="0 0 22 30" aria-hidden>
          <path d="M11 2 L18 24 L11 19 L4 24 Z" fill={C.forest} />
        </svg>
        <span className="eb -mt-0.5">N</span>
      </div>
      <div data-ui className="pointer-events-none absolute right-4 bottom-2 rounded-[2px] bg-cream/90 px-2 py-1 text-right text-forest ">
        <div className="ml-auto h-1.5 border-x-2 border-b-2 border-forest" style={{ width: barPx }} />
        <div className="num mt-0.5 text-[11px]">{barM >= 1000 ? `${barM / 1000} km` : `${barM} m`}</div>
      </div>
    </div>
  );
}
