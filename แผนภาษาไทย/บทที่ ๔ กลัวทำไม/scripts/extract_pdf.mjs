import { getDocument } from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/pdfjs-dist/legacy/build/pdf.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(__dirname, "..", "หน่วยการเรียนรู้ที่ ๔ กลัวทำไม.pdf");
const OUT_JSON = join(__dirname, "pdf_data.json");
const OUT_RAW = join(__dirname, "pdf_raw.json");

// PUA → standard Thai Unicode mapping for TH SarabunPSK PDFs.
// Empirically derived from the source PDF by context inspection.
// Tall consonants (ป, ฝ, ฟ, ฬ) get vowels/tone marks shifted, encoded in PUA.
const PUA_MAP = {
  0xF700: "่",   // ่ raised
  0xF701: "้",   // ้ raised
  0xF702: "ี",   // ี after tall consonant (e.g. "ปี")
  0xF703: "ึ",   // ึ after tall consonant (e.g. "ฝึก")
  0xF704: "ํ",   // ํ
  0xF705: "่",   // ่ after tall consonant (e.g. "ฝ่า", "ใฝ่")
  0xF706: "้",   // ้ raised
  0xF707: "๊",   // ๊ after tall consonant (e.g. "โป๊ก")
  0xF708: "๋",   // ๋ after tall consonant (e.g. "เป๋า")
  0xF709: "์",   // ์ raised
  0xF70A: "่",   // ่ (default, low position)
  0xF70B: "้",   // ้ (default)
  0xF70C: "๊",   // ๊ (default)
  0xF70D: "๋",   // ๋ (default, e.g. "กรุ๋ง", "เอ๋ย")
  0xF70E: "์",   // ์ (default, very common for thanthakhat)
  0xF70F: "ํ",   // ํ low
  0xF710: "ั",   // ั low
  0xF711: "ิ",   // ิ low
  0xF712: "็",   // ็ (mai taikhu, e.g. "เป็น")
  0xF713: "ั",   // ั variant (rare, 1 occurrence)
  0xF714: "ื",   // ื
};

function normalizeThai(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (PUA_MAP.hasOwnProperty(cp)) {
      out += PUA_MAP[cp];
    } else if (cp >= 0xE000 && cp <= 0xF8FF) {
      continue;
    } else {
      out += ch;
    }
  }
  // Compose nikkhahit + sara aa → sara am: ํา → ำ
  out = out.replace(/ํา/g, "ำ");
  return out;
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
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      fontName: it.fontName,
      width: it.width,
      height: it.height,
    }));

    pages.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    });

    for (const [key, fobj] of Object.entries(tc.styles || {})) {
      fontFaceMap[key] = {
        fontFamily: fobj.fontFamily,
        ascent: fobj.ascent,
        descent: fobj.descent,
      };
    }
  }

  writeFileSync(OUT_RAW, JSON.stringify({ pages, fontFaceMap, totalPages }, null, 2), "utf8");

  // Group items into lines by page (same y-coordinate within tolerance)
  const linesByPage = new Map();
  for (const p of pages) {
    const arr = [];
    for (const it of p.items) {
      if (!it.str || !it.str.trim()) continue;
      const last = arr[arr.length - 1];
      if (last && Math.abs(last.y - it.y) < 2) {
        last.parts.push(it);
      } else {
        arr.push({ y: it.y, parts: [it] });
      }
    }
    linesByPage.set(p.pageNum, arr);
  }

  const allLines = [];
  for (const [pageNum, lines] of linesByPage) {
    lines.sort((a, b) => b.y - a.y);
    for (const line of lines) {
      line.parts.sort((a, b) => a.x - b.x);
      // Insert space between parts when x-gap is large (cross-column or word break)
      let raw = "";
      let prevEndX = null;
      for (const pt of line.parts) {
        if (prevEndX !== null) {
          const gap = pt.x - prevEndX;
          if (gap > 6) raw += " ";
        }
        raw += pt.str;
        prevEndX = pt.x + (pt.width || 0);
      }
      const text = normalizeThai(raw).trim();
      if (text) {
        allLines.push({
          page: pageNum,
          y: line.y,
          x: line.parts[0].x,
          text,
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
      currentPlan = {
        number: m[1],
        header: line.text,
        startPage: line.page,
        lines: [],
      };
    } else if (currentPlan) {
      currentPlan.lines.push(line);
    }
  }
  if (currentPlan) plans.push(currentPlan);

  const sectionRe = /^([๐-๙]+)\.\s*(.+)/;
  const sectionTitleHints = [
    "สาระสำคัญ",
    "ตัวชี้วัด",
    "จุดประสงค์การเรียนรู้",
    "คุณลักษณะอันพึงประสงค์",
    "สาระการเรียนรู้",
    "กิจกรรมการเรียนรู้",
    "สื่อ",
    "วัดผลประเมินผล",
    "การวัดและประเมิน",
    "การประเมิน",
  ];

  for (const p of plans) {
    const sections = [];
    let currentSection = null;
    const preamble = [];
    for (const ln of p.lines) {
      const m = ln.text.match(sectionRe);
      // Font-agnostic section detection: rely on left-margin position + section
      // title hints (this PDF tags headings as g_d0_f1; chapter 2 used g_d0_f2).
      const isSection =
        m &&
        ln.x < 85 &&
        sectionTitleHints.some((h) => ln.text.includes(h));
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
      number: p.number,
      header: p.header,
      startPage: p.startPage,
      preambleLines: p.preamble.map((l) => ({ x: Math.round(l.x), text: l.text })),
      sections: p.sections.map((s) => ({
        number: s.number,
        title: s.title,
        contentLines: s.lines.map((l) => ({ x: Math.round(l.x), text: l.text })),
      })),
    })),
  };

  writeFileSync(OUT_JSON, JSON.stringify(summary, null, 2), "utf8");

  console.log(`Pages: ${totalPages}`);
  console.log(`Plans found: ${plans.length}`);
  for (const p of plans) {
    console.log(`  Plan ${p.number} (page ${p.startPage}) — ${p.sections.length} sections`);
    for (const s of p.sections) {
      console.log(`    ${s.number}. ${s.title}`);
    }
  }
}

extract().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
