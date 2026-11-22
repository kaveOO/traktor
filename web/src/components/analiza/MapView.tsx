"use client";

// maplibre-gl (~1 MB) is loaded lazily inside the init effect, so it is not in the /analiza first load.
import type * as maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./analiza.css";
import { useEffect, useRef, useState } from "react";
import { ProgressLine } from "@/components/brand/ui";
import type { LonLat, Parcel } from "@/lib/analiza";
import { bboxOf } from "./api";

export type Basemap = "satelita" | "mapa";
/** tone: default = forest, safe = agri, warning = terracotta (warnings only). All with a cream ring. */
export type MapMarker = { id: string; lonLat: LonLat; label: string; n: number; tone?: "default" | "safe" | "warning" };

/** Basemap endpoints.
 * Satelita: EOX Sentinel-2 cloudless 2016 (layer s2cloudless_3857, CC BY 4.0) up to z13, then the GUGiK
 * orthophoto from z11: WMTS StandardResolution, matrix set "EPSG:3857" (TileMatrix "EPSG:3857:{z}"),
 * ~5x faster than the WMS (docs/review/05-performance.md).
 * Działki: KIEG WMS with {bbox-epsg-3857}. Mapa: OSM standard tiles (ODbL). */
const ORTO_WMTS =
  "https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTOFOTOMAPA&STYLE=default&TILEMATRIXSET=EPSG:3857&FORMAT=image/jpeg&TILEMATRIX=EPSG:3857:{z}&TILEROW={y}&TILECOL={x}";
const KIEG_WMS =
  "https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=dzialki,numery_dzialek&STYLES=&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE";

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    s2: {
      type: "raster",
      // 2016 layer: CC BY 4.0 (2018+ layers are CC BY-NC-SA, not allowed for transfer to KOWR)
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"],
      tileSize: 256,
      maxzoom: 14,
      attribution:
        '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016), CC BY 4.0',
    },
    orto: {
      type: "raster",
      tiles: [ORTO_WMTS],
      tileSize: 256,
      minzoom: 11,
      maxzoom: 19,
      attribution: 'Ortofotomapa © <a href="https://www.geoportal.gov.pl" target="_blank" rel="noopener">GUGiK</a>',
    },
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">autorzy OpenStreetMap</a> (ODbL)',
    },
    kieg: {
      type: "raster",
      tiles: [KIEG_WMS],
      tileSize: 256,
      minzoom: 15,
      maxzoom: 20,
      attribution: "Działki: KIEG © GUGiK",
    },
    parcel: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#EFE6D3" } },
    { id: "s2", type: "raster", source: "s2", maxzoom: 13 },
    { id: "orto", type: "raster", source: "orto", minzoom: 11 },
    { id: "osm", type: "raster", source: "osm", layout: { visibility: "none" } },
    { id: "kieg", type: "raster", source: "kieg", minzoom: 15 },
    // parcel: faint cream wash (water blue is reserved for water and the retention zone, SPEC §06),
    // a 1.5 px forest line on a 5 px cream halo so it reads on orthophoto and on OSM alike
    { id: "parcel-fill", type: "fill", source: "parcel", paint: { "fill-color": "#F3ECDD", "fill-opacity": 0.18 } },
    {
      id: "parcel-halo",
      type: "line",
      source: "parcel",
      layout: { "line-join": "round" },
      paint: { "line-color": "#F3ECDD", "line-width": 5 },
    },
    {
      id: "parcel-line",
      type: "line",
      source: "parcel",
      layout: { "line-join": "round" },
      paint: { "line-color": "#1F3A22", "line-width": 1.5 },
    },
  ],
};

const LOCALE = {
  "Map.Title": "Mapa",
  "NavigationControl.ZoomIn": "Przybliż",
  "NavigationControl.ZoomOut": "Oddal",
  "NavigationControl.ResetBearing": "Ustaw północ u góry",
  "AttributionControl.ToggleAttribution": "Pokaż źródła mapy",
  "AttributionControl.MapFeedback": "Zgłoś błąd mapy",
  "Marker.Title": "Znacznik",
  "Popup.Close": "Zamknij",
  "ScaleControl.Meters": "m",
  "ScaleControl.Kilometers": "km",
};

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Pads the camera so the parcel is not hidden by the side panel (desktop) or bottom sheet (mobile). */
const padding = () =>
  window.innerWidth >= 900
    ? { top: 96, bottom: 64, left: 48, right: 468 }
    : { top: 120, bottom: Math.round(window.innerHeight * 0.5), left: 24, right: 24 };

