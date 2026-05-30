// Embed worksheet PDFs as full-page floating images after each matching plan in the docx.
// Renders each worksheet PDF → PNG (one per page) and injects via document.xml surgery.
// MUST run AFTER build_docx.mjs (edits the docx in place). Usage: node embed_worksheets.mjs <unitDir>
import { pdf } from "pdf-to-img";
import JSZip from "jszip";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getUnitDir, loadConfig, toThai } from "./lib.mjs";

const unitDir = getUnitDir();
const cfg = loadConfig(unitDir);
const PLAN_COUNT = cfg.worksheetCount || cfg.keepPlans.length;
const wsPdf = (tn) => join(unitDir, "แบบฝึกหัด", `ใบงานที่_${tn}_บทที่_${cfg.unitNo}_${cfg.unitName}.pdf`);
const docxPath = join(unitDir, cfg.outputName);

// A4 in EMU (210mm × 297mm)
const A4_W = 7559670;
const A4_H = 10692778;
const PAGE_BREAK_XML = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

function imageXml(relId, imgId, name, cx, cy) {
  const NS_WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}"><pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${name}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="${NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

async function main() {
  console.log(`Rendering ${PLAN_COUNT} worksheet PDFs to PNG...`);
  const allPages = [];
  for (let i = 1; i <= PLAN_COUNT; i++) {
    const tn = toThai(i);
    const pages = [];
    const doc = await pdf(wsPdf(tn), { scale: 2 });
    for await (const page of doc) pages.push(Buffer.from(page));
    allPages.push(pages);
    console.log(`  ใบงาน ${tn}: ${pages.length} pages`);
  }

  console.log(`\nLoading ${docxPath}`);
  const zip = await JSZip.loadAsync(readFileSync(docxPath));

  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  let nextRId = Math.max(0, ...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => parseInt(m[1]))) + 1;
  let nextImgId = 1000;

  const mediaEntries = [];
  for (let ws = 0; ws < PLAN_COUNT; ws++) {
    const wsPages = [];
    allPages[ws].forEach((png, pg) => {
      const fileName = `ws${ws + 1}_p${pg + 1}.png`;
      const relId = `rId${nextRId++}`;
      zip.file(`word/media/${fileName}`, png);
      wsPages.push({ relId, imgId: nextImgId++, fileName, cx: A4_W, cy: A4_H });
    });
    mediaEntries.push(wsPages);
  }

  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    zip.file("[Content_Types].xml", ctXml);
  }

  let newRels = relsXml.replace("</Relationships>", "");
  for (const wsPages of mediaEntries)
    for (const { relId, fileName } of wsPages)
      newRels += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
  newRels += "</Relationships>";
  zip.file("word/_rels/document.xml.rels", newRels);

  const docXml = await zip.file("word/document.xml").async("string");
  const body = docXml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/)[1];
  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  function walkChunks(s) {
    const chunks = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9_:]*)\b[^>]*?(\/?)>/g;
    let depth = 0, start = -1, topTag = null, m;
    while ((m = tagRe.exec(s)) !== null) {
      const full = m[0], close = full.startsWith("</"), self = m[2] === "/", tag = m[1];
      if (close) {
        depth--;
        if (depth === 0 && tag === topTag) { chunks.push(s.slice(start, m.index + full.length)); start = -1; topTag = null; }
      } else if (!self) {
        if (depth === 0 && (tag === "w:p" || tag === "w:tbl")) { start = m.index; topTag = tag; }
        depth++;
      }
    }
    return chunks;
  }

  const chunks = walkChunks(bodyClean);
  const planHeaderRe = /แผนการจัดการเรียนรู้ที่\s*([๐-๙0-9]+)/;
  const planStarts = [];
  chunks.forEach((c, i) => {
    if (c.includes("แผนการจัดการเรียนรู้ที่")) {
      const m = c.match(planHeaderRe);
      if (m && planStarts.length < PLAN_COUNT) planStarts.push({ index: i, num: m[1] });
    }
  });
  console.log(`\nFound ${planStarts.length} plan boundaries`);
  if (planStarts.length !== PLAN_COUNT) throw new Error(`Expected ${PLAN_COUNT} plans, got ${planStarts.length}`);

  const planEnds = [...planStarts.slice(1).map((p) => p.index), chunks.length];
  const parts = [];
  if (planStarts[0].index > 0) parts.push(chunks.slice(0, planStarts[0].index).join(""));

  for (let i = 0; i < PLAN_COUNT; i++) {
    const planChunks = chunks.slice(planStarts[i].index, planEnds[i]);
    const lastChunk = planChunks[planChunks.length - 1] || "";
    const hasPageBreak = lastChunk.includes('w:type="page"') || lastChunk.includes("w:type='page'");
    if (hasPageBreak) { parts.push(planChunks.slice(0, -1).join("")); parts.push(lastChunk); }
    else { parts.push(planChunks.join("")); parts.push(PAGE_BREAK_XML); }

    const wsPages = mediaEntries[i];
    wsPages.forEach(({ relId, imgId, cx, cy }, pg) => {
      parts.push(imageXml(relId, imgId, `ws${i + 1}_p${pg + 1}`, cx, cy));
      if (pg < wsPages.length - 1) parts.push(PAGE_BREAK_XML);
    });
    if (i < PLAN_COUNT - 1) parts.push(PAGE_BREAK_XML);
    console.log(`  Plan ${i + 1} + Worksheet ${i + 1} (${wsPages.length} pages)`);
  }

  const newDocXml = docXml.replace(/<w:body\b[^>]*>[\s\S]*<\/w:body>/, `<w:body>${parts.join("") + sectPr}</w:body>`);
  zip.file("word/document.xml", newDocXml);

  const outBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  writeFileSync(docxPath, outBuf);
  console.log(`\nSAVED: ${docxPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
