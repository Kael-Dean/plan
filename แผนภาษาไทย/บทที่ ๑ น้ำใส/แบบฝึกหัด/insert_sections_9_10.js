const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  // ── 1. Load source (English) docx ──
  console.log("Loading source docx...");
  const srcBuf = fs.readFileSync("D:/แผน/แผนภาษาอังกฤษป.2หน่วย2My family(21) (1).docx");
  const srcZip = await JSZip.loadAsync(srcBuf);
  const srcXml = await srcZip.file("word/document.xml").async("string");
  const srcChunks = srcXml.split(/(?=<w:p[ >])/);
  console.log(`Source: ${srcChunks.length} chunks`);

  // Parse source relationships: rId → { type, target }
  const srcRelsXml = await srcZip.file("word/_rels/document.xml.rels").async("string");
  const srcRelMap = {};
  for (const m of srcRelsXml.matchAll(/Id="(rId\d+)"[^>]*Type="([^"]*)"[^>]*Target="([^"]*)"/g)) {
    srcRelMap[m[1]] = { type: m[2], target: m[3] };
  }

  // ── 2. Find plan boundaries and sec9 positions in source ──
  const planStarts = [];
  const sec9Starts = [];

  for (let i = 0; i < srcChunks.length; i++) {
    const t = srcChunks[i].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (t.startsWith("แผนการจัดการเรียนรู้ที่") && /\d/.test(t)) {
      planStarts.push(i);
    }
    if (/^9\s*\./.test(t) && t.includes("วัดและประเมิน")) {
      sec9Starts.push(i);
    }
  }

  console.log(`Plans found: ${planStarts.length} at [${planStarts.slice(0, 12).join(", ")}...]`);
  console.log(`Sec9 found:  ${sec9Starts.length} at [${sec9Starts.slice(0, 12).join(", ")}...]`);

  if (sec9Starts.length < 10) {
    throw new Error(`Need 10 sec9 markers, got ${sec9Starts.length}`);
  }

  // ── 3. Extract sec9+10+บันทึก for each of 10 plans ──
  const extractedSections = [];
  for (let i = 0; i < 10; i++) {
    const start = sec9Starts[i];
    const nextPlanIdx = planStarts.find(p => p > start);
    const end = nextPlanIdx !== undefined ? nextPlanIdx : srcChunks.length;

    let extracted = srcChunks.slice(start, end);
    while (extracted.length > 0) {
      const last = extracted[extracted.length - 1];
      const hasPageBreak = last.includes('w:type="page"') || last.includes("w:type='page'");
      const isEmpty = last.replace(/<[^>]+>/g, "").trim() === "";
      if (hasPageBreak || isEmpty) extracted.pop();
      else break;
    }

    extractedSections.push(extracted.join(""));
    console.log(`  Plan ${i + 1}: sec9@[${start}], end@[${end - 1}], ${extracted.length} chunks`);
  }

  // ── 4. Load target docx ──
  console.log("\nLoading target docx...");
  const tgtBuf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_PDF2.docx");
  const tgtZip = await JSZip.loadAsync(tgtBuf);
  const tgtDocXml = await tgtZip.file("word/document.xml").async("string");

  // Parse target relationships and find next available rId
  let tgtRelsXml = await tgtZip.file("word/_rels/document.xml.rels").async("string");
  const existingIds = [...tgtRelsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  let nextRId = Math.max(0, ...existingIds) + 1;

  // ── 5. Collect all rId references from extracted sections & remap ──
  console.log("\nRemapping image relationships...");
  const allExtracted = extractedSections.join("");
  const usedSrcRIds = [...new Set([...allExtracted.matchAll(/r:embed="(rId\d+)"/g)].map(m => m[1]))];
  console.log(`  Unique rIds in extracted sections: ${usedSrcRIds.join(", ")}`);

  const rIdRemap = {}; // srcRId → newTgtRId
  const newRelEntries = [];
  const mediaToCopy = [];

  for (const srcRId of usedSrcRIds) {
    const rel = srcRelMap[srcRId];
    if (!rel) {
      console.warn(`  ⚠ Source ${srcRId} not found in relationships — skipping`);
      continue;
    }
    const newRId = `rId${nextRId++}`;
    rIdRemap[srcRId] = newRId;

    if (rel.target.startsWith("media/")) {
      const ext = rel.target.split(".").pop();
      const newMediaName = `src_${srcRId}.${ext}`;
      newRelEntries.push(
        `<Relationship Id="${newRId}" Type="${rel.type}" Target="media/${newMediaName}"/>`
      );
      mediaToCopy.push({ srcPath: `word/${rel.target}`, tgtPath: `word/media/${newMediaName}` });
      console.log(`  ${srcRId} → ${newRId}  (${rel.target} → ${newMediaName})`);
    } else {
      newRelEntries.push(
        `<Relationship Id="${newRId}" Type="${rel.type}" Target="${rel.target}"/>`
      );
      console.log(`  ${srcRId} → ${newRId}  (${rel.target})`);
    }
  }

  // Copy media files from source to target
  for (const { srcPath, tgtPath } of mediaToCopy) {
    const buf = await srcZip.file(srcPath).async("nodebuffer");
    tgtZip.file(tgtPath, buf);
  }
  console.log(`  Copied ${mediaToCopy.length} media files`);

  // Append new relationships to target rels file
  tgtRelsXml = tgtRelsXml.replace("</Relationships>", newRelEntries.join("") + "</Relationships>");
  tgtZip.file("word/_rels/document.xml.rels", tgtRelsXml);

  // Ensure any new image extensions are in [Content_Types].xml
  let ctXml = await tgtZip.file("[Content_Types].xml").async("string");
  const newExts = [...new Set(mediaToCopy.map(m => m.tgtPath.split(".").pop().toLowerCase()))];
  for (const ext of newExts) {
    const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", wmf: "image/x-wmf", emf: "image/x-emf" };
    const mime = mimeMap[ext] || `image/${ext}`;
    if (!ctXml.includes(`Extension="${ext}"`)) {
      ctXml = ctXml.replace("</Types>", `<Default Extension="${ext}" ContentType="${mime}"/></Types>`);
      console.log(`  Added Content-Type for .${ext}`);
    }
  }
  tgtZip.file("[Content_Types].xml", ctXml);

  // Remap rIds in extracted sections
  for (let i = 0; i < extractedSections.length; i++) {
    let xml = extractedSections[i];
    for (const [srcRId, newRId] of Object.entries(rIdRemap)) {
      xml = xml.split(`r:embed="${srcRId}"`).join(`r:embed="${newRId}"`);
    }
    extractedSections[i] = xml;
  }

  // ── 6. Parse target body ──
  const bodyMatch = tgtDocXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const body = bodyMatch[1];
  const sectPrMatch = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  const bodyClean = body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  const tgtChunks = bodyClean.split(/(?=<w:p[ >])/);
  console.log(`\nTarget: ${tgtChunks.length} chunks`);

  // ── 7. Find first-page image anchor for each worksheet ──
  const insertionMap = new Map(); // chunkIdx → wsNum

  for (let i = 0; i < tgtChunks.length; i++) {
    if (tgtChunks[i].includes("<wp:anchor") && /name="ws\d+_p1"/.test(tgtChunks[i])) {
      const m = tgtChunks[i].match(/name="ws(\d+)_p1"/);
      if (m) {
        const wsNum = parseInt(m[1]);
        if (wsNum >= 1 && wsNum <= 10) {
          const pbIdx =
            i > 0 &&
            (tgtChunks[i - 1].includes('w:type="page"') ||
              tgtChunks[i - 1].includes("w:type='page'"))
              ? i - 1
              : i;
          insertionMap.set(pbIdx, wsNum);
          console.log(`  ws${wsNum}: image @[${i}], insert before [${pbIdx}]`);
        }
      }
    }
  }

  if (insertionMap.size !== 10) {
    throw new Error(`Expected 10 insertion points, found ${insertionMap.size}`);
  }

  // ── 8. Build new document body ──
  console.log("\nBuilding new body...");
  const parts = [];
  for (let i = 0; i < tgtChunks.length; i++) {
    if (insertionMap.has(i)) {
      const wsNum = insertionMap.get(i);
      parts.push(extractedSections[wsNum - 1]);
    }
    parts.push(tgtChunks[i]);
  }

  const newBody = parts.join("") + sectPr;
  const newDocXml = tgtDocXml.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    `<w:body>${newBody}</w:body>`
  );
  tgtZip.file("word/document.xml", newDocXml);

  // ── 9. Save ──
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_PDF3.docx";
  const buf = await tgtZip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outPath, buf);
  console.log(`\nSAVED: ${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
