// Per-page text + tokens from unpacked brand pages. Usage: node scripts/brand-pages.mjs docs/brand/unpacked docs/brand/pages.md
import fs from "node:fs";
import path from "node:path";

const [dir, out] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => /^\d\d-.*\.html$/.test(f)).sort();
let md = "# TRAKTOR Brand Guidelines: extracted text per page\n\n";
const allHex = new Map();
for (const f of files) {
  let h = fs.readFileSync(path.join(dir, f), "utf8");
  h = h.replace(/data:[^"')\s]{200,}/g, "DATA").replace(/url\(DATA\)/g, "url(DATA)");
  const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const css = (h.match(/<style[\s\S]*?<\/style>/g) || []).join("\n");
  const vars = [...new Set(css.match(/--[\w-]+\s*:\s*[^;]+/g) || [])];
  const fonts = [...new Set((h.match(/font-family\s*:\s*[^;"}]+/g) || []).map((s) => s.replace(/\s+/g, " ")))];
  for (const x of h.match(/#[0-9A-Fa-f]{6}\b/g) || []) allHex.set(x.toUpperCase(), (allHex.get(x.toUpperCase()) || 0) + 1);
  const body = h
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, " [svg] ")
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  md += `## ${f.slice(0, 2)} · ${title}\n\n**CSS vars:** ${vars.slice(0, 60).join("; ") || "-"}\n\n**Fonts:** ${fonts.join(" | ") || "-"}\n\n\`\`\`text\n${body.slice(0, 6000)}\n\`\`\`\n\n`;
}
md += "## Colour usage across pages\n\n" + [...allHex.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`).join("\n") + "\n";
fs.writeFileSync(out, md);
console.log(out, md.length);
