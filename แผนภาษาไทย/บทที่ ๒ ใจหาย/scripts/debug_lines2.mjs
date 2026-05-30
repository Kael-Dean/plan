import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, "pdf_raw.json"), "utf8"));

function repairThai(s) {
  return s.replace(/เรียนรู(?!้)/g, "เรียนรู้").replace(/หนวย/g, "หน่วย");
}

// Reproduce main script's line grouping logic
for (const p of raw.pages.slice(0, 2)) {
  const arr = [];
  for (const it of p.items) {
    if (!it.str || !it.str.trim()) continue;
    const last = arr[arr.length - 1];
    if (last && Math.abs(last.y - it.y) < 2) {
      last.parts.push(it);
    } else {
      arr.push({ y: it.y, parts: [it] });
    }
  }
  arr.sort((a, b) => b.y - a.y);
  console.log(`=== Page ${p.pageNum} ===`);
  for (const line of arr.slice(0, 10)) {
    line.parts.sort((a, b) => a.x - b.x);
    const raw = line.parts.map((pp) => pp.str).join("");
    const text = repairThai(raw);
    console.log(`y=${line.y.toFixed(1)} x=${line.parts[0].x.toFixed(1)}: ${JSON.stringify(text)}`);
  }
}

// Test regex
const re = /แผนการจัดการเรียนรู้ที่\s*([๐-๙0-9]+)/;
console.log("\nRegex test:");
const candidates = [
  "แผนการจัดการเรียนรู้ที่ ๑",
  "แผนการจัดการเรียนรู้ ที่ ๘",
];
for (const c of candidates) {
  console.log(`  ${JSON.stringify(c)} → ${JSON.stringify(c.match(re))}`);
}
