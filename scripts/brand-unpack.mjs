// Unpacks a "__bundler" HTML export (manifest of base64, optionally gzip-compressed, files).
// Usage: node scripts/brand-unpack.mjs <export.html> <outDir>
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [src, outDir] = process.argv.slice(2);
const h = fs.readFileSync(src, "utf8");
const grab = (type) => {
  const m = h.match(new RegExp(`<script type="__bundler/${type}">([\\s\\S]*?)</script>`));
  return m ? JSON.parse(m[1]) : null;
};
const manifest = grab("manifest");
const order = grab("page_order") || [];
const template = grab("template");
fs.mkdirSync(outDir, { recursive: true });
const ext = (mime) =>
  ({ "text/html": "html", "text/css": "css", "application/javascript": "js", "text/javascript": "js", "image/png": "png", "image/jpeg": "jpg", "image/svg+xml": "svg", "image/webp": "webp", "font/woff2": "woff2", "font/woff": "woff", "application/json": "json" })[mime] || "bin";
const decode = (buf) => {
  for (const f of [zlib.gunzipSync, zlib.inflateSync, zlib.inflateRawSync, zlib.brotliDecompressSync]) {
    try { return f(buf); } catch {}
  }
  return buf;
};
const index = [];
for (const [id, e] of Object.entries(manifest)) {
  let buf = Buffer.from(e.data, "base64");
  if (e.compressed) buf = decode(buf);
  const name = `${String(order.indexOf(id)).padStart(2, "0")}-${id}.${ext(e.mime)}`;
  fs.writeFileSync(path.join(outDir, name), buf);
  index.push({ name, mime: e.mime, bytes: buf.length, page: order.indexOf(id) });
}
if (template) fs.writeFileSync(path.join(outDir, "_template.html"), template);
index.sort((a, b) => a.name.localeCompare(b.name));
for (const i of index) console.log(i.name, i.mime, i.bytes);
