import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(__dirname, "pdf_data.json"), "utf8"));

const KEEP = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];
const WANT = ["๓", "๕", "๖"]; // จุดประสงค์, สาระการเรียนรู้, กิจกรรมการเรียนรู้

for (const p of data.plans) {
  if (!KEEP.includes(p.number)) continue;
  const topicLine = p.preambleLines.find((l) => l.text.startsWith("เรื่อง"));
  console.log("\n========================================");
  console.log(`PLAN ${p.number}: ${topicLine ? topicLine.text : ""}`);
  console.log("========================================");
  for (const s of p.sections) {
    if (!WANT.includes(s.number)) continue;
    console.log(`\n--- ${s.number}. ${s.title} ---`);
    for (const l of s.contentLines) {
      console.log(l.text);
    }
  }
}
