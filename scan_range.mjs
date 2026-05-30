// สแกนเฉพาะหน้า 83-230 เพื่อดู plan/section titles ทั้งหมด
import { getDocument } from "file:///C:/Users/User/.claude/skills/lesson-plan-docx/scripts/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { readFileSync } from "node:fs";

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

const START = 83, END = 230;

for (let p = START; p <= END; p++) {
  const page = await doc.getPage(p);
  const content = await page.getTextContent();
  const text = norm(content.items.map(i => i.str).join(" ")).replace(/\s+/g, " ").trim();
  // พิมพ์เฉพาะหน้าที่มี "แผน" หรือ "หน่วย" หรือ "เรื่อง"
  if (/แผนการจัดการเรียนรู้ที่|หน่วยการเรียนรู้|เรื่อง/.test(text)) {
    console.log(`\n=== PDF หน้า ${p} ===`);
    console.log(text.substring(0, 300));
  }
}
console.log("\nDone scanning pages", START, "-", END);
