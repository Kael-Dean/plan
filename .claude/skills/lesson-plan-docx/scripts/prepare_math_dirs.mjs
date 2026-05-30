// Create plan directories + config.json for each plan in plan_manifest.json.
// Copies the individual PDF from 10แผนคัดสรร into each plan's folder.
// Skips plans whose folder already exists AND already has a .docx file.
// Usage: node prepare_math_dirs.mjs <manifestPath> <baseDir>
// Example:
//   node prepare_math_dirs.mjs "D:\แผน\แผนคณิตศาสตร์\10แผนคัดสรร\plan_manifest.json" "D:\แผน\แผนคณิตศาสตร์"

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

const manifestPath = resolve(process.argv[2]);
const baseDir = resolve(process.argv[3]);

if (!manifestPath || !baseDir) {
  console.error("Usage: node prepare_math_dirs.mjs <manifestPath> <baseDir>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const srcDir = dirname(manifestPath); // folder containing the individual PDFs

const CONFIG_TEMPLATE = {
  subject: "คณิตศาสตร์",
  grade: "ชั้นประถมศึกษาปีที่ ๑",
  numerals: "arabic",
  font: "TH SarabunPSK",
  fontSizePt: 16,
  evaluator: "นางสาวทักษพร การสนธิ์",
  instructor: "นางสาวทักษพร การสนธิ์",
  directorLabel: "ผู้อำนวยการโรงเรียนบ้านหนองเต่า",
  school: "โรงเรียนบ้านหนองเต่า",
  worksheetCount: 0,
};

let skipped = 0;
let created = 0;

for (const entry of manifest) {
  const { globalNum, pdfName, folderName } = entry;
  const planDir = join(baseDir, folderName);
  const docxPath = join(planDir, `${folderName}.docx`);

  // Skip if folder already exists with a completed .docx
  if (existsSync(planDir) && existsSync(docxPath)) {
    console.log(`[SKIP] แผนที่ ${String(globalNum).padStart(2)}: ${folderName} (docx exists)`);
    skipped++;
    continue;
  }

  // Create directory
  mkdirSync(planDir, { recursive: true });

  // Copy PDF from srcDir (10แผนคัดสรร) into plan folder
  const srcPdf = join(srcDir, pdfName);
  const dstPdf = join(planDir, pdfName);
  if (existsSync(srcPdf)) {
    copyFileSync(srcPdf, dstPdf);
  } else {
    console.warn(`  WARNING: Source PDF not found: ${srcPdf}`);
  }

  // Write config.json (no BOM — lib.mjs handles BOM-stripping anyway)
  const config = {
    ...CONFIG_TEMPLATE,
    pdfName,
    outputName: `${folderName}.docx`,
  };
  writeFileSync(join(planDir, "config.json"), JSON.stringify(config, null, 2), "utf8");

  console.log(`[CREATE] แผนที่ ${String(globalNum).padStart(2)}: ${folderName}`);
  created++;
}

console.log(`\nDone. Created: ${created}, Skipped (docx exists): ${skipped}, Total: ${manifest.length}`);

// Print list of plan dirs that need extract+build (no docx yet)
const needBuild = manifest.filter(e => {
  const docxPath = join(baseDir, e.folderName, `${e.folderName}.docx`);
  return !existsSync(docxPath);
});

if (needBuild.length > 0) {
  console.log(`\nPlans needing extract+build (${needBuild.length}):`);
  for (const e of needBuild) {
    console.log(`  ${String(e.globalNum).padStart(3)}: ${join(baseDir, e.folderName)}`);
  }
}
