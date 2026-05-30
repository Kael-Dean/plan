const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_พร้อมแบบฝึกหัด.docx");
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("word/document.xml").async("string");

  // Extract all text content (remove XML tags)
  const textContent = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // Check for worksheet title text
  const checks = [
    "ใบงานที่",
    "รู้จักคำนำเรื่อง",
    "เรียนรู้คำศัพท์เพิ่มเติม",
    "อ่านเรื่องและตอบคำถาม",
    "วิเคราะห์ตัวละคร",
    "คำเดี่ยวและกลุ่มคำ",
    "ส่วนประกอบของคำ",
    "ความหมายของคำ",
    "อักษรสามหมู่",
    "อ่านคล่องร้องเล่น",
    "คำคล้องจอง",
    "จุดประสงค์",
    "คะแนนเต็ม",
    "กุ๊กไก่",
    "เย็น เย็น",
  ];

  console.log("Content verification:");
  checks.forEach(term => {
    const count = (textContent.match(new RegExp(term, "g")) || []).length;
    const status = count > 0 ? "✓" : "✗";
    console.log(`  ${status} "${term}": ${count} occurrences`);
  });

  // Count how many times "ชั้น ป.๒/" appears (once per worksheet header)
  const headerCount = (textContent.match(/ชั้น ป\.๒\//g) || []).length;
  console.log(`\n  ✓ Worksheet headers (ชั้น ป.๒/): ${headerCount}`);

  // Find page break positions relative to content
  const pageBreakPositions = [];
  let searchPos = 0;
  while (true) {
    const pos = xml.indexOf('w:type="page"', searchPos);
    if (pos === -1) break;
    pageBreakPositions.push(pos);
    searchPos = pos + 1;
  }
  console.log(`\n  Page breaks: ${pageBreakPositions.length} (expected 19)`);
}

main().catch(console.error);
