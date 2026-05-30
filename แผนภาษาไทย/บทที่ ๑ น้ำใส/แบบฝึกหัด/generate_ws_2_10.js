const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType
} = require("docx");

const FONT = "TH Sarabun New";
const SZ = (pt) => pt * 2;

const bd = (c = "000000", s = 6) => ({ style: BorderStyle.SINGLE, size: s, color: c });
const allBd = (c = "000000", s = 6) => ({ top: bd(c,s), bottom: bd(c,s), left: bd(c,s), right: bd(c,s) });
const noBd = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBds = { top: noBd, bottom: noBd, left: noBd, right: noBd, insideHorizontal: noBd, insideVertical: noBd };

const T = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || SZ(16), bold: !!o.bold, ...o });
const P = (ch, o = {}) => new Paragraph({
  children: Array.isArray(ch) ? ch : [ch],
  alignment: o.alignment,
  spacing: o.spacing || { before: 60, after: 60 },
});
const blank = () => P([T("")]);

const makeHeader = () => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [5400, 2400, 1560],
  borders: noBds,
  rows: [new TableRow({ children: [
    new TableCell({ borders: { top: noBd, left: noBd, right: noBd, bottom: bd() },
      width: { size: 5400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [P([T("ชื่อ–นามสกุล ")])] }),
    new TableCell({ borders: { top: noBd, left: noBd, right: noBd, bottom: bd() },
      width: { size: 2400, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [P([T("ชั้น ป.๒/")], { alignment: AlignmentType.RIGHT })] }),
    new TableCell({ borders: { top: noBd, left: noBd, right: noBd, bottom: bd() },
      width: { size: 1560, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 60, right: 60 },
      children: [P([T("เลขที่ ")], { alignment: AlignmentType.RIGHT })] }),
  ]})]
});

const makeTitle = (num, title, obj) => [
  P([T("ใบงานวิชาภาษาไทย ภาษาพาที ชั้นประถมศึกษาปีที่ ๒", { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER }),
  P([T("บทที่ ๑  น้ำใส", { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER }),
  P([T(`ใบงานที่ ${num}  ${title}`, { bold: true, size: SZ(17) })], { alignment: AlignmentType.CENTER }),
  P([T(`จุดประสงค์ : ${obj}`, { size: SZ(14), italics: true })], { alignment: AlignmentType.CENTER }),
];

const makeFooter = () => P([
  T("คะแนนเต็ม ๒๐ คะแนน      คะแนนที่ได้ ", { size: SZ(14) }),
  T("__________", { size: SZ(14) }),
  T("      ผู้ตรวจ ", { size: SZ(14) }),
  T("____________________", { size: SZ(14) }),
]);

const actT = (n, txt) => P([T(`${n}.  `, { bold: true, size: SZ(17) }), T(txt, { bold: true, size: SZ(17) })]);
const wBank = (label, words) => P([T(`${label} : `, { italics: true, size: SZ(14) }), T(words, { bold: true, size: SZ(16) })]);

const makeMatchTable = (pairs) => {
  const half = Math.ceil(pairs.length / 2);
  const rows = Array.from({ length: half }, (_, i) => {
    const L = pairs[i], R = pairs[i + half] || ["", ""];
    return new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 2200, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        children: [P([T(L[0], { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 2480, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [P([T(L[1], { size: SZ(14) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 2200, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        children: [P([T(R[0], { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 2480, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [P([T(R[1], { size: SZ(14) })], { alignment: AlignmentType.CENTER })] }),
    ]});
  });
  return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200,2480,2200,2480], borders: noBds, rows });
};

const makeSpellTable = (words) => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [1800, 7560], borders: allBd(),
  rows: [
    new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 1800, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
        children: [P([T("คำ", { bold: true })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 7560, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
        children: [P([T("แจกลูกสะกดคำ", { bold: true })], { alignment: AlignmentType.CENTER })] }),
    ]}),
    ...words.map(w => new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 1800, type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 120, right: 120 },
        children: [P([T(w, { bold: true, size: SZ(20) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 7560, type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 120, right: 120 },
        children: [P([T(".....................................................................................................", { size: SZ(16) })])] }),
    ]}))
  ]
});

const makeCopyTable = (words) => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [1560, 7800], borders: allBd(),
  rows: words.map(w => new TableRow({ children: [
    new TableCell({ borders: allBd(), width: { size: 1560, type: WidthType.DXA },
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [P([T(w, { bold: true, size: SZ(22) })], { alignment: AlignmentType.CENTER })] }),
    new TableCell({ borders: allBd(), width: { size: 7800, type: WidthType.DXA },
      margins: { top: 100, bottom: 100, left: 200, right: 120 },
      children: [P([T("...................................................................................................................", { size: SZ(18), color: "BBBBBB" })])] }),
  ]}))
});

const makeAnswerLines = (n = 2) => Array.from({ length: n }, () =>
  P([T("...........................................................................", { size: SZ(16) })]));

const makeMCQ = (questions) => questions.flatMap((q, i) => [
  P([T(`${i+1}.  ${q.q}`, { size: SZ(16) })]),
  P([T(`    ก. ${q.a}    ข. ${q.b}    ค. ${q.c}`, { size: SZ(16) })])
]);

const makeSeqTable = (events) => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [1000, 8360], borders: allBd(),
  rows: events.map(ev => new TableRow({ children: [
    new TableCell({ borders: allBd(), width: { size: 1000, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [P([T("......", { size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
    new TableCell({ borders: allBd(), width: { size: 8360, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 200, right: 120 },
      children: [P([T(ev, { size: SZ(16) })])] }),
  ]}))
});

const makeFillTable = (sentences, wordBank) => [
  P([T(`คำที่กำหนด : `, { italics: true, size: SZ(14) }), T(wordBank, { bold: true, size: SZ(16) })]),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], borders: allBd(),
    rows: sentences.map((s, i) => new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 9360, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 200, right: 120 },
        children: [P([T(`${i+1}.  ${s}`, { size: SZ(16) })])] }),
    ]}))
  })
];

