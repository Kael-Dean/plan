// Build the math lesson-plan .docx (ป.๑ template) from pdf_data.json + config.json.
// Faithful to the source PDF: header, pre-table content, 3-column activity table,
// media list, assessment list, two observation tables (fixed template), and
// บันทึกหลังการจัดการเรียนรู้ with three signature blocks.
// Numerals stay Arabic (as in the PDF). Usage: node build_math_docx.mjs <planDir>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition,
  LeaderType, Table, TableRow, TableCell, WidthType, BorderStyle, VerticalMergeType,
  VerticalAlign, TableLayoutType, PageBreak,
} from "docx";
import { getUnitDir, loadConfig } from "./lib.mjs";

const planDir = getUnitDir();
const cfg = loadConfig(planDir);
const D = JSON.parse(readFileSync(join(planDir, "pdf_data.json"), "utf8"));

const FONT = cfg.font || "TH SarabunPSK";
const SIZE = (cfg.fontSizePt || 16) * 2; // half-points
const INSTRUCTOR = cfg.instructor || "";
const EVALUATOR = cfg.evaluator || cfg.instructor || "";
const DIRECTOR_LABEL = cfg.directorLabel || "ผู้บริหารสถานศึกษา";
const ACTING_DIRECTOR_LABEL = cfg.actingDirectorLabel || "รักษาการในตำแหน่งผู้อำนวยการสถานศึกษา";
const ACTING_DIRECTOR_NAME  = cfg.actingDirectorName  || "(นางสาวชนิดา กลีบแก้ว)";
const HEAD_MATH_LABEL = cfg.headMathLabel || "หัวหน้าหมวดคณิตศาสตร์";
const HEAD_MATH_NAME  = cfg.headMathName  || "(นางสาวสุรีรีตน์ แสวงสุข)";

const IND = (cm) => Math.round(cm * 567);
const DOTS = (n) => ".".repeat(n);

// A4 portrait usable width (twips): 11906 - 2*1417 margins ≈ 9072.
// Activity table columns: กิจกรรม | เวลา(นาที) | สมรรถนะ — fixed so Thai text wraps
// inside each cell instead of letting the activity column eat all the width.
const ACT_COLW = [5350, 1300, 2422]; // sum = 9072

// Tell Word the complex-script (bidi) language is Thai (helps spacing/shaping).
const LANG = { value: "en-US", bidirectional: "th-TH" };

// Thai has no spaces between words, so Word treats a whole run as one unbreakable
// token and splits it mid-word in narrow cells ("สรุปผลการประเ/มิน"). Insert a
// zero-width space (U+200B) at every Thai word boundary so Word may break ONLY
// between words. Uses Intl.Segmenter (Thai dictionary) — verified available in Node.
const ZWSP = "​";
let _seg = null;
try { _seg = new Intl.Segmenter("th", { granularity: "word" }); } catch { _seg = null; }
function thaiWrap(text) {
  if (!_seg || !text) return text;
  // only touch strings that actually contain Thai letters
  if (!/[฀-๿]/.test(text)) return text;
  let out = "";
  let first = true;
  for (const { segment } of _seg.segment(text)) {
    if (!first && /[฀-๿]/.test(segment)) out += ZWSP;
    out += segment;
    first = false;
  }
  return out;
}

function run(text, opts = {}) {
  return new TextRun({ text: thaiWrap(String(text)), font: FONT, size: SIZE, bold: opts.bold ?? false, language: LANG, ...opts });
}
function para(children, opts = {}) {
  return new Paragraph({ children: Array.isArray(children) ? children : [children], ...opts });
}
function twoColRow(left, right, opts = {}) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [run(left, opts), new TextRun({ text: "\t", font: FONT, size: SIZE }), run(right, opts)],
    ...opts,
  });
}

const THIN = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_TABLE_BORDERS = {
  top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER,
  insideHorizontal: NO_BORDER, insideVertical: NO_BORDER,
};

