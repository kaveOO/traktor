import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { FieldPattern } from "../../web/src/components/brand/FieldPattern";
import { writeFileSync } from "node:fs";
const out = process.argv[2];
writeFileSync(out + "/field-forest.svg", renderToStaticMarkup(h(FieldPattern, { seed: 7, tone: "forest", angle: -14, board: 0.42 })));
writeFileSync(out + "/field-color.svg", renderToStaticMarkup(h(FieldPattern, { seed: 3, tone: "color", angle: -14, board: 0.55 })));