const makeTraitTable = (character, traits) => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 7360], borders: noBds,
  rows: [new TableRow({ children: [
    new TableCell({ borders: allBd(), width: { size: 2000, type: WidthType.DXA },
      margins: { top: 200, bottom: 200, left: 120, right: 120 },
      shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
      children: [P([T(character, { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER })] }),
    new TableCell({ borders: allBd(), width: { size: 7360, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 200, right: 120 },
      children: [P([T(traits, { size: SZ(15) })])] }),
  ]})]
});

const makeVennDiagram = () => [
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 3360, 3000], borders: noBds,
    rows: [new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 3000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "DBE8FD", type: ShadingType.CLEAR },
        children: [P([T("ภูผา", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 3360, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "D6F5E1", type: ShadingType.CLEAR },
        children: [P([T("เหมือนกัน", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
      new TableCell({ borders: allBd(), width: { size: 3000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { fill: "FFE0EC", type: ShadingType.CLEAR },
        children: [P([T("น้ำใส", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
    ]}),
    new TableRow({ children: [
      new TableCell({ borders: allBd(), width: { size: 3000, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 120, right: 120 },
        children: [P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })])] }),
      new TableCell({ borders: allBd(), width: { size: 3360, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 120, right: 120 },
        children: [P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })])] }),
      new TableCell({ borders: allBd(), width: { size: 3000, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 120, right: 120 },
        children: [P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })]), P([T("...........................", { size: SZ(16) })])] }),
    ]})
  ]})
];

const makeToneTable = (baseWord, vowel) => {
  const header = ["คำ", "ไม่มีวรรณยุกต์", "วรรณยุกต์ ่", "วรรณยุกต์ ้", "วรรณยุกต์ ๊", "วรรณยุกต์ ๋"];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1632, 1632, 1632, 1632, 1632],
    borders: allBd(),
    rows: [
      new TableRow({ children: header.map((h, i) => new TableCell({
        borders: allBd(), width: { size: i === 0 ? 1200 : 1632, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
        children: [P([T(h, { bold: true, size: SZ(14) })], { alignment: AlignmentType.CENTER })]
      })) }),
      new TableRow({ children: [
        new TableCell({ borders: allBd(), width: { size: 1200, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 80, right: 80 },
          children: [P([T(baseWord, { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER })] }),
        ...Array(5).fill(null).map(() => new TableCell({
          borders: allBd(), width: { size: 1632, type: WidthType.DXA },
          margins: { top: 120, bottom: 120, left: 80, right: 80 },
          children: [P([T("..................", { size: SZ(18) })], { alignment: AlignmentType.CENTER })]
        }))
      ]})
    ]
  });
};

const makeRhymeTable = (pairs) => new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 7360], borders: noBds,
  rows: pairs.map(([base, rhymes]) => new TableRow({ children: [
    new TableCell({ borders: allBd(), width: { size: 2000, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 200, right: 120 },
      shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
      children: [P([T(base, { bold: true, size: SZ(20) })], { alignment: AlignmentType.CENTER })] }),
    new TableCell({ borders: allBd(), width: { size: 7360, type: WidthType.DXA },
      margins: { top: 120, bottom: 120, left: 200, right: 120 },
      children: [P([T(rhymes, { size: SZ(16), color: "888888", italics: true })])] }),
  ]}))
});

