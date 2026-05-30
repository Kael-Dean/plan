// Validate a built math docx: extract text, check for PUA chars, key headings, names, tables.
// Usage: node validate_math_docx.mjs <planDir>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { getUnitDir, loadConfig } from "./lib.mjs";

const planDir = getUnitDir();
const cfg = loadConfig(planDir);
const docxPath = join(planDir, cfg.outputName);

const zip = await JSZip.loadAsync(readFileSync(docxPath));
const xml = await zip.file("word/document.xml").async("string");

// extract text from <w:t> nodes (strip ZWSP word-break marks added by the builder)
const texts = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) =>
  m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/​/g, ""));
const full = texts.join(" ");

// PUA check
const pua = [...full].filter((c) => { const cp = c.codePointAt(0); return cp >= 0xE000 && cp <= 0xF8FF; });
const tableCount = (xml.match(/<w:tbl>/g) || []).length;

const checks = [
  ["PUA chars = 0", pua.length === 0, `found ${pua.length}`],
  ["มี 'แผนการจัดการเรียนรู้ที่'", full.includes("แผนการจัดการเรียนรู้ที่"), ""],
  ["มี 'มาตรฐานการเรียนรู้'", full.includes("มาตรฐานการเรียนรู้"), ""],
  ["มี 'จุดประสงค์การเรียนรู้สู่ตัวชี้วัด'", full.includes("จุดประสงค์การเรียนรู้สู่ตัวชี้วัด"), ""],
  ["มี 'การจัดกิจกรรมการเรียนรู้'", full.includes("การจัดกิจกรรมการเรียนรู้"), ""],
  ["มี 'สื่อการเรียนรู้'", full.includes("สื่อการเรียนรู้"), ""],
  ["มี 'การวัดและประเมินผล'", full.includes("การวัดและประเมินผล"), ""],
  ["มี ตาราง 'แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรม'", full.includes("แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรม"), ""],
  ["มี 'แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรมกลุ่ม'", full.includes("แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรมกลุ่ม"), ""],
  ["มี 'บันทึกหลังการจัดการเรียนรู้'", full.includes("บันทึกหลังการจัดการเรียนรู้"), ""],
  [`ผู้ประเมิน = ${cfg.evaluator}`, full.includes(cfg.evaluator), ""],
  ["มี 'ผู้สอน'", full.includes("ผู้สอน"), ""],
  [`ผอ. = ${cfg.directorLabel}`, full.includes(cfg.directorLabel), ""],
  ["ตาราง >= 3", tableCount >= 3, `found ${tableCount}`],
];

let ok = true;
for (const [name, pass, extra] of checks) {
  console.log(`${pass ? "✓" : "✗"} ${name}${extra && !pass ? " — " + extra : ""}`);
  if (!pass) ok = false;
}
if (pua.length) console.log("PUA sample:", pua.slice(0, 10).map((c) => "U+" + c.codePointAt(0).toString(16)));
console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
process.exit(ok ? 0 : 1);
