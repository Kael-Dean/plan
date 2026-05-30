const JSZip = require("jszip");
const fs = require("fs");

// Thai numeral mapping for file names
const thaiNums = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

// Page break XML to insert between sections
const PAGE_BREAK = `<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;

async function loadDocx(path) {
  const buf = fs.readFileSync(path);
  return JSZip.loadAsync(buf);
}

async function getBodyContent(zip) {
  const xml = await zip.file("word/document.xml").async("string");
  const m = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!m) throw new Error("No body found");
  return { xml, body: m[1] };
}

function stripSectPr(body) {
  // Remove the last <w:sectPr...>...</w:sectPr> from body
  return body.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/, "");
}

function extractSectPr(body) {
  const m = body.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  return m ? m[0] : "";
}

// Split body paragraphs by plan start index
// We know plan markers are at indices [1, 65, 114, 175, 237, 289, 341, 394, 450, 498]
// when splitting on (?=<w:p[ >])
function splitBodyByPlans(body) {
  // Split into paragraph-starting chunks
  const chunks = body.split(/(?=<w:p[ >])/);

  // Verify plan boundaries by checking for แผนการจัดการเรียนรู้ text
  const planStarts = [1, 65, 114, 175, 237, 289, 341, 394, 450, 498];

  // Verify these positions contain plan markers
  for (let i = 0; i < planStarts.length; i++) {
    const idx = planStarts[i];
    if (idx < chunks.length && !chunks[idx].includes("แผนการจัดการเรียนรู้")) {
      console.warn(`Warning: Plan ${i+1} marker not found at expected position ${idx}`);
      // Try to find it nearby
      for (let j = idx - 3; j <= idx + 3; j++) {
        if (j >= 0 && j < chunks.length && chunks[j].includes("แผนการจัดการเรียนรู้")) {
          console.log(`  Found at position ${j} instead`);
          planStarts[i] = j;
          break;
        }
      }
    }
  }

  // Plan end indices (exclusive)
  const planEnds = [...planStarts.slice(1), chunks.length];

  // Extract each plan's chunks
  const plans = [];
  // Add prefix (before plan 1)
  const prefix = chunks.slice(0, planStarts[0]).join("");

  for (let i = 0; i < 10; i++) {
    plans.push(chunks.slice(planStarts[i], planEnds[i]));
  }

  return { prefix, plans, allChunks: chunks };
}

async function main() {
  console.log("Reading main docx...");
  const mainZip = await loadDocx("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส.docx");
  const { xml: mainXml, body: mainBody } = await getBodyContent(mainZip);
  const mainSectPr = extractSectPr(mainBody);
  const mainBodyClean = stripSectPr(mainBody);

  // Split main body into 10 plan sections
  const { prefix, plans } = splitBodyByPlans(mainBodyClean);
  console.log(`Split into ${plans.length} plans`);
  plans.forEach((p, i) => console.log(`  Plan ${i+1}: ${p.length} chunks`));

  // Read all 10 worksheet docx files and extract their body content
  console.log("\nReading worksheet files...");
  const worksheetBodies = [];

  // Worksheet 1 already exists
  for (let i = 1; i <= 10; i++) {
    const tn = thaiNums[i];
    const wsPath = `D:/แผน/แบบฝึกหัด/ใบงานที่_${tn}_บทที่_๑_น้ำใส.docx`;
    try {
      const wsZip = await loadDocx(wsPath);
      const { body: wsBody } = await getBodyContent(wsZip);
      const wsBodyClean = stripSectPr(wsBody).trim();
      worksheetBodies.push(wsBodyClean);
      console.log(`  Worksheet ${i} (${tn}): loaded`);
    } catch (e) {
      console.error(`  ERROR loading worksheet ${i}: ${e.message}`);
      worksheetBodies.push(`<w:p><w:r><w:t>ใบงานที่ ${tn} (ไม่พบไฟล์)</w:t></w:r></w:p>`);
    }
  }

  // Build the new combined body
  console.log("\nBuilding combined document...");
  const parts = [];

  // Add prefix content (before plan 1)
  if (prefix) parts.push(prefix);

  for (let i = 0; i < 10; i++) {
    const planChunks = plans[i];

    // Check if the last chunk of this plan already has a page break
    const lastChunk = planChunks[planChunks.length - 1] || "";
    const hasPageBreak = lastChunk.includes('w:type="page"') || lastChunk.includes("w:type='page'");

    if (hasPageBreak) {
      // Add all plan content EXCEPT the last page break chunk
      // The page break will serve as separator between plan and worksheet
      const planContent = planChunks.slice(0, -1).join("");
      parts.push(planContent);
      // Add the page break chunk (separates plan from worksheet)
      parts.push(lastChunk);
    } else {
      // Add all plan content
      parts.push(planChunks.join(""));
      // Add a page break to separate plan from worksheet
      parts.push(PAGE_BREAK);
    }

    // Add the worksheet content
    parts.push(worksheetBodies[i]);

    // Add page break after worksheet (to separate from next plan), except after last
    if (i < 9) {
      parts.push(PAGE_BREAK);
    }

    console.log(`  Added plan ${i+1} + worksheet ${i+1}`);
  }

  // Reassemble body
  const newBody = parts.join("") + mainSectPr;

  // Replace body in main XML
  const newDocXml = mainXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBody}</w:body>`);

  // Update the zip
  mainZip.file("word/document.xml", newDocXml);

  // Save output
  const outPath = "D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส_พร้อมแบบฝึกหัด.docx";
  const buf = await mainZip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  fs.writeFileSync(outPath, buf);

  const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
  console.log(`\nSAVED: ${outPath} (${sizeMB} MB)`);
  console.log("Done!");
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
