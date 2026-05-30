// สแกนชื่อแผนทั้ง 19 ของหน่วย 1 — ใช้หน้าพิมพ์เทียบ offset
import { getDocument } from "file:///C:/Users/User/.claude/skills/lesson-plan-docx/scripts/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";

const PDF_PATH = "D:/แผน/แผนคณิตศาสตร์/แผนคณิตศาสตร์ ป.1.pdf";
const OFFSET = 6; // PDF page = text page + OFFSET

const PUA_MAP = {
  0xF700:"่",0xF701:"้",0xF702:"ี",0xF703:"ึ",0xF704:"ํ",
  0xF705:"่",0xF706:"้",0xF707:"๊",0xF708:"๋",0xF709:"์",
  0xF70A:"่",0xF70B:"้",0xF70C:"๊",0xF70D:"๋",0xF70E:"์",
  0xF70F:"ํ",0xF710:"ั",0xF711:"ิ",0xF712:"็",0xF713:"ั",0xF714:"ื",
};
function norm(s) {
  let o = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (PUA_MAP.hasOwnProperty(cp)) o += PUA_MAP[cp];
    else if (cp >= 0xE000 && cp <= 0xF8FF) continue;
    else o += ch;
  }
  return o;
}

const buf = readFileSync(PDF_PATH);
const doc = await getDocument({ data: new Uint8Array(buf) }).promise;

// แผนทั้ง 19 ของหน่วย 1 เริ่มที่หน้าพิมพ์ 6, 14, 22, 30, 38, 46, 54, 62, 70, 77, 85, 93, 101, 109, 117, 124, 131, 138, 145
const textPageStarts = [6, 14, 22, 30, 38, 46, 54, 62, 70, 77, 85, 93, 101, 109, 117, 124, 131, 138, 145];

for (let i = 0; i < textPageStarts.length; i++) {
  const pdfPage = textPageStarts[i] + OFFSET;
  const page = await doc.getPage(pdfPage);
  const content = await page.getTextContent();
  const text = norm(content.items.map(i => i.str).join(" ")).replace(/\s+/g, " ").trim();
  // ดึง "เรื่อง ... เวลาเรียน"
  const m = text.match(/เรื่อง\s+(.+?)\s+เวลาเรียน/);
  const topic = m ? m[1].trim() : "(ไม่พบชื่อ)";
  console.log(`แผนที่ ${String(i+1).padStart(2)} | PDF p.${pdfPage} | ${topic}`);
}
