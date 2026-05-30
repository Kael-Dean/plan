const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  HeadingLevel, TabStopType, TabStopPosition, PageOrientation
} = require("docx");

const FONT = "TH Sarabun New";
const SZ = (pt) => pt * 2; // half-points

const border = (color = "000000", size = 6) => ({
  style: BorderStyle.SINGLE, size, color
});
const allBorders = (color = "000000", size = 6) => ({
  top: border(color, size), bottom: border(color, size),
  left: border(color, size), right: border(color, size),
});
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = {
  top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
  insideHorizontal: noBorder, insideVertical: noBorder
};

const T = (text, opts = {}) => new TextRun({
  text, font: FONT, size: opts.size || SZ(16),
  bold: !!opts.bold, ...opts
});

const P = (children, opts = {}) => new Paragraph({
  children: Array.isArray(children) ? children : [children],
  alignment: opts.alignment,
  spacing: opts.spacing || { before: 60, after: 60 },
  indent: opts.indent,
  tabStops: opts.tabStops,
  border: opts.border,
});

const blank = () => P([T("")]);

// ===== HEADER (matches the form image) =====
const headerNameRow = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [5400, 2400, 1560],
  borders: noBorders,
  rows: [new TableRow({
    children: [
      new TableCell({
        borders: { top: noBorder, left: noBorder, right: noBorder,
          bottom: border("000000", 6) },
        width: { size: 5400, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [P([T("ชื่อ–นามสกุล ", { size: SZ(16) })])]
      }),
      new TableCell({
        borders: { top: noBorder, left: noBorder, right: noBorder,
          bottom: border("000000", 6) },
        width: { size: 2400, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [P([T("ชั้น ป.๒/", { size: SZ(16) })],
          { alignment: AlignmentType.RIGHT })]
      }),
      new TableCell({
        borders: { top: noBorder, left: noBorder, right: noBorder,
          bottom: border("000000", 6) },
        width: { size: 1560, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [P([T("เลขที่ ", { size: SZ(16) })],
          { alignment: AlignmentType.RIGHT })]
      }),
    ]
  })]
});

const titleBlock = [
  P([T("ใบงานวิชาภาษาไทย ภาษาพาที ชั้นประถมศึกษาปีที่ ๒",
    { bold: true, size: SZ(18) })], { alignment: AlignmentType.CENTER }),
  P([T("บทที่ ๑ น้ำใส", { bold: true, size: SZ(18) })],
    { alignment: AlignmentType.CENTER }),
  P([T("ใบงานที่ ๑  รู้จักคำนำเรื่อง", { bold: true, size: SZ(17) })],
    { alignment: AlignmentType.CENTER }),
  P([T("จุดประสงค์ : นักเรียนอ่านแจกลูกสะกดคำและบอกความหมายของคำได้",
    { size: SZ(14), italics: true })], { alignment: AlignmentType.CENTER }),
];

// ===== ACTIVITY 1: Sing & fill the blanks in the song =====
const act1Title = P([T("๑.  ", { bold: true, size: SZ(17) }),
  T("ร้องเพลง “กุ๊กไก่” พร้อมเติมคำที่หายไปลงในช่องว่าง", { bold: true, size: SZ(17) })]);

const songBox = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [9360],
  borders: allBorders("000000", 8),
  rows: [new TableRow({
    children: [new TableCell({
      borders: allBorders("000000", 8),
      width: { size: 9360, type: WidthType.DXA },
      margins: { top: 200, bottom: 200, left: 300, right: 300 },
      shading: { fill: "FFF8DC", type: ShadingType.CLEAR },
      children: [
        P([T("เพลง  กุ๊กไก่", { bold: true, size: SZ(18) })],
          { alignment: AlignmentType.CENTER }),
        P([T("กุ๊ก ๆ ", { size: SZ(16) }),
          T("__________", { size: SZ(16) }),
          T("  เลี้ยงลูกมาจน", { size: SZ(16) }),
          T("__________", { size: SZ(16) })],
          { alignment: AlignmentType.CENTER }),
        P([T("ไม่มี", { size: SZ(16) }),
          T("__________", { size: SZ(16) }),
          T("ให้ลูกกิน  ลูกร้องเจี๊ยบ ๆ", { size: SZ(16) })],
          { alignment: AlignmentType.CENTER }),
        P([T("แม่พาเลียบ", { size: SZ(16) }),
          T("__________", { size: SZ(16) }),
          T("  ทำมาหากินตามประสา", { size: SZ(16) }),
          T("__________", { size: SZ(16) }),
          T("เอย", { size: SZ(16) })],
          { alignment: AlignmentType.CENTER }),
      ]
    })]
  })]
});

