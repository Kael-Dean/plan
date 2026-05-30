// Validate the generated docx (headless checks only — visual pagination needs Word).
// Usage: node validate_docx.mjs <unitDir>
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getUnitDir, loadConfig } from "./lib.mjs";

const unitDir = getUnitDir();
const cfg = loadConfig(unitDir);
const docxPath = join(unitDir, cfg.outputName);
const numPlans = cfg.keepPlans.length;

const zip = await JSZip.loadAsync(readFileSync(docxPath));
const need = ["[Content_Types].xml", "word/document.xml", "word/_rels/document.xml.rels"];
console.log("=== Parts ===");
for (const p of need) console.log(`  ${zip.file(p) ? "OK  " : "MISS"} ${p}`);

const xml = await zip.file("word/document.xml").async("string");
const allText = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
const count = (re) => (xml.match(re) || []).length;

const pua = [...allText].filter((c) => { const cp = c.codePointAt(0); return cp >= 0xE000 && cp <= 0xF8FF; }).length;
console.log("\n=== Content ===");
console.log(`  PUA leftover: ${pua === 0 ? "OK — 0" : "FAIL — " + pua}`);
const planHeaders = [...allText.matchAll(/แผนการจัดการเรียนรู้ที่\s*([๐-๙]+)/g)].map((m) => m[1]);
console.log(`  Plan headers: ${planHeaders.length}/${numPlans} → ${planHeaders.join(", ")}`);
console.log(`  "เวลา ${cfg.planHours} ชั่วโมง": ${count(new RegExp(`เวลา ${cfg.planHours} ชั่วโมง`, "g"))}`);
console.log(`  "เวลา ${cfg.unitTotalHours} ชั่วโมง": ${count(new RegExp(`เวลา ${cfg.unitTotalHours} ชั่วโมง`, "g"))}`);

console.log("\n=== Keep-together props ===");
console.log(`  keepNext:        ${count(/<w:keepNext\b/g)}`);
console.log(`  cantSplit:       ${count(/<w:cantSplit\b/g)}  (expect 7×plans = ${7 * numPlans})`);
console.log(`  pageBreakBefore: ${count(/<w:pageBreakBefore\b/g)}  (expect ${numPlans})`);

const pngs = Object.keys(zip.files).filter((f) => /^word\/media\/.*\.png$/.test(f));
const blips = count(/<a:blip\b/g);
console.log("\n=== Embedded worksheets (if embedded) ===");
console.log(`  PNG media: ${pngs.length} | a:blip refs: ${blips}`);
console.log(`\nFile: ${(readFileSync(docxPath).length / 1024 / 1024).toFixed(2)} MB`);
