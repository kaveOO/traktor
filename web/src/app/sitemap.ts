import type { MetadataRoute } from "next";

/** Public origin. Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://traktor.<subdomena>.workers.dev). */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Content pages only. /slides (pitch deck), /raport (needs query params) and /api are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: { path: string; priority: number }[] = [
    { path: "/", priority: 1 },
    { path: "/analiza", priority: 0.9 },
    { path: "/metoda", priority: 0.7 },
    { path: "/mapa", priority: 0.5 },
    { path: "/karta", priority: 0.4 },
  ];
  return pages.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: "monthly", priority: p.priority }));
}
