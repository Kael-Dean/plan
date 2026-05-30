const { execSync } = require("child_process");
const { pdf } = require("pdf-to-img");
const JSZip = require("jszip");
const fs = require("fs");

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const A4_W = 7559670;
const A4_H = 10692778;

function imageXml(relId, imgId, imgName, cx, cy) {
  const NS_WP  = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const NS_A   = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  const NS_R   = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${imgName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}"><pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${imgName}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="${NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

const PAGE_BREAK_XML = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

function extractText(chunk) {
  return [...chunk.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join("");
}

function findWSBounds(chunks, wsThaiNum) {
  const titleText = `ใบงานที่ ${wsThaiNum}`;
  let titleIdx = -1;
  for (let i = 0; i < chunks.length; i++) {
    if (extractText(chunks[i]).includes(titleText)) { titleIdx = i; break; }
  }
  if (titleIdx < 0) return null;

  // Scan back to find the preceding page break — WS section starts after it
  let startIdx = titleIdx;
  for (let i = titleIdx - 1; i >= 0; i--) {
    if (chunks[i].includes('w:type="page"') || chunks[i].includes("w:type='page'")) {
      startIdx = i + 1;
      break;
    }
  }

  // Scan forward to find "คะแนนเต็ม" footer
  let endIdx = -1;
  for (let i = titleIdx; i < chunks.length; i++) {
    if (extractText(chunks[i]).includes("คะแนนเต็ม")) { endIdx = i; break; }
  }

  return startIdx >= 0 && endIdx >= 0 ? { startIdx, endIdx } : null;
}

async function renderWorksheet(wsNum) {
  const htmlPath = `D:/แผน/แบบฝึกหัด/worksheet_${wsNum}.html`;
  const pdfPath = `D:/แผน/แบบฝึกหัด/tmp_ws${wsNum}_fix.pdf`;

  console.log(`  WS${wsNum}: HTML → PDF via Edge...`);
  execSync(
    `"${EDGE}" --headless --disable-gpu --print-to-pdf="${pdfPath}" --no-pdf-header-footer "file:///D:/แผน/แบบฝึกหัด/worksheet_${wsNum}.html"`,
    { timeout: 30000 }
  );

  console.log(`  WS${wsNum}: PDF → PNG pages...`);
  const pages = [];
  const doc = await pdf(pdfPath, { scale: 2 });
  for await (const page of doc) pages.push(Buffer.from(page));

  try { fs.unlinkSync(pdfPath); } catch (_) {}
  console.log(`  WS${wsNum}: ${pages.length} page(s)`);
  return pages;
}

async function main() {
  // ── 1. Render WS4, WS5, WS7 from fixed HTML ──
  console.log("Rendering worksheets 4, 5, 7...");
  const allPages = {};
  for (const n of [4, 5, 7]) allPages[n] = await renderWorksheet(n);

  // ── 2. Load base docx (lesson plans + all text worksheets) ──
  console.log("\nLoading base docx...");
  const base = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_พร้อมแบบฝึกหัด.docx";
  const zip = await JSZip.loadAsync(fs.readFileSync(base));

  // ── 3. Parse relationships → find next available rId ──
  let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;
  let nextImgId = 200;

  // ── 4. Add PNG media files + build new relationships ──
  const entries = {}; // wsNum → [{relId, imgId}]
  let newRels = relsXml.replace("</Relationships>", "");

  for (const [wsNum, pages] of Object.entries(allPages)) {
    entries[wsNum] = [];
    for (let pg = 0; pg < pages.length; pg++) {
      const fileName = `ws${wsNum}_fix_p${pg + 1}.png`;
      const relId = `rId${nextRId++}`;
      const imgId = nextImgId++;
      zip.file(`word/media/${fileName}`, pages[pg]);
      newRels += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
      entries[wsNum].push({ relId, imgId });
    }
  }
  newRels += "</Relationships>";
  zip.file("word/_rels/document.xml.rels", newRels);

  // ── 5. Content_Types: ensure PNG is registered ──
  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    zip.file("[Content_Types].xml", ctXml);
  }

  // ── 6. Replace WS4, WS5, WS7 text sections with images ──
  console.log("\nReplacing worksheet sections in document.xml...");
  const docXml = await zip.file("word/document.xml").async("string");
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const sectPrMatch = bodyMatch[1].match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  let chunks = bodyClean.split(/(?=<w:p[ >])/);
  console.log(`  Total chunks: ${chunks.length}`);

  // Process in reverse order so indices don't shift after splice
  const thaiMap = { 4: "๔", 5: "๕", 7: "๗" };
  for (const wsNum of [7, 5, 4]) {
    const bounds = findWSBounds(chunks, thaiMap[wsNum]);
    if (!bounds) { console.warn(`  WS${wsNum}: bounds NOT FOUND — skipping`); continue; }
    console.log(`  WS${wsNum}: replacing chunks ${bounds.startIdx}–${bounds.endIdx}`);

    const imgParts = [];
    for (let pg = 0; pg < entries[wsNum].length; pg++) {
      const { relId, imgId } = entries[wsNum][pg];
      imgParts.push(imageXml(relId, imgId, `ws${wsNum}_fix_p${pg + 1}`, A4_W, A4_H));
      if (pg < entries[wsNum].length - 1) imgParts.push(PAGE_BREAK_XML);
    }

    // Splice: remove text WS section, insert image XML as single chunk
    chunks.splice(bounds.startIdx, bounds.endIdx - bounds.startIdx + 1, imgParts.join(""));
  }

  const newBody = chunks.join("") + sectPr;
  const newDocXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);
  zip.file("word/document.xml", newDocXml);

  // ── 7. Save ──
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final3_FIXED.docx";
  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outPath, outBuf);
  console.log(`\nSAVED: ${outPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
