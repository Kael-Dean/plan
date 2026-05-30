import JSZip from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/jszip/dist/jszip.min.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docxPath = join(__dirname, "..", "หน่วยการเรียนรู้ที่๔_กลัวทำไม.docx");

const buf = readFileSync(docxPath);
const zip = await JSZip.loadAsync(buf);

const required = ["[Content_Types].xml", "word/document.xml", "word/_rels/document.xml.rels"];
console.log("=== Parts ===");
for (const p of required) console.log(`  ${zip.file(p) ? "OK" : "MISSING"}  ${p}`);

const docXml = await zip.file("word/document.xml").async("string");

// Extract all w:t text
const texts = [...docXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
const allText = texts.join("");

// PUA leftover check
const pua = [...allText].filter((ch) => {
  const cp = ch.codePointAt(0);
  return cp >= 0xE000 && cp <= 0xF8FF;
});
console.log("\n=== PUA leftover ===");
console.log(`  ${pua.length === 0 ? "OK — 0 PUA chars" : "FAIL — " + pua.length + " PUA chars: " + [...new Set(pua)].map(c=>c.codePointAt(0).toString(16))}`);

// Plan headers
const planHeaders = [...allText.matchAll(/แผนการจัดการเรียนรู้ที่\s*([๐-๙]+)/g)].map((m) => m[1]);
console.log("\n=== Plan headers ===");
console.log(`  Found ${planHeaders.length}: ${planHeaders.join(", ")}`);

// Hours check
const unitHours = [...allText.matchAll(/หน่วยการเรียนรู้ที่ ๔ เรื่อง กลัวทำไม/g)].length;
const plan1hr = [...allText.matchAll(/เวลา ๑ ชั่วโมง/g)].length;
const unit10hr = [...allText.matchAll(/เวลา ๑๐ ชั่วโมง/g)].length;
console.log("\n=== Hours ===");
console.log(`  Unit title occurrences: ${unitHours}`);
console.log(`  "เวลา ๑ ชั่วโมง" occurrences: ${plan1hr}`);
console.log(`  "เวลา ๑๐ ชั่วโมง" occurrences: ${unit10hr}`);

// Section presence per known headings
const sectionHits = {};
for (const h of ["สาระสำคัญ", "ตัวชี้วัด", "จุดประสงค์การเรียนรู้", "คุณลักษณะอันพึงประสงค์", "สาระการเรียนรู้", "กิจกรรมการเรียนรู้", "สื่อ", "การวัดและประเมินผลการเรียนรู้", "กิจกรรมเสนอแนะ", "บันทึกหลังแผนการจัดการเรียนรู้"]) {
  sectionHits[h] = [...allText.matchAll(new RegExp(h, "g"))].length;
}
console.log("\n=== Section heading counts (expect ~10 each) ===");
for (const [k, v] of Object.entries(sectionHits)) console.log(`  ${v}\t${k}`);

console.log(`\nTotal w:t runs: ${texts.length}, total chars: ${allText.length}, file: ${(buf.length/1024).toFixed(1)} KB`);
