/**
 * replace_worksheets.js
 *
 * Replaces worksheet images in final4.docx with pages from the new PDFs.
 *
 * Strategy:
 * 1. Render all 10 new PDFs to PNG pages.
 * 2. Load final4.docx via JSZip.
 * 3. Parse document.xml body: find groups of consecutive anchor-image paragraphs
 *    (those are the worksheet sections — there are exactly 10 groups).
 * 4. Remove old images from media/ and old relationships.
 * 5. Insert new PNG pages with updated anchor paragraphs.
 * 6. Save as final5.docx.
 */

const { pdf } = require("pdf-to-img");
const JSZip = require("jszip");
const fs = require("fs");

const THAI_NUMS = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

// A4 full-page EMU dimensions
const A4_W = 7559670;
const A4_H = 10692778;

function pngSize(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

// Build floating anchor paragraph XML for a worksheet page image
function anchorParaXml(relId, imgId, imgName, cx, cy, relativeHeight) {
  const NS_WP  = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const NS_A   = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  const NS_R   = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${relativeHeight}" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${imgName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}"><pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${imgName}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="${NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

const PAGE_BREAK_XML = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

// Check if a paragraph chunk is an anchor image paragraph (worksheet page)
function isAnchorPara(chunk) {
  return chunk.includes("wp:anchor") && chunk.includes("r:embed=");
}

// Check if a paragraph chunk is a page-break-only paragraph
function isPageBreakPara(chunk) {
  return chunk.includes('w:type="page"') || chunk.includes("w:type='page'");
}

async function main() {
  // ── 1. Render all 10 PDFs to PNG pages ──
  console.log("Rendering PDF pages to PNG...");
  const allPages = [];
  for (let i = 1; i <= 10; i++) {
    const tn = THAI_NUMS[i];
    const pdfPath = `D:/แผน/แบบฝึกหัด/ใบงานที่_${tn}_บทที่_๑_น้ำใส.pdf`;
    const pages = [];
    const doc = await pdf(pdfPath, { scale: 2 });
    for await (const page of doc) pages.push(Buffer.from(page));
    allPages.push(pages);
    console.log(`  WS${i} (${tn}): ${pages.length} pages`);
  }
  const totalNew = allPages.reduce((s, p) => s + p.length, 0);
  console.log(`Total new pages: ${totalNew}`);

  // ── 2. Load main docx ──
  console.log("\nLoading final4.docx...");
  const mainBuf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final4.docx");
  const zip = await JSZip.loadAsync(mainBuf);

  // ── 3. Parse document.xml ──
  const docXml = await zip.file("word/document.xml").async("string");
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const body = bodyMatch[1];

  // Separate sectPr from body content
  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  // Split body into paragraph chunks
  const chunks = bodyClean.split(/(?=<w:p[ >])/);
  console.log(`Total body paragraph chunks: ${chunks.length}`);

  // ── 4. Find anchor-image paragraph groups ──
  // An "anchor group" is a run of consecutive anchor paragraphs (possibly with page-break
  // paragraphs interspersed). We collect group start/end indices.
  const groups = []; // each: { start, end } (inclusive, in chunks[])
  let inGroup = false;
  let groupStart = -1;

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    if (isAnchorPara(c)) {
      if (!inGroup) { groupStart = i; inGroup = true; }
    } else if (inGroup && isPageBreakPara(c)) {
      // page break between anchor pages — still part of the group
    } else {
      if (inGroup) {
        // End of group — find last anchor index
        let lastAnchor = groupStart;
        for (let j = i - 1; j >= groupStart; j--) {
          if (isAnchorPara(chunks[j])) { lastAnchor = j; break; }
        }
        groups.push({ start: groupStart, end: lastAnchor });
        inGroup = false;
        groupStart = -1;
      }
    }
  }
  if (inGroup) {
    let lastAnchor = groupStart;
    for (let j = chunks.length - 1; j >= groupStart; j--) {
      if (isAnchorPara(chunks[j])) { lastAnchor = j; break; }
    }
    groups.push({ start: groupStart, end: lastAnchor });
  }

  console.log(`Found ${groups.length} anchor image groups:`);
  groups.forEach((g, i) => {
    const count = chunks.slice(g.start, g.end + 1).filter(isAnchorPara).length;
    console.log(`  Group ${i+1}: chunks[${g.start}..${g.end}] (${count} anchor images)`);
  });

  if (groups.length !== 10) {
    console.error(`ERROR: Expected 10 worksheet groups, found ${groups.length}. Aborting.`);
    process.exit(1);
  }

  // ── 5. Collect old relationship IDs used by worksheet images ──
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const oldRIds = new Set();
  for (const g of groups) {
    for (let i = g.start; i <= g.end; i++) {
      const m = chunks[i].match(/r:embed="([^"]+)"/g);
      if (m) m.forEach(x => oldRIds.add(x.replace(/r:embed="|"/g, "")));
    }
  }
  console.log(`\nOld worksheet rIds: ${[...oldRIds].join(", ")}`);

  // Map old rId → image file
  const oldRIdToFile = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]+Target="media\/([^"]+)"/g)) {
    if (oldRIds.has(m[1])) oldRIdToFile[m[1]] = m[2];
  }

  // ── 6. Find next available rId and imgId ──
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;
  let nextImgId = 200;

  // Find base relativeHeight from first existing anchor
  const firstAnchorMatch = docXml.match(/relativeHeight="(\d+)"/);
  let baseRelHeight = firstAnchorMatch ? parseInt(firstAnchorMatch[1]) : 251646976;
  let relHeightCounter = baseRelHeight;

  // ── 7. Build new relationships + media entries for new PDF pages ──
  const newMediaEntries = []; // [wsIdx][pageIdx] = { relId, imgId, fileName, cx, cy }
  const newRelsToAdd = [];

  for (let ws = 0; ws < 10; ws++) {
    const pages = allPages[ws];
    const wsEntries = [];
    for (let pg = 0; pg < pages.length; pg++) {
      const buf = pages[pg];
      const fileName = `ws${ws + 1}_p${pg + 1}_new.png`;
      const relId = `rId${nextRId++}`;
      const imgId = nextImgId++;
      relHeightCounter += 1024;
      zip.file(`word/media/${fileName}`, buf);
      wsEntries.push({ relId, imgId, fileName, cx: A4_W, cy: A4_H, relHeight: relHeightCounter });
      newRelsToAdd.push({ relId, fileName });
    }
    newMediaEntries.push(wsEntries);
  }

  // ── 8. Remove old worksheet images from media ──
  for (const [rId, file] of Object.entries(oldRIdToFile)) {
    zip.remove(`word/media/${file}`);
    console.log(`  Removed media: ${file}`);
  }

  // ── 9. Build new document body by replacing each group ──
  const parts = [];
  let cursor = 0;

  for (let wsIdx = 0; wsIdx < 10; wsIdx++) {
    const g = groups[wsIdx];

    // Everything before this group (non-worksheet content)
    if (cursor < g.start) {
      parts.push(chunks.slice(cursor, g.start).join(""));
    }

    // Insert new worksheet pages for this PDF
    const wsPages = newMediaEntries[wsIdx];
    for (let pg = 0; pg < wsPages.length; pg++) {
      const { relId, imgId, fileName, cx, cy, relHeight } = wsPages[pg];
      const name = `ws${wsIdx + 1}_p${pg + 1}`;
      parts.push(anchorParaXml(relId, imgId, name, cx, cy, relHeight));
      if (pg < wsPages.length - 1) {
        parts.push(PAGE_BREAK_XML);
      }
    }

    cursor = g.end + 1;
  }

  // Remaining content after last group
  if (cursor < chunks.length) {
    parts.push(chunks.slice(cursor).join(""));
  }

  const newBody = parts.join("") + sectPr;
  const newDocXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);
  zip.file("word/document.xml", newDocXml);

  // ── 10. Update relationships ──
  // Remove old worksheet rIds; add new ones
  let newRels = relsXml;
  for (const rId of oldRIds) {
    newRels = newRels.replace(new RegExp(`<Relationship Id="${rId}"[^/]*/>`), "");
  }
  newRels = newRels.replace("</Relationships>", "");
  for (const { relId, fileName } of newRelsToAdd) {
    newRels += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
  }
  newRels += "</Relationships>";
  zip.file("word/_rels/document.xml.rels", newRels);

  // Ensure PNG content type exists
  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    zip.file("[Content_Types].xml", ctXml);
  }

  // ── 11. Save output ──
  console.log("\nSaving final5.docx...");
  const outBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final5.docx";
  fs.writeFileSync(outPath, outBuf);
  console.log(`SAVED: ${outPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
