// Split the main math lesson-plan PDF into individual plan PDFs.
// Detects plan boundaries by finding pages where "แผนการจัดการเรียนรู้ที่" appears
// exactly once (TOC pages have many occurrences and are thus excluded).
// Uses global sequential numbering 1–N to avoid conflicts between units that restart at plan 1.
// Usage: node split_math_pdf.mjs <mainPdfPath> <outputDir>

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

const mainPdfPath = resolve(process.argv[2]);
const outputDir = resolve(process.argv[3]);

if (!mainPdfPath || !outputDir) {
  console.error("Usage: node split_math_pdf.mjs <mainPdfPath> <outputDir>");
  process.exit(1);
}

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
    if (Object.prototype.hasOwnProperty.call(PUA_MAP, cp)) out += PUA_MAP[cp];
    else if (cp >= 0xE000 && cp <= 0xF8FF) continue;
    else out += ch;
  }
  return out.replace(/ํา/g, "ำ");
}

function sanitize(s) {
  // Remove characters invalid in Windows filenames
  return s.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
}

// Group text items into visual lines by y-proximity, sorted top→bottom.
function groupLines(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.y) < 5) {
      last.parts.push(it);
    } else {
      lines.push({ y: it.y, parts: [it] });
    }
  }
  // Sort parts within each line left→right
  for (const ln of lines) ln.parts.sort((a, b) => a.x - b.x);
  return lines;
}

function lineText(line) {
  return line.parts.map(p => p.str).join(" ").trim();
}

// Extract plan title: find the line containing "เรื่อง" and grab text after it.
// If the title after "เรื่อง" looks incomplete (ends with hyphen or is very short),
// append the next line as a continuation.
function extractTitle(lines) {
  const KNOWN_SECTIONS = ["วิชา", "ชั้น", "เวลา", "ภาคเรียน", "กลุ่มสาระ", "โรงเรียน",
    "มาตรฐาน", "ตัวชี้วัด", "สมรรถนะ", "จุดประสงค์"];

  // Try primary: find "เรื่อง" keyword
  for (let i = 0; i < lines.length; i++) {
    const text = lineText(lines[i]);
    const reungIdx = text.indexOf("เรื่อง");
    if (reungIdx === -1) continue;

    let title = text.slice(reungIdx + "เรื่อง".length).trim();

    // Strip trailing metadata fields that appear on the same visual line as เรื่อง
    // (e.g., "เวลาเรียน 1 ชั่วโมง" on the right side of the header row)
    const STRIP_BEFORE = ["เวลาเรียน", "กลุ่มสาระ", "ชั้นประถม", "ภาคเรียน", "ปีการศึกษา"];
    for (const sb of STRIP_BEFORE) {
      const si = title.indexOf(sb);
      if (si !== -1) title = title.slice(0, si).trim();
    }

    // Check if continuation line needed (title is empty, very short, or ends with hyphen/dash)
    const needsContinuation = !title || title.length < 3 ||
      title.endsWith("-") || title.endsWith("–") || title.endsWith("—");

    if (needsContinuation && i + 1 < lines.length) {
      const nextText = lineText(lines[i + 1]);
      // Don't append if next line looks like a section heading
      const isSection = KNOWN_SECTIONS.some(s => nextText.startsWith(s));
      if (!isSection) {
        title = title ? title + " " + nextText : nextText;
      }
    }

    return title;
  }

  // Fallback: no เรื่อง found — extract title as text after "แผนการจัดการเรียนรู้ที่ N"
  const KW = "แผนการจัดการเรียนรู้ที่";
  for (const line of lines) {
    const text = lineText(line);
    const kwIdx = text.indexOf(KW);
    if (kwIdx === -1) continue;
    // Skip the keyword and the plan number (digits + space after)
    let after = text.slice(kwIdx + KW.length).trim();
    after = after.replace(/^\d+\s*/, ""); // strip plan number
    // Strip metadata
    const STRIP_BEFORE2 = ["เวลาเรียน", "กลุ่มสาระ", "ชั้นประถม", "ภาคเรียน"];
    for (const sb of STRIP_BEFORE2) {
      const si = after.indexOf(sb);
      if (si !== -1) after = after.slice(0, si).trim();
    }
    if (after.length > 2) return after;
  }
  return "";
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const doc = await getDocument(mainPdfPath).promise;
  const totalPages = doc.numPages;
  console.log(`Scanning ${totalPages} pages for plan boundaries...`);

  const planStarts = []; // { pageIndex (0-based), title }
  const KEYWORD = "แผนการจัดการเรียนรู้ที่";

  for (let pn = 1; pn <= totalPages; pn++) {
    const page = await doc.getPage(pn);
    const tc = await page.getTextContent();

    const items = tc.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: normalizeThai(it.str),
        x: it.transform[4],
        y: it.transform[5],
        w: it.width || 0,
      }));

    const allText = items.map(it => it.str).join(" ");

    // Count keyword occurrences. TOC pages have many; plan start pages have exactly 1.
    const occurrences = (allText.match(new RegExp(KEYWORD, "g")) || []).length;

    // Also check occurrences restricted to the TOP 30% of the page.
    // TOC pages have many keyword lines spread across the whole page.
    // Plan-start pages have the keyword only near the top (y > 0.7 * height).
    const vp = page.getViewport({ scale: 1.0 });
    const H = vp.height;
    const topItems = items.filter(it => it.y > H * 0.7);
    const topText = topItems.map(it => it.str).join(" ");
    const topOccurrences = (topText.match(new RegExp(KEYWORD, "g")) || []).length;

    const isLikelyPlanStart =
      // Standard case: keyword once on whole page (TOC excluded)
      (occurrences === 1 && allText.includes("เรื่อง")) ||
      // Fallback: keyword once in top 30% even without เรื่อง
      // (some plans omit เรื่อง; title follows plan number directly in header row)
      (topOccurrences === 1 && occurrences <= 3);

    if (isLikelyPlanStart) {
      const lines = groupLines(items);
      const title = extractTitle(lines) || "ไม่ทราบชื่อ";
      planStarts.push({ pageIndex: pn - 1, title });
      process.stdout.write(`\r  Found ${planStarts.length} plan(s) — last: page ${pn}  `);
    }
  }

  console.log(`\n\nDetected ${planStarts.length} plans:`);
  planStarts.forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. page ${String(p.pageIndex + 1).padStart(4)}: "${p.title}"`);
  });

  if (planStarts.length !== 99) {
    console.warn(`\nWARNING: Expected 99 plans but found ${planStarts.length}.`);
    console.warn("Review the list above before proceeding.");
  }

  // Split PDF using pdf-lib
  console.log("\nSplitting PDF...");
  const pdfBytes = readFileSync(mainPdfPath);
  const srcPdf = await PDFDocument.load(pdfBytes);

  const manifest = [];

  for (let i = 0; i < planStarts.length; i++) {
    const { pageIndex, title } = planStarts[i];
    const endIndex = i + 1 < planStarts.length
      ? planStarts[i + 1].pageIndex - 1
      : totalPages - 1;

    const globalNum = i + 1;
    const safeTitle = sanitize(title);
    const pdfName = `แผนที่ ${globalNum} - ${safeTitle}.pdf`;
    const folderName = `แผนที่ ${globalNum} - ${safeTitle}`;

    const newPdf = await PDFDocument.create();
    const indices = [];
    for (let p = pageIndex; p <= endIndex; p++) indices.push(p);
    const copied = await newPdf.copyPages(srcPdf, indices);
    for (const pg of copied) newPdf.addPage(pg);
    writeFileSync(join(outputDir, pdfName), await newPdf.save());

    manifest.push({
      globalNum,
      title,
      pdfName,
      folderName,
      startPage: pageIndex + 1,
      endPage: endIndex + 1,
    });

    process.stdout.write(`\r  [${globalNum}/${planStarts.length}] ${pdfName.slice(0, 55)}`);
  }

  console.log("\n");
  const manifestPath = join(outputDir, "plan_manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`plan_manifest.json written to: ${manifestPath}`);
  console.log(`Done. ${manifest.length} PDF files saved to: ${outputDir}`);
}

main().catch(err => { console.error(err); process.exit(1); });
