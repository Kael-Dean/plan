// แยก PDF คณิตศาสตร์ ป.1 ออกเป็นแผน 1-7 แต่ละไฟล์
import { PDFDocument } from "./node_modules/pdf-lib/cjs/index.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const PDF_PATH = "D:/แผน/แผนคณิตศาสตร์/แผนคณิตศาสตร์ ป.1.pdf";
const OUT_DIR  = "D:/แผน/แผนคณิตศาสตร์/แยกแผน";

// page ranges (1-indexed PDF pages) จากการสแกน
const PLANS = {
  1: { start: 12, end: 19 },
  2: { start: 20, end: 27 },
  3: { start: 28, end: 35 },
  4: { start: 36, end: 43 },
  5: { start: 44, end: 51 },
  6: { start: 52, end: 59 },
  7: { start: 60, end: 67 },
};

mkdirSync(OUT_DIR, { recursive: true });

const srcBytes = readFileSync(PDF_PATH);
const srcPdf   = await PDFDocument.load(srcBytes);

for (const [planNo, { start, end }] of Object.entries(PLANS)) {
  const newPdf = await PDFDocument.create();
  // copyPages expects 0-indexed
  const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
  const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
  copiedPages.forEach(p => newPdf.addPage(p));

  const outBytes = await newPdf.save();
  const outPath  = `${OUT_DIR}/แผนที่ ${planNo}.pdf`;
  writeFileSync(outPath, outBytes);
  console.log(`✓ แผนที่ ${planNo}: หน้า ${start}–${end} (${pageIndices.length} หน้า) → ${outPath}`);
}

console.log("\nเสร็จสิ้น! ไฟล์อยู่ใน:", OUT_DIR);
