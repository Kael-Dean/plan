// สแกนหา page range ของแต่ละแผน (ใช้ pdfjs-dist จาก skill)
import { getDocument } from "file:///C:/Users/User/.claude/skills/lesson-plan-docx/scripts/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync, writeFileSync } from "node:fs";

const PDF_PATH = "D:/แผน/แผนคณิตศาสตร์/แผนคณิตศาสตร์ ป.1.pdf";

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
const total = doc.numPages;
console.log("Total pages:", total);

// ต้องมีทั้งเลขแผนและ "กลุ่มสาระการเรียนรู้" บนหน้าเดียวกัน (หน้าจริง ไม่ใช่สารบัญ)
const planRe = /แผนการจัดการเรียนรู้ที่\s*(\d+)/;
const bodyMarker = /กลุ่มสาระการเรียนรู้/;

const planPages = {}; // planNo -> first page (1-indexed)

for (let p = 1; p <= total; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  const text = norm(content.items.map(i => i.str).join(" "));
  const m = planRe.exec(text);
  if (m && bodyMarker.test(text)) {
    const n = parseInt(m[1]);
    if (!planPages[n]) {
      planPages[n] = p;
      console.log(`แผนที่ ${n} เริ่มที่หน้า ${p}: ${text.substring(0, 100).trim()}`);
    }
  }
  if (p % 100 === 0) process.stderr.write(`scanned ${p}/${total}\n`);
}

writeFileSync("D:/แผน/plan_pages.json", JSON.stringify(planPages, null, 2));
console.log("\nplan_pages.json saved:", planPages);
