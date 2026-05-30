// Build the lesson-plan .docx from pdf_data.json + config.json.
// Config-driven (any subject/grade). Keep-together page layout is built in.
// Usage: node build_docx.mjs <unitDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
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
} from "docx";
import { getUnitDir, loadConfig, toThai } from "./lib.mjs";

const unitDir = getUnitDir();
const cfg = loadConfig(unitDir);
const PDF_DATA = JSON.parse(readFileSync(join(unitDir, "pdf_data.json"), "utf8"));

const FONT = cfg.font || "TH SarabunPSK";
const SIZE = (cfg.fontSizePt || 16) * 2; // half-points

const KEEP = cfg.keepPlans;
const THAI_NUM = KEEP.map((_, i) => toThai(i + 1));
const UNIT_TOTAL_HOURS = cfg.unitTotalHours;
const PLAN_HOURS = cfg.planHours;
const UNIT_TITLE = cfg.unitTitle;
const SUBJECT_LINE = `กลุ่มสาระการเรียนรู้${cfg.subject}`;
const GRADE_LINE = cfg.grade;

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: SIZE, bold: opts.bold ?? false, ...opts });
}

function para(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
}

function planHeader(planNum) {
  return para([run(`แผนการจัดการเรียนรู้ที่ ${planNum}`, { bold: true })], {
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

function twoColRow(left, right) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [run(left), new TextRun({ text: "\t", font: FONT, size: SIZE }), run(right)],
  });
}

function dotted() {
  return para(run(".".repeat(120)), { alignment: AlignmentType.CENTER });
}

function fillableLine(prefix) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
    children: [run(prefix || ""), new TextRun({ text: "\t", font: FONT, size: SIZE })],
  });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_TABLE_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

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

function singleSignatureTable(lines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [new TableRow({ cantSplit: true, children: [centeredSignatureCell(lines, 100)] })],
  });
}

function twoColumnSignatureTable(leftLines, rightLines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_TABLE_BORDERS,
    rows: [new TableRow({
      cantSplit: true,
      children: [centeredSignatureCell(leftLines, 50), centeredSignatureCell(rightLines, 50)],
    })],
  });
}

function parsePreamble(preambleLines) {
  let planTopic = "", planHours = "", standardCat = "";
  const standardDescLines = [];
  for (const pl of preambleLines) {
    const t = pl.text;
    if (t.startsWith("เรื่อง ") && t.includes("เวลา")) {
      const m = t.match(/^เรื่อง\s+(.+?)\s+เวลา\s+(\S+)\s+ชั่วโมง/);
      if (m) { planTopic = m[1].trim(); planHours = m[2].trim(); }
    } else if (t.startsWith("สาระที่ ")) {
      standardCat = t.trim();
    } else if (t.match(/^\.+$/)) {
      // dotted line — skip
    } else if (!t.startsWith("กลุ่ม") && !t.startsWith("หน่วย")) {
      standardDescLines.push(t.trim());
    }
  }
  return { planTopic, planHours, standardCat, standardDesc: standardDescLines.join(" ") };
}

const IND = (cm) => Math.round(cm * 567);

// Section 1 — ความคิดรวบยอด / สมรรถนะสำคัญ (kept together as one block).
function buildSection1(section) {
  const children = [
    para([run(`${section.number}. ${section.title}`, { bold: true })], {
      spacing: { before: 100 }, keepNext: true, keepLines: true,
    }),
  ];
  const blocks = [];
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
    const headerText = block.header === "concept" ? "๑. ความคิดรวบยอด" : "๒. สมรรถนะสำคัญของผู้เรียน";
    children.push(para([run(headerText, { bold: true })], {
      indent: { left: IND(0.6) }, keepNext: true, keepLines: true,
    }));
    for (let i = 0; i < block.lines.length; i++) {
      const ln = block.lines[i];
      const isSectionLast = bi === blocks.length - 1 && i === block.lines.length - 1;
      const text = block.header === "concept" ? ln.text : `-  ${ln.text.replace(/^-\s*/, "")}`;
      children.push(para([run(text)], {
        indent: { left: IND(1.5) }, keepNext: !isSectionLast, keepLines: true,
      }));
    }
  }
  return children;
}

