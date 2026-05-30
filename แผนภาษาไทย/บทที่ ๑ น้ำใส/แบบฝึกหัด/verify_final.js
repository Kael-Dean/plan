const JSZip = require("jszip");
const fs = require("fs");
(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final.docx"));
  const xml = await zip.file("word/document.xml").async("string");
  const checks = [
    ["นางวีรานุช", "old teacher (should be 0)"],
    ["พิศวงค์", "old surname (should be 0)"],
    ["นางสาวทักษพร", "new teacher (should be 20)"],
    ["การสนธิ์", "new surname (should be 20)"],
    ["วัชรานุช", "name1 (should be 0)"],
    ["แก้วดี", "name3 (should be 0)"],
    ["สุรวิทยาคม", "old school abbr (should be 0)"],
    ["บ้านหนองเต่า", "new school (should be 10)"],
    ["rId37", "logo (should be 0)"],
    ["กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ", "subject header (should be 0)"],
    ["วิชาภาษาอังกฤษ", "english subject (should be 0)"],
    ["My family", "english title (should be 0)"],
  ];
  checks.forEach(([kw, label]) =>
    console.log(`${label}: ${(xml.match(new RegExp(kw, "g")) || []).length}`)
  );

  // Also show context around new teacher name
  const idx = xml.indexOf("นางสาวทักษพร");
  if (idx >= 0) console.log("\nNew teacher context:", xml.substring(idx - 20, idx + 40).replace(/<[^>]+>/g, ""));
})().catch(console.error);
