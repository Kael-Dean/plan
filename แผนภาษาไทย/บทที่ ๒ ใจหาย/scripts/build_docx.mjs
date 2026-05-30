import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopType,
  TabStopPosition,
  LeaderType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/docx/dist/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_DATA = JSON.parse(readFileSync(join(__dirname, "pdf_data.json"), "utf8"));
const REF_DATA = JSON.parse(readFileSync(join(__dirname, "ref_data.json"), "utf8"));

const FONT = "TH SarabunPSK";
const SIZE = 32; // 16pt in half-points

// === User customization: ตัด 3 แผนซ้ำ (๒, ๓, ๘) เหลือ 10 แผน, แผนละ 1 ชั่วโมง ===
const KEEP_ORIGINAL = ["๑", "๔", "๕", "๖", "๗", "๙", "๑๐", "๑๑", "๑๒", "๑๓"];
const THAI_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];
const UNIT_TOTAL_HOURS = "๑๐";
const PLAN_HOURS = "๑";

// Build a TextRun with default font/size.
function run(text, opts = {}) {
  return new TextRun({
    text,
    font: FONT,
    size: SIZE,
    bold: opts.bold ?? false,
    ...opts,
  });
}

function para(children, opts = {}) {
  return new Paragraph({
    children: Array.isArray(children) ? children : [children],
    ...opts,
  });
}

// Plan header: "แผนการจัดการเรียนรู้ที่ X" centered bold
function planHeader(planNum) {
  return para([run(`แผนการจัดการเรียนรู้ที่ ${planNum}`, { bold: true })], {
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

// 2-column header row using tab stops (left/right)
function twoColRow(left, right) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [run(left), new TextRun({ text: "\t", font: FONT, size: SIZE }), run(right)],
  });
}

// Dotted separator line (centered, full width via repeated chars — for visual divider)
function dotted() {
  return para(run(".".repeat(120)), { alignment: AlignmentType.CENTER });
}

// Fillable line: text on the left, auto dots filling to the right margin.
// Uses RIGHT tab stop with LeaderType.DOT so dots always reach the right margin
// regardless of how long the text prefix is.
function fillableLine(prefix) {
  return new Paragraph({
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: TabStopPosition.MAX,
        leader: LeaderType.DOT,
      },
    ],
    children: [
      run(prefix || ""),
      new TextRun({ text: "\t", font: FONT, size: SIZE }),
    ],
  });
}

// Right-aligned signature line: "ลงชื่อ" + dots filling to "label" on the right.
// Uses a right tab stop at MAX with dot leader, plus a final label.
function signatureLine(label) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [run("ลงชื่อ" + ".".repeat(40) + label)],
  });
}

// Borders helper for invisible (layout-only) tables
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_TABLE_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

// Build a TableCell containing N centered paragraphs (signature + name + position).
// `lines` is an array of strings; each becomes one centered paragraph.
// All lines except the last get keepNext to stay together.
function centeredSignatureCell(lines, widthPercent = 50) {
  return new TableCell({
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children: lines.map((text, idx) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [run(text)],
        keepNext: idx < lines.length - 1,
      }),
    ),
  });
}

// Single signature block centered on the page (1 cell, 100% width).
// `lines` = signature line + name + optional position
function singleSignatureTable(lines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [centeredSignatureCell(lines, 100)],
    })],
  });
}

// Two-column signature block (หัวหน้ากลุ่มสาระ | รองผู้อำนวยการ)
function twoColumnSignatureTable(leftLines, rightLines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [
        centeredSignatureCell(leftLines, 50),
        centeredSignatureCell(rightLines, 50),
      ],
    })],
  });
}

// Parse the preamble of a plan to extract plan_topic, plan_hours, standard info
function parsePreamble(preambleLines) {
  let planTopic = "";
  let planHours = "";
  let standardCat = "";
  const standardDescLines = [];

  for (const pl of preambleLines) {
    const t = pl.text;
    if (t.startsWith("เรื่อง ") && t.includes("เวลา")) {
      const m = t.match(/^เรื่อง\s+(.+?)\s+เวลา\s+(\S+)\s+ชั่วโมง/);
      if (m) {
        planTopic = m[1].trim();
        planHours = m[2].trim();
      }
    } else if (t.startsWith("สาระที่ ")) {
      standardCat = t.trim();
    } else if (t.match(/^\.+$/)) {
      // dotted line
    } else if (!t.startsWith("กลุ่ม") && !t.startsWith("หน่วย")) {
      standardDescLines.push(t.trim());
    }
  }
  return {
    planTopic,
    planHours,
    standardCat,
    standardDesc: standardDescLines.join(" "),
  };
}

