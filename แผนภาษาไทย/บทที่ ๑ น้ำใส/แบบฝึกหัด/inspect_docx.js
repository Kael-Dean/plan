const JSZip = require("jszip");
const fs = require("fs");

const buf = fs.readFileSync("D:/แผน/หน่วยการเรียนรู้ที่๑_น้ำใส.docx");
JSZip.loadAsync(buf).then(zip => {
  const docXml = zip.file("word/document.xml");
  if (!docXml) { console.log("No document.xml"); return; }
  docXml.async("string").then(xml => {
    // Find แผนการจัดการเรียนรู้ markers
    const lines = xml.split(/(?=<w:p[ >])/);
    console.log("Total paragraph blocks:", lines.length);
    // Find page breaks
    let pbCount = 0;
    const pbPositions = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('w:type="page"') || lines[i].includes("w:type='page'")) {
        pbCount++;
        pbPositions.push(i);
      }
    }
    console.log("Page breaks found:", pbCount);
    console.log("At positions:", pbPositions.slice(0, 15));

    // Find แผน markers
    const planMarkers = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("แผนการจัดการเรียนรู้")) {
        const snippet = lines[i].replace(/<[^>]+>/g, "").substring(0, 60);
        planMarkers.push({ idx: i, text: snippet });
      }
    }
    console.log("Plan markers:", JSON.stringify(planMarkers, null, 2));

    // Show XML file list
    console.log("\nFiles in docx:");
    Object.keys(zip.files).forEach(f => console.log(" ", f));
  });
});
