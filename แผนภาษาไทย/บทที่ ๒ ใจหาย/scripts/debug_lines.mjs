import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, "pdf_raw.json"), "utf8"));

function repairThai(s) {
  return s.replace(/เรียนรู(?!้)/g, "เรียนรู้");
}

// Show first item of every page that matches "แผน"
for (const p of raw.pages) {
  for (const it of p.items) {
    if (it.str && it.str.includes("แผน")) {
      const repaired = repairThai(it.str);
      console.log(`Page ${p.pageNum} y=${it.y.toFixed(1)} x=${it.x.toFixed(1)}: ${JSON.stringify(repaired)}`);
    }
  }
}
