const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_PDF.docx");
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");

  // Count plan markers
  const plans = (xml.match(/แผนการจัดการเรียนรู้/g) || []).length;
  // Count embedded images
  const images = (xml.match(/wp:inline/g) || []).length;
  // Count media files
  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith("word/media/")).length;
  // Page breaks
  const pb = (xml.match(/w:type="page"/g) || []).length;

  console.log(`แผนการสอน: ${plans}`);
  console.log(`ภาพ (inline images): ${images}`);
  console.log(`ไฟล์ใน media/: ${mediaFiles} PNG`);
  console.log(`Page breaks: ${pb}`);
  console.log(`ขนาดไฟล์: ${(buf.length/1024/1024).toFixed(2)} MB`);
}
main().catch(console.error);