const makePictureRow5 = (labels) => {
  const picCell = (label) => new TableCell({
    borders: allBd(), width: { size: 1872, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 80, right: 80 },
    children: [
      P([T("  ", { size: SZ(14) })]),
      P([T("(วาดภาพ)", { italics: true, size: SZ(12), color: "888888" })], { alignment: AlignmentType.CENTER }),
      P([T("  ", { size: SZ(14) })]),
      P([T(label, { size: SZ(12), color: "888888", italics: true })], { alignment: AlignmentType.CENTER }),
    ]
  });
  const blankCell = () => new TableCell({
    borders: { top: noBd, left: noBd, right: noBd, bottom: bd("000000", 8) },
    width: { size: 1872, type: WidthType.DXA }, margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [P([T("  ", { size: SZ(16) })], { alignment: AlignmentType.CENTER })]
  });
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1872,1872,1872,1872,1872], borders: noBds,
    rows: [
      new TableRow({ children: labels.map(picCell) }),
      new TableRow({ children: labels.map(() => blankCell()) }),
    ]
  });
};

async function buildWS(num, thaiNum, title, obj, activities) {
  const doc = new Document({
    creator: "Teacher",
    title: `ใบงานที่ ${thaiNum} บทที่ ๑ น้ำใส`,
    styles: { default: { document: { run: { font: FONT, size: SZ(16) } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children: [makeHeader(), blank(), ...makeTitle(thaiNum, title, obj), blank(), ...activities, blank(), makeFooter()]
    }]
  });
  const buf = await Packer.toBuffer(doc);
  const path = `D:/แผน/แบบฝึกหัด/ใบงานที่_${thaiNum}_บทที่_๑_น้ำใส.docx`;
  fs.writeFileSync(path, buf);
  console.log("WROTE:", path);
}

async function main() {

  // ===== WORKSHEET 2: เรียนรู้คำศัพท์เพิ่มเติม =====
  await buildWS(2, "๒", "เรียนรู้คำศัพท์เพิ่มเติม",
    "อ่านสะกดคำ บอกความหมาย และคัดคำศัพท์ใหม่ในบทเรียนได้", [
    actT("๑", "ดูภาพแล้วเขียนคำที่ตรงกับภาพ"),
    wBank("คำที่ใช้เติม", "ยิ้ม   มอง   ไหว   ไข่   เล้า   ราด   บิน   ปก"),
    makePictureRow5(["ยิ้ม", "มอง", "ไหว", "ไข่", "เล้า"]),
    makePictureRow5(["ราด", "บิน", "ปก", "——", "——"]),
    blank(),
    actT("๒", "โยงเส้นจับคู่คำศัพท์ใหม่กับความหมายให้ถูกต้อง"),
    makeMatchTable([
      ["ตะกร้า","ภาชนะสานใช้ใส่ของ"],
      ["หลังคา","ส่วนบนของบ้านกันแดดกันฝน"],
      ["น้ำหวาน","น้ำที่ผสมรสหวานสำหรับดื่ม"],
      ["น้ำแข็ง","น้ำที่จับตัวแข็งเพราะความเย็น"],
      ["ผู้หญิง","มนุษย์เพศหญิง"],
      ["ไม้เสียบ","ไม้เล็กยาวใช้เสียบของกิน"],
      ["กระติก","ภาชนะใส่ของให้เย็นนานๆ"],
      ["น้ำแข็งใส","ของหวานทำจากน้ำแข็งและน้ำหวาน"],
      ["นั่งยองๆ","นั่งโดยงอเข่าทั้งสองข้างขึ้น"],
      ["เต้นระบำ","เต้นรำเป็นชุดเป็นจังหวะ"],
    ]),
    blank(),
    actT("๓", "เขียนแจกลูกสะกดคำตามตัวอย่าง"),
    P([T("ตัวอย่าง : ", { italics: true, size: SZ(15) }), T("กิน  →  ก – อิ – น  อ่านว่า  กิน", { bold: true, size: SZ(16) })]),
    makeSpellTable(["คา","ใส","สาน","หญิง","นา"]),
    blank(),
    actT("๔", "ดูภาพแล้วเลือกคำเขียนลงในช่องว่าง"),
    wBank("คำที่กำหนด", "ตะกร้า   น้ำแข็ง   หลังคา   ผู้หญิง   กระติก"),
    makePictureRow5(["ตะกร้าสาน","น้ำแข็งใส","หลังคาบ้าน","ผู้หญิง","กระติกน้ำ"]),
    blank(),
    actT("๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["ตะกร้า","สีแดง","สีเขียว","ผู้หญิง","หลังคา","น้ำหวาน","น้ำแข็ง","ไม้เสียบ","กระติก","เต้นระบำ"]),
  ]);

  // ===== WORKSHEET 3: อ่านและตอบคำถาม =====
  await buildWS(3, "๓", "อ่านเรื่องและตอบคำถาม",
    "อ่านออกเสียงเรื่อง น้ำใส และตอบคำถามจากเรื่องที่อ่านได้", [
    actT("๑", "อ่านเรื่องแล้วตอบคำถามต่อไปนี้"),
    P([T("๑.  ตอนเรียนชั้น ป.๑ น้ำใสอยู่ที่ไหน", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๒.  น้ำใสคือใคร", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๓.  น้ำใสหิ้วอะไรมา และหิ้วมาทำไม", { size: SZ(16) })]),
    ...makeAnswerLines(2),
    P([T("๔.  ภูผามีความสัมพันธ์อย่างไรกับน้ำใส", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    blank(),
    actT("๒", "วงกลม ○ หน้าคำตอบที่ถูกต้อง"),
    ...makeMCQ([
      { q: "ใบโบกและใบบัวคือสัตว์ชนิดใด", a: "ลูกหมา", b: "ช้าง", c: "ลูกไก่" },
      { q: "น้ำใสนำอะไรไปให้ใบโบก", a: "ข้าวโพด", b: "น้ำหวาน", c: "น้ำแข็งกด" },
      { q: "ใครเป็นเพื่อนของน้ำใส", a: "ภูผา", b: "ใบบัว", c: "แม่ไก่" },
      { q: "ใบโบกแสดงท่าทางอย่างไร", a: "ชูงวง", b: "แกว่งหาง", c: "วิ่งหนี" },
    ]),
    blank(),
    actT("๓", "เรียงลำดับเหตุการณ์ โดยใส่ตัวเลข ๑–๔ ในช่อง"),
    makeSeqTable([
      "น้ำใสและภูผาเลี้ยงน้ำแข็งกดให้ใบโบกและใบบัว",
      "น้ำใสและภูผาหันมามองหน้ากันแล้วหัวเราะดังลั่น",
      "น้ำใสวิ่งนำหน้าภูผาไปหาเพื่อนช้าง",
      "ใบโบกชูงวงและใบบัวแกว่งหางอย่างพอใจ",
    ]),
    blank(),
    actT("๔", "เติมคำในช่องว่างให้สมบูรณ์"),
    ...makeFillTable([
      "_____ วิ่งนำหน้า _____ ไปหาเพื่อนช้าง",
      "น้ำใสป้อน _____ ให้ใบโบก",
      "ใบโบกชู _____ แต่ใบบัวแกว่ง _____",
      "_____ และ _____ เป็นช้างที่น่ารักของน้ำใสและภูผา",
    ], "น้ำใส • ภูผา • ใบโบก • ใบบัว • น้ำแข็งกด • งวง • หาง"),
    blank(),
    actT("๕", "เขียนสรุปข้อคิดที่ได้จากเรื่อง"),
    P([T("นักเรียนคิดว่าได้ข้อคิดอะไรจากเรื่องนี้ และจะนำไปใช้ในชีวิตประจำวันได้อย่างไร", { italics: true, size: SZ(15) })]),
    ...makeAnswerLines(3),
  ]);

  // ===== WORKSHEET 4: วิเคราะห์ตัวละคร =====
  await buildWS(4, "๔", "วิเคราะห์ตัวละครและข้อคิด",
    "บอกเนื้อหาสาระจากบทเรียน และนำข้อคิดจากเรื่องไปใช้ในชีวิตประจำวันได้", [
    actT("๑", "วงกลม ○ ล้อมรอบคำที่บอกนิสัยของ ภูผา แล้วเขียนเหตุผล"),
    makeTraitTable("ภูผา", "ใจดี   มีน้ำใจ   รอบคอบ   ขี้กลัว   ระมัดระวัง   เห็นแก่ตัว   รักเพื่อน   รักสัตว์   ใจร้อน   ขี้โมโห"),
    P([T("เพราะ .......................................................................................................", { size: SZ(16) })]),
    blank(),
    actT("๒", "วงกลม ○ ล้อมรอบคำที่บอกนิสัยของ น้ำใส แล้วเขียนเหตุผล"),
    makeTraitTable("น้ำใส", "ใจดี   มีน้ำใจ   ขี้สงสาร   รักสัตว์   ใจร้อน   ร่าเริง   กล้าหาญ   ขี้กลัว   รักเพื่อน   เห็นแก่ตัว"),
    P([T("เพราะ .......................................................................................................", { size: SZ(16) })]),
    blank(),
    actT("๓", "เปรียบเทียบ ภูผา และ น้ำใส โดยเติมข้อมูลในตาราง"),
    ...makeVennDiagram(),
    blank(),
    actT("๔", "สถานการณ์ — ถ้านักเรียนกำลังกินขนมแล้วถูกช้างแย่งไป นักเรียนจะทำอย่างไร"),
    P([T("ฉันจะ .................................................................................................", { size: SZ(16) })]),
    P([T("เพราะ .................................................................................................", { size: SZ(16) })]),
    blank(),
    actT("๕", "เขียนข้อคิดที่ได้จากเรื่อง"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders: noBds,
      rows: [new TableRow({ children: [
        new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
          children: [P([T("ข้อคิดที่ได้จากเรื่อง", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
        new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: "DBE8FD", type: ShadingType.CLEAR },
          children: [P([T("ฉันจะนำไปใช้อย่างไร", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 120, right: 120 },
          children: [P([T(".....................................................................................", { size: SZ(15) })]), P([T(".....................................................................................", { size: SZ(15) })])] }),
        new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 120, right: 120 },
          children: [P([T(".....................................................................................", { size: SZ(15) })]), P([T(".....................................................................................", { size: SZ(15) })])] }),
      ]})]
    }),
  ]);

  // ===== WORKSHEET 5: คำและกลุ่มคำ =====
  await buildWS(5, "๕", "คำเดี่ยวและกลุ่มคำ",
    "อ่านสะกดคำ บอกความหมายของคำ และแยกคำเดี่ยวกับกลุ่มคำได้ถูกต้อง", [
    actT("๑", "ทบทวนความรู้ — ตอบคำถามต่อไปนี้"),
    P([T("๑.  ภูผา มีนิสัยอย่างไร?", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๒.  น้ำใส มีนิสัยอย่างไร?", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๓.  ถ้านักเรียนโดนช้างแย่งของกิน นักเรียนจะทำอย่างไร?", { size: SZ(16) })]),
    ...makeAnswerLines(2),
    blank(),
    actT("๒", "จัดกลุ่มคำต่อไปนี้เป็น คำเดี่ยว หรือ กลุ่มคำ"),
    wBank("คำที่กำหนด", "ร้อน   หิว   ยิ้ม   น้ำใส   ของกิน   ท้องนา   น้ำหวาน   รัก"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], borders: noBds,
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { fill: "DBE8FD", type: ShadingType.CLEAR },
            children: [P([T("คำเดี่ยว (มีความหมายสมบูรณ์ด้วยตัวเอง)", { bold: true, size: SZ(15) })], { alignment: AlignmentType.CENTER })] }),
          new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
            children: [P([T("กลุ่มคำ (หลายคำรวมกันให้ความหมายชัดขึ้น)", { bold: true, size: SZ(15) })], { alignment: AlignmentType.CENTER })] }),
        ]}),
        ...Array(4).fill(null).map(() => new TableRow({ children: [
          new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 120 },
            children: [P([T("..........................................................................", { size: SZ(16) })])] }),
          new TableCell({ borders: allBd(), width: { size: 4680, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 120 },
            children: [P([T("..........................................................................", { size: SZ(16) })])] }),
        ]})),
      ]
    }),
    blank(),
    actT("๓", "แต่งประโยคโดยใช้คำเดี่ยว ๒ ประโยค และกลุ่มคำ ๒ ประโยค"),
    P([T("ใช้คำเดี่ยว:", { bold: true, size: SZ(16) })]),
    ...makeAnswerLines(2),
    P([T("ใช้กลุ่มคำ:", { bold: true, size: SZ(16) })]),
    ...makeAnswerLines(2),
    blank(),
    actT("๔", "เขียนแจกลูกสะกดคำตามตัวอย่าง"),
    makeSpellTable(["ร้อน","หิว","ยิ้ม","ใส","นา"]),
    blank(),
    actT("๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["น้ำใส","ของกิน","ท้องนา","น้ำหวาน","ร้อน","หิว","ยิ้ม","มอง","รัก","ดี"]),
  ]);

  // ===== WORKSHEET 6: ส่วนประกอบของคำ =====
  await buildWS(6, "๖", "ส่วนประกอบของคำ",
    "สังเกตพยัญชนะต้น สระ ตัวสะกด และวรรณยุกต์ของคำได้", [
    actT("๑", "เติมคำลงในช่องว่างให้ถูกต้อง"),
    P([T("๑.  คำที่มีความหมายสมบูรณ์ด้วยตัวเอง เรียกว่า ............................  ตัวอย่าง : .............................", { size: SZ(16) })]),
    P([T("๒.  คำหลายคำที่นำมารวมกัน เรียกว่า ............................  ตัวอย่าง : .............................", { size: SZ(16) })]),
    P([T("๓.  คำในเรื่อง น้ำใส ที่เป็นกลุ่มคำ เช่น ............................. และ .............................", { size: SZ(16) })]),
    blank(),
    actT("๒", "แยกส่วนประกอบของคำ — เติมข้อมูลในตาราง"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [1800, 2400, 2400, 1560, 1200], borders: allBd(),
      rows: [
        new TableRow({ children: ["คำ","พยัญชนะต้น","สระ","ตัวสะกด","วรรณยุกต์"].map((h, i) =>
          new TableCell({ borders: allBd(), width: { size: [1800,2400,2400,1560,1200][i], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
            children: [P([T(h, { bold: true, size: SZ(15) })], { alignment: AlignmentType.CENTER })]
          })
        )}),
        ...["โบ","ไข่","เล้า","ราด","บิน","ปก","ยิ้ม","มอง","ไหว","รูป"].map(w =>
          new TableRow({ children: [
            new TableCell({ borders: allBd(), width: { size: 1800, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [P([T(w, { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER })] }),
            ...Array(4).fill(null).map((_, j) => new TableCell({
              borders: allBd(), width: { size: [2400,2400,1560,1200][j], type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [P([T("", { size: SZ(16) })])]
            }))
          ]})
        )
      ]
    }),
    blank(),
    actT("๓", "เขียนคำที่มีส่วนประกอบตามที่กำหนด"),
    P([T("๑.  คำที่มีพยัญชนะต้น ก + สระ อา : .............................", { size: SZ(16) })]),
    P([T("๒.  คำที่มีพยัญชนะต้น น + สระ อ้า : .............................", { size: SZ(16) })]),
    P([T("๓.  คำที่มีตัวสะกดแม่กน : .............................", { size: SZ(16) })]),
    P([T("๔.  คำที่มีวรรณยุกต์โท (  ้) : .............................", { size: SZ(16) })]),
    blank(),
    actT("๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["โบ","ไข่","เล้า","ราด","บิน","ปก","ยิ้ม","มอง","ไหว","รูป"]),
  ]);

  // ===== WORKSHEET 7: คำศัพท์จากบทเรียน =====
  await buildWS(7, "๗", "ความหมายของคำและการใช้คำ",
    "รู้ความหมายของคำ และนำคำไปใช้แต่งประโยคได้ถูกต้องตามสถานการณ์", [
    actT("๑", "วงกลม ○ ข้อที่มีความหมายตรงกับคำที่กำหนด"),
    ...makeMCQ([
      { q: "เล้า หมายความว่าอย่างไร", a: "คอกหรือที่พักสัตว์เลี้ยง", b: "ภาชนะใส่อาหาร", c: "ต้นไม้ชนิดหนึ่ง" },
      { q: "ชิม หมายความว่าอย่างไร", a: "ทดลองกินเพื่อดูรส", b: "สีของวัตถุ", c: "ชื่อสัตว์" },
      { q: "ขอโทษ หมายความว่าอย่างไร", a: "คำพูดแสดงความเสียใจ", b: "อาการโกรธ", c: "พฤติกรรมดีใจ" },
      { q: "ราด หมายความว่าอย่างไร", a: "เทน้ำหรือของเหลวลงบน", b: "การยกของหนัก", c: "การเดินทาง" },
    ]),
    blank(),
    actT("๒", "โยงเส้นจับคู่คำกับประโยคที่ใช้คำนั้นได้ถูกต้อง"),
    makeMatchTable([
      ["บิน","นกกระจอกเข้ามาในบ้าน"],
      ["ยิ้ม","เธอยิ้มเมื่อได้รับของขวัญ"],
      ["มอง","เขามองท้องฟ้าสีฟ้า"],
      ["ไหว","นักเรียนไหว้ครูด้วยความเคารพ"],
      ["ราด","เทน้ำราดรดต้นไม้"],
    ]),
    blank(),
    actT("๓", "เขียนประโยคโดยใช้คำที่กำหนด"),
    ...[["โบ",""], ["ไข่",""], ["เล้า",""], ["บิน",""], ["ยิ้ม",""]].flatMap(([w]) => [
      P([T(`${w}  →  `, { bold: true, size: SZ(16) }), T(".......................................................................", { size: SZ(16) })]),
    ]),
    blank(),
    actT("๔", "เขียนแจกลูกสะกดคำตามตัวอย่าง"),
    makeSpellTable(["ไหว","รูป","ปก","มอง","บิน"]),
    blank(),
    actT("๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["บิน","ยิ้ม","มอง","ไหว","รูป","โบ","ไข่","เล้า","ราด","ปก"]),
  ]);

  // ===== WORKSHEET 8: อักษรสามหมู่และการผันวรรณยุกต์ =====
  await buildWS(8, "๘", "อักษรสามหมู่และการผันวรรณยุกต์",
    "บอกอักษรสามหมู่ได้ และผันวรรณยุกต์ของอักษรกลาง อักษรสูง อักษรต่ำได้", [
    actT("๑", "เติมคำในช่องว่างให้ถูกต้อง"),
    P([T("พยัญชนะไทยมีทั้งหมด .............. ตัว แบ่งตามระดับเสียงได้ .............. หมู่", { size: SZ(16) })]),
    P([T("อักษรกลาง มีทั้งหมด .............. ตัว  ได้แก่ ........................................................................................................", { size: SZ(16) })]),
    P([T("อักษรสูง มีทั้งหมด .............. ตัว  ได้แก่ ........................................................................................................", { size: SZ(16) })]),
    P([T("อักษรต่ำ มีทั้งหมด .............. ตัว  ได้แก่ ........................................................................................................", { size: SZ(16) })]),
    blank(),
    actT("๒", "จัดหมวดพยัญชนะต่อไปนี้ลงในอักษรสามหมู่"),
    wBank("พยัญชนะที่กำหนด", "ก  ข  ค  ง  จ  ช  ซ  ญ  ฎ  ฏ  ฐ  ฑ  ฒ  ณ  ด  ต  ถ  ท  ธ  น  บ  ป  ผ  ฝ  พ  ฟ  ภ  ม  ย  ร  ล  ว  ส  ห  อ  ฮ"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [3120, 3120, 3120], borders: noBds,
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { fill: "DBE8FD", type: ShadingType.CLEAR },
            children: [P([T("อักษรกลาง", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { fill: "D6F5E1", type: ShadingType.CLEAR },
            children: [P([T("อักษรสูง", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
            children: [P([T("อักษรต่ำ", { bold: true, size: SZ(16) })], { alignment: AlignmentType.CENTER })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 200, bottom: 200, left: 120, right: 120 },
            children: [P([T("(ก จ ฎ ฏ ด ต บ ป อ)", { size: SZ(15), color: "AAAAAA", italics: true })])] }),
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 200, bottom: 200, left: 120, right: 120 },
            children: [P([T("(ข ฉ ฐ ถ ผ ฝ ส ห)", { size: SZ(15), color: "AAAAAA", italics: true })])] }),
          new TableCell({ borders: allBd(), width: { size: 3120, type: WidthType.DXA },
            margins: { top: 200, bottom: 200, left: 120, right: 120 },
            children: [P([T("(ง ค ซ ญ ฑ ฒ ณ ท ธ น พ ฟ ภ ม ย ร ล ว ฮ)", { size: SZ(15), color: "AAAAAA", italics: true })])] }),
        ]}),
      ]
    }),
    blank(),
    actT("๓", "ผันวรรณยุกต์ — เติมคำที่ผันด้วยวรรณยุกต์ทั้ง ๕ เสียง"),
    P([T("ตัวอย่าง : ", { italics: true, size: SZ(15) }), T("กา  ก่า  ก้า  ก๊า  ก๋า", { bold: true, size: SZ(16) })]),
    makeToneTable("กา", "อา"),
    makeToneTable("นา", "อา"),
    makeToneTable("ขา", "อา"),
    blank(),
    actT("๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["อักษรกลาง","อักษรสูง","อักษรต่ำ","วรรณยุกต์","กา","นา","ขา","ดา","ตา","หา"]),
  ]);

  // ===== WORKSHEET 9: เย็น เย็น =====
  await buildWS(9, "๙", "อ่านคล่อง ร้องเล่น — เย็น เย็น",
    "อ่านบทร้องเล่นออกเสียงได้ถูกต้อง และคัดลายมือตัวบรรจงได้สวยงาม", [
    actT("๑", "ผันวรรณยุกต์ — เติมคำที่ผันด้วยวรรณยุกต์ทั้ง ๕ เสียง"),
    makeToneTable("เย็น", "เ–็น"),
    makeToneTable("เป็น", "เ–็น"),
    makeToneTable("เห็น", "เ–็น"),
    blank(),
    actT("๒", "อ่านบทร้องเล่นต่อไปนี้ออกเสียงดังๆ ให้ถูกต้อง"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], borders: allBd("000000", 8),
      rows: [new TableRow({ children: [new TableCell({
        borders: allBd("000000", 8), width: { size: 9360, type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        shading: { fill: "DBE8FD", type: ShadingType.CLEAR },
        children: [
          P([T("บทร้องเล่น  เย็น เย็น", { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER }),
          P([T("เย็น เย็น  น้ำเย็น  น้ำใสเย็นเฉียบ", { size: SZ(17) })], { alignment: AlignmentType.CENTER }),
          P([T("เด็ก ๆ แย่งกัน  กินน้ำเย็นเย็น", { size: SZ(17) })], { alignment: AlignmentType.CENTER }),
          P([T("ยกมือไหว้  แม่ครูช่วยเป็น", { size: SZ(17) })], { alignment: AlignmentType.CENTER }),
          P([T("เห็น เห็น  ใครเห็นบ้าง  เป็น เป็น", { size: SZ(17) })], { alignment: AlignmentType.CENTER }),
        ]
      })] })]
    }),
    blank(),
    actT("๓", "ตอบคำถามจากบทร้องเล่น"),
    P([T("๑.  ในบทร้องเล่น เด็กๆ กำลังทำอะไร", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๒.  คำใดในบทร้องเล่นที่มีเสียงคล้องจองกัน", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    P([T("๓.  นักเรียนชอบบทร้องเล่นนี้หรือไม่ เพราะเหตุใด", { size: SZ(16) })]),
    ...makeAnswerLines(1),
    blank(),
    actT("๔", "คัดลายมือตัวบรรจง — คัดประโยคต่อไปนี้ให้สวยงาม"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], borders: allBd(),
      rows: [
        new TableRow({ children: [new TableCell({
          borders: allBd(), width: { size: 9360, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
          children: [P([T("เย็น เย็น  น้ำเย็น  น้ำใสเย็นเฉียบ", { size: SZ(17), italics: true })], { alignment: AlignmentType.CENTER })]
        })]})  ,
        new TableRow({ children: [new TableCell({
          borders: allBd(), width: { size: 9360, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 120, right: 120 },
          children: [
            P([T("..............................................................................................", { size: SZ(17), color: "BBBBBB" })]),
            P([T("..............................................................................................", { size: SZ(17), color: "BBBBBB" })]),
          ]
        })]})
      ]
    }),
    blank(),
    actT("๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["เย็น","เป็น","เห็น","น้ำ","ใส","เฉียบ","ไหว้","ครู","เด็ก","กิน"]),
  ]);

  // ===== WORKSHEET 10: คำคล้องจอง =====
  await buildWS(10, "๑๐", "คำคล้องจอง",
    "บอกคำคล้องจองได้ และแต่งคำคล้องจองจากคำที่กำหนดได้", [
    actT("๑", "ทบทวน — คำคล้องจองคืออะไร"),
    new Table({
      width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360], borders: allBd("000000", 8),
      rows: [new TableRow({ children: [new TableCell({
        borders: allBd("000000", 8), width: { size: 9360, type: WidthType.DXA },
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        shading: { fill: "FFF3C4", type: ShadingType.CLEAR },
        children: [
          P([T("คำคล้องจอง", { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER }),
          P([T("คือ คำที่มีเสียงสระและตัวสะกดเดียวกัน ทำให้อ่านออกเสียงได้คล้องกัน", { size: SZ(16) })]),
          P([T("ตัวอย่าง :  นา → มา  ฟ้า  หา  |  กิน → บิน  ดิน  จิน  |  เย็น → เป็น  เห็น", { bold: true, size: SZ(16) })]),
        ]
      })] })]
    }),
    blank(),
    actT("๒", "จับคู่คำคล้องจอง — เขียนคำที่คล้องจองกับคำที่กำหนด"),
    makeRhymeTable([
      ["นา", "มา, ฟ้า, หา, พา, ......, ......"],
      ["กิน", "บิน, ดิน, ......, ......, ......"],
      ["เย็น", "เป็น, เห็น, ......, ......, ......"],
      ["ใส", "ไหว, ใต้, ......, ......, ......"],
      ["รูป", "......, ......, ......, ......, ......"],
    ]),
    blank(),
    actT("๓", "โยงเส้นจับคู่คำคล้องจอง"),
    makeMatchTable([
      ["เย็น","น้ำ"],
      ["มา","หา"],
      ["บิน","กิน"],
      ["เห็น","เป็น"],
      ["ดิน","ถิ่น"],
    ]),
    blank(),
    actT("๔", "แต่งประโยคโดยใช้คำคล้องจอง"),
    P([T("ตัวอย่าง : ", { italics: true, size: SZ(14) }), T("เด็กน้อยนา  ชวนกันมา  หาของกิน", { bold: true, size: SZ(16) })]),
    ...Array(4).fill(null).flatMap((_, i) => [
      P([T(`${i+1}.  ..............................................................................................`, { size: SZ(16) })]),
    ]),
    blank(),
    actT("๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง"),
    makeCopyTable(["คล้องจอง","นา","กิน","เย็น","ใส","บิน","มา","เห็น","รัก","ดิน"]),
  ]);

  console.log("\nAll worksheets generated successfully!");
}

main().catch(console.error);
