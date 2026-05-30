import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import JSZip from "../../บทที่ ๑ น้ำใส/แบบฝึกหัด/node_modules/jszip/dist/jszip.min.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REF_DOCX = join(
  __dirname,
  "..",
  "..",
  "บทที่ ๑ น้ำใส",
  "หน่วยการเรียนรู้ที่๑_น้ำใส_final5.docx",
);
const OUT_JSON = join(__dirname, "ref_data.json");
const OUT_XML = join(__dirname, "ref_document.xml");

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getInnerText(xmlChunk) {
  const tRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  const parts = [];
  let m;
  while ((m = tRe.exec(xmlChunk)) !== null) parts.push(decodeXml(m[1]));
  return parts.join("");
}

// SAX-style walker to find TOP-LEVEL <w:p> and <w:tbl> children of <w:body>.
// Track nesting depth so we don't pick up <w:p> inside <w:tc> inside <w:tbl>.
function walkTopBlocks(body) {
  const blocks = [];
  const tagOpenRe = /<\/?([a-zA-Z][a-zA-Z0-9_:]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let currentBlockStart = -1;
  let currentBlockTag = null;
  let m;
  while ((m = tagOpenRe.exec(body)) !== null) {
    const full = m[0];
    const isClose = full.startsWith("</");
    const selfClose = m[2] === "/";
    const tag = m[1];

    if (isClose) {
      depth--;
      if (depth === 0 && tag === currentBlockTag) {
        const xmlChunk = body.slice(currentBlockStart, m.index + full.length);
        blocks.push({ tag, xml: xmlChunk, text: getInnerText(xmlChunk) });
        currentBlockStart = -1;
        currentBlockTag = null;
      }
    } else if (selfClose) {
      // self-closing tag doesn't change depth
    } else {
      if (depth === 0 && (tag === "w:p" || tag === "w:tbl" || tag === "w:sectPr")) {
        currentBlockStart = m.index;
        currentBlockTag = tag;
      }
      depth++;
    }
  }
  return blocks;
}

async function extract() {
  const buf = readFileSync(REF_DOCX);
  const zip = await JSZip.loadAsync(buf);

  const docXmlFile = zip.file("word/document.xml");
  const xml = await docXmlFile.async("string");
  writeFileSync(OUT_XML, xml, "utf8");
  console.log(`document.xml size: ${xml.length} chars`);

  const bodyMatch = xml.match(/<w:body\b[^>]*>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) throw new Error("body not found");
  const body = bodyMatch[1];

  const blocks = walkTopBlocks(body);
  console.log(`Top-level blocks in body: ${blocks.length}`);
  const pCount = blocks.filter((b) => b.tag === "w:p").length;
  const tCount = blocks.filter((b) => b.tag === "w:tbl").length;
  const sCount = blocks.filter((b) => b.tag === "w:sectPr").length;
  console.log(`  Paragraphs: ${pCount}, Tables: ${tCount}, sectPr: ${sCount}`);

  const planHeaderRe = /แผนการจัดการเรียนรู้ที่\s*([๐-๙0-9]+)/;
  const planBoundaries = [];
  blocks.forEach((b, i) => {
    if (b.tag === "w:p") {
      const m = b.text.match(planHeaderRe);
      if (m) planBoundaries.push({ index: i, planNum: m[1], text: b.text });
    }
  });
  console.log(`Plans found by block: ${planBoundaries.length}`);
  for (const pb of planBoundaries) {
    console.log(`  Plan ${pb.planNum} starts at block ${pb.index}`);
  }

  const sec9Re = /^\s*๙\.\s*/;
  const sec10Re = /^\s*๑๐\.\s*/;
  const sec8Re = /^\s*๘\.\s*/;

  const p1Start = planBoundaries[0].index;
  const p1End = planBoundaries[1].index;
  let sec8StartBlock = -1;
  let sec9StartBlock = -1;
  let sec10StartBlock = -1;
  for (let i = p1Start; i < p1End; i++) {
    const b = blocks[i];
    if (b.tag !== "w:p") continue;
    if (sec8StartBlock < 0 && sec8Re.test(b.text) && b.text.includes("วัดผล")) sec8StartBlock = i;
    if (sec9StartBlock < 0 && sec9Re.test(b.text)) sec9StartBlock = i;
    if (sec10StartBlock < 0 && sec10Re.test(b.text)) sec10StartBlock = i;
  }

  console.log(`Plan 1 range: blocks ${p1Start}..${p1End - 1} (${p1End - p1Start} blocks)`);
  console.log(`  Section 8 start: block ${sec8StartBlock}`);
  console.log(`  Section 9 start: block ${sec9StartBlock}`);
  console.log(`  Section 10 start: block ${sec10StartBlock}`);

  const sec9Blocks = blocks.slice(sec9StartBlock, sec10StartBlock);
  const trailingBlocks = blocks.slice(sec10StartBlock, p1End);
  const sec9Xml = sec9Blocks.map((b) => b.xml).join("");
  const trailingXml = trailingBlocks.map((b) => b.xml).join("");

  console.log(`\nSection 9 blocks: ${sec9Blocks.length}`);
  console.log(`Trailing blocks (Sec 10 + appendix + signatures): ${trailingBlocks.length}`);

  console.log("\n=== Section 9 blocks ===");
  for (const b of sec9Blocks) {
    if (b.tag === "w:p") {
      console.log(`  [P]  ${JSON.stringify(b.text.slice(0, 80))}`);
    } else if (b.tag === "w:tbl") {
      const rowMatches = [...b.xml.matchAll(/<w:tr\b[^>]*?>([\s\S]*?)<\/w:tr>/g)];
      console.log(`  [TBL] ${rowMatches.length} rows`);
      rowMatches.forEach((rm, ri) => {
        const cellMatches = [...rm[1].matchAll(/<w:tc\b[^>]*?>([\s\S]*?)<\/w:tc>/g)];
        console.log(
          `    row ${ri}: ${cellMatches.length} cells: ${cellMatches
            .map((c) => JSON.stringify(getInnerText(c[1]).slice(0, 40)))
            .join(" | ")}`,
        );
      });
    }
  }

  console.log("\n=== Trailing blocks ===");
  for (const b of trailingBlocks) {
    if (b.tag === "w:p") {
      console.log(`  [P]  ${JSON.stringify(b.text.slice(0, 80))}`);
    } else if (b.tag === "w:tbl") {
      console.log(`  [TBL] ${b.text.slice(0, 50)}`);
    }
  }

  const result = {
    sec9_xml: sec9Xml,
    trailing_xml: trailingXml,
    instructor_name: "นางสาวทักษพร การสนธิ์",
    homeroom_label: "หัวหน้ากลุ่มสาระการเรียนรู้",
    deputy_label: "รองผู้อำนวยการโรงเรียนบ้านหนองเต่า",
    homeroom_name: "",
    deputy_name: "",
  };
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), "utf8");
  console.log("\nWritten ref_data.json with sec9/trailing XML and signature names.");
}

extract().catch((e) => {
  console.error("ERROR:", e.message);
  console.error(e.stack);
  process.exit(1);
});
