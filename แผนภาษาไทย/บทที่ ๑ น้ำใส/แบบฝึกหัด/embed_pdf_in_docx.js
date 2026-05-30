const { pdf } = require("pdf-to-img");
const JSZip = require("jszip");
const fs = require("fs");

const THAI_NUMS = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

// Read PNG dimensions from buffer (PNG header: bytes 16-23 = width, height as big-endian uint32)
function pngSize(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  return { w, h };
}

// A4 full page dimensions in EMU (1 EMU = 1/914400 inch)
// A4: 210mm x 297mm = 7,559,670 x 10,692,778 EMU
const A4_W = 7559670;
const A4_H = 10692778;

// Floating image that fills the entire A4 page (position 0,0 relative to page)
function imageXml(relId, imgId, imgName, cx, cy) {
  const NS_WP  = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
  const NS_A   = "http://schemas.openxmlformats.org/drawingml/2006/main";
  const NS_PIC = "http://schemas.openxmlformats.org/drawingml/2006/picture";
  const NS_R   = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:anchor xmlns:wp="${NS_WP}" distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251658240" behindDoc="0" locked="1" layoutInCell="1" allowOverlap="0"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="${imgName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_A}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${NS_A}"><a:graphicData uri="${NS_PIC}"><pic:pic xmlns:pic="${NS_PIC}"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="${imgName}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}" xmlns:r="${NS_R}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`;
}

const PAGE_BREAK_XML = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

async function main() {
  // ── 1. Render all 10 PDFs to PNG pages ──
  console.log("Rendering PDF pages to PNG...");
  const allPages = []; // allPages[i] = array of PNG buffers for worksheet i+1

  for (let i = 1; i <= 10; i++) {
    const tn = THAI_NUMS[i];
    const pdfPath = `D:/แผน/แบบฝึกหัด/ใบงานที่_${tn}_บทที่_๑_น้ำใส.pdf`;
    const pages = [];
    const doc = await pdf(pdfPath, { scale: 2 });
    for await (const page of doc) {
      pages.push(Buffer.from(page));
    }
    allPages.push(pages);
    console.log(`  Worksheet ${i} (${tn}): ${pages.length} pages`);
  }

  // ── 2. Load main docx ──
  console.log("\nLoading main docx...");
  const mainBuf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final5.docx");
  const zip = await JSZip.loadAsync(mainBuf);

  // ── 3. Parse existing relationships to find next available rId ──
  const relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;
  let nextImgId = 100; // docPr id (arbitrary, must be unique)

  // ── 4. Add PNG files to media folder + build relationships ──
  const mediaEntries = []; // { relId, imgId, fileName, cx, cy }

  for (let ws = 0; ws < 10; ws++) {
    const pages = allPages[ws];
    const wsPages = [];
    for (let pg = 0; pg < pages.length; pg++) {
      const buf = pages[pg];
      const { w, h } = pngSize(buf);

      // Full A4 page dimensions (image fills entire page via floating anchor)
      const cx = A4_W;
      const cy = A4_H;

      const fileName = `ws${ws + 1}_p${pg + 1}.png`;
      const relId = `rId${nextRId++}`;
      const imgId = nextImgId++;

      zip.file(`word/media/${fileName}`, buf);
      wsPages.push({ relId, imgId, fileName, cx, cy });
    }
    mediaEntries.push(wsPages);
  }

  // ── 5. Update [Content_Types].xml to include PNG ──
  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace("</Types>",
      `<Default Extension="png" ContentType="image/png"/></Types>`);
    zip.file("[Content_Types].xml", ctXml);
  }

  // ── 6. Update relationships file ──
  let newRels = relsXml.replace("</Relationships>", "");
  for (const wsPages of mediaEntries) {
    for (const { relId, fileName } of wsPages) {
      newRels += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
    }
  }
  newRels += "</Relationships>";
  zip.file("word/_rels/document.xml.rels", newRels);

  // ── 7. Split main document body and insert worksheet images ──
  console.log("Inserting images into document...");
  const docXml = await zip.file("word/document.xml").async("string");
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const body = bodyMatch[1];

  // Remove sectPr
  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  // Split into paragraph chunks
  const chunks = bodyClean.split(/(?=<w:p[ >])/);

  // Find plan start positions (same as merge script)
  const planStarts = [1, 65, 114, 175, 237, 289, 341, 394, 450, 498];
  // Auto-detect: verify and shift if needed
  for (let i = 0; i < planStarts.length; i++) {
    const expected = planStarts[i];
    if (expected < chunks.length && !chunks[expected].includes("แผนการจัดการเรียนรู้")) {
      for (let j = expected - 3; j <= expected + 3; j++) {
        if (j >= 0 && j < chunks.length && chunks[j].includes("แผนการจัดการเรียนรู้")) {
          planStarts[i] = j;
          break;
        }
      }
    }
  }

  const planEnds = [...planStarts.slice(1), chunks.length];

  // Build new body
  const parts = [];
  if (planStarts[0] > 0) parts.push(chunks.slice(0, planStarts[0]).join(""));

  for (let i = 0; i < 10; i++) {
    const planChunks = chunks.slice(planStarts[i], planEnds[i]);
    const lastChunk = planChunks[planChunks.length - 1] || "";
    const hasPageBreak = lastChunk.includes('w:type="page"') || lastChunk.includes("w:type='page'");

    if (hasPageBreak) {
      parts.push(planChunks.slice(0, -1).join(""));
      parts.push(lastChunk); // keep page break → starts new page for worksheet
    } else {
      parts.push(planChunks.join(""));
      parts.push(PAGE_BREAK_XML); // add page break before worksheet
    }

    // Insert worksheet pages as images
    const wsPages = mediaEntries[i];
    for (let pg = 0; pg < wsPages.length; pg++) {
      const { relId, imgId, fileName, cx, cy } = wsPages[pg];
      parts.push(imageXml(relId, imgId, `ws${i+1}_p${pg+1}`, cx, cy));
      // Page break between image pages (not after last page of last worksheet)
      if (pg < wsPages.length - 1) {
        parts.push(PAGE_BREAK_XML);
      }
    }

    // Page break after worksheet (before next plan), except after last
    if (i < 9) {
      parts.push(PAGE_BREAK_XML);
    }

    console.log(`  Plan ${i+1} + Worksheet ${i+1} (${wsPages.length} pages)`);
  }

  const newBody = parts.join("") + sectPr;
  const newDocXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);
  zip.file("word/document.xml", newDocXml);

  // ── 8. Save output ──
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final5_new.docx";
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  fs.writeFileSync(outPath, buf);
  console.log(`\nSAVED: ${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