// Build XML-ish indentation (in twips). 1 cm ≈ 567 twips.
const IND = (cm) => Math.round(cm * 567);

// Section 1 body — special parsing for ๑. ความคิดรวบยอด / ๒. สมรรถนะสำคัญ.
// Treat each sub-block (ความคิดรวบยอด + content, สมรรถนะ + bullets) as a keep-chain.
function buildSection1(section) {
  const children = [];
  children.push(
    para([run(`${section.number}. ${section.title}`, { bold: true })], {
      spacing: { before: 100 },
      keepNext: true,
      keepLines: true,
    }),
  );

  // Pre-classify lines into blocks
  const blocks = []; // each block: { header: "concept"|"competency", lines: [...] }
  let current = null;
  for (const ln of section.contentLines) {
    if (/^๑\.\s*ความคิดรวบยอด/.test(ln.text)) {
      if (current) blocks.push(current);
      current = { header: "concept", lines: [] };
    } else if (/^๒\.\s*สมรรถนะ/.test(ln.text)) {
      if (current) blocks.push(current);
      current = { header: "competency", lines: [] };
    } else if (current) {
      current.lines.push(ln);
    }
  }
  if (current) blocks.push(current);

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const headerText = block.header === "concept"
      ? "๑. ความคิดรวบยอด"
      : "๒. สมรรถนะสำคัญของผู้เรียน";
    // header — always keepNext (followed by its content)
    children.push(
      para([run(headerText, { bold: true })], {
        indent: { left: IND(0.6) },
        keepNext: true,
        keepLines: true,
      }),
    );
    // content of block — chain all but last
    for (let i = 0; i < block.lines.length; i++) {
      const ln = block.lines[i];
      const isLastInBlock = i === block.lines.length - 1;
      if (block.header === "concept") {
        children.push(
          para([run(ln.text)], {
            indent: { left: IND(1.5) },
            keepNext: !isLastInBlock,
            keepLines: true,
          }),
        );
      } else {
        const txt = ln.text.replace(/^-\s*/, "");
        children.push(
          para([run(`-  ${txt}`)], {
            indent: { left: IND(1.5) },
            keepNext: !isLastInBlock,
            keepLines: true,
          }),
        );
      }
    }
  }
  return children;
}

// Generic section builder — uses x-indent for hierarchy.
// Each section is grouped into "activity blocks" where:
// - A new block starts at a line beginning with a thai numeric prefix at indent L1 (x ≤ 110)
// - Every line within a block has keepNext: true (chain) EXCEPT the very last line
// - This ensures e.g. "๑. นักเรียนท่องบท..." + its continuation + poem lines all stay on
//   the same page; if not enough room, the entire activity block moves to the next page.
function buildGenericSection(section) {
  const children = [];
  children.push(
    para([run(`${section.number}. ${section.title}`, { bold: true })], {
      spacing: { before: 100 },
      keepNext: true,
      keepLines: true,
    }),
  );

  const lines = section.contentLines;
  // A new activity block starts when a line begins with a Thai numeric "๑." "๒." ... at L1 indent
  const isItemStart = (ln) =>
    /^[๐-๙]+\.\s/.test(ln.text) && ln.x <= 110;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const t = ln.text;
    let indentCm = 1.5;
    if (ln.x <= 75) indentCm = 0;
    else if (ln.x <= 110) indentCm = 0.6;
    else if (ln.x <= 130) indentCm = 1.2;
    else if (ln.x <= 165) indentCm = 1.8;
    else indentCm = 2.5;

    // Bold only short titles that fit on one line
    const isSubHeader = /^[๐-๙]+\.\s+\S+/.test(t) && ln.x < 130 && t.length < 60;

    // Last line in this activity block? (next line starts a new block or section ends)
    const isLastInBlock =
      i === lines.length - 1 ||
      isItemStart(lines[i + 1]);

    children.push(
      para([run(t, { bold: isSubHeader })], {
        indent: { left: IND(indentCm) },
        keepNext: !isLastInBlock,
        keepLines: true,
      }),
    );
  }
  return children;
}