// ---------- header ----------
function buildHeader() {
  const out = [];
  out.push(para([run("แผนการจัดการเรียนรู้", { bold: true })], {
    alignment: AlignmentType.CENTER, spacing: { after: 80 },
  }));
  // header.lines: [title, "กลุ่มสาระ… ชั้น…", "หน่วยการเรียนรู้ที่ … เวลาเรียน …"]
  // line[1] subject+grade — split into two-column (subject left, grade right) if it has ชั้น
  const subjGrade = D.header.lines[1] || "";
  const m = subjGrade.match(/^(.*?)(ชั้นประถมศึกษาปีที่.*)$/);
  if (m) out.push(twoColRow(m[1].trim(), m[2].trim()));
  else if (subjGrade) out.push(para([run(subjGrade)]));

  const unitLine = D.header.lines[2] || "";
  const um = unitLine.match(/^(.*?)(เวลาเรียน.*)$/);
  if (um) {
    const rightPart = um[2].replace(/เวลาเรียน\s*\d+\s*ชั่วโมง/, "เวลาเรียน 10 ชั่วโมง");
    out.push(twoColRow(um[1].trim(), rightPart));
  } else if (unitLine) out.push(para([run(unitLine)]));

  // extra: plan line (split topic/time), date line
  for (const ex of D.header.extra) {
    if (ex.startsWith("แผนการจัดการเรียนรู้ที่")) {
      const pm = ex.match(/^(.*?)(เวลาเรียน.*)$/);
      if (pm) out.push(twoColRow(pm[1].trim(), pm[2].trim(), { bold: true }));
      else out.push(para([run(ex, { bold: true })]));
    } else {
      out.push(para([run(ex)]));
    }
  }
  return out;
}

// ---------- pre-table content ----------
function indentForX(x) {
  if (x <= 100) return 0;
  if (x <= 125) return 0.6;
  if (x <= 145) return 1.0;
  return 1.4;
}
function buildPreTable() {
  const out = [];
  const lines = D.preTable;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const next = lines[i + 1];
    // Group each section (heading + ALL its items) with keepNext so the whole
    // section stays on one page.  Allow a page break only BETWEEN sections
    // (i.e. at the last item before the next heading, or at the last line overall).
    // This prevents item 4 of คุณลักษณะ from orphaning onto the next page while
    // also not chaining all sections together (which would push page 1 blank).
    const isLastInSection = !next || !!next.heading;
    const keepNext = l.heading ? !!next : !isLastInSection;
    out.push(para([run(l.text, { bold: l.heading })], {
      indent: { left: IND(indentForX(l.x)) },
      keepNext, keepLines: true,
      spacing: l.heading ? { before: 60 } : {},
    }));
  }
  return out;
}

// ---------- activity table (3 columns) ----------
function actCell(children, widthDxa) {
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: widthDxa, type: WidthType.DXA },
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}
function buildActivity() {
  const out = [];
  out.push(para([run("การจัดกิจกรรมการเรียนรู้", { bold: true })], {
    spacing: { before: 120 }, keepNext: true, keepLines: true,
  }));

  const headerRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      actCell([para([run("กิจกรรมการเรียนรู้", { bold: true })], { alignment: AlignmentType.CENTER })], ACT_COLW[0]),
      actCell([para([run("เวลา (นาที)", { bold: true })], { alignment: AlignmentType.CENTER })], ACT_COLW[1]),
      actCell([para([run("สมรรถนะ", { bold: true })], { alignment: AlignmentType.CENTER })], ACT_COLW[2]),
    ],
  });

  const dataRows = D.activity.rows.map((r) => {
    const actText = r.act.join(""); // Thai wrap → join without spaces
    const actParas = [para([run(actText)], { spacing: { after: 40 } })];
    const timeParas = [para([run(r.time.join("") || "")], { alignment: AlignmentType.CENTER })];
    const compParas = r.comp.length
      ? r.comp.map((c) => para([run(c)]))
      : [para([run("")])];
    return new TableRow({
      cantSplit: false,
      children: [actCell(actParas, ACT_COLW[0]), actCell(timeParas, ACT_COLW[1]), actCell(compParas, ACT_COLW[2])],
    });
  });

  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: ACT_COLW,
    layout: TableLayoutType.FIXED,
    rows: [headerRow, ...dataRows],
  }));
  return out;
}

// ---------- media list ----------
function buildMedia() {
  const out = [];
  out.push(para([run("สื่อการเรียนรู้", { bold: true })], {
    spacing: { before: 160 }, keepNext: true, keepLines: true,
  }));
  D.media.lines.forEach((l, i) => {
    const next = D.media.lines[i + 1];
    const keepNext = !!next && next.x > l.x;
    out.push(para([run(l.text)], {
      indent: { left: IND(indentForX(l.x)) }, keepLines: true, keepNext,
    }));
  });
  return out;
}

