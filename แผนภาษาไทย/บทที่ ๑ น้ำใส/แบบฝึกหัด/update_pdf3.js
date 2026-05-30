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

async function renderWorksheet(wsNum) {
  const pdfPath = `D:/แผน/แบบฝึกหัด/tmp_ws${wsNum}_upd.pdf`;
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
  // ── 1. Render WS5–10 from updated HTML (all have คัดลายมือ with 3 lines now) ──
  console.log("Rendering worksheets 5–10...");
  const newPages = {}; // wsNum → [Buffer]
  for (const n of [5, 6, 7, 8, 9, 10]) newPages[n] = await renderWorksheet(n);

  // ── 2. Load PDF3.docx ──
  console.log("\nLoading PDF3.docx...");
  const pdf3Path = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_PDF3.docx";
  const zip = await JSZip.loadAsync(fs.readFileSync(pdf3Path));

  // ── 3. Parse existing relationships ──
  let relsXml = await zip.file("word/_rels/document.xml.rels").async("string");
  const existingIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;
  let nextImgId = 500;

  // ── 4. For each WS5–10: replace existing PNG files, handle page count changes ──
  // PDF3.docx stores ws images as ws{n}_p{pg}.png in word/media/
  // Relationships file maps rIdN → media/ws{n}_p{pg}.png
  //
  // Strategy:
  //   a) For existing pages: overwrite the PNG bytes in the zip
  //   b) For new extra pages (if render has MORE pages): add new media + rel + XML paragraph
  //   c) For removed pages (if render has FEWER): remove media + rel + XML paragraph
  //
  // Because changing page counts requires XML surgery, we take a simpler approach:
  //   Rebuild the WS section by finding image paragraphs referencing ws{n}_* and replacing them.

  let docXml = await zip.file("word/document.xml").async("string");
  let newRels = relsXml;

  for (const wsNum of [5, 6, 7, 8, 9, 10]) {
    const pages = newPages[wsNum];
    console.log(`\n  Processing WS${wsNum} (${pages.length} new page(s))...`);

    // Find all existing rIds for this worksheet's images
    const wsRelPattern = new RegExp(`Id="(rId\\d+)"[^>]*Target="media/ws${wsNum}_p\\d+\\.png"`, "g");
    const existingWsRels = [...relsXml.matchAll(wsRelPattern)].map(m => m[1]);
    console.log(`    Existing rIds for ws${wsNum}: ${existingWsRels.join(", ")} (${existingWsRels.length} pages)`);

    const oldPageCount = existingWsRels.length;
    const newPageCount = pages.length;

    if (newPageCount === oldPageCount) {
      // Simple case: same number of pages — just overwrite PNG bytes
      for (let pg = 0; pg < pages.length; pg++) {
        const fileName = `word/media/ws${wsNum}_p${pg + 1}.png`;
        console.log(`    Overwriting ${fileName}`);
        zip.file(fileName, pages[pg]);
      }
    } else {
      console.log(`    Page count changed: ${oldPageCount} → ${newPageCount}. Rebuilding WS${wsNum} section.`);

      // Step A: Determine which rIds are currently used for this worksheet
      const oldRIds = existingWsRels; // ordered by page number

      // Step B: If new page count < old, remove excess rIds from XML + rels
      // If new page count > old, add new rIds

      // Replace existing PNG bytes
      for (let pg = 0; pg < Math.min(oldPageCount, newPageCount); pg++) {
        zip.file(`word/media/ws${wsNum}_p${pg + 1}.png`, pages[pg]);
      }

      // Remove excess old PNG files if page count shrank
      for (let pg = newPageCount; pg < oldPageCount; pg++) {
        zip.remove(`word/media/ws${wsNum}_p${pg + 1}.png`);
      }

      // Add new PNG files if page count grew
      const addedRIds = [];
      for (let pg = oldPageCount; pg < newPageCount; pg++) {
        const fileName = `ws${wsNum}_p${pg + 1}.png`;
        const relId = `rId${nextRId++}`;
        zip.file(`word/media/${fileName}`, pages[pg]);
        newRels = newRels.replace("</Relationships>",
          `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/></Relationships>`);
        addedRIds.push(relId);
        console.log(`    Added new media: ${fileName} as ${relId}`);
      }

      // Rebuild the paragraph sequence in document.xml for this worksheet
      // Find the anchor paragraph for ws{n}_p1 and rebuild from there
      const firstRId = oldRIds[0];
      if (!firstRId) { console.warn(`    No existing rId for ws${wsNum}_p1 — skipping XML surgery`); continue; }

      // Build new image paragraph sequence
      const allRIds = [
        ...oldRIds.slice(0, Math.min(oldPageCount, newPageCount)),
        ...addedRIds,
      ];

      const newImgParts = [];
      for (let pg = 0; pg < newPageCount; pg++) {
        const rId = allRIds[pg] || `rId${nextRId++}`;
        const imgId = nextImgId++;
        newImgParts.push(imageXml(rId, imgId, `ws${wsNum}_p${pg + 1}`, A4_W, A4_H));
        if (pg < newPageCount - 1) newImgParts.push(PAGE_BREAK_XML);
      }

      // Replace the old image paragraph block
      // Build regex matching all consecutive img paragraphs for ws{wsNum}
      // Each img paragraph contains r:embed="${rId}" where rId is one of oldRIds
      const escapeRx = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const imgParaPattern = oldRIds
        .map(rid => `<w:p[\\s\\S]*?r:embed="${escapeRx(rid)}"[\\s\\S]*?<\\/w:p>`)
        .join(`(?:<w:p>[\\s\\S]*?<\\/w:p>)?`); // optional page break between

      // Use a more reliable approach: find each old image paragraph and replace the block
      // Find the first ws{n}_p1 anchor, then locate its enclosing <w:p>...</w:p>
      const firstAnchorMarker = `r:embed="${firstRId}"`;
      const anchorIdx = docXml.indexOf(firstAnchorMarker);
      if (anchorIdx < 0) { console.warn(`    Cannot find anchor for ${firstRId} — skipping`); continue; }

      // Walk back to find <w:p
      let paraStart = docXml.lastIndexOf("<w:p", anchorIdx);
      // Walk forward to find all consecutive ws{n} image paragraphs
      // (they are separated by PAGE_BREAK paragraphs)
      // Collect all existing rIds in document order
      const oldRIdSet = new Set(oldRIds);
      let searchPos = paraStart;
      let blockEnd = paraStart;

      for (let k = 0; k < oldPageCount * 2; k++) {
        // Find next <w:p> start after blockEnd
        const nextP = docXml.indexOf("<w:p", blockEnd + 4);
        if (nextP < 0) break;
        const nextPEnd = docXml.indexOf("</w:p>", nextP) + 6;
        const seg = docXml.substring(nextP, nextPEnd);
        // Check if this paragraph is part of our block (image or page break)
        const hasWsImg = [...oldRIdSet].some(rid => seg.includes(`r:embed="${rid}"`));
        const isPB = seg.includes('w:type="page"') || seg.includes("w:type='page'");
        if (hasWsImg || isPB) {
          blockEnd = nextPEnd;
        } else {
          break;
        }
      }

      // Now find the true end of the first paragraph
      const firstParaEnd = docXml.indexOf("</w:p>", paraStart) + 6;
      // The full block is from paraStart to blockEnd (or firstParaEnd if no further matching)
      const blockEndFinal = blockEnd > firstParaEnd ? blockEnd : firstParaEnd;

      // Remove excess rIds from relationships (pages that no longer exist)
      for (let pg = newPageCount; pg < oldPageCount; pg++) {
        const rid = oldRIds[pg];
        const relRx = new RegExp(`<Relationship[^>]*Id="${escapeRx(rid)}"[^>]*/>`);
        newRels = newRels.replace(relRx, "");
        console.log(`    Removed relationship ${rid}`);
      }

      docXml = docXml.substring(0, paraStart) + newImgParts.join("") + docXml.substring(blockEndFinal);
      console.log(`    Rebuilt ws${wsNum} image block`);
    }
  }

  zip.file("word/_rels/document.xml.rels", newRels);
  zip.file("word/document.xml", docXml);

  // ── 5. Content_Types: ensure PNG registered ──
  let ctXml = await zip.file("[Content_Types].xml").async("string");
  if (!ctXml.includes('Extension="png"')) {
    ctXml = ctXml.replace("</Types>", `<Default Extension="png" ContentType="image/png"/></Types>`);
    zip.file("[Content_Types].xml", ctXml);
  }

  // ── 6. Save ──
  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(pdf3Path, outBuf);
  console.log(`\nSAVED: ${pdf3Path} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
