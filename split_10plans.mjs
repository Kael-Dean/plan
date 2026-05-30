// แยก 10 แผนคัดสรรจากหน่วย 1 คณิตศาสตร์ ป.1
import { PDFDocument } from "./node_modules/pdf-lib/cjs/index.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const PDF_PATH = "D:/แผน/แผนคณิตศาสตร์/แผนคณิตศาสตร์ ป.1.pdf";
const OUT_DIR  = "D:/แผน/แผนคณิตศาสตร์/10แผนคัดสรร";

// 10 แผนที่เลือก: [originalPlanNo, startPDF, endPDF, topic]
const SELECTED = [
  [1,  12,  19, "การนับหนึ่งถึงห้า และศูนย์"],
  [2,  20,  27, "การนับหกถึงสิบ"],
  [3,  28,  35, "การเขียนตัวเลขและตัวหนังสือ 1–2"],
  [5,  44,  51, "การเขียนตัวเลขและตัวหนังสือ 5 และ 0"],
  [7,  60,  67, "การเขียนตัวเลขและตัวหนังสือ 8–9"],
  [8,  68,  75, "การเขียนตัวเลขและตัวหนังสือ 10"],
  [9,  76,  82, "การเปรียบเทียบจำนวนโดยการจับคู่"],
  [11, 91,  98, "การเปรียบเทียบจำนวนนับ 1 ถึง 10 และ 0"],
  [13, 107, 114, "การเรียงลำดับจำนวน 1 ถึง 10 และ 0"],
  [15, 123, 129, "ความสัมพันธ์ส่วนย่อย-ส่วนรวม 0 ถึง 5"],
];

mkdirSync(OUT_DIR, { recursive: true });

const srcBytes = readFileSync(PDF_PATH);
const srcPdf   = await PDFDocument.load(srcBytes);

for (let i = 0; i < SELECTED.length; i++) {
  const [origNo, start, end, topic] = SELECTED[i];
  const newPlanNo = i + 1;
  const newPdf = await PDFDocument.create();
  const pageIndices = Array.from({ length: end - start + 1 }, (_, k) => start - 1 + k);
  const copied = await newPdf.copyPages(srcPdf, pageIndices);
  copied.forEach(p => newPdf.addPage(p));

  const outBytes = await newPdf.save();
  const outPath  = `${OUT_DIR}/แผนที่ ${newPlanNo} - ${topic}.pdf`;
  writeFileSync(outPath, outBytes);
  console.log(`✓ แผนที่ ${newPlanNo} (เดิม ${origNo}): หน้า ${start}–${end} → ${topic}`);
}

console.log("\nเสร็จสิ้น! ไฟล์อยู่ใน:", OUT_DIR);
