const JSZip = require("jszip");
const fs = require("fs");
async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส.docx"));
  const xml = await zip.file("word/document.xml").async("string");
  const sz = xml.match(/<w:pgSz[^/]*/);
  const mar = xml.match(/<w:pgMar[^/]*/);
  console.log("Page size:", sz ? sz[0] : "not found");
  console.log("Margins  :", mar ? mar[0] : "not found");
}
main().catch(console.error);