// Section 4 — always the standard 5 items (คุณลักษณะอันพึงประสงค์)
function buildSection4() {
  return [
    para([run("๔. คุณลักษณะอันพึงประสงค์", { bold: true })], {
      spacing: { before: 100 },
      keepNext: true,
      keepLines: true,
    }),
    para([run("๑. รักความเป็นไทย")], { indent: { left: IND(0.6) }, keepNext: true }),
    para([run("๒. ใฝ่เรียนรู้")], { indent: { left: IND(0.6) }, keepNext: true }),
    para([run("๓. มีจิตสาธารณะ")], { indent: { left: IND(0.6) }, keepNext: true }),
    para([run("๔. มีวินัย")], { indent: { left: IND(0.6) }, keepNext: true }),
    para([run("๕. อยู่อย่างพอเพียง")], { indent: { left: IND(0.6) } }),
  ];
}

// Section 9 — assessment table (4 columns × 4 rows)
function buildSection9() {
  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: "000000",
  };
  const borders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
  };

  function cell(lines, opts = {}) {
    const paras = lines.map((line) => {
      if (typeof line === "string") {
        return new Paragraph({
          children: [run(line, { bold: !!opts.bold })],
          alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        });
      }
      return line;
    });
    return new TableCell({
      children: paras,
      borders,
      width: { size: opts.width || 25, type: WidthType.PERCENTAGE },
    });
  }

  const header = new TableRow({
    children: [
      cell(["ทักษะที่ต้องการวัด"], { bold: true, center: true }),
      cell(["วิธีการ"], { bold: true, center: true }),
      cell(["เครื่องมือ"], { bold: true, center: true }),
      cell(["เกณฑ์การประเมิน"], { bold: true, center: true }),
    ],
  });

  const row1 = new TableRow({
    children: [
      cell([
        new Paragraph({ children: [run("ด้านความรู้ความเข้าใจ", { bold: true })] }),
        new Paragraph({
          children: [run("1.  ออกเสียงคำศัพท์ ประโยคและบอกความหมาย")],
        }),
      ]),
      cell(["สังเกต"]),
      cell(["แบบบันทึกการสังเกต"]),
      cell([
        new Paragraph({ children: [run("นักเรียนผ่านเกณฑ์")] }),
        new Paragraph({ children: [run("โดยปฏิบัติกิจกรรมได้ถูกต้องร้อยละ 70")] }),
      ]),
    ],
  });

  const row2 = new TableRow({
    children: [
      cell([
        new Paragraph({ children: [run("ด้านทักษะ", { bold: true })] }),
        new Paragraph({ children: [run("ทักษะการฟัง การพูด การอ่าน การเขียน")] }),
      ]),
      cell([
        new Paragraph({ children: [run("ตรวจผลงาน")] }),
        new Paragraph({ children: [run("สังเกต")] }),
      ]),
      cell([
        new Paragraph({ children: [run("แบบบันทึกการทำงาน")] }),
        new Paragraph({ children: [run("แบบบันทึกการสังเกต")] }),
      ]),
      cell([
        new Paragraph({ children: [run("นักเรียนผ่านเกณฑ์")] }),
        new Paragraph({ children: [run("โดยทำกิจกรรมถูกต้องอย่างน้อย ร้อยละ 70")] }),
      ]),
    ],
  });

  const row3 = new TableRow({
    children: [
      cell([
        new Paragraph({ children: [run("ด้านเจตคติ", { bold: true })] }),
        new Paragraph({ children: [run("1. ขยันใฝ่รู้ใฝ่เรียน")] }),
        new Paragraph({ children: [run("2. เชื่อมั่นในตนเอง /กล้าแสดงออก")] }),
        new Paragraph({ children: [run("3. มีเจตคติที่ดีต่อการเรียน")] }),
      ]),
      cell(["สังเกต"]),
      cell(["แบบบันทึกการสังเกต"]),
      cell([
        new Paragraph({ children: [run("นักเรียนผ่านเกณฑ์โดย")] }),
        new Paragraph({ children: [run("มีส่วนร่วมในกิจกรรม")] }),
        new Paragraph({ children: [run("และมีความสุขใน")] }),
        new Paragraph({ children: [run("การเรียนอย่างน้อย")] }),
        new Paragraph({ children: [run("ร้อยละ 80")] }),
      ]),
    ],
  });

  return [
    para([run("๙. การวัดและประเมินผลการเรียนรู้", { bold: true })], {
      spacing: { before: 200 },
      keepNext: true,
      keepLines: true,
    }),
    new Table({
      rows: [header, row1, row2, row3],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    para([run("")]),
    para([run("เกณฑ์การตัดสิน/ระดับคุณภาพ", { bold: true })], {
      keepNext: true,
      keepLines: true,
    }),
    para([run("คะแนน 9 - 10  คะแนน  หมายถึง  ดีเยี่ยม")], {
      indent: { left: IND(0.6) }, keepNext: true,
    }),
    para([run("คะแนน 7 - 8    คะแนน  หมายถึง  ดี")], {
      indent: { left: IND(0.6) }, keepNext: true,
    }),
    para([run("คะแนน 5 - 6    คะแนน  หมายถึง  พอใช้")], {
      indent: { left: IND(0.6) }, keepNext: true,
    }),
    para([run("คะแนน 1 - 4    คะแนน  หมายถึง  ปรับปรุง")], {
      indent: { left: IND(0.6) },
    }),
  ];
}

// Section 10 + บันทึกหลังสอน + 3 signatures
function buildTrailing(instructorName, deputyLabel, homeroomLabel) {
  const out = [];

  // ๑๐. กิจกรรมเสนอแนะ — heading + 2 fillable dotted lines
  out.push(
    para([run("๑๐. กิจกรรมเสนอแนะ", { bold: true })], {
      spacing: { before: 200 },
      keepNext: true,
      keepLines: true,
    }),
  );
  out.push(fillableLine(""));
  out.push(fillableLine(""));
  out.push(para([run("")]));
  // Top signature block (after ๑๐. กิจกรรมเสนอแนะ): "ลงชื่อ...ครูผู้สอน" + (name) centered
  out.push(singleSignatureTable([
    "ลงชื่อ" + ".".repeat(30) + "ครูผู้สอน",
    `(${instructorName})`,
  ]));
  out.push(para([run("")]));

  // บันทึกหลังแผนการจัดการเรียนรู้ (heading kept with next)
  out.push(
    para([run("บันทึกหลังแผนการจัดการเรียนรู้", { bold: true })], {
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      keepNext: true,
      keepLines: true,
    }),
  );

  // 1. ผลการสอน — heading + 3 content lines (keep together)
  out.push(
    para([run("      1.  ผลการสอน", { bold: true })], {
      keepNext: true, keepLines: true,
    }),
  );
  out.push(para([run(" นักเรียนผ่านเกณฑ์การประเมิน")], { keepNext: true }));
  out.push(para([run(" นักเรียนไม่ผ่านเกณฑ์การประเมิน ดังนี้")], { keepNext: true }));
  out.push(fillableLine(""));

  // 2. ปัญหาและอุปสรรค
  out.push(
    para([run("      2.  ปัญหาและอุปสรรค", { bold: true })], {
      keepNext: true, keepLines: true,
    }),
  );
  out.push(para([run(" กิจกรรมการจัดการเรียนรู้ ไม่เหมาะสมกับเวลา")], { keepNext: true }));
  out.push(para([run(" มีนักเรียนทำใบงาน/ใบกิจกรรมไม่ทันตามกำหนดเวลา")], { keepNext: true }));
  out.push(para([run(" มีนักเรียนที่ไม่สนใจในการเรียน")], { keepNext: true }));
  out.push(fillableLine(" อื่นๆ "));

  // 3. ข้อเสนอแนะ/แนวทางแก้ไข
  out.push(
    para([run("      3.  ข้อเสนอแนะ/แนวทางแก้ไข", { bold: true })], {
      keepNext: true, keepLines: true,
    }),
  );
  out.push(fillableLine(" ควรนำแผนไปปรับปรุงเรื่อง"));
  out.push(fillableLine(" แนวทางแก้ไขนักเรียนที่ไม่ผ่านการประเมิน/ไม่สนใจเรียน"));
  out.push(fillableLine(" อื่นๆ"));
  out.push(para([run("")]));

  // Middle signature block (ผู้บันทึก) — 3 centered lines in a single-cell table
  out.push(singleSignatureTable([
    "ลงชื่อ" + ".".repeat(30) + "ผู้บันทึก",
    `(${instructorName})`,
    "ครูผู้สอน",
  ]));
  out.push(para([run("")]));
  out.push(fillableLine(""));
  out.push(fillableLine(""));
  out.push(para([run("")]));

  // Bottom 2-column signature block (หัวหน้ากลุ่มสาระ | รองผู้อำนวยการ)
  // Each cell: signature line + () + label, all centered within its cell
  out.push(twoColumnSignatureTable(
    ["ลงชื่อ" + ".".repeat(25), "()", homeroomLabel],
    ["ลงชื่อ" + ".".repeat(25), "()", deputyLabel],
  ));

  return out;
}

// Build one complete plan
function buildPlan(planData, displayNum, isLast) {
  const out = [];
  const preamble = parsePreamble(planData.preambleLines);

  // Title (renumbered)
  out.push(planHeader(displayNum));

  // 2-column header (unit hours updated)
  out.push(twoColRow("กลุ่มสาระการเรียนรู้ภาษาไทย", "ชั้นประถมศึกษาปีที่ ๒"));
  out.push(
    twoColRow(
      "หน่วยการเรียนรู้ที่ ๒ เรื่อง ใจหาย",
      `เวลา ${UNIT_TOTAL_HOURS} ชั่วโมง`,
    ),
  );
  out.push(
    twoColRow(
      `เรื่อง ${preamble.planTopic}`,
      `เวลา ${PLAN_HOURS} ชั่วโมง`,
    ),
  );

  out.push(dotted());

  // Standard category + description
  if (preamble.standardCat) {
    out.push(para([run(preamble.standardCat, { bold: true })]));
  }
  if (preamble.standardDesc) {
    out.push(para([run(preamble.standardDesc)], { indent: { left: IND(0.6) } }));
  }

  // Sections 1-8
  for (const sec of planData.sections) {
    const num = sec.number;
    if (num === "๑") {
      out.push(...buildSection1(sec));
    } else if (num === "๔") {
      out.push(...buildSection4());
    } else {
      out.push(...buildGenericSection(sec));
    }
  }

  // Sections 9 (from reference)
  out.push(...buildSection9());

  // Trailing (section 10 + บันทึก + signatures, from reference)
  out.push(
    ...buildTrailing(
      REF_DATA.instructor_name,
      REF_DATA.deputy_label,
      REF_DATA.homeroom_label,
    ),
  );

  // Page break between plans
  if (!isLast) {
    out.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    );
  }

  return out;
}