const act1Help = P([T("คำที่ใช้เติม : ", { size: SZ(14), italics: true }),
  T("ใหญ่   ไก่   นม   คุ้ยดิน   ไก่", { size: SZ(14), bold: true })]);

// ===== ACTIVITY 2: Match word with meaning =====
const act2Title = P([T("๒.  ", { bold: true, size: SZ(17) }),
  T("โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง", { bold: true, size: SZ(17) })]);

const matchPairs = [
  ["โบ", "ของประดับผูกที่ผมหรือของขวัญ"],
  ["ไข่", "สิ่งที่ออกจากตัวแม่ไก่"],
  ["เล้า", "ที่อยู่ของไก่หรือเป็ด"],
  ["ราด", "เทน้ำหรือของเหลวลงไป"],
  ["บิน", "เคลื่อนที่ในอากาศด้วยปีก"],
  ["ปก", "ด้านหน้าหรือด้านหลังของหนังสือ"],
  ["ยิ้ม", "อาการของปากที่แสดงความพอใจ"],
  ["มอง", "ดู หรือใช้สายตาเพ่งดู"],
  ["ไหว", "ยกมือประนมขึ้นเพื่อแสดงความเคารพ"],
  ["รูป", "ภาพที่วาดหรือถ่ายขึ้น"],
];

const matchTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [2200, 2480, 2200, 2480],
  borders: noBorders,
  rows: (() => {
    // 5 rows x (word | meaning | word | meaning)
    const rows = [];
    for (let i = 0; i < 5; i++) {
      const left = matchPairs[i];
      const right = matchPairs[i + 5];
      // Shuffle meaning order so it's not trivial — use predictable shuffle
      const shuffledOrderLeft = [1, 3, 0, 4, 2];
      const shuffledOrderRight = [4, 0, 2, 1, 3];
      const meaningLeft = matchPairs[shuffledOrderLeft[i]][1];
      const meaningRight = matchPairs[5 + shuffledOrderRight[i]][1];
      rows.push(new TableRow({
        children: [
          new TableCell({
            borders: allBorders("000000", 6),
            width: { size: 2200, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [P([T(left[0], { bold: true, size: SZ(20) })],
              { alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            borders: allBorders("000000", 6),
            width: { size: 2480, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [P([T(meaningLeft, { size: SZ(15) })],
              { alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            borders: allBorders("000000", 6),
            width: { size: 2200, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [P([T(right[0], { bold: true, size: SZ(20) })],
              { alignment: AlignmentType.CENTER })]
          }),
          new TableCell({
            borders: allBorders("000000", 6),
            width: { size: 2480, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [P([T(meaningRight, { size: SZ(15) })],
              { alignment: AlignmentType.CENTER })]
          }),
        ]
      }));
    }
    return rows;
  })()
});

// ===== ACTIVITY 3: Spelling (แจกลูกสะกดคำ) =====
const act3Title = P([T("๓.  ", { bold: true, size: SZ(17) }),
  T("เขียนแจกลูกสะกดคำตามตัวอย่าง", { bold: true, size: SZ(17) })]);

const act3Example = P([T("ตัวอย่าง :  ", { italics: true, size: SZ(15) }),
  T("รูป  →  ร – อู – ป  อ่านว่า  รูป", { bold: true, size: SZ(16) })]);

const spellWords = ["มอง", "ราด", "ยิ้ม", "ปก", "เล้า"];
const spellTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1800, 7560],
  borders: allBorders("000000", 6),
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: allBorders("000000", 6),
          width: { size: 1800, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
          children: [P([T("คำ", { bold: true, size: SZ(16) })],
            { alignment: AlignmentType.CENTER })]
        }),
        new TableCell({
          borders: allBorders("000000", 6),
          width: { size: 7560, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: "DCE6F1", type: ShadingType.CLEAR },
          children: [P([T("แจกลูกสะกดคำ", { bold: true, size: SZ(16) })],
            { alignment: AlignmentType.CENTER })]
        }),
      ]
    }),
    ...spellWords.map((w) => new TableRow({
      children: [
        new TableCell({
          borders: allBorders("000000", 6),
          width: { size: 1800, type: WidthType.DXA },
          margins: { top: 200, bottom: 200, left: 120, right: 120 },
          children: [P([T(w, { bold: true, size: SZ(20) })],
            { alignment: AlignmentType.CENTER })]
        }),
        new TableCell({
          borders: allBorders("000000", 6),
          width: { size: 7560, type: WidthType.DXA },
          margins: { top: 200, bottom: 200, left: 120, right: 120 },
          children: [P([T("....................................................................................................",
            { size: SZ(16) })])]
        }),
      ]
    }))
  ]
});

