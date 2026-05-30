import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import JSZip from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/jszip/dist/jszip.min.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCX = join(__dirname, "..", "หน่วยการเรียนรู้ที่๒_ใจหาย_final5.docx");

function decodeXml(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

async function verify() {
  const buf = readFileSync(DOCX);
  const zip = await JSZip.loadAsync(buf);

  console.log("=== Zip entries ===");
  for (const name of Object.keys(zip.files)) console.log("  ", name);

  const xml = await zip.file("word/document.xml").async("string");
  console.log(`\n=== document.xml: ${xml.length} chars ===`);

  // Extract all <w:t> texts in order
  const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const texts = [];
  let m;
  while ((m = tRe.exec(xml)) !== null) texts.push(decodeXml(m[1]));
  console.log(`Total text runs: ${texts.length}`);

  // Count plan headers
  const planHeaderRe = /แผนการจัดการเรียนรู้ที่\s*([๐-๙0-9]+)/;
  const planHits = texts.filter((t) => planHeaderRe.test(t));
  console.log(`Plan headers found: ${planHits.length}`);
  console.log(`  - ${planHits.join(" | ")}`);

  // Count section 9 / 10 headers
  const sec9Hits = texts.filter((t) => /^\s*๙\.\s*การวัด/.test(t));
  const sec10Hits = texts.filter((t) => /^\s*๑๐\.\s*กิจกรรมเสนอแนะ/.test(t));
  console.log(`Section 9 headers: ${sec9Hits.length}`);
  console.log(`Section 10 headers: ${sec10Hits.length}`);

  // Count signature occurrences
  const instructorHits = texts.filter((t) => t.includes("นางสาวทักษพร การสนธิ์"));
  const deputyHits = texts.filter((t) => t.includes("รองผู้อำนวยการ"));
  const homeroomHits = texts.filter((t) => t.includes("หัวหน้ากลุ่มสาระ"));
  console.log(`Instructor name occurrences: ${instructorHits.length}`);
  console.log(`Deputy label occurrences: ${deputyHits.length}`);
  console.log(`Homeroom label occurrences: ${homeroomHits.length}`);

  // Count tables (for section 9)
  const tblCount = [...xml.matchAll(/<w:tbl\b/g)].length;
  console.log(`Tables in doc: ${tblCount}`);

  // Count page breaks
  const pbCount = [...xml.matchAll(/<w:br\s+w:type="page"\s*\/>/g)].length;
  console.log(`Page breaks: ${pbCount}`);

  // Show first 80 text fragments
  console.log("\n=== First 30 text fragments ===");
  for (const t of texts.slice(0, 30)) {
    if (t.trim()) console.log(`  ${JSON.stringify(t.slice(0, 80))}`);
  }
}

verify().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