// ---------- assessment list ----------
function buildAssess() {
  const out = [];
  out.push(para([run("การวัดและประเมินผลการเรียนรู้", { bold: true })], {
    spacing: { before: 160 }, keepNext: true, keepLines: true,
  }));
  D.assess.lines.forEach((l, i) => {
    const next = D.assess.lines[i + 1];
    const keepNext = !!next && next.x > l.x;
    out.push(para([run(l.text)], {
      indent: { left: IND(indentForX(l.x)) }, keepLines: true, keepNext,
    }));
  });
  return out;
}

// ---------- observation tables (fixed template) ----------
function obCell(text, opts = {}) {
  return new TableCell({
    borders: CELL_BORDERS,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 20, bottom: 20, left: 30, right: 30 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.colSpan,
    rowSpan: opts.rowSpan,
    children: (Array.isArray(text) ? text : [text]).map((t) =>
      new Paragraph({ children: [run(String(t), { bold: opts.bold })], alignment: AlignmentType.CENTER })),
  });
}
function emptyNumberedRows(numCols) {
  const rows = [];
  for (let n = 1; n <= 15; n++) {
    const cells = [obCell(`${n}.`)];
    for (let c = 0; c < numCols; c++) cells.push(obCell(""));
    rows.push(new TableRow({ cantSplit: true, children: cells }));
  }
  return rows;
}

function buildObsTable1() {
  const out = [];
  out.push(para([run("แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรม", { bold: true })], {
    alignment: AlignmentType.CENTER, spacing: { before: 200 },
    pageBreakBefore: true, keepNext: true, keepLines: true,
  }));
  out.push(para([run("คำชี้แจง ให้ทำเครื่องหมาย ✓ ลงในช่องรายการสังเกตพฤติกรรมที่นักเรียนปฏิบัติ")], {
    keepNext: true,
  }));

  const headRow1 = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      obCell("เลขที่", { rowSpan: 2, width: 8 }),
      obCell("ร่วมมือในการทำกิจกรรม", { colSpan: 2, bold: true }),
      obCell("กล้าออกมาแสดงความสามารถ", { colSpan: 2, bold: true }),
      obCell("เข้าร่วมกิจกรรมด้วยความสนุกสนาน", { colSpan: 2, bold: true }),
      obCell("สรุปผลการประเมิน", { colSpan: 2, bold: true }),
    ],
  });
  const headRow2 = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      obCell("ผ่าน"), obCell("ไม่ผ่าน"),
      obCell("ผ่าน"), obCell("ไม่ผ่าน"),
      obCell("ผ่าน"), obCell("ไม่ผ่าน"),
      obCell("ผ่าน"), obCell("ไม่ผ่าน"),
    ],
  });
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headRow1, headRow2, ...emptyNumberedRows(8)],
  }));

  out.push(para([run("เกณฑ์การประเมิน", { bold: true })], { spacing: { before: 80 }, keepNext: true }));
  out.push(para([run("ผ่านตั้งแต่ 2 รายการ ถือว่า ผ่าน")], { indent: { left: IND(0.6) }, keepNext: true }));
  out.push(para([run("ผ่าน 1 รายการ ถือว่า ไม่ผ่าน")], { indent: { left: IND(0.6) } }));
  out.push(para([run("")]));
  out.push(...signatureBlock("ผู้ประเมิน", `(${EVALUATOR})`));
  return out;
}

function buildObsTable2() {
  const out = [];
  out.push(para([run("แบบสังเกตพฤติกรรมการเข้าร่วมกิจกรรมกลุ่ม", { bold: true })], {
    alignment: AlignmentType.CENTER, spacing: { before: 200 },
    pageBreakBefore: true, keepNext: true, keepLines: true,
  }));
  out.push(para([run("คำชี้แจง ให้กรอกคะแนนลงในช่องรายการสังเกตพฤติกรรมที่นักเรียนปฏิบัติ")], {
    keepNext: true,
  }));

  const headRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      obCell("เลขที่", { width: 8 }),
      obCell("รับผิดชอบงานที่ได้รับมอบหมาย (2 คะแนน)", { bold: true }),
      obCell("รับฟังความคิดเห็นของผู้อื่น (2 คะแนน)", { bold: true }),
      obCell("นำเสนอผลงานได้น่าสนใจ (2 คะแนน)", { bold: true }),
      obCell("มีความคิดริเริ่มสร้างสรรค์ (2 คะแนน)", { bold: true }),
      obCell("ทำงานเสร็จตามเวลาที่กำหนด (2 คะแนน)", { bold: true }),
      obCell("รวมคะแนน (10 คะแนน)", { bold: true }),
      obCell("สรุปผล", { bold: true }),
    ],
  });
  out.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headRow, ...emptyNumberedRows(7)],
  }));

  out.push(para([run("เกณฑ์การประเมิน", { bold: true })], { spacing: { before: 80 }, keepNext: true }));
  out.push(para([run("คะแนน 9 - 10 ระดับ ดีมาก    คะแนน 7 - 8 ระดับ ดี")], { indent: { left: IND(0.6) }, keepNext: true }));
  out.push(para([run("คะแนน 5 - 6 ระดับ พอใช้    คะแนน 0 - 4 ระดับ ควรปรับปรุง")], { indent: { left: IND(0.6) } }));
  out.push(para([run("")]));
  out.push(...signatureBlock("ผู้ประเมิน", `(${EVALUATOR})`));
  return out;
}