async function build() {
  // Filter to keep only selected original plan numbers, then renumber 1..10
  const kept = PDF_DATA.plans.filter((p) => KEEP_ORIGINAL.includes(p.number));
  if (kept.length !== KEEP_ORIGINAL.length) {
    throw new Error(
      `Expected ${KEEP_ORIGINAL.length} plans, kept ${kept.length}. Missing: ${KEEP_ORIGINAL.filter((n) => !kept.find((p) => p.number === n)).join(", ")}`,
    );
  }
  console.log(`Original plans kept: ${kept.map((p) => p.number).join(", ")}`);
  console.log(`Renumbered to: ${THAI_NUM.join(", ")}`);

  const allChildren = [];
  kept.forEach((plan, i) => {
    const isLast = i === kept.length - 1;
    const displayNum = THAI_NUM[i];
    allChildren.push(...buildPlan(plan, displayNum, isLast));
  });

  const doc = new Document({
    creator: "Chapter 2 Builder",
    title: "หน่วยการเรียนรู้ที่ ๒ ใจหาย",
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 }, // 2.5cm
          },
        },
        children: allChildren,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = join(__dirname, "..", "หน่วยการเรียนรู้ที่๒_ใจหาย_final5.docx");
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes)`);
  console.log(`Plans included: ${PDF_DATA.plans.length}`);
}

build().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
