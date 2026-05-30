import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_DATA = join(__dirname, "pdf_data.json");
const OUT = join(__dirname, "..", "Content.md");

const data = JSON.parse(readFileSync(PDF_DATA, "utf8"));

// === Filter: keep 10 plans, renumber 1..10, 1hr each ===
const KEEP_ORIGINAL = ["๑", "๔", "๕", "๖", "๗", "๙", "๑๐", "๑๑", "๑๒", "๑๓"];
const THAI_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

const kept = data.plans.filter((p) => KEEP_ORIGINAL.includes(p.number));

const lines = [];
lines.push("# Content / เนื้อหา — หน่วยการเรียนรู้ที่ ๒ เรื่อง ใจหาย");
lines.push("");
lines.push("> เนื้อหาสกัดจาก `หน่วยการเรียนรู้ที่ ๒ ใจหาย (1).pdf`");
lines.push("> ครอบคลุมหัวข้อที่ ๑–๘ ของ ๑๐ แผนการสอน (เลือกจาก ๑๓ แผนใน PDF ต้นฉบับ)");
lines.push("> *(หัวข้อ ๙ และ ๑๐ ดูที่ Layout.md — copy จากบทที่ ๑ น้ำใส)*");
lines.push("");
lines.push("---");
lines.push("");
lines.push("## ภาพรวมหน่วยการเรียนรู้");
lines.push("");
lines.push("| รายการ | ค่า |");
lines.push("|--------|-----|");
lines.push("| หน่วยที่ | ๒ |");
lines.push("| เรื่อง | ใจหาย |");
lines.push("| กลุ่มสาระ | ภาษาไทย |");
lines.push("| ชั้น | ประถมศึกษาปีที่ ๒ |");
lines.push("| เวลารวม | ๑๐ ชั่วโมง |");
lines.push("| จำนวนแผน | ๑๐ แผน (แผนละ ๑ ชั่วโมง) |");
lines.push("");
lines.push("**แผนที่ถูกตัด (ทับซ้อน):** แผน ๒, ๓, ๘ จาก PDF ต้นฉบับ");
lines.push("");
lines.push("## ตารางการเทียบลำดับแผน (ใหม่ ↔ เดิม)");
lines.push("");
lines.push("| แผนใหม่ | แผนเดิมใน PDF | เรื่อง |");
lines.push("|---|---|---|");
for (let i = 0; i < kept.length; i++) {
  const plan = kept[i];
  let topic = "?";
  for (const pl of plan.preambleLines) {
    const m = pl.text.match(/^เรื่อง\s+(.+?)\s+เวลา\s+(\S+)\s+ชั่วโมง/);
    if (m) topic = m[1].trim();
  }
  lines.push(`| ${THAI_NUM[i]} | ${plan.number} | ${topic} |`);
}
lines.push("");
lines.push("---");
lines.push("");

kept.forEach((plan, i) => {
  const displayNum = THAI_NUM[i];
  lines.push(`## แผนการจัดการเรียนรู้ที่ ${displayNum} *(เดิมแผน ${plan.number} ใน PDF)*`);
  lines.push("");

  // Preamble: header (กลุ่มสาระ/หน่วย/เรื่อง/เวลา) + สาระ + มาตรฐาน
  if (plan.preambleLines && plan.preambleLines.length > 0) {
    lines.push("### ส่วนหัว (Header)");
    lines.push("");
    for (const pl of plan.preambleLines) {
      let t = pl.text;
      if (t.match(/^\.+$/)) continue; // skip dotted line
      // Rewrite unit hours: ๒๐ → ๑๐
      t = t.replace(/หน่วยการเรียนรู้ที่ ๒ เรื่อง ใจหาย เวลา ๒๐ ชั่วโมง/, "หน่วยการเรียนรู้ที่ ๒ เรื่อง ใจหาย เวลา ๑๐ ชั่วโมง");
      // Rewrite plan hours to ๑ ชั่วโมง
      t = t.replace(/^(เรื่อง\s+.+?\s+เวลา\s+)(\S+)(\s+ชั่วโมง)$/, "$1๑$3");
      lines.push(`- ${t}`);
    }
    lines.push("");
  }

  for (const sec of plan.sections) {
    lines.push(`### ${sec.number}. ${sec.title}`);
    lines.push("");
    for (const cl of sec.contentLines) {
      const t = cl.text;
      // Indentation based on x position
      let indent = "";
      if (cl.x >= 200) indent = "      ";
      else if (cl.x >= 160) indent = "    ";
      else if (cl.x >= 130) indent = "  ";
      else if (cl.x >= 100) indent = "";
      lines.push(`${indent}- ${t}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
});

writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`Wrote ${OUT}`);
console.log(`Plans kept: ${kept.length}, total lines: ${lines.length}`);