// ===== ACTIVITY 4: Choose the right word for the picture (draw box) =====
const act4Title = P([T("๔.  ", { bold: true, size: SZ(17) }),
  T("เลือกคำให้ตรงกับภาพ แล้วเขียนคำลงในช่องว่าง", { bold: true, size: SZ(17) })]);

const act4Help = P([T("คำที่กำหนด : ", { italics: true, size: SZ(14) }),
  T("โบ   ไข่   เล้า   บิน   ไหว", { bold: true, size: SZ(16) })]);

const pictureCell = (label) => new TableCell({
  borders: allBorders("000000", 6),
  width: { size: 1872, type: WidthType.DXA },
  margins: { top: 120, bottom: 120, left: 80, right: 80 },
  children: [
    P([T(" ", { size: SZ(14) })]),
    P([T("(วาดภาพ)", { italics: true, size: SZ(12), color: "888888" })],
      { alignment: AlignmentType.CENTER }),
    P([T(" ", { size: SZ(14) })]),
    P([T(" ", { size: SZ(14) })]),
    P([T(" ", { size: SZ(14) })]),
    P([T(label, { size: SZ(12), color: "888888", italics: true })],
      { alignment: AlignmentType.CENTER }),
  ]
});

const blankCell = () => new TableCell({
  borders: { top: noBorder, left: noBorder, right: noBorder,
    bottom: border("000000", 8) },
  width: { size: 1872, type: WidthType.DXA },
  margins: { top: 40, bottom: 40, left: 80, right: 80 },
  children: [P([T("  ", { size: SZ(16) })],
    { alignment: AlignmentType.CENTER })]
});

const pictureRow = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1872, 1872, 1872, 1872, 1872],
  borders: noBorders,
  rows: [
    new TableRow({
      children: [
        pictureCell("รังของแม่ไก่ที่มีไข่"),
        pictureCell("โบสีฟ้าผูกผม"),
        pictureCell("เด็กยกมือไหว้"),
        pictureCell("เล้าไก่"),
        pictureCell("นกกำลังบิน"),
      ]
    }),
    new TableRow({
      children: [blankCell(), blankCell(), blankCell(), blankCell(), blankCell()]
    })
  ]
});

// ===== ACTIVITY 5: Copy the words nicely =====
const act5Title = P([T("๕.  ", { bold: true, size: SZ(17) }),
  T("คัดคำต่อไปนี้ด้วยตัวบรรจง", { bold: true, size: SZ(17) })]);

const copyWords = ["โบ", "ไข่", "เล้า", "ราด", "บิน", "ปก", "ยิ้ม", "มอง", "ไหว", "รูป"];
const copyTable = new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [1560, 7800],
  borders: allBorders("000000", 6),
  rows: copyWords.map((w) => new TableRow({
    children: [
      new TableCell({
        borders: allBorders("000000", 6),
        width: { size: 1560, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [P([T(w, { bold: true, size: SZ(22) })],
          { alignment: AlignmentType.CENTER })]
      }),
      new TableCell({
        borders: allBorders("000000", 6),
        width: { size: 7800, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 200, right: 120 },
        children: [P([T("...................................................................................................................",
          { size: SZ(18), color: "BBBBBB" })])]
      }),
    ]
  }))
});

// ===== Footer note =====
const footerNote = P([
  T("คะแนนเต็ม ๒๐ คะแนน      คะแนนที่ได้ ", { size: SZ(14) }),
  T("__________", { size: SZ(14) }),
  T("      ผู้ตรวจ ", { size: SZ(14) }),
  T("____________________", { size: SZ(14) }),
]);

// ===== ASSEMBLE DOCUMENT =====
const doc = new Document({
  creator: "Teacher",
  title: "ใบงานที่ ๑ บทที่ ๑ น้ำใส",
  styles: {
    default: { document: { run: { font: FONT, size: SZ(16) } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 }, // US Letter
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } // 0.75"
      }
    },
    children: [
      headerNameRow,
      blank(),
      ...titleBlock,
      blank(),
      act1Title,
      songBox,
      act1Help,
      blank(),
      act2Title,
      matchTable,
      blank(),
      act3Title,
      act3Example,
      spellTable,
      blank(),
      act4Title,
      act4Help,
      pictureRow,
      blank(),
      act5Title,
      copyTable,
      blank(),
      footerNote,
    ]
  }]
});

Packer.toBuffer(doc).then((buf) => {
  const out = "d:/แผน/แบบฝึกหัด/ใบงานที่_๑_บทที่_๑_น้ำใส.docx";
  fs.writeFileSync(out, buf);
  console.log("WROTE:", out);
});
