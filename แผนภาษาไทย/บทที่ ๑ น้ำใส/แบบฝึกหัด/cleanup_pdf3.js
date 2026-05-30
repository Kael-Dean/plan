const JSZip = require("jszip");
const fs = require("fs");

async function main() {
  const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_PDF3.docx");
  const zip = await JSZip.loadAsync(buf);
  let docXml = await zip.file("word/document.xml").async("string");

  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  const sectPrMatch = bodyMatch[1].match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch ? sectPrMatch[0] : "";
  let body = bodyMatch[1].replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");

  // ── 1. Remove logo image paragraphs (rId37) ──
  let chunks = body.split(/(?=<w:p[ >])/);
  const beforeLogo = chunks.length;
  chunks = chunks.filter(c => !c.includes('r:embed="rId37"'));
  console.log(`Removed logo paragraphs: ${beforeLogo - chunks.length}`);
  body = chunks.join("");

  // ── 2. Remove English subject header paragraphs ──
  // Use SPECIFIC strings only — broad terms like วิชาภาษาอังกฤษ also appear in evaluation tables
  chunks = body.split(/(?=<w:p[ >])/);
  const removals = [
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ", // subject group header line
    "อ12101",                               // English subject code (unique to header)
    "เรื่อง My family",                     // English unit title
  ];
  const removed = chunks.filter(c => removals.some(r => c.includes(r))).length;
  chunks = chunks.filter(c => !removals.some(r => c.includes(r)));
  console.log(`Removed header paragraphs: ${removed}`);
  body = chunks.join("");

  // ── 3. Teacher name: นางวีรานุช พิศวงค์ → นางสาวทักษพร การสนธิ์ ──
  // Case A: name in single w:t (single space between first/last name)
  const countA = (body.match(/นางวีรานุช พิศวงค์/g) || []).length;
  body = body.split("นางวีรานุช พิศวงค์").join("นางสาวทักษพร การสนธิ์");
  console.log(`Teacher name (A, single-run): ${countA}`);

  // Case B: name split by proofErr (double space before surname in first run)
  const countB = (body.match(/นางวีรานุช  /g) || []).length;
  body = body.split("นางวีรานุช  ").join("นางสาวทักษพร ");
  console.log(`Teacher name (B, split - first part): ${countB}`);

  // Surname in proofErr run — replace "พิศวงค์" which only appears in this context
  const countSurname = (body.match(/พิศวงค์/g) || []).length;
  body = body.split("พิศวงค์").join("การสนธิ์");
  console.log(`Teacher surname (พิศวงค์→การสนธิ์): ${countSurname}`);

  // ── 4. Clear นางสาววัชรานุช รังแก้ว (keep parentheses field) ──
  // Her name is in its own run — just clear the text
  const countW1 = (body.match(/นางสาววัชรานุช  รังแก้ว/g) || []).length;
  const countW2 = (body.match(/นางสาววัชรานุช รังแก้ว/g) || []).length;
  body = body.split("นางสาววัชรานุช  รังแก้ว").join("");
  body = body.split("นางสาววัชรานุช รังแก้ว").join("");
  console.log(`Cleared วัชรานุช: ${countW1 + countW2}`);

  // ── 5. Clear นางสุดาภรณ์ แก้วดี (split across runs: "สุดา" | proofErr | "ภรณ์" | "  แก้วดี)") ──
  // "(นางสุดา" in a run → change to "("
  const countSuda = (body.match(/\(นางสุดา/g) || []).length;
  body = body.split("(นางสุดา").join("(");
  console.log(`Cleared (นางสุดา: ${countSuda}`);

  // "ภรณ์" in proofErr run (follows the สุดา split) → remove entire proofErr+run block
  const countPhon = (body.match(/ภรณ์<\/w:t><\/w:r><w:proofErr w:type="spellEnd"\/>/g) || []).length;
  body = body.replace(
    /<w:proofErr w:type="spellStart"\/>(<w:r\b[^>]*>(?:[^<]|<(?!\/w:r>))*<w:t[^>]*>)ภรณ์(<\/w:t><\/w:r>)<w:proofErr w:type="spellEnd"\/>/g,
    ""
  );
  console.log(`Cleared ภรณ์ in proofErr: ${countPhon}`);

  // "  แก้วดี)" trailing text → replace with just ")"
  const countKaew = (body.match(/  แก้วดี\)/g) || []).length;
  body = body.split("  แก้วดี)").join(")");
  console.log(`Cleared แก้วดี: ${countKaew}`);

  // ── 6. Change school name: หนองโตง "สุรวิทยาคม" → บ้านหนองเต่า ──
  // First run ends with "หนอง" before the proofErr split → append replacement
  const countSchool = (body.match(/รองผู้อำนวยการโรงเรียนหนอง<\/w:t>/g) || []).length;
  body = body
    .split("รองผู้อำนวยการโรงเรียนหนอง</w:t>")
    .join("รองผู้อำนวยการโรงเรียนบ้านหนองเต่า</w:t>");
  console.log(`Changed school name (first run): ${countSchool}`);

  // Remove "โตง" in proofErr context (school name second part)
  const countTong = (body.match(/โตง[^<]*<\/w:t>[\s\S]*?<\/w:r><w:proofErr w:type="spellEnd"/g) || []).length;
  body = body.replace(
    /<w:proofErr w:type="spellStart"\/>(<w:r\b[^>]*>(?:[^<]|<(?!\/w:r>))*<w:t[^>]*>)โตง([^<]*)(<\/w:t>[^<]*<\/w:r>)<w:proofErr w:type="spellEnd"\/>/g,
    ""
  );
  console.log(`Removed โตง run in school name: ${countTong}`);

  // Clear any remaining "สุรวิทยาคม" (with surrounding quote chars) from w:t elements
  const countSura = (body.match(/สุรวิทยาคม/g) || []).length;
  body = body.replace(/<w:t[^>]*>[^<]*สุรวิทยาคม[^<]*<\/w:t>/g, "<w:t></w:t>");
  console.log(`Cleared สุรวิทยาคม: ${countSura}`);

  // ── 7. Save ──
  const newDocXml = docXml.replace(
    /<w:body>[\s\S]*<\/w:body>/,
    `<w:body>${body}${sectPr}</w:body>`
  );
  zip.file("word/document.xml", newDocXml);

  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_final.docx";
  const outBuf = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  fs.writeFileSync(outPath, outBuf);
  console.log(`\nSAVED: ${outPath} (${(outBuf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
