// Cloudflare Pages (Free) front door for TRAKTOR: https://traktor-9zx.pages.dev
// Every request (pages + /api) is forwarded to the app running on the team machine through a
// Cloudflare Tunnel. Proxying costs ~1 subrequest and well under 10 ms CPU, so the Free plan is enough;
// the analysis itself (CPU + ~150 data requests) runs on the machine, not in the Worker.
// Deploy: npx wrangler pages deploy deploy/pages-proxy --project-name traktor --branch main
// If the tunnel URL changes, update ORIGIN and redeploy.
const ORIGIN = "https://tray-packaging-leadership-something.trycloudflare.com";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", "https");
    const init = { method: request.method, headers, redirect: "manual" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
    try {
      const res = await fetch(target, init);
      const out = new Response(res.body, res);
      const loc = out.headers.get("location");
      if (loc && loc.startsWith(ORIGIN)) out.headers.set("location", loc.slice(ORIGIN.length) || "/");
      return out;
    } catch {
      return new Response(
        "<!doctype html><meta charset=utf-8><title>TRAKTOR</title><p style=\"font:16px system-ui;padding:2rem\">Serwer TRAKTOR jest chwilowo niedostępny. Spróbuj za minutę.</p>",
        { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "60" } },
      );
    }
  },
};