// Generic section (๒,๓,ๅ,๖,๗,๘) — whole section kept together as one block.
function buildGenericSection(section) {
  const children = [
    para([run(`${section.number}. ${section.title}`, { bold: true })], {
      spacing: { before: 100 }, keepNext: true, keepLines: true,
    }),
  ];
  const lines = section.contentLines;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const t = ln.text;
    let indentCm = 1.5;
    if (ln.x <= 75) indentCm = 0;
    else if (ln.x <= 110) indentCm = 0.6;
    else if (ln.x <= 130) indentCm = 1.2;
    else if (ln.x <= 165) indentCm = 1.8;
    else indentCm = 2.5;
    const isSubHeader = /^[๐-๙]+\.\s+\S+/.test(t) && ln.x < 130 && t.length < 60;
    // keepNext on every line except the section's last → heading + items move
    // together; the section never strands its heading at a page bottom.
    children.push(para([run(t, { bold: isSubHeader })], {
      indent: { left: IND(indentCm) }, keepNext: i !== lines.length - 1, keepLines: true,
    }));
  }
  return children;
}

// Section 4 — คุณลักษณะอันพึงประสงค์ (list from config).
function buildSection4(kulaksana) {
  const out = [
    para([run("๔. คุณลักษณะอันพึงประสงค์", { bold: true })], {
      spacing: { before: 100 }, keepNext: true, keepLines: true,
    }),
  ];
  kulaksana.forEach((k, i) => {
    out.push(para([run(`${toThai(i + 1)}. ${k}`)], {
      indent: { left: IND(0.6) }, keepNext: i !== kulaksana.length - 1, keepLines: true,
    }));
  });
  return out;
}