/** MapLibre needs WebGL; without it the Map constructor throws. */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function createMap(lib: typeof maplibregl, container: HTMLDivElement, onClick: (lonLat: LonLat, zoom: number) => void) {
  const map = new lib.Map({
    container,
    style: STYLE,
    bounds: [14.07, 49.0, 24.15, 54.84],
    fitBoundsOptions: { padding: padding() },
    attributionControl: false,
    keyboard: true,
    locale: LOCALE,
    maxZoom: 19,
    minZoom: 4,
    // flat map, north up (SPEC §06: no 3D tilt)
    maxPitch: 0,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    // tracks the container with a ResizeObserver (mobile sheet, rotation, window resize)
    trackResize: true,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new lib.NavigationControl({ showCompass: false }), "bottom-left");
  map.addControl(new lib.ScaleControl({ unit: "metric" }), "bottom-left");
  // default = responsive: always open on wide maps, collapses to (i) only on maps < 640 px after a move
  map.addControl(new lib.AttributionControl(), "bottom-left");
  map.on("click", (e: maplibregl.MapMouseEvent) => onClick([e.lngLat.lng, e.lngLat.lat], map.getZoom()));
  return map;
}

export default function MapView({
  parcel,
  basemap,
  showParcels,
  markers,
  activeMarker,
  onMarkerClick,
  onMapClick,
  flyTarget,
  ariaLabel,
}: {
  parcel: Parcel | null;
  basemap: Basemap;
  showParcels: boolean;
  markers: MapMarker[];
  activeMarker: string | null;
  onMarkerClick: (id: string) => void;
  onMapClick: (lonLat: LonLat, zoom: number) => void;
  flyTarget: { lonLat: LonLat; zoom?: number; bbox?: [number, number, number, number]; key: number } | null;
  ariaLabel: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const libRef = useRef<typeof maplibregl | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  /** true once maplibre-gl is loaded and the map exists; re-runs the effects below */
  const [ready, setReady] = useState(false);
  /** first style + tiles drawn: hides the progress line */
  const [painted, setPainted] = useState(false);
  const [loadError, setLoadError] = useState<null | "webgl" | "load">(null);
  const markerRefs = useRef(new Map<string, { m: maplibregl.Marker; node: HTMLButtonElement }>());
  const clickRef = useRef(onMapClick);
  const markerClickRef = useRef(onMarkerClick);
  useEffect(() => {
    clickRef.current = onMapClick;
    markerClickRef.current = onMarkerClick;
  });

  // init once
  useEffect(() => {
    let cancelled = false;
    let map: maplibregl.Map | null = null;
    const markersNow = markerRefs.current;
    // no WebGL: skip the ~1 MB download and say so
    (hasWebGL() ? import("maplibre-gl") : Promise.reject(new Error("webgl")))
      .then((lib) => {
        if (cancelled || !el.current) return;
        libRef.current = lib;
        // MapLibre 6: the tile worker is a separate ES module that Turbopack does not emit.
        // It is copied to public/vendor by scripts/copy-maplibre-worker.mjs (prebuild).
        const ml = lib as unknown as { setWorkerUrl?: (u: string) => void; default?: { setWorkerUrl?: (u: string) => void } };
        (ml.setWorkerUrl ?? ml.default?.setWorkerUrl)?.("/vendor/maplibre-gl-worker.mjs");
        try {
          map = createMap(lib, el.current, (ll, z) => clickRef.current(ll, z));
        } catch {
          setLoadError("webgl");
          return;
        }
        map.once("load", () => !cancelled && setPainted(true));
        mapRef.current = map;
        setReady(true);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error && e.message === "webgl" ? "webgl" : "load");
      });
    return () => {
      cancelled = true;
      markersNow.forEach(({ m }) => m.remove());
      markersNow.clear();
      // frees the WebGL context, workers and the ResizeObserver
      map?.remove();
      mapRef.current = null;
      libRef.current = null;
    };
  }, []);

  // basemap + parcel overlay toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const sat = basemap === "satelita";
      map.setLayoutProperty("s2", "visibility", sat ? "visible" : "none");
      map.setLayoutProperty("orto", "visibility", sat ? "visible" : "none");
      map.setLayoutProperty("osm", "visibility", sat ? "none" : "visible");
      map.setLayoutProperty("kieg", "visibility", showParcels ? "visible" : "none");
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    return () => {
      map.off("load", apply);
    };
  }, [basemap, showParcels, ready]);

  // parcel outline + camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("parcel") as maplibregl.GeoJSONSource | undefined;
      src?.setData({
        type: "FeatureCollection",
        features: parcel
          ? [{ type: "Feature", properties: { id: parcel.id }, geometry: parcel.geometry as GeoJSON.Geometry }]
          : [],
      });
      if (parcel) {
        const [a, b, c, d] = bboxOf(parcel);
        map.fitBounds(
          [
            [a, b],
            [c, d],
          ],
          { padding: padding(), maxZoom: 17, duration: reducedMotion() ? 0 : 1600, essential: false },
        );
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    return () => {
      map.off("load", apply);
    };
  }, [parcel, ready]);

  // explicit camera moves (search result, "Pokaż na mapie")
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTarget) return;
    const duration = reducedMotion() ? 0 : 1400;
    if (flyTarget.bbox) {
      const [a, b, c, d] = flyTarget.bbox;
      map.fitBounds(
        [
          [a, b],
          [c, d],
        ],
        { padding: padding(), maxZoom: flyTarget.zoom ?? 14, duration },
      );
    } else {
      map.flyTo({ center: flyTarget.lonLat, zoom: flyTarget.zoom ?? Math.max(map.getZoom(), 16), duration, padding: padding() });
    }
  }, [flyTarget, ready]);

  // recommendation markers
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const refs = markerRefs.current;
    const want = new Set(markers.map((m) => m.id));
    refs.forEach((v, id) => {
      if (!want.has(id)) {
        v.m.remove();
        refs.delete(id);
      }
    });
    const paint = (node: HTMLButtonElement, mk: MapMarker) => {
      node.className = `analiza-marker${mk.tone && mk.tone !== "default" ? ` is-${mk.tone}` : ""}`;
      node.textContent = String(mk.n);
      node.setAttribute("aria-label", `Rekomendacja ${mk.n}: ${mk.label}`);
    };
    for (const mk of markers) {
      const have = refs.get(mk.id);
      if (have) {
        // same id, new content (tone, number, position): update in place
        paint(have.node, mk);
        have.m.setLngLat(mk.lonLat);
        continue;
      }
      const node = document.createElement("button");
      node.type = "button";
      paint(node, mk);
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        markerClickRef.current(mk.id);
      });
      const m = new lib.Marker({ element: node }).setLngLat(mk.lonLat).addTo(map);
      refs.set(mk.id, { m, node });
    }
  }, [markers, ready]);

  useEffect(() => {
    markerRefs.current.forEach(({ node }, id) => {
      const on = id === activeMarker;
      node.classList.toggle("is-active", on);
      node.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }, [activeMarker, markers, ready]);

  return (
    <>
      <div
        ref={el}
        className="analiza-map absolute inset-0"
        role="region"
        aria-label={ariaLabel}
        aria-roledescription="mapa"
      />
      {loadError ? (
        // the map is gone, the panel still works; the error sits mid-screen above the sheet
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-10 flex justify-center px-6 min-[900px]:pr-[460px]">
          <div role="alert" className="max-w-sm rounded-[4px] bg-cream/95 p-4 text-forest shadow-[0_8px_24px_rgba(31,58,34,.18)]">
            <p className="text-[15px] font-semibold">
              {loadError === "webgl" ? "Mapa wymaga WebGL." : "Nie udało się wczytać mapy."}
            </p>
            <p className="mt-1 text-[13px] text-forest-muted">
              {loadError === "webgl"
                ? "Włącz akcelerację sprzętową w przeglądarce albo otwórz stronę w innej. Wyszukiwanie i analiza działają bez mapy."
                : "Sprawdź połączenie i odśwież stronę. Wyszukiwanie i analiza działają bez mapy."}
            </p>
          </div>
        </div>
      ) : (
        !painted && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
            <ProgressLine label="Ładuję mapę" />
          </div>
        )
      )}
    </>
  );
}
