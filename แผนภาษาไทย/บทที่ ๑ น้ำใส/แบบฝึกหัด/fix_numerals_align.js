const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final.docx");
  const zip = await JSZip.loadAsync(buf);
  let docXml = await zip.file("word/document.xml").async("string");

  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const sectPrMatch = bodyMatch[1].match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  let body = bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  let chunks = body.split(/(?=<w:p[ >])/);

  // ── 1. Change section numbers 9 → ๙ and 10 → ๑๐ ──
  let count9 = 0, count10 = 0;
  chunks = chunks.map(chunk => {
    const text = chunk.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    if (/^9[\s.]/.test(text) && text.includes("วัดและประเมิน")) {
      chunk = chunk.replace("<w:t>9</w:t>", "<w:t>๙</w:t>");
      count9++;
    }

    if (/^10[\s.]/.test(text) && text.includes("กิจกรรม")) {
      // "10" is split as <w:t>1</w:t> + <w:t>0</w:t> across two runs
      chunk = chunk.replace("<w:t>1</w:t>", "<w:t>๑๐</w:t>");
      chunk = chunk.replace("<w:t>0</w:t>", "<w:t></w:t>");
      count10++;
    }

    return chunk;
  });
  console.log(`Section 9 → ๙: ${count9}`);
  console.log(`Section 10 → ๑๐: ${count10}`);

  // ── 2. Center teacher name paragraphs ──
  let countCenter = 0;
  chunks = chunks.map(chunk => {
    if (!chunk.includes("นางสาวทักษพร")) return chunk;

    // Remove left indent that conflicts with centering
    chunk = chunk.replace(/<w:ind[^>]*\/>/g, "");

    // Add <w:jc w:val="center"/> after the <w:spacing .../> element inside <w:pPr>
    chunk = chunk.replace(
      /(<w:spacing[^>]*lineRule="auto"\/>)/,
      '$1<w:jc w:val="center"/>'
    );

    // Fallback: if no <w:spacing> was present, insert <w:jc> before </w:pPr>
    if (!chunk.includes('<w:jc w:val="center"/>')) {
      chunk = chunk.replace("</w:pPr>", '<w:jc w:val="center"/></w:pPr>');
    }

    countCenter++;
    return chunk;
  });
  console.log(`Teacher name paragraphs centered: ${countCenter}`);

  // ── 3. Fix right () alignment above รองผู้อำนวยการโรงเรียนบ้านหนองเต่า ──
  // Structure: right "(" is in its own <w:t> with 7 leading spaces → needs 27
  // Pattern: after 3 <w:tab/> elements, <w:t xml:space="preserve">       (</w:t>
  let countParen = 0;
  chunks = chunks.map((chunk, i) => {
    // Check next 3 chunks to find the title paragraph (may have empty paragraphs between)
    let titleFound = false;
    for (let j = 1; j <= 3 && i + j < chunks.length; j++) {
      const nt = chunks[i + j].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (nt.includes("หัวหน้ากลุ่มสาระ") && nt.includes("รองผู้อำนวยการ")) { titleFound = true; break; }
    }
    if (!titleFound) return chunk;

    // The right "(" run has 7 leading spaces; replace with 27 for alignment
    const before = '<w:t xml:space="preserve">       (</w:t>';
    const after  = '<w:t xml:space="preserve">                           (</w:t>';
    if (chunk.includes(before)) {
      chunk = chunk.split(before).join(after);
      countParen++;
    }
    return chunk;
  });
  console.log(`Right () alignment fixed: ${countParen}`);

  body = chunks.join("");

  // ── 3. Save ──
  const newDocXml = docXml.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    () => `<w:body>${body}${sectPr}</w:body>`
  );
  zip.file("word/document.xml", newDocXml);

  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final3.docx";
  fs.writeFileSync(outPath, outBuf);
  console.log(`\nSAVED: ${outPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
