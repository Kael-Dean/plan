const JSZip = require("jszip");
const fs = require("fs");

(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final.docx"));
  const xml = await zip.file("word/document.xml").async("string");

  const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  let body = bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");
  const chunks = body.split(/(?=<w:p[ >])/);

  // Print full XML of chunk 172
  const c = chunks[172];
  console.log("=== FULL chunk[172] XML ===");
  console.log(c);
  console.log("\n=== All <w:t> content ===");
  const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = tRegex.exec(c)) !== null) {
    console.log(`  <w:t>: "${m[1]}"`);
  }

  // Test the paren regex
  const tParenRegex = /<w:t[^>]*>[^<]*\(\)[^<]*<\/w:t>/g;
  const allTParens = [];
  let m2;
  while ((m2 = tParenRegex.exec(c)) !== null) {
    allTParens.push({ match: m2[0] });
  }
  console.log(`\n() matches found: ${allTParens.length}`);
  allTParens.forEach((x, i) => console.log(`  [${i}]: ${x.match}`));
})().catch(console.error);
