// Recursively unpack nested "__bundler" pages and write readable per-page text + the inner HTML.
// Usage: node scripts/brand-deep.mjs docs/brand/unpacked docs/brand/pages
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [dir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const decode = (buf) => {
  for (const f of [zlib.gunzipSync, zlib.inflateSync, zlib.inflateRawSync]) { try { return f(buf); } catch {} }
  return buf;
};
const grab = (h, type) => {
  const m = h.match(new RegExp(`<script type="__bundler/${type}">([\\s\\S]*?)</script>`));
  return m ? JSON.parse(m[1]) : null;
};
/** Inline the page: template with resource uuids replaced by data URIs is overkill; we only need html/css/js text. */
function innerHtml(h) {
  const man = grab(h, "manifest");
  const tpl = grab(h, "template");
  if (!man) return h;
  let html = typeof tpl === "string" ? tpl : "";
  const parts = [];
  for (const [id, e] of Object.entries(man)) {
    let buf = Buffer.from(e.data, "base64");
    if (e.compressed) buf = decode(buf);
    if (/^text\/|javascript|json|svg/.test(e.mime)) parts.push({ id, mime: e.mime, text: buf.toString("utf8") });
    else html = html.split(id).join(`asset:${e.mime}`);
  }
  for (const p of parts) if (/html/.test(p.mime)) html += "\n" + p.text;
  return { html, parts };
}
const strip = (h) =>
  h.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<svg[\s\S]*?<\/svg>/g, " [svg] ")
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr|\/section)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

let all = "# TRAKTOR Brand Guidelines 1.0: page text (unpacked from the exported artifact)\n\n";
for (const f of fs.readdirSync(dir).filter((x) => /^\d\d-.*\.html$/.test(x)).sort()) {
  const h = fs.readFileSync(path.join(dir, f), "utf8");
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || f;
  const r = innerHtml(h);
  const html = typeof r === "string" ? r : r.html;
  const scripts = typeof r === "string" ? [] : r.parts.filter((p) => /javascript|jsx|babel/.test(p.mime) || /React|createElement|jsx/.test(p.text.slice(0, 2000)));
  const slug = f.slice(0, 2) + "-" + title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  fs.writeFileSync(path.join(outDir, slug + ".html"), html.replace(/data:[^"')\s]{200,}/g, "DATA"));
  for (const [i, s] of scripts.entries()) fs.writeFileSync(path.join(outDir, `${slug}.script${i}.js`), s.text);
  // text from html + string literals in scripts (JSX text)
  let text = strip(html);
  for (const s of scripts) {
    const lits = [...s.text.matchAll(/>([^<>{}\n]{3,})</g)].map((m) => m[1].trim()).filter((t) => /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(t));
    text += "\n" + [...new Set(lits)].join("\n");
  }
  all += `## ${title}\n\n\`\`\`text\n${text.slice(0, 9000)}\n\`\`\`\n\n`;
  console.log(slug, html.length, scripts.length);
}
fs.writeFileSync(path.join(outDir, "_ALL.md"), all);
console.log("total", all.length);
