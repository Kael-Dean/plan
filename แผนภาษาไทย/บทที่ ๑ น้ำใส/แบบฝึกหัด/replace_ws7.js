/**
 * replace_ws7.js
 *
 * Replaces only worksheet 7 images in final5.docx with pages from the new PDF.
 * New PDF has 2 pages; old ws7 had 3 pages — one anchor paragraph will be removed.
 *
 * Output: D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final5.docx (overwritten)
 */

const { pdf } = require("pdf-to-img");
const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");

const DOCX_PATH = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final5.docx";
const PDF_PATH  = "D:/แผน/แบบฝึกหัด/ใบงานที่_๗_บทที่_๑_น้ำใส.pdf";
const WS_INDEX  = 7; // 1-based worksheet number to replace

const A4_W = 7559670;
const A4_H = 10692778;

function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function anchorParaXml(relId, imgId, imgName, cx, cy, relativeHeight) {
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${relativeHeight}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${imgName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${imgName}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

const PAGE_BREAK_XML = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

function isAnchorPara(chunk) {
  return chunk.includes("wp:anchor") && chunk.includes("r:embed=");
}
function isPageBreakPara(chunk) {
  return chunk.includes('w:type="page"') || chunk.includes("w:type='page'");
}

async function main() {
  // 1. Render new PDF to PNG buffers
  console.log("Rendering new worksheet 7 PDF...");
  const newPages = [];
  for await (const page of await pdf(PDF_PATH, { scale: 2 })) {
    newPages.push(Buffer.from(page));
  }
  console.log(`  New PDF has ${newPages.length} pages`);

  // 2. Load docx
  console.log("\nLoading final5.docx...");
  const mainBuf = fs.readFileSync(DOCX_PATH);
  const zip = await JSZip.loadAsync(mainBuf);

  // 3. Parse document.xml
  const docXml = await zip.file("word/document.xml").async("string");
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const body = bodyMatch[1];

  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  const chunks = bodyClean.split(/(?=<w:p[ >])/);
  console.log(`Total paragraph chunks: ${chunks.length}`);

  // 4. Find anchor-image groups (one per worksheet)
  const groups = [];
  let inGroup = false;
  let groupStart = -1;

  for (let i = 0; i < chunks.length; i++) {
    if (isAnchorPara(chunks[i])) {
      if (!inGroup) { inGroup = true; groupStart = i; }
    } else if (inGroup) {
      if (!isPageBreakPara(chunks[i])) {
        groups.push({ start: groupStart, end: i - 1 });
        inGroup = false;
      }
    }
  }
  if (inGroup) groups.push({ start: groupStart, end: chunks.length - 1 });

  console.log(`Found ${groups.length} worksheet groups`);
  if (groups.length < WS_INDEX) {
    console.error(`ERROR: expected at least ${WS_INDEX} groups, found ${groups.length}`);
    process.exit(1);
  }

  const ws7Group = groups[WS_INDEX - 1];
  console.log(`WS7 group: chunks[${ws7Group.start}..${ws7Group.end}]`);

  // 5. Collect old rIds used by ws7
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const ws7OldRIds = new Set();
  for (let i = ws7Group.start; i <= ws7Group.end; i++) {
    const matches = chunks[i].match(/r:embed="([^"]+)"/g) || [];
    matches.forEach(m => ws7OldRIds.add(m.replace(/r:embed="([^"]+)"/, "$1")));
  }
  console.log(`Old WS7 rIds: ${[...ws7OldRIds].join(", ")}`);

  // 6. Find old image file names for ws7 rIds
  const oldTargets = new Set();
  for (const rId of ws7OldRIds) {
    const m = relsXml.match(new RegExp(`Id="${rId}"[^/]*/>[^<]*|Id="${rId}"[^>]*Target="([^"]+)"`));
    if (m && m[1]) oldTargets.add(m[1]);
  }
  // Simpler parse
  const allRels = [...relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)];
  const ridToTarget = {};
  allRels.forEach(m => { ridToTarget[m[1]] = m[2]; });
  const ws7OldFiles = [...ws7OldRIds].map(r => ridToTarget[r]).filter(Boolean);
  console.log(`Old WS7 files: ${ws7OldFiles.join(", ")}`);

  // 7. Determine new rIds and file names
  // Find max existing rId number
  const maxRId = Math.max(...allRels.map(m => {
    const n = parseInt(m[1].replace("rId", ""), 10);
    return isNaN(n) ? 0 : n;
  }));

  // Find max existing drawing/image id in document.xml
  const allImgIds = [...docXml.matchAll(/docPr id="(\d+)"/g)].map(m => parseInt(m[1]));
  const maxImgId = allImgIds.length ? Math.max(...allImgIds) : 0;

  const newRIds = newPages.map((_, i) => `rId${maxRId + 1 + i}`);
  const newFileNames = newPages.map((_, i) => `media/ws7_p${i + 1}_new2.png`);
  const newImgIds = newPages.map((_, i) => maxImgId + 1 + i);
  const baseRelHeight = 251658240;

  // 8. Build replacement anchor paragraphs
  const newAnchorChunks = newPages.map((buf, i) => {
    const { w, h } = pngSize(buf);
    const ratio = h / w;
    const cx = A4_W;
    const cy = Math.round(cx * ratio);
    return anchorParaXml(newRIds[i], newImgIds[i], `ws7_new_p${i + 1}`, cx, cy, baseRelHeight + i * 1024);
  });

  // 9. Rebuild chunks: replace ws7 group with new anchor paragraphs
  const before = chunks.slice(0, ws7Group.start);
  const after = chunks.slice(ws7Group.end + 1);
  const newChunks = [...before, ...newAnchorChunks, ...after];

  const newBody = newChunks.join("") + sectPr;
  const newDocXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);

  // 10. Remove old ws7 image files from zip
  for (const f of ws7OldFiles) {
    zip.remove(`word/${f}`);
    console.log(`Removed: word/${f}`);
  }

  // 11. Add new PNG files
  for (let i = 0; i < newPages.length; i++) {
    zip.file(`word/${newFileNames[i]}`, newPages[i]);
    console.log(`Added: word/${newFileNames[i]}`);
  }

  // 12. Update rels: remove old ws7 rels, add new ones
  let newRelsXml = relsXml;
  for (const rId of ws7OldRIds) {
    newRelsXml = newRelsXml.replace(new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*/>`), "");
  }
  // Add new rels before closing tag
  const newRelEntries = newRIds.map((rId, i) =>
    `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${newFileNames[i]}"/>`
  ).join("");
  newRelsXml = newRelsXml.replace("</Relationships>", newRelEntries + "</Relationships>");

  // 13. Update zip contents
  zip.file("word/document.xml", newDocXml);
  zip.file("word/_rels/document.xml.rels", newRelsXml);

  // 14. Save
  console.log("\nSaving updated docx...");
  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });
  fs.writeFileSync(DOCX_PATH, outBuf);
  console.log(`Saved: ${DOCX_PATH}`);
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });
