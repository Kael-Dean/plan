// Embed worksheet PDFs as full-page floating images after each plan in the chapter 3 docx.
// Same approach as chapter 2's embed_worksheets.mjs, adapted for chapter 3 (10 plans, ครัวป่า).
import { pdf } from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/pdf-to-img/dist/index.js";
import JSZip from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/jszip/dist/jszip.min.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const THAI_NUMS = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];
const PLAN_COUNT = 10;

// A4 in EMU (1 EMU = 1/914400 inch); A4 = 210mm × 297mm
const A4_W = 7559670;
const A4_H = 10692778;

const PAGE_BREAK_XML =
  `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

function imageXml(relId, imgId, name, cx, cy) {
  const NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}"><pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${name}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="${NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

async function main() {
  // 1. Render all 10 PDFs to PNG buffers (one buffer per page)
  console.log("Rendering 10 worksheet PDFs to PNG...");
  const allPages = [];
  for (let i = 1; i <= PLAN_COUNT; i++) {
    const tn = THAI_NUMS[i];
    const pdfPath = join(__dirname, "..", "แบบฝึกหัด", `ใบงานที่_${tn}_บทที่_๓_ครัวป่า.pdf`);
    const pages = [];
    const doc = await pdf(pdfPath, { scale: 2 });
    for await (const page of doc) pages.push(Buffer.from(page));
    allPages.push(pages);
    console.log(`  ใบงาน ${tn}: ${pages.length} pages`);
  }

  // 2. Load the chapter 3 docx
  const docxPath = join(__dirname, "..", "หน่วยการเรียนรู้ที่๓_ครัวป่า.docx");
  console.log(`\nLoading ${docxPath}`);
  const buf = readFileSync(docxPath);
  const zip = await JSZip.loadAsync(buf);

  // 3. Get next available rId
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;
  let nextImgId = 1000;

  // 4. Add PNGs into media folder + build relationship list
  const mediaEntries = [];
  for (let ws = 0; ws < PLAN_COUNT; ws++) {
    const pages = allPages[ws];
    const wsPages = [];
    for (let pg = 0; pg < pages.length; pg++) {
      const png = pages[pg];
      const fileName = `ws${ws + 1}_p${pg + 1}.png`;
      const relId = `rId${nextRId++}`;
      const imgId = nextImgId++;
      zip.file(`word/media/${fileName}`, png);
      wsPages.push({ relId, imgId, fileName, cx: A4_W, cy: A4_H });
    }
    mediaEntries.push(wsPages);
  }

  // 5. Update [Content_Types].xml — register png if not present
  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace(
      "</Types>",
      `<Default Extension="png" ContentType="image/png"/></Types>`,
    );
    zip.file("[Content_Types].xml", ctXml);
  }

  // 6. Update relationships
  let newRels = relsXml.replace("</Relationships>", "");
  for (const wsPages of mediaEntries) {
    for (const { relId, fileName } of wsPages) {
      newRels += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
    }
  }
  newRels += "</Relationships>";
  zip.file("word/_rels/document.xml.rels", newRels);

  // 7. Parse body, find plan boundaries, inject images
  const docXml = await zip.file("word/document.xml").async("string");
  const bodyMatch = docXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/);
  const body = bodyMatch[1];

  // Extract sectPr (last)
  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  // Split into <w:p> and <w:tbl> chunks at top level
  function walkChunks(s) {
    const chunks = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9_:]*)\b[^>]*?(\/?)>/g;
    let depth = 0;
    let start = -1;
    let topTag = null;
    let m;
    while ((m = tagRe.exec(s)) !== null) {
      const full = m[0];
      const close = full.startsWith("</");
      const self = m[2] === "/";
      const tag = m[1];
      if (close) {
        depth--;
        if (depth === 0 && tag === topTag) {
          chunks.push(s.slice(start, m.index + full.length));
          start = -1;
          topTag = null;
        }
      } else if (!self) {
        if (depth === 0 && (tag === "w:p" || tag === "w:tbl")) {
          start = m.index;
          topTag = tag;
        }
        depth++;
      }
    }
    return chunks;
  }

  const chunks = walkChunks(bodyClean);
  console.log(`\nTotal top-level chunks: ${chunks.length}`);

  // Find plan start indices by searching for "แผนการจัดการเรียนรู้ที่ X"
  const planHeaderRe = /แผนการจัดการเรียนรู้ที่\s*([๐-๙0-9]+)/;
  const planStarts = [];
  chunks.forEach((c, i) => {
    if (c.includes("แผนการจัดการเรียนรู้ที่")) {
      const m = c.match(planHeaderRe);
      if (m && planStarts.length < PLAN_COUNT) {
        planStarts.push({ index: i, num: m[1] });
      }
    }
  });
  console.log(`Found ${planStarts.length} plan boundaries:`);
  for (const p of planStarts) {
    console.log(`  Plan ${p.num} at chunk index ${p.index}`);
  }
  if (planStarts.length !== PLAN_COUNT) {
    throw new Error(`Expected ${PLAN_COUNT} plans, got ${planStarts.length}`);
  }

  const planEnds = [...planStarts.slice(1).map((p) => p.index), chunks.length];

  // Build new body
  const parts = [];
  if (planStarts[0].index > 0) {
    parts.push(chunks.slice(0, planStarts[0].index).join(""));
  }

  for (let i = 0; i < PLAN_COUNT; i++) {
    const planChunks = chunks.slice(planStarts[i].index, planEnds[i]);
    const lastChunk = planChunks[planChunks.length - 1] || "";
    const hasPageBreak =
      lastChunk.includes('w:type="page"') || lastChunk.includes("w:type='page'");

    if (hasPageBreak) {
      parts.push(planChunks.slice(0, -1).join(""));
      parts.push(lastChunk);
    } else {
      parts.push(planChunks.join(""));
      parts.push(PAGE_BREAK_XML);
    }

    // Insert worksheet PNG pages
    const wsPages = mediaEntries[i];
    for (let pg = 0; pg < wsPages.length; pg++) {
      const { relId, imgId, fileName, cx, cy } = wsPages[pg];
      parts.push(imageXml(relId, imgId, `ws${i + 1}_p${pg + 1}`, cx, cy));
      if (pg < wsPages.length - 1) {
        parts.push(PAGE_BREAK_XML);
      }
    }

    // Page break after worksheet (before next plan), except after last
    if (i < PLAN_COUNT - 1) {
      parts.push(PAGE_BREAK_XML);
    }

    console.log(`  Plan ${i + 1} + Worksheet ${i + 1} (${wsPages.length} pages)`);
  }

  const newBody = parts.join("") + sectPr;
  const newDocXml = docXml.replace(
    /<w:body\b[^>]*>[\s\S]*<\/w:body>/,
    `<w:body>${newBody}</w:body>`,
  );
  zip.file("word/document.xml", newDocXml);

  // 8. Save
  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  writeFileSync(docxPath, outBuf);
  console.log(`\nSAVED: ${docxPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