// Section 9 — assessment table (rows + grading scale from config). Kept together.
function buildSection9(rows, gradingScale) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  function tp(text, opts = {}) {
    return new Paragraph({
      children: [run(text, { bold: !!opts.bold })],
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      keepNext: true,
    });
  }
  function cell(lines, opts = {}) {
    const paras = lines.map((line) =>
      typeof line === "string"
        ? tp(line, opts)
        : tp(line.text, { bold: line.bold, center: opts.center }),
    );
    return new TableCell({ children: paras, borders, width: { size: opts.width || 25, type: WidthType.PERCENTAGE } });
  }

  const header = new TableRow({
    cantSplit: true,
    children: [
      cell(["ทักษะที่ต้องการวัด"], { bold: true, center: true }),
      cell(["วิธีการ"], { bold: true, center: true }),
      cell(["เครื่องมือ"], { bold: true, center: true }),
      cell(["เกณฑ์การประเมิน"], { bold: true, center: true }),
    ],
  });
  const dataRows = rows.map((r) => new TableRow({
    cantSplit: true,
    children: [
      cell(r.skill.map((s, i) => ({ text: s, bold: i === 0 }))),
      cell(r.method),
      cell(r.tool),
      cell(r.criteria),
    ],
  }));

  const out = [
    para([run("๙. การวัดและประเมินผลการเรียนรู้", { bold: true })], {
      spacing: { before: 200 }, keepNext: true, keepLines: true,
    }),
    new Table({ rows: [header, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
    para([run("")]),
    para([run("เกณฑ์การตัดสิน/ระดับคุณภาพ", { bold: true })], { keepNext: true, keepLines: true }),
  ];
  gradingScale.forEach((line, i) => {
    out.push(para([run(line)], {
      indent: { left: IND(0.6) }, keepNext: i !== gradingScale.length - 1,
    }));
  });
  return out;
}

// Section 10 + บันทึกหลังสอน + 3 signatures.
function buildTrailing(instructorName, deputyLabel, homeroomLabel) {
  const out = [];
  out.push(para([run("๑๐. กิจกรรมเสนอแนะ", { bold: true })], {
    spacing: { before: 200 }, keepNext: true, keepLines: true,
  }));
  out.push(fillableLine(""));
  out.push(fillableLine(""));
  out.push(para([run("")]));
  out.push(singleSignatureTable(["ลงชื่อ" + ".".repeat(30) + "ครูผู้สอน", `(${instructorName})`]));
  out.push(para([run("")]));

  // บันทึกหลังแผน starts on a fresh page so its items stay together.
  out.push(para([run("บันทึกหลังแผนการจัดการเรียนรู้", { bold: true })], {
    alignment: AlignmentType.CENTER, spacing: { before: 200 },
    pageBreakBefore: true, keepNext: true, keepLines: true,
  }));

  out.push(para([run("      1.  ผลการสอน", { bold: true })], { keepNext: true, keepLines: true }));
  out.push(para([run(" นักเรียนผ่านเกณฑ์การประเมิน")], { keepNext: true }));
  out.push(para([run(" นักเรียนไม่ผ่านเกณฑ์การประเมิน ดังนี้")], { keepNext: true }));
  out.push(fillableLine(""));

  out.push(para([run("      2.  ปัญหาและอุปสรรค", { bold: true })], { keepNext: true, keepLines: true }));
  out.push(para([run(" กิจกรรมการจัดการเรียนรู้ ไม่เหมาะสมกับเวลา")], { keepNext: true }));
  out.push(para([run(" มีนักเรียนทำใบงาน/ใบกิจกรรมไม่ทันตามกำหนดเวลา")], { keepNext: true }));
  out.push(para([run(" มีนักเรียนที่ไม่สนใจในการเรียน")], { keepNext: true }));
  out.push(fillableLine(" อื่นๆ "));

  out.push(para([run("      3.  ข้อเสนอแนะ/แนวทางแก้ไข", { bold: true })], { keepNext: true, keepLines: true }));
  out.push(fillableLine(" ควรนำแผนไปปรับปรุงเรื่อง"));
  out.push(fillableLine(" แนวทางแก้ไขนักเรียนที่ไม่ผ่านการประเมิน/ไม่สนใจเรียน"));
  out.push(fillableLine(" อื่นๆ"));
  out.push(para([run("")]));

  out.push(singleSignatureTable(["ลงชื่อ" + ".".repeat(30) + "ผู้บันทึก", `(${instructorName})`, "ครูผู้สอน"]));
  out.push(para([run("")]));
  out.push(fillableLine(""));
  out.push(fillableLine(""));
  out.push(para([run("")]));

  out.push(twoColumnSignatureTable(
    ["ลงชื่อ" + ".".repeat(25), "()", homeroomLabel],
    ["ลงชื่อ" + ".".repeat(25), "()", deputyLabel],
  ));
  return out;
}

function buildPlan(planData, displayNum, isLast) {
  const out = [];
  const preamble = parsePreamble(planData.preambleLines);

  out.push(planHeader(displayNum));
  out.push(twoColRow(SUBJECT_LINE, GRADE_LINE));
  out.push(twoColRow(UNIT_TITLE, `เวลา ${UNIT_TOTAL_HOURS} ชั่วโมง`));
  out.push(twoColRow(`เรื่อง ${preamble.planTopic}`, `เวลา ${PLAN_HOURS} ชั่วโมง`));
  out.push(dotted());

  if (preamble.standardCat) out.push(para([run(preamble.standardCat, { bold: true })]));
  if (preamble.standardDesc) out.push(para([run(preamble.standardDesc)], { indent: { left: IND(0.6) } }));

  for (const sec of planData.sections) {
    if (sec.number === "๑") out.push(...buildSection1(sec));
    else if (sec.number === "๔") out.push(...buildSection4(cfg.kulaksana));
    else out.push(...buildGenericSection(sec));
  }

  out.push(...buildSection9(cfg.section9Rows, cfg.gradingScale));
  out.push(...buildTrailing(cfg.instructor, cfg.deputyLabel, cfg.homeroomLabel));

  if (!isLast) out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

async function build() {
  const kept = PDF_DATA.plans.filter((p) => KEEP.includes(p.number));
  if (kept.length !== KEEP.length) {
    throw new Error(
      `Expected ${KEEP.length} plans, kept ${kept.length}. Missing: ${KEEP.filter((n) => !kept.find((p) => p.number === n)).join(", ")}`,
    );
  }
  console.log(`Plans kept: ${kept.map((p) => p.number).join(", ")} → renumbered ${THAI_NUM.join(", ")}`);

  const allChildren = [];
  kept.forEach((plan, i) => allChildren.push(...buildPlan(plan, THAI_NUM[i], i === kept.length - 1)));

  const doc = new Document({
    creator: "lesson-plan-docx skill",
    title: cfg.unitTitle,
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 twips
          margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 }, // 2.5cm
        },
      },
      children: allChildren,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = join(unitDir, cfg.outputName);
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes) — ${kept.length} plans`);
}

build().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