// signature: centered "ลงชื่อ ........... <role>" then centered "(name)"
function signatureBlock(role, nameLine) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("ลงชื่อ " + DOTS(38) + " " + role)],
      keepNext: true,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(nameLine)],
    }),
  ];
}

// Two side-by-side signatures in a borderless 2-column table
// Left: หัวหน้าหมวดคณิตศาสตร์  Right: รักษาการในตำแหน่งผู้อำนวยการสถานศึกษา
function doubleSignatureBlock() {
  const noBorderCell = (children) => new TableCell({
    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
    children,
  });
  const sigCell = (name, role) => noBorderCell([
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run("ลงชื่อ " + DOTS(25))],
      keepNext: true,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(name)],
      keepNext: true,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(role)],
    }),
  ]);
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_TABLE_BORDERS,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            sigCell(HEAD_MATH_NAME, HEAD_MATH_LABEL),
            sigCell(ACTING_DIRECTOR_NAME, ACTING_DIRECTOR_LABEL),
          ],
        }),
      ],
    }),
  ];
}

// ---------- บันทึกหลังการจัดการเรียนรู้ (fixed template) ----------
// Full-width fillable dotted line: a right tab at page edge with a DOT leader, so
// the dots stretch the whole line like the PDF (instead of a fixed dot count).
function dottedFull(keepNext = false) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX, leader: LeaderType.DOT }],
    children: [new TextRun({ text: "\t", font: FONT, size: SIZE })],
    spacing: { line: 320 },
    keepNext,
  });
}
function buildAfterNotes() {
  const out = [];
  out.push(para([run("บันทึกหลังการจัดการเรียนรู้", { bold: true })], {
    alignment: AlignmentType.CENTER, spacing: { before: 200 },
    pageBreakBefore: true, keepNext: true, keepLines: true,
  }));

  out.push(para([run("ผลที่เกิดกับผู้เรียน", { bold: true })], { keepNext: true }));
  for (let i = 0; i < 6; i++) out.push(dottedFull());

  out.push(para([run("ปัญหา / อุปสรรค", { bold: true })], { spacing: { before: 60 }, keepNext: true }));
  for (let i = 0; i < 5; i++) out.push(dottedFull());

  out.push(para([run("ข้อเสนอแนะ / แนวทางแก้ปัญหา", { bold: true })], { spacing: { before: 60 }, keepNext: true }));
  for (let i = 0; i < 4; i++) out.push(dottedFull());

  out.push(para([run("")]));
  out.push(...signatureBlock("ผู้สอน", `(${INSTRUCTOR})`));
  out.push(para([run("")]));

  out.push(para([run("ข้อเสนอแนะของผู้บริหารสถานศึกษา", { bold: true })], { spacing: { before: 60 }, keepNext: true }));
  for (let i = 0; i < 4; i++) out.push(dottedFull(true));
  out.push(para([run("")], { keepNext: true }));
  out.push(...doubleSignatureBlock());
  return out;
}

async function build() {
  const children = [
    ...buildHeader(),
    ...buildPreTable(),
    ...buildActivity(),
    ...buildMedia(),
    ...buildAssess(),
    ...buildObsTable1(),
    ...buildObsTable2(),
    ...buildAfterNotes(),
  ];

  const doc = new Document({
    creator: "lesson-plan-docx skill (math)",
    title: D.header.extra[0] || "แผนการจัดการเรียนรู้",
    styles: { default: { document: { run: { font: FONT, size: SIZE, language: LANG } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1417, bottom: 1417, left: 1417, right: 1417 },
        },
      },
      children,
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = join(planDir, cfg.outputName);
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes) — ${D.activity.rows.length} activity rows`);
}

build().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
