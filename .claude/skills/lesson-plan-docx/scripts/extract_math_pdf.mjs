// Extract a single math lesson-plan PDF (ป.๑ template) into structured pdf_data.json.
// Captures: header, pre-table content (มาตรฐาน…ชิ้นงาน), 3-column activity table,
// สื่อการเรียนรู้, and the assessment list (การวัดและประเมินผล → before แบบสังเกต…).
// The two observation tables + บันทึกหลังสอน are a fixed template rendered by the builder.
// Usage: node extract_math_pdf.mjs <planDir>
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUnitDir, loadConfig } from "./lib.mjs";

const planDir = getUnitDir();
const cfg = loadConfig(planDir);
const PDF_PATH = join(planDir, cfg.pdfName);
const OUT_JSON = join(planDir, "pdf_data.json");
const OUT_RAW = join(planDir, "pdf_raw.json");

const PUA_MAP = {
  0xF700: "่", 0xF701: "้", 0xF702: "ี", 0xF703: "ึ", 0xF704: "ํ",
  0xF705: "่", 0xF706: "้", 0xF707: "๊", 0xF708: "๋", 0xF709: "์",
  0xF70A: "่", 0xF70B: "้", 0xF70C: "๊", 0xF70D: "๋", 0xF70E: "์",
  0xF70F: "ํ", 0xF710: "ั", 0xF711: "ิ", 0xF712: "็", 0xF713: "ั", 0xF714: "ื",
};
function normalizeThai(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (PUA_MAP.hasOwnProperty(cp)) out += PUA_MAP[cp];
    else if (cp >= 0xE000 && cp <= 0xF8FF) continue;
    else out += ch;
  }
  return out.replace(/ํา/g, "ำ");
}

const HEADINGS = [
  "มาตรฐานการเรียนรู้/ตัวชี้วัด", "มาตรฐานการเรียนรู้", "ตัวชี้วัด", "สมรรถนะหลัก",
  "จุดประสงค์การเรียนรู้สู่ตัวชี้วัด", "สาระสำคัญ", "สาระการเรียนรู้",
  "คุณลักษณะอันพึงประสงค์", "ชิ้นงานหรือภาระงาน",
];
const isHeading = (t) => HEADINGS.some((h) => t.trim() === h || t.trim().startsWith(h + " "));

function joinParts(parts) {
  let raw = "", prevEnd = null;
  for (const pt of parts) {
    if (prevEnd !== null && pt.x - prevEnd > 6) raw += " ";
    raw += pt.str;
    prevEnd = pt.x + (pt.width || 0);
  }
  return normalizeThai(raw).trim();
}

// Split a merged line's parts into the 3 activity columns.
// Time-column digits appear at x≈337–372 (varies per plan PDF rendering).
// Stray digits from activity text (counting sequences like "1 2 3...9 10") can
// overflow to x≈312–328, so the lower bound is 330 to exclude them.
// Plan 4's time values sit at x=371.9, so the upper boundary for time is 385
// (items at x≥385 are unambiguously in the competency column).
// Non-digit text in [330,385) that isn't a digit goes to competency (c3) too —
// that covers competency headers that start below x=385 in some plan PDFs.
function splitColumns(parts) {
  const c1 = [], c2 = [], c3 = [];
  for (const pt of parts) {
    const isDigit = /^\d+$/.test(pt.str.trim());
    if (pt.x >= 385) {
      c3.push(pt);                         // clearly competency column
    } else if (pt.x >= 330 && isDigit) {
      c2.push(pt);                         // time column: digit in [330,385)
    } else if (pt.x >= 365) {
      c3.push(pt);                         // non-digit in [365,385): competency text
    } else {
      c1.push(pt);                         // activity text (x<330) or non-digit in [330,365)
    }
  }
  return { c1: joinParts(c1), c2: joinParts(c2), c3: joinParts(c3) };
}

