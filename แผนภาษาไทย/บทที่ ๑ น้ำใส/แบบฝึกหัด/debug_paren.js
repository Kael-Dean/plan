const JSZip = require("jszip");
const fs = require("fs");

(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final.docx"));
  const xml = await zip.file("word/document.xml").async("string");

  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  let body = bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");
  const chunks = body.split(/(?=<w:p[ >])/);

  console.log(`Total chunks: ${chunks.length}`);

  // Find chunks containing ()
  for (let i = 0; i < chunks.length; i++) {
    const t = chunks[i].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!t.includes("()")) continue;

    // Print this chunk and next 3
    console.log(`\n── chunk[${i}] text: "${t.substring(0, 120)}"`);
    for (let j = 1; j <= 3; j++) {
      if (i + j < chunks.length) {
        const nt = chunks[i + j].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        console.log(`   chunk[${i+j}] text: "${nt.substring(0, 120)}"`);
      }
    }

    // Print raw XML of this chunk (truncated)
    console.log(`   raw (first 400 chars): ${chunks[i].substring(0, 400)}`);
  }
})().catch(console.error);
