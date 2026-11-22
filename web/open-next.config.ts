import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext config for Cloudflare Workers.
 *
 * Incremental cache: read-only static assets. TRAKTOR has no ISR/revalidate and no "use cache",
 * so prerendered shells (Cache Components / PPR) are served from the Workers assets binding and
 * no KV/R2 is needed. API routes are dynamic and are not cached by Next.
 *
 * If ISR or "use cache" is added later, switch to R2 (bucket "traktor-opennext-cache"):
 *   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 * and add to wrangler.jsonc:
 *   "r2_buckets": [{ "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "traktor-opennext-cache" }]
 * (create it first: npx wrangler r2 bucket create traktor-opennext-cache).
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