async function extract() {
  const doc = await getDocument(PDF_PATH).promise;
  const totalPages = doc.numPages;
  const rawPages = [];
  const flat = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const vp = page.getViewport({ scale: 1.0 });
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], width: it.width }));
    rawPages.push({ pageNum, width: vp.width, height: vp.height, items });

    // First pass: coarse grouping while streaming (catches adjacent same-y items).
    const rawLines = [];
    for (const it of items) {
      const last = rawLines[rawLines.length - 1];
      if (last && Math.abs(last.y - it.y) < 3) last.parts.push(it);
      else rawLines.push({ y: it.y, parts: [it] });
    }
    rawLines.sort((a, b) => b.y - a.y);
    // Second pass: post-sort merge — PDFs may emit columns separately (column-major
    // stream order), so "2." (x=70, y=441.9) and "10" (x=357, y=442.1) end up in
    // separate rawLines entries even though they're on the same visual row.
    // Merging after sort combines them regardless of stream order.
    const lines = [];
    for (const ln of rawLines) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - ln.y) < 3) {
        last.parts.push(...ln.parts);
        last.parts.sort((a, b) => a.x - b.x);
      } else {
        lines.push(ln);
      }
    }
    for (const ln of lines) {
      ln.parts.sort((a, b) => a.x - b.x);
      // Drop the running page number (a lone digit on its own line near the top-right).
      // Keep digits that share a line with other text (e.g. the grade "1" at x≈512).
      const isPageNumberLine = ln.parts.length === 1 &&
        /^\d+$/.test(ln.parts[0].str.trim()) && ln.parts[0].x > 480;
      if (isPageNumberLine) continue;
      const parts = ln.parts;
      flat.push({ page: pageNum, y: ln.y, x: Math.round(parts[0].x), parts, text: joinParts(parts) });
    }
  }
  writeFileSync(OUT_RAW, JSON.stringify({ totalPages, pages: rawPages }, null, 2), "utf8");

  const findIdx = (pred) => flat.findIndex(pred);
  const idxActivity = findIdx((l) => l.text.startsWith("การจัดกิจกรรมการเรียนรู้"));
  const idxMedia = findIdx((l) => l.text.startsWith("สื่อการเรียนรู้"));
  const idxAssess = findIdx((l) => l.text.startsWith("การวัดและประเมินผล"));
  const idxObs = findIdx((l) => l.text.startsWith("แบบสังเกตพฤติกรรม"));

  // header: title / subject+grade / unit+time (skip stray page-number lines)
  const header = { lines: [] };
  for (const l of flat) {
    if (/^\d+$/.test(l.text)) continue;
    header.lines.push(l.text);
    if (header.lines.length >= 3) break;
  }
  const headerExtra = [];
  for (const l of flat) {
    if (l.text.startsWith("แผนการจัดการเรียนรู้ที่")) { headerExtra.push(l.text); continue; }
    if (l.text.startsWith("สอนวันที่")) { headerExtra.push(l.text); break; }
  }

  // pre-table content
  const preTable = [];
  const headerSet = new Set([...header.lines, ...headerExtra]);
  const endPre = idxActivity >= 0 ? idxActivity : flat.length;
  for (let i = 0; i < endPre; i++) {
    const l = flat[i];
    if (/^\d+$/.test(l.text)) continue;
    if (headerSet.has(l.text)) continue;
    if (!l.text) continue;
    preTable.push({ x: l.x, text: l.text, heading: isHeading(l.text) });
  }

  // activity table rows
  const activity = { rows: [] };
  if (idxActivity >= 0) {
    const end = idxMedia >= 0 ? idxMedia : (idxAssess >= 0 ? idxAssess : flat.length);
    let cur = null;
    for (let i = idxActivity + 1; i < end; i++) {
      const l = flat[i];
      if (l.text.includes("กิจกรรมการเรียนรู้") && l.text.includes("สมรรถนะ")) continue;
      const { c1, c2, c3 } = splitColumns(l.parts);
      if (/^\d+\.\s*\S/.test(c1)) {
        if (cur) activity.rows.push(cur);
        cur = { act: [], time: [], comp: [] };
      }
      if (!cur) cur = { act: [], time: [], comp: [] };
      if (c1) cur.act.push(c1);
      if (c2 && cur.time.length === 0) cur.time.push(c2); // take first time value only
      if (c3) cur.comp.push(c3);
    }
    if (cur) activity.rows.push(cur);
  }

  // media list
  const media = { lines: [] };
  if (idxMedia >= 0) {
    const end = idxAssess >= 0 ? idxAssess : flat.length;
    for (let i = idxMedia + 1; i < end; i++) {
      const l = flat[i];
      if (/^\d+$/.test(l.text)) continue;
      if (l.text) media.lines.push({ x: l.x, text: l.text });
    }
  }

  // assessment list
  const assess = { lines: [] };
  if (idxAssess >= 0) {
    const end = idxObs >= 0 ? idxObs : flat.length;
    for (let i = idxAssess + 1; i < end; i++) {
      const l = flat[i];
      if (/^\d+$/.test(l.text)) continue;
      if (l.text) assess.lines.push({ x: l.x, text: l.text });
    }
  }

  const out = { totalPages, header: { lines: header.lines, extra: headerExtra }, preTable, activity, media, assess };
  writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), "utf8");

  console.log(`Pages: ${totalPages}`);
  console.log(`Header: ${header.lines.length} + extra ${headerExtra.length}`);
  console.log(`Pre-table: ${preTable.length} (headings: ${preTable.filter((p) => p.heading).map((p) => p.text).join(" | ")})`);
  console.log(`Activity rows: ${activity.rows.length} | times: ${activity.rows.map((r) => r.time.join("")).join(",")}`);
  console.log(`Media: ${media.lines.length} | Assess: ${assess.lines.length}`);
}

extract().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
