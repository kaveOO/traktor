"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { CrestHeight, Order, OrderAction, RefusalCode, Site, XY } from "@/lib/traktor";
import { REFUSAL_LABEL, candidates, ditches, mapFeatures, sites } from "@/lib/traktor";
import { C, ORDER_COLOR, ORDER_DASH, ORDER_LETTER, centroid, neighbourParcel, ownParcel, path, pts, retentionPath } from "./geo";

const ORDER_PL: Record<OrderAction, string> = { TRZYMAJ: "TRZYMAJ", OTWORZ: "OTWÓRZ", NIE_RUSZAJ: "NIE RUSZAJ" };
import { IMAGERY, OsmTiles, type TileSource } from "./OsmTiles";

export type Basemap = TileSource | "schema";
const isTiles = (b: Basemap): b is TileSource => b !== "schema";
const isImagery = (b: Basemap) => b !== "schema" && IMAGERY.has(b);

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
  const w = Math.min(1400, Math.max(80, v.w)); // 80 units = 800 m wide: orthophoto z18 detail
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
  basemap = "gugik-orto",
  credit,
}: {
  basemap?: Basemap;
  /** compact attribution rendered in the bottom-right control stack */
  credit?: ReactNode;
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
  // active pointers, for two-finger pinch zoom (+ pan) on touch screens
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; vb: VB; at: XY } | null>(null);
  const twoPoints = () => {
    const [a, b] = [...pointers.current.values()];
    return { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  // keyboard: arrows pan by 10%, +/- zoom (only while the map or a marker has focus)
  const onMapKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-ui]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const v = vbRef.current;
    const pan: Record<string, [number, number]> = {
      ArrowLeft: [-0.1, 0],
      ArrowRight: [0.1, 0],
      ArrowUp: [0, -0.1],
      ArrowDown: [0, 0.1],
    };
    if (e.key in pan) {
      const [dx, dy] = pan[e.key];
      if (anim.current) cancelAnimationFrame(anim.current);
      setVb(clampVB({ ...v, x: v.x + dx * v.w, y: v.y + dy * v.h }));
    } else if (e.key === "+" || e.key === "=") zoomBy(1 / 1.4);
    else if (e.key === "-" || e.key === "_") zoomBy(1.4);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

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
      role="application"
      aria-roledescription="mapa"
      aria-label="Mapa gminy: rowy, miejsca bezpieczne i odrzucone"
      aria-describedby="map-kbd-hint"
      tabIndex={0}
      onKeyDown={onMapKey}
      className="absolute inset-0 touch-none select-none overflow-hidden bg-cream focus-visible:outline-[3px] focus-visible:outline-offset-[-3px]"
      style={{ cursor: drag.current?.moved ? "grabbing" : "grab" }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-ui]")) return;
        if (anim.current) cancelAnimationFrame(anim.current);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          // second finger: switch from pan to pinch
          const { dist, mid } = twoPoints();
          pinch.current = { dist, vb: vbRef.current, at: toUser(mid.x, mid.y) };
          drag.current = null;
          suppressClick.current = true;
          wrap.current?.setPointerCapture(e.pointerId);
          return;
        }
        if (pointers.current.size > 2) return;
        suppressClick.current = false;
        drag.current = { x: e.clientX, y: e.clientY, vb: vbRef.current, moved: false, id: e.pointerId };
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const p = pinch.current;
        if (p && pointers.current.size >= 2) {
          const { dist, mid } = twoPoints();
          const r = wrap.current!.getBoundingClientRect();
          const f = p.dist / dist;
          const w = Math.min(1400, Math.max(80, p.vb.w * f));
          const h = (w * 640) / 1000;
          const s = Math.max(r.width / w, r.height / h);
          // keep the map point that started under the fingers' midpoint under it
          setVb(
            clampVB({
              w,
              h,
              x: p.at[0] - w / 2 - (mid.x - r.left - r.width / 2) / s,
              y: p.at[1] - h / 2 - (mid.y - r.top - r.height / 2) / s,
            }),
          );
          return;
        }
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
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
      onPointerUp={(e) => {
        pointers.current.delete(e.pointerId);
        if (pinch.current) {
          if (pointers.current.size < 2) pinch.current = null;
          // one finger left after a pinch: continue panning from here without a jump
          const rest = [...pointers.current.entries()][0];
          drag.current = rest ? { x: rest[1].x, y: rest[1].y, vb: vbRef.current, moved: true, id: rest[0] } : null;
          return;
        }
        if (drag.current?.id === e.pointerId) {
          suppressClick.current = suppressClick.current || drag.current.moved;
          drag.current = null;
        }
      }}
      onPointerCancel={(e) => {
        pointers.current.delete(e.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        drag.current = null;
      }}
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
      >
        {/* everything up to the site markers is visual only; the keyboard/AT path is the markers + the lists in the panel */}
        <g aria-hidden="true">
        <defs>
          <pattern id="isok" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={C.water} fillOpacity="0.2" />
            <line x1="0" y1="0" x2="0" y2="8" stroke={C.water} strokeWidth="1.6" strokeOpacity="0.55" />
          </pattern>
        </defs>

        <rect x={-1000} y={-1000} width={3000} height={2640} fill={C.cream} />
        {/* live tiles (GUGiK ortho / Sentinel-2 / OSM / Google) or real land cover (BDOT10k PT*) */}
        {isTiles(basemap) ? (
          <>
            {/* offline fallback under the live GUGiK tiles: static GUGiK WMS orthophoto of the AOI */}
            {basemap === "gugik-orto" && (
              <image href="/maps/orto-bydgoszcz-west.jpg" x={0} y={0} width={1000} height={640} preserveAspectRatio="none" />
            )}
            <OsmTiles vb={vb} scale={scale} source={basemap} />
            <rect
              x={-1000}
              y={-1000}
              width={3000}
              height={2640}
              fill={isImagery(basemap) ? C.forest : C.cream}
              fillOpacity={isImagery(basemap) ? 0.15 : 0.12}
            />
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
            strokeWidth={refusedHere ? 2.5 : 2}
            strokeDasharray={refusedHere ? "6 4" : undefined}
            vectorEffect="non-scaling-stroke"
            style={{ transition: "fill 400ms, stroke 400ms" }}
          />
        )}
        {neigh && refusedHere && (
          <text
            x={centroid(neigh.points)[0]}
            y={centroid(neigh.points)[1]}
            textAnchor="middle"
            fill={C.terraInk}
            stroke={C.cream}
            strokeWidth={fs(3)}
            paintOrder="stroke"
            style={{ fontSize: fs(11.5), fontWeight: 700 }}
          >
            Sąsiad: woda wyjdzie
          </text>
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
        {/* on imagery: cream 1 px halo under a thicker stroke so ditches read on fields and forest */}
        {isImagery(basemap) &&
          ditches.map((d) => (
            <path
              key={`h${d.id}`}
              d={path(d.points)}
              fill="none"
              stroke={C.cream}
              strokeOpacity={d.resolvable ? 0.85 : 0.5}
              strokeWidth={d.resolvable ? 4.5 : 3.5}
              strokeDasharray={d.resolvable ? undefined : "4 4"}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {ditches.map((d) => (
          <path
            key={d.id}
            d={path(d.points)}
            fill="none"
            stroke={C.water}
            strokeOpacity={d.resolvable ? (isImagery(basemap) ? 1 : 0.95) : isImagery(basemap) ? 0.8 : 0.5}
            strokeWidth={isImagery(basemap) ? (d.resolvable ? 2.5 : 1.5) : d.resolvable ? 2 : 1.5}
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
              <g key={c.id} className="cursor-pointer" onClick={() => onSelectCandidate(c.id)}>
                <circle
                  cx={c.xy[0]}
                  cy={c.xy[1]}
                  r={(isSel ? 5 : hl ? 3.2 : 1.8) * u}
                  fill={C.terra}
                  fillOpacity={isSel ? 1 : dim ? 0.12 : hl ? 0.95 : 0.7}
                  stroke={C.cream}
                  strokeOpacity={dim ? 0 : 0.9}
                  strokeWidth={isSel ? 1.5 : 0.6}
                  vectorEffect="non-scaling-stroke"
                />
                {/* 24px touch target when the reason is filtered or the point is open (WCAG 2.5.8) */}
                {(hl || isSel) && <circle cx={c.xy[0]} cy={c.xy[1]} r={12 * u} fill="transparent" />}
                {isSel && (
                  <g style={{ fontSize: fs(11) }}>
                    <rect x={c.xy[0] + 8 * u} y={c.xy[1] - 9 * u} width={50 * u} height={18 * u} rx={2 * u} fill={C.terraInk} />
                    <text x={c.xy[0] + 33 * u} y={c.xy[1] + 4 * u} textAnchor="middle" fill={C.cream} className="num" style={{ fontWeight: 700 }}>
                      {c.id}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* accepted sites: real buttons, Tab order, Enter/Space opens */}
        <g role="group" aria-label="Miejsca bezpieczne na zastawkę">
        {sites.map((s) => {
          const o = orders[s.id];
          const isSel = selected?.id === s.id;
          const hidden = kowrOnly && !s.kowr;
          const r = (isSel ? 9 : 5.5) * u;
          const dash = o ? ORDER_DASH[o.action]?.split(" ").map((n) => Number(n) * u * 1.4).join(" ") : undefined;
          const label =
            `Miejsce ${s.id}, ${s.name}` +
            (o ? `, polecenie ${ORDER_PL[o.action]}` : "") +
            (s.maxAcceptedCrestCm ? `, maks. ${s.maxAcceptedCrestCm} cm` : "") +
            (isSel ? ", otwarte" : "");
          return (
            <g
              key={s.id}
              opacity={hidden ? 0.18 : 1}
              className="site-marker cursor-pointer"
              onClick={() => onSelectSite(s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSite(s.id);
                }
              }}
              role="button"
              tabIndex={hidden ? -1 : 0}
              aria-hidden={hidden || undefined}
              aria-label={label}
            >
              <circle className="focus-ring" cx={s.xy[0]} cy={s.xy[1]} r={r + 7 * u} fill="none" stroke={C.cream} strokeWidth={5 * u} />
              <circle className="focus-ring" cx={s.xy[0]} cy={s.xy[1]} r={r + 7 * u} fill="none" stroke={C.forest} strokeWidth={2.4 * u} />
              <circle
                cx={s.xy[0]}
                cy={s.xy[1]}
                r={r + 2.6 * u}
                fill="none"
                stroke={o ? ORDER_COLOR[o.action] : C.forest}
                strokeWidth={2.4 * u}
                strokeDasharray={dash}
                style={{ transition: "stroke 400ms" }}
              />
              <circle cx={s.xy[0]} cy={s.xy[1]} r={r} fill={C.agri} stroke={C.cream} strokeWidth={1.6 * u} />
              {o && (
                <text
                  x={s.xy[0]}
                  y={s.xy[1] + (isSel ? 3.6 : 2.5) * u}
                  textAnchor="middle"
                  fill={C.cream}
                  aria-hidden
                  style={{ fontSize: fs(isSel ? 10 : 7), fontWeight: 800, pointerEvents: "none" }}
                >
                  {ORDER_LETTER[o.action]}
                </text>
              )}
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
        </g>
      </svg>
      <p id="map-kbd-hint" className="sr-only">
        Strzałki przesuwają mapę, plus i minus przybliżają. Tab przechodzi po miejscach, Enter otwiera miejsce. Pełna lista
        miejsc i odrzuconych punktów jest w panelu.
      </p>

      {/* north arrow, zoom controls, scale bar, credit: one stack that stays above the mobile bottom sheet (--sheet-h) */}
      <div
        data-ui
        className="pointer-events-none absolute right-4 flex flex-col items-end gap-2 transition-[bottom] duration-300 max-[640px]:right-2"
        style={{ bottom: "calc(var(--sheet-h, 0px) + 8px)" }}
      >
        <div className="mr-[9px] flex flex-col items-center text-forest" aria-hidden>
          <svg width="22" height="30" viewBox="0 0 22 30">
            <path d="M11 2 L18 24 L11 19 L4 24 Z" fill={C.forest} stroke={C.cream} strokeWidth="1" />
          </svg>
          <span className="eb -mt-0.5">N</span>
        </div>
        <div className="no-print pointer-events-auto flex flex-col overflow-hidden rounded-[4px] bg-cream/95 shadow-[0_8px_24px_rgba(31,58,34,.18)]">
          <button type="button" aria-label="Przybliż" className="grid size-10 place-items-center text-xl text-forest hover:bg-cream-deep" onClick={() => zoomBy(1 / 1.4)}>
            +
          </button>
          <span className="h-px bg-forest/15" aria-hidden />
          <button type="button" aria-label="Oddal" className="grid size-10 place-items-center text-xl text-forest hover:bg-cream-deep" onClick={() => zoomBy(1.4)}>
            −
          </button>
          <span className="h-px bg-forest/15" aria-hidden />
          <button type="button" aria-label="Cała gmina" title="Cała gmina" className="eb grid h-10 w-10 place-items-center text-[10px] text-forest hover:bg-cream-deep" onClick={() => animateTo(FULL, 700)}>
            CAŁA
          </button>
        </div>
        <div className="rounded-[2px] bg-cream/90 px-2 py-1 text-right text-forest">
          <div className="ml-auto h-1.5 border-x-2 border-b-2 border-forest" style={{ width: barPx }} aria-hidden />
          <div className="num mt-0.5 text-[11px]">
            <span className="sr-only">Skala: </span>
            {barM >= 1000 ? `${barM / 1000} km` : `${barM} m`}
          </div>
        </div>
        {credit && <div className="pointer-events-auto">{credit}</div>}
      </div>
    </div>
  );
}
