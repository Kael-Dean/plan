// Extract text from the source lesson-plan PDF, normalize TH SarabunPSK PUA codepoints
// to real Thai Unicode, group into lines, split into plans + sections.
// Writes <unitDir>/pdf_data.json (+ pdf_raw.json). Usage: node extract_pdf.mjs <unitDir>
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUnitDir, loadConfig } from "./lib.mjs";

const unitDir = getUnitDir();
const cfg = loadConfig(unitDir);
const PDF_PATH = join(unitDir, cfg.pdfName);
const OUT_JSON = join(unitDir, "pdf_data.json");
const OUT_RAW = join(unitDir, "pdf_raw.json");

// PUA → standard Thai Unicode (TH SarabunPSK). Tall consonants shift vowels/tone marks into PUA.
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
  return out.replace(/ํา/g, "ำ"); // nikkhahit + sara aa → sara am
}

async function extract() {
  const doc = await getDocument(PDF_PATH).promise;
  const totalPages = doc.numPages;
  const pages = [];
  const fontFaceMap = {};

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const tc = await page.getTextContent();
    const items = tc.items.map((it) => ({
      str: it.str, x: it.transform[4], y: it.transform[5],
      fontName: it.fontName, width: it.width, height: it.height,
    }));
    pages.push({ pageNum, width: viewport.width, height: viewport.height, items });
    for (const [key, fobj] of Object.entries(tc.styles || {})) {
      fontFaceMap[key] = { fontFamily: fobj.fontFamily, ascent: fobj.ascent, descent: fobj.descent };
    }
  }

  writeFileSync(OUT_RAW, JSON.stringify({ pages, fontFaceMap, totalPages }, null, 2), "utf8");

  // Group items into lines (same y within tolerance).
  const linesByPage = new Map();
  for (const p of pages) {
    const arr = [];
    for (const it of p.items) {
      if (!it.str || !it.str.trim()) continue;
      const last = arr[arr.length - 1];
      if (last && Math.abs(last.y - it.y) < 2) last.parts.push(it);
      else arr.push({ y: it.y, parts: [it] });
    }
    linesByPage.set(p.pageNum, arr);
  }

  const allLines = [];
  for (const [pageNum, lines] of linesByPage) {
    lines.sort((a, b) => b.y - a.y);
    for (const line of lines) {
      line.parts.sort((a, b) => a.x - b.x);
      let raw = "", prevEndX = null;
      for (const pt of line.parts) {
        if (prevEndX !== null && pt.x - prevEndX > 6) raw += " ";
        raw += pt.str;
        prevEndX = pt.x + (pt.width || 0);
      }
      const text = normalizeThai(raw).trim();
      if (text) {
        allLines.push({
          page: pageNum, y: line.y, x: line.parts[0].x, text,
          fonts: [...new Set(line.parts.map((p) => p.fontName))],
        });
      }
    }
  }

  const planHeaderRe = /แผนการจัดการเรียนรู้\s*ที่\s*([๐-๙0-9]+)/;
  const plans = [];
  let currentPlan = null;
  for (const line of allLines) {
    const m = line.text.match(planHeaderRe);
    if (m && line.x > 150) {
      if (currentPlan) plans.push(currentPlan);
      currentPlan = { number: m[1], header: line.text, startPage: line.page, lines: [] };
    } else if (currentPlan) {
      currentPlan.lines.push(line);
    }
  }
  if (currentPlan) plans.push(currentPlan);

  // Font-agnostic section detection: left margin (x < 85) + Thai heading keyword.
  const sectionRe = /^([๐-๙]+)\.\s*(.+)/;
  const sectionTitleHints = [
    "สาระสำคัญ", "ตัวชี้วัด", "จุดประสงค์การเรียนรู้", "คุณลักษณะอันพึงประสงค์",
    "สาระการเรียนรู้", "กิจกรรมการเรียนรู้", "สื่อ", "วัดผลประเมินผล",
    "การวัดและประเมิน", "การประเมิน",
  ];

  for (const p of plans) {
    const sections = [];
    let currentSection = null;
    const preamble = [];
    for (const ln of p.lines) {
      const m = ln.text.match(sectionRe);
      const isSection = m && ln.x < 85 && sectionTitleHints.some((h) => ln.text.includes(h));
      if (isSection) {
        if (currentSection) sections.push(currentSection);
        currentSection = { number: m[1], title: m[2].trim(), lines: [] };
      } else if (currentSection) {
        currentSection.lines.push(ln);
      } else {
        preamble.push(ln);
      }
    }
    if (currentSection) sections.push(currentSection);
    p.sections = sections;
    p.preamble = preamble;
  }

  const summary = {
    totalPages,
    planCount: plans.length,
    fontFaceMap,
    plans: plans.map((p) => ({
      number: p.number, header: p.header, startPage: p.startPage,
      preambleLines: p.preamble.map((l) => ({ x: Math.round(l.x), text: l.text })),
      sections: p.sections.map((s) => ({
        number: s.number, title: s.title,
        contentLines: s.lines.map((l) => ({ x: Math.round(l.x), text: l.text })),
      })),
    })),
  };
  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");

  console.log(`Pages: ${totalPages} | Plans found: ${plans.length}`);
  for (const p of plans) console.log(`  Plan ${p.number} (page ${p.startPage}) — ${p.sections.length} sections`);
}

extract().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
