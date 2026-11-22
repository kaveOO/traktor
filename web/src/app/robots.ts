import type { MetadataRoute } from "next";

/** Same origin rule as sitemap.ts: set NEXT_PUBLIC_SITE_URL at build time. */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // API routes call public data services on each request; /slides is the pitch deck, not content
      disallow: ["/api/", "/slides"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
