const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_พร้อมแบบฝึกหัด.docx");
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");

  // Count plan markers
  const planMarkers = [...xml.matchAll(/แผนการจัดการเรียนรู้ที่[^<]*/g)].map(m => m[0]);
  console.log(`Plan markers found: ${planMarkers.length}`);
  planMarkers.forEach((m, i) => console.log(`  ${i+1}. ${m.substring(0, 40)}`));

  // Count worksheet markers
  const wsMarkers = [...xml.matchAll(/ใบงานที่[^<]{1,20}บทที่[^<]*/g)].map(m => m[0]);
  console.log(`\nWorksheet markers found: ${wsMarkers.length}`);
  wsMarkers.forEach((m, i) => console.log(`  ${i+1}. ${m.substring(0, 40)}`));

  // Count page breaks
  const pbCount = (xml.match(/w:type="page"/g) || []).length;
  console.log(`\nPage breaks: ${pbCount}`);

  // Check document length
  console.log(`\nDocument XML length: ${(xml.length/1024).toFixed(1)} KB`);
}

main().catch(console.error);
