// Generate 10 worksheet HTML files for Chapter 4 (กลัวทำไม)
// Same visual style as Chapter 2/3, content derived from each plan's "๖. กิจกรรมการเรียนรู้"
// and the real textbook content (ภาษาพาที ป.๒ บทที่ ๔). Then convert each HTML to PDF via Edge headless.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== SHARED CSS (identical to chapter 2/3 worksheet style) ==========
const CSS = `
  :root{
    --ink:#1f2a44; --ink-soft:#3b4660;
    --line:#cfd6e4; --line-soft:#e6ebf3;
    --accent:#3b82f6;
    --yellow:#fff3c4; --yellow-b:#f3c64a;
    --blue:#dbeafe;   --blue-b:#3b82f6;
    --green:#d6f5e1;  --green-b:#22a06b;
    --pink:#ffe0ec;   --pink-b:#e85a8c;
    --purple:#ece4ff; --purple-b:#7b5cf0;
    --cream:#fffbf0;
  }
  *{box-sizing:border-box}
  @page{size:A4; margin:8mm 9mm}
  html,body{margin:0;padding:0}
  body{
    font-family:"Sarabun","Leelawadee UI","Tahoma",sans-serif;
    color:var(--ink); font-size:14pt; line-height:1.3;
    background:#fff;
    -webkit-print-color-adjust:exact; print-color-adjust:exact;
  }
  .page{padding:0 2mm}
  .top{display:grid; grid-template-columns:1fr auto auto; gap:12px; align-items:end;
    padding-bottom:3px; margin-bottom:4px; border-bottom:1.5px dashed var(--line);}
  .field{display:flex; align-items:flex-end; gap:6px; font-family:"Sarabun"; font-size:14pt;
    border-bottom:1.2px solid var(--ink); padding-bottom:2px; min-height:24px;}
  .field b{font-weight:600}
  .field.name{min-width:62mm}
  .field.cls{min-width:30mm}
  .field.no{min-width:22mm}
  .banner{position:relative;
    background:linear-gradient(135deg,#e0f2ff 0%,#dbeafe 50%,#e7e1ff 100%);
    border:2px solid var(--blue-b); border-radius:16px;
    padding:8px 22px 8px; margin:4px 0 8px; overflow:hidden;}
  .banner::before, .banner::after{content:""; position:absolute;
    width:80px; height:80px; border-radius:50%; opacity:.55; pointer-events:none;}
  .banner::before{left:-22px; top:-26px;
    background:radial-gradient(circle at 50% 50%, #93c5fd 0%, transparent 70%);}
  .banner::after{right:-26px; bottom:-30px;
    background:radial-gradient(circle at 50% 50%, #c4b5fd 0%, transparent 70%);}
  .banner h1{margin:0; font-family:"Mali"; font-weight:700;
    font-size:17pt; text-align:center; color:#1d4ed8; letter-spacing:.2px; line-height:1.2;}
  .banner h2{margin:1px 0 0; font-family:"Mali"; font-weight:600;
    font-size:15pt; text-align:center; color:#3730a3;}
  .banner .sub{margin-top:3px; text-align:center;
    font-family:"Sarabun"; font-size:11pt; color:#3b4660;}
  .banner .chip{display:inline-block; padding:1px 12px; margin-top:3px;
    background:#fff; border:1.2px solid var(--blue-b); border-radius:99px;
    font-family:"Mali"; font-size:11pt; color:#1d4ed8;}
  .card{border-radius:12px; padding:8px 14px 10px;
    margin-bottom:8px; border:1.6px solid; position:relative;
    break-inside:avoid; page-break-inside:avoid;}
  .card .head{display:flex; align-items:center; gap:10px; margin:0 0 6px;}
  .card .num{flex:none; width:28px; height:28px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-family:"Mali"; font-weight:700; font-size:14pt;
    color:#fff; box-shadow:0 2px 0 rgba(0,0,0,.05);}
  .card h3{margin:0; flex:1; font-family:"Mali"; font-weight:700; font-size:14pt; color:var(--ink);}
  .card .hint{margin:4px 0 6px; font-family:"Sarabun"; font-size:11.5pt; font-style:italic; color:#5a6478;}
  .card .hint b{font-style:normal; color:var(--ink); font-weight:600}
  .c-yellow{background:var(--yellow); border-color:var(--yellow-b)}
  .c-yellow .num{background:var(--yellow-b)}
  .c-blue{background:var(--blue); border-color:var(--blue-b)}
  .c-blue .num{background:var(--blue-b)}
  .c-green{background:var(--green); border-color:var(--green-b)}
  .c-green .num{background:var(--green-b)}
  .c-pink{background:var(--pink); border-color:var(--pink-b)}
  .c-pink .num{background:var(--pink-b)}
  .c-purple{background:var(--purple); border-color:var(--purple-b)}
  .c-purple .num{background:var(--purple-b)}
  .song{background:#fff; border:1.5px dashed var(--yellow-b);
    border-radius:10px; padding:8px 14px; text-align:center;
    font-family:"Mali"; font-size:13pt; line-height:1.6; color:#7a4a00;}
  .song .title{font-size:14pt; font-weight:700; margin-bottom:2px; color:#a16207;}
  .song .blank{display:inline-block; min-width:60px;
    border-bottom:1.8px solid #b45309; margin:0 4px;}
  .song .note{margin-top:4px; padding-top:4px; border-top:1px dotted #d4a83a;
    font-size:11pt; font-family:"Sarabun"; color:#7a4a00;}
  .song .note b{font-family:"Mali"; color:#a16207}
  .match{display:grid; grid-template-columns:1fr 1fr; gap:0 28px; padding:2px 4px;}
  .match-half{display:grid; grid-template-columns:78px 1fr; gap:5px 44px;
    align-items:center; position:relative;}
  .mw{background:#fff; border:1.6px solid var(--blue-b); border-radius:8px;
    padding:3px 0; text-align:center; font-family:"Mali"; font-size:15pt;
    font-weight:700; color:#1d4ed8; min-height:32px;
    display:flex; align-items:center; justify-content:center; position:relative;}
  .mm{background:#fff; border:1.6px solid var(--blue-b); border-radius:8px;
    padding:4px 10px; font-family:"Sarabun"; font-size:11.5pt; line-height:1.2;
    min-height:32px; display:flex; align-items:center; position:relative;}
  .mw::after, .mm::before{content:""; position:absolute; top:50%;
    width:8px; height:8px; border-radius:50%;
    background:#1d4ed8; border:1.4px solid #fff;
    box-shadow:0 0 0 1.2px #1d4ed8;}
  .mm::before{ left:-6px;  transform:translate(-50%,-50%); }
  .mw::after { right:-6px; transform:translate(50%,-50%); }
  .spell{width:100%; border-collapse:separate; border-spacing:0;
    background:#fff; border:1.4px solid var(--green-b); border-radius:12px;
    overflow:hidden;}
  .spell thead th{background:var(--green-b); color:#fff;
    font-family:"Mali"; font-weight:600; font-size:12.5pt; padding:4px 10px;}
  .spell td{border-top:1px solid #b9e3c8; padding:5px 12px;
    font-family:"Sarabun"; font-size:13pt;}
  .spell td.w{width:22%; text-align:center;
    font-family:"Mali"; font-weight:700; font-size:17pt; color:#0f6b3f;
    background:#eef9f2;}
  .spell td.line{background:
    linear-gradient(#22a06b,#22a06b) 0 0/100% 1.2px no-repeat,
    linear-gradient(#a3d9bb,#a3d9bb) 0 50%/100% 1px no-repeat,
    linear-gradient(#22a06b,#22a06b) 0 100%/100% 1.2px no-repeat;
    height:38px;}
  .ex{margin:0 0 5px; padding:4px 12px;
    background:#fff; border-left:5px solid var(--green-b); border-radius:8px;
    font-family:"Sarabun"; font-size:11.5pt;}
  .ex b{font-family:"Mali"; color:#0f6b3f}
  .copy{width:100%; border-collapse:separate; border-spacing:0;
    background:#fff; border:1.4px solid var(--purple-b); border-radius:12px;
    overflow:hidden;}
  .copy td{padding:4px 10px; vertical-align:middle}
  .copy tr+tr td{border-top:1px solid #d8cbff}
  .copy td.w{width:18%; text-align:center;
    font-family:"Mali"; font-weight:700; font-size:19pt; color:#4c1d95;
    background:#f5f1ff;}
  .copy td.lines{height:40px;
    background:
      linear-gradient(#d8cbff,#d8cbff) 0 0/100% 1px no-repeat,
      linear-gradient(#ece8ff,#ece8ff) 0 50%/100% 1px no-repeat,
      linear-gradient(#d8cbff,#d8cbff) 0 100%/100% 1px no-repeat;}
  .foot{margin-top:6px; padding:5px 14px;
    border:1.4px solid var(--line); border-radius:10px; background:var(--cream);
    display:flex; justify-content:space-between; align-items:center;
    font-family:"Sarabun"; font-size:11.5pt;}
  .foot .score{display:inline-block; padding:2px 12px; border-radius:99px;
    background:#fff; border:1.4px solid var(--yellow-b);
    font-family:"Mali"; color:#7a4a00;}
  .foot .sig{border-bottom:1.2px solid var(--ink); display:inline-block; min-width:44mm}
  .lines-tall{height:90px;
    background:repeating-linear-gradient(to bottom,
      transparent 0, transparent 24px, #d8cbff 24px, #d8cbff 25px);
    margin-top:6px;}
  .lines-3{height:60px;
    background:repeating-linear-gradient(to bottom,
      transparent 0, transparent 24px, var(--ink-soft) 24px, var(--ink-soft) 25px);
    margin-top:4px;}
  .panel-row{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  .panel{background:#fff; border:1.5px solid var(--purple-b); border-radius:10px;
    padding:6px 10px;}
  .panel .pl{font-family:"Mali"; color:#4c1d95; font-size:12pt; font-weight:700;}
  .word-grid{display:grid; grid-template-columns:repeat(4,1fr); gap:6px;}
  .word-cell{background:#fff; border:1.6px solid var(--blue-b); border-radius:8px;
    text-align:center; padding:6px 4px; font-family:"Mali"; font-size:13pt;
    font-weight:700; color:#1d4ed8;}
  .chip-row{display:flex; flex-wrap:wrap; gap:6px; padding:4px;}
  .chip-row .chip{display:inline-block; padding:3px 12px;
    background:#fff; border:1.5px solid #92400e; border-radius:99px;
    font-family:"Mali"; font-size:12pt; color:#7a4a00;}
  .cat-table{width:100%; border-collapse:separate; border-spacing:0;
    background:#fff; border:1.4px solid var(--green-b); border-radius:10px; overflow:hidden;}
  .cat-table th{background:var(--green-b); color:#fff; padding:6px;
    font-family:"Mali"; font-size:13pt;}
  .cat-table td{border-top:1px solid #b9e3c8; padding:8px 10px; height:54px;}
  .blank-line{border-bottom:1.6px dashed #555; display:inline-block; min-width:80px;}
`;

const THAI = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

// ========== HEADER + BANNER ==========
const drop = `<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-3px"><path fill="#3b82f6" d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/></svg>`;

function header(num, topic, objective) {
  return `
  <div class="top">
    <div class="field name"><b>ชื่อ–นามสกุล</b> </div>
    <div class="field cls"><b>ชั้น</b> ป.๒/ </div>
    <div class="field no"><b>เลขที่</b> </div>
  </div>
  <div class="banner">
    <h1>${drop} ใบงานวิชาภาษาไทย • ภาษาพาที • ชั้นประถมศึกษาปีที่ ๒ ${drop}</h1>
    <h2>บทที่ ๔  กลัวทำไม</h2>
    <div class="sub"><span class="chip">ใบงานที่ ${num}  ${topic}</span></div>
    <div class="sub">จุดประสงค์ : ${objective}</div>
  </div>`;
}

const footer = `
  <div class="foot">
    <div><span class="score">คะแนนเต็ม ๒๐</span> &nbsp; คะแนนที่ได้ <span class="sig" style="min-width:18mm"></span></div>
    <div>ลายเซ็นผู้ปกครอง <span class="sig"></span></div>
    <div>ผู้ตรวจ <span class="sig"></span></div>
  </div>`;

// ========== ACTIVITY BUILDERS (same as chapter 2/3) ==========
function card(color, num, title, body) {
  return `<div class="card c-${color}">
    <div class="head"><div class="num">${num}</div><h3>${title}</h3></div>
    ${body}
  </div>`;
}

function matchActivity(pairs) {
  const mid = Math.ceil(pairs.length / 2);
  const left = pairs.slice(0, mid);
  const right = pairs.slice(mid);
  const row = (p) => `<div class="mw">${p.w}</div><div class="mm">${p.m}</div>`;
  return `<div class="match">
    <div class="match-half">${left.map(row).join("")}</div>
    <div class="match-half">${right.map(row).join("")}</div>
  </div>`;
}

function spellActivity(words, example) {
  return `${example ? `<div class="ex"><b>ตัวอย่าง :</b> &nbsp; ${example}</div>` : ""}
    <table class="spell">
      <thead><tr><th style="width:22%">คำ</th><th>แจกลูกสะกดคำ</th></tr></thead>
      <tbody>${words.map(w => `<tr><td class="w">${w}</td><td class="line"></td></tr>`).join("")}</tbody>
    </table>`;
}

function copyActivity(words) {
  return `<table class="copy">${words.map(w => `<tr><td class="w">${w}</td><td class="lines"></td></tr>`).join("")}</table>`;
}

function wordGridActivity(words) {
  return `<div class="word-grid">${words.map(w => `<div class="word-cell">${w}</div>`).join("")}</div>`;
}

function songActivity(title, lines, hintWords) {
  return `<div class="song">
    <div class="title">♪  ${title}  ♪</div>
    ${lines.map(l => `<div>${l}</div>`).join("")}
    ${hintWords ? `<div class="note"><b>คำที่ใช้เติม :</b> ${hintWords}</div>` : ""}
  </div>`;
}

function panelsActivity(panels) {
  return `<div class="panel-row">${panels.map(p => `
    <div class="panel">
      <div class="pl">${p.label}</div>
      <div class="lines-3"></div>
    </div>`).join("")}</div>`;
}

function catActivity(headers, rows, hint) {
  return `${hint ? `<div class="hint"><b>คำที่ใช้ :</b> ${hint}</div>` : ""}
  <table class="cat-table">
    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
    ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
  </table>`;
}

function writeBox() {
  return `<div class="lines-tall"></div>`;
}

// Q&A box: list of questions, each with 3-line answer space
function qaBox(color, questions) {
  return `<div style="background:#fff;border:1.5px dashed var(--${color}-b);border-radius:10px;padding:10px;">
    ${questions.map((q, i) =>
      `<div style="margin-bottom:${i < questions.length - 1 ? "8px" : "0"};"><b>${THAI[i + 1]}.</b> ${q}<div class="lines-3" style="margin-top:4px"></div></div>`,
    ).join("")}
  </div>`;
}

// fill-in-the-blank sentences (use @ as the blank placeholder)
function fillSentences(color, hint, sentences) {
  const c = color === "blue" ? "#1d4ed8" : color === "green" ? "#0f6b3f" : color === "yellow" ? "#a16207" : "#be185d";
  return `<div class="hint"><b>คำที่ใช้ :</b> ${hint}</div>
  <div style="background:#fff;border:1.5px solid var(--${color}-b);border-radius:8px;padding:8px 12px;font-family:Sarabun;font-size:12.5pt;line-height:2.4">
    ${sentences.map((s, i) => `<div><b>${THAI[i + 1]}.</b> ${s.replace(/@/g, `<span class="blank-line" style="border-color:${c}"></span>`)}</div>`).join("")}
  </div>`;
}

// spell-style table with custom columns (header bg by color)
function tableActivity(color, headers, rows) {
  const map = {
    blue: { hbg: "var(--blue-b)", wcol: "#1d4ed8", wbg: "#dbeafe" },
    green: { hbg: "var(--green-b)", wcol: "#0f6b3f", wbg: "#eef9f2" },
    purple: { hbg: "var(--purple-b)", wcol: "#4c1d95", wbg: "#f5f1ff" },
    yellow: { hbg: "var(--yellow-b)", wcol: "#a16207", wbg: "#fff6db" },
    pink: { hbg: "var(--pink-b)", wcol: "#be185d", wbg: "#ffe9f1" },
  };
  const m = map[color] || map.blue;
  return `<table class="spell" style="border-color:${m.hbg}">
    <thead style="background:${m.hbg}"><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) =>
      i === 0
        ? `<td class="w" style="color:${m.wcol};background:${m.wbg}">${c}</td>`
        : (c === "" ? `<td class="line"></td>` : `<td style="text-align:center;font-family:Sarabun;font-size:13pt">${c}</td>`),
    ).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

// draw box + lines for caption
function drawBox(color, h = 140, captionLabel = "") {
  return `<div style="background:#fff;border:1.5px solid var(--${color}-b);border-radius:10px;padding:8px;">
    <div style="height:${h}px;border:1.5px dashed var(--${color}-b);border-radius:8px;background:#fafafa;"></div>
    ${captionLabel ? `<div style="font-family:Mali;color:#4c1d95;margin:6px 0 2px;"><b>${captionLabel}</b></div><div class="lines-3"></div>` : ""}
  </div>`;
}

// ========== BUILD WHOLE PAGE ==========
function buildPage(num, topic, objective, activities) {
  return `<!doctype html><html lang="th"><head>
<meta charset="utf-8"><title>ใบงานที่ ${num} บทที่ ๔ กลัวทำไม</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&family=Itim&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body><div class="page">
${header(num, topic, objective)}
${activities.join("\n")}
${footer}
</div></body></html>`;
}

// ========== WORKSHEET DEFINITIONS (10 worksheets for chapter 4 — กลัวทำไม) ==========
const WORKSHEETS = [
  // ============ WS 1: เรียนรู้คำ นำเรื่อง (ตอน ๑) ============
  {
    num: "๑",
    topic: "เรียนรู้คำ นำเรื่อง",
    objective: "อ่านแจกลูกสะกดคำได้ และบอกความหมายของคำในบทเรียนได้",
    activities: [
      card("green", "๑", "เขียนแจกลูกสะกดคำตามตัวอย่าง",
        spellActivity(
          ["ทาง", "ยุง", "พัด", "กลัว", "เพชร"],
          "นก &nbsp;→&nbsp; <b>น – โอะ – ก</b> &nbsp; อ่านว่า &nbsp; <b>นก</b>")),

      card("pink", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "ก่อไฟ", m: "ทำให้เกิดไฟด้วยฟืนหรือถ่าน" },
          { w: "สุมไฟ", m: "ใส่เชื้อเพิ่มให้ไฟลุกอยู่เสมอ" },
          { w: "หินงอก", m: "หินที่งอกขึ้นจากพื้นถ้ำ" },
          { w: "หินย้อย", m: "หินที่ย้อยลงมาจากเพดานถ้ำ" },
          { w: "พนมมือ", m: "ยกมือสองข้างประกบกันไหว้" },
          { w: "ตะเกียง", m: "เครื่องให้แสงสว่างที่ใช้น้ำมัน" },
        ])),

      card("blue", "๓", "วงกลมคำที่เป็น “สิ่งของเครื่องใช้” ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "เต็นท์", "ผ้าม่าน", "ไฟฉาย", "ตะเกียง",
          "ยุง", "ทุเรียน", "ก้อนหิน", "ที่พัก",
          "อมยิ้ม", "แม่มด", "เพชร", "พัด",
        ])),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ทาง", "ฟัน", "ยุง", "พัด", "กลัว", "ก่อไฟ", "ก้อนหิน", "ไฟฉาย", "ตะเกียง", "ทุเรียน"])),
    ],
  },

  // ============ WS 2: เรียนรู้คำ นำเรื่อง (ตอน ๒) ============
  {
    num: "๒",
    topic: "เรียนรู้คำ นำเรื่อง (ทบทวนและคัดคำ)",
    objective: "อ่านแจกลูกสะกดคำได้ และบอกความหมายของคำได้",
    activities: [
      card("blue", "๑", "เขียนแจกลูกสะกดคำตามตัวอย่าง",
        spellActivity(
          ["มืด", "หนาว", "เหนื่อย", "ครึ้ม", "แมลง"],
          "<b>ลม</b> &nbsp;→&nbsp; ล – โอะ – ม &nbsp; อ่านว่า &nbsp; <b>ลม</b>")),

      card("green", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "เหนื่อย", m: "อ่อนแรง อยากพัก" },
          { w: "ครึ้ม", m: "มืดมัวเพราะมีเมฆมาก" },
          { w: "อธิษฐาน", m: "ตั้งใจขอสิ่งที่ต้องการ" },
          { w: "เพลิดเพลิน", m: "สนุกเพลินจนลืมเวลา" },
          { w: "ค่อนข้าง", m: "เกือบจะ อยู่ในระดับหนึ่ง" },
          { w: "ตะโกน", m: "ออกเสียงดังกว่าปกติ" },
        ])),

      card("pink", "๓", "วงกลมคำที่เป็น “คำบอกลักษณะ/ความรู้สึก” ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "หนาว", "เหนื่อย", "เล็ก", "ร้าย",
          "มืด", "ครึ้ม", "ลม", "หนาม",
          "เดี๋ยว", "กลางวัน", "หน่อย", "เร่ง",
        ])),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ชื่อ", "ร้าย", "ลืม", "มืด", "หนาว", "เหนื่อย", "ครึ้ม", "แมลง", "หายใจ", "เพลิดเพลิน"])),
    ],
  },

  // ============ WS 3: การอ่านออกเสียง ============
  {
    num: "๓",
    topic: "การอ่านออกเสียง — เรื่อง กลัวทำไม",
    objective: "อ่านออกเสียงเนื้อหาในบทเรียนได้ และตอบคำถามจากเรื่องที่อ่านได้",
    activities: [
      card("blue", "๑", "ตอบคำถามจากเรื่อง “กลัวทำไม” โดยเขียนคำตอบลงในช่องว่าง",
        qaBox("blue", [
          "ทำไมน้ำใสจึงตกใจกลัว?",
          "ภายในถ้ำมีลักษณะอย่างไร?",
          "ลักษณะของหินงอกและหินย้อยเหมือนอะไรบ้าง?",
        ])),

      card("green", "๒", "เขียนสิ่งที่ภูผาและน้ำใสพบเห็นภายในถ้ำ ลงในแผนภาพความคิด", `
        <div style="background:#fff;border:1.5px solid var(--green-b);border-radius:10px;padding:10px;">
          <div style="text-align:center;font-family:Mali;color:#0f6b3f;font-size:13pt;margin-bottom:8px;">
            <span style="display:inline-block;background:var(--green);border:1.8px solid var(--green-b);border-radius:99px;padding:4px 22px;">สิ่งที่พบในถ้ำ</span>
          </div>
          <div class="word-grid" style="grid-template-columns:repeat(3,1fr);">
            ${Array.from({ length: 6 }).map(() =>
              `<div style="border:1.5px dashed var(--green-b);border-radius:8px;height:34px;background:#f4fbf6;"></div>`).join("")}
          </div>
        </div>`),

      card("pink", "๓", "ลองคิดดู — ถ้านักเรียนเป็นน้ำใส จะกลัวหรือไม่ เพราะอะไร?", `
        <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#9d174d;margin-bottom:6px;"><b>เขียนคำตอบ:</b></div>
          ${writeBox()}
        </div>`),
    ],
  },

  // ============ WS 4: การอ่านจับใจความ ============
  {
    num: "๔",
    topic: "การอ่านจับใจความ — คิดวิเคราะห์เรื่อง กลัวทำไม",
    objective: "บอกเนื้อหาสาระ วิเคราะห์และแสดงความคิดเห็น และนำข้อคิดไปใช้ในชีวิตประจำวันได้",
    activities: [
      card("blue", "๑", "ตอบคำถามคิดวิเคราะห์จากเรื่อง “กลัวทำไม”",
        qaBox("blue", [
          "เหตุใดเรื่องนี้จึงตั้งชื่อว่า “กลัวทำไม”?",
          "ทำไมต้องสวดมนต์และอธิษฐานก่อนนอน?",
          "สมุนไพรอะไรที่ใช้จุดไล่ยุงและแมลงได้?",
        ])),

      card("green", "๒", "เขียนบอกสิ่งที่ทำให้รู้สึกกลัว และวิธีทำให้หายกลัว", `
        <table class="cat-table">
          <tr><th style="width:45%">สิ่งที่ทำให้ฉันกลัว</th><th>วิธีทำให้หายกลัว</th></tr>
          <tr><td></td><td></td></tr>
          <tr><td></td><td></td></tr>
        </table>`),

      card("pink", "๓", "วาดภาพสิ่งที่ภูผาและน้ำใสทำก่อนนอนในถ้ำ พร้อมเขียนบรรยายสั้น ๆ",
        drawBox("pink", 120, "คำบรรยายภาพ:")),

      card("purple", "๔", "ข้อคิดที่ได้จากเรื่อง และการนำไปใช้ในชีวิตประจำวัน",
        panelsActivity([
          { label: "✦ ข้อคิดที่ได้จากเรื่อง" },
          { label: "♥ ฉันจะนำไปปฏิบัติอย่างไร" },
        ])),
    ],
  },

  // ============ WS 5: คำศัพท์จากบทเรียน ============
  {
    num: "๕",
    topic: "คำศัพท์จากบทเรียน — อ่านและแต่งประโยค",
    objective: "อ่านสะกดคำในบทเรียนได้ บอกความหมายของคำ และนำคำไปใช้ได้ถูกต้องตามสถานการณ์",
    activities: [
      card("yellow", "๑", "เขียนแจกลูกสะกดคำต่อไปนี้ตามตัวอย่าง",
        spellActivity(
          ["จุด", "กาง", "ลืม", "ครึ้ม", "เหนื่อย"],
          "<b>หนาว</b> &nbsp;→&nbsp; ห – หนาว – ว &nbsp; อ่านว่า &nbsp; <b>หนาว</b>")),

      card("blue", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "จุด", m: "ทำให้ติดไฟหรือเกิดแสง" },
          { w: "กาง", m: "ทำให้แผ่ออกหรือขึงออก" },
          { w: "ลืม", m: "นึกไม่ออก จำไม่ได้" },
          { w: "ครึ้ม", m: "มืดมัวเพราะมีเมฆมาก" },
          { w: "ร้าย", m: "ดุ ไม่ดี เป็นอันตราย" },
          { w: "แมลง", m: "สัตว์ตัวเล็กมีหกขา" },
        ])),

      card("green", "๓", "เลือกคำที่กำหนดให้เติมลงในประโยคให้ถูกต้อง",
        fillSentences("green", "จุด • กาง • ลืม • หนาว • แมลง", [
          "พ่อ @ เต็นท์เพื่อเป็นที่พักในป่า",
          "พี่ @ ตะเกียงให้แสงสว่างยามค่ำคืน",
          "อากาศในถ้ำทำให้รู้สึก @ มาก",
          "น้องนอนหลับจน @ ปิดไฟ",
        ])),

      card("pink", "๔", "เลือกคำศัพท์ที่กำหนดให้ มาแต่งประโยค (อย่างน้อย ๕ ประโยค)", `
        <div class="hint"><b>คำที่ใช้ :</b> จุด • กาง • ลืม • ครึ้ม • เหนื่อย • ร้าย • หนาว • แมลง</div>
        ${writeBox()}`),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["จุด", "กาง", "ลืม", "ครึ้ม", "เหนื่อย", "ร้าย", "เล็ก", "หนาว", "กลางวัน", "แมลง"])),
    ],
  },

  // ============ WS 6: สระอึ และ สระอือ ============
  {
    num: "๖",
    topic: "สระอึ ( –ึ ) และสระอือ ( –ือ )",
    objective: "บอกรูปสระอึและสระอือได้ ประสมคำและอ่านแจกลูกสะกดคำได้",
    activities: [
      card("yellow", "๑", "อ่านกฎแล้วเติมคำตอบ", `
        <div class="song" style="border-color:var(--yellow-b);color:#7a4a00;text-align:left;line-height:1.7">
          <div class="title" style="text-align:center">♪  จำให้ขึ้นใจ  ♪</div>
          <div>• สระอือ ที่<b>ไม่มีตัวสะกด</b> จะมีตัว <b>อ</b> เคียง เช่น มือ คือ <span class="blank"></span></div>
          <div>• สระอือ ที่<b>มีตัวสะกด</b> จะ<b>ไม่มี</b>ตัว อ เคียง เช่น มืด ฟืน <span class="blank"></span></div>
          <div class="note"><b>คำที่ใช้เติม :</b> ลือ &nbsp;•&nbsp; กลืน</div>
        </div>`),

      card("green", "๒", "เติมพยัญชนะต้นที่กำหนด แล้วประสมคำกับสระอือ ( –ือ / เ–ือ )",
        tableActivity("green",
          ["พยัญชนะต้น", "+ สระ", "= คำ (ให้นักเรียนเขียน)"],
          [
            ["ม", "–ือ", ""],
            ["ค", "–ือ", ""],
            ["ล", "–ืม", ""],
            ["ฟ", "–ืน", ""],
            ["ป", "–ืน", ""],
          ])),

      card("pink", "๓", "อ่านแจกลูกสะกดคำต่อไปนี้แล้วเขียนคำที่อ่านได้",
        spellActivity(
          ["มืด", "ฟืน", "คืน", "กลืน", "ปลื้ม"],
          "<b>มือ</b> &nbsp;→&nbsp; ม – อือ – มือ &nbsp; อ่านว่า &nbsp; <b>มือ</b>")),

      card("purple", "๔", "คัดคำที่ประสมด้วยสระอือต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["มือ", "คือ", "ลือ", "มืด", "ฟืน", "คืน", "ยืน", "ปืน", "กลืน", "ปลื้ม"])),
    ],
  },

  // ============ WS 7: คำควบกล้ำ (ว ควบ) ============
  {
    num: "๗",
    topic: "คำควบกล้ำ — คว กว ขว",
    objective: "อ่านสะกดคำควบกล้ำในบทเรียนได้ และนำคำไปใช้ได้ถูกต้องตามสถานการณ์",
    activities: [
      card("yellow", "๑", "อ่าน “เพลงคำควบกล้ำ” แล้วเติมคำที่หายไปลงในช่องว่าง",
        songActivity("เพลงคำควบกล้ำ",
          [
            `<span class="blank"></span>ไล่ขวิดข้างขวา`,
            `ขว้าง<span class="blank"></span>มาไล่ขว้างควายไป`,
            `ควายขวางวิ่งวน<span class="blank"></span> (ซ้ำ)`,
            `กวัด<span class="blank"></span>ขวานไล่ล้มคว่ำขวางควาย`,
          ],
          "ควาย &nbsp;•&nbsp; ขวาน &nbsp;•&nbsp; ขวักไขว่ &nbsp;•&nbsp; แกว่ง")),

      card("green", "๒", "แยกคำควบกล้ำต่อไปนี้ลงในตารางตามชนิดของตัวควบให้ถูกต้อง",
        catActivity(
          ["คว", "กว", "ขว"],
          [["", "", ""], ["", "", ""]],
          "ควาย • กวาด • ขวาน • ความรัก • กว้าง • ขวัญ • คว่ำ • แกว่ง • ขวิด")),

      card("pink", "๓", "วงกลมคำที่เป็น “คำควบกล้ำ” ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "ควาย", "ขวาน", "กวาด", "ความ",
          "กลัว", "หนาว", "ขวัญ", "แกว่ง",
          "กว้าง", "มืด", "คว่ำ", "ขวิด",
        ])),

      card("purple", "๔", "คัดคำควบกล้ำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ควาย", "ขวาน", "กวาด", "ความรัก", "กว้าง", "ขวัญ", "แกว่ง", "คว่ำ", "ขวิด", "ขวักไขว่"])),
    ],
  },

  // ============ WS 8: การแต่งประโยค ============
  {
    num: "๘",
    topic: "การแต่งประโยค — ประธาน กริยา กรรม",
    objective: "นำคำมาแต่งประโยคให้ได้ใจความและใช้ภาษาถูกต้อง และคัดลายมือได้",
    activities: [
      card("blue", "๑", "อ่านประโยคแล้วแยกส่วนประกอบของประโยคลงในตาราง", `
        <div class="ex" style="border-left-color:var(--blue-b)"><b>ตัวอย่าง :</b> &nbsp; แมวกินปลา &nbsp;→&nbsp; ประธาน <b>แมว</b> | กริยา <b>กิน</b> | กรรม <b>ปลา</b></div>
        ${tableActivity("blue",
          ["ประโยค", "ประธาน", "กริยา", "กรรม"],
          [
            ["นกบิน", "", "", "—"],
            ["น้องร้องไห้", "", "", "—"],
            ["ฉันเขียนหนังสือ", "", "", ""],
            ["ภูผาก่อไฟ", "", "", ""],
          ])}`),

      card("green", "๒", "นำคำที่กำหนดให้มาแต่งเป็นประโยค (ประธาน + กริยา + กรรม)",
        fillSentences("green", "ก่อไฟ • กางเต็นท์ • จุดตะเกียง • พนมมือ", [
          "พ่อ @",
          "พี่ @",
          "ภูผา @",
          "ทุกคน @",
        ])),

      card("pink", "๓", "แต่งประโยคของนักเรียนเอง จากคำในบทเรียน มา ๕ ประโยค", `
        <div class="hint"><b>คำที่ใช้ :</b> ไฟฉาย • ถ้ำ • หินย้อย • ยุง • ทุเรียน • อมยิ้ม</div>
        ${writeBox()}`),

      card("purple", "๔", "คัดประโยคต่อไปนี้ด้วยตัวบรรจง", `
        <table class="copy">
          <tr><td class="lines" style="height:40px"></td></tr>
          <tr><td class="lines" style="height:40px"></td></tr>
        </table>
        <div class="ex" style="border-left-color:var(--purple-b);margin-top:6px"><b>ประโยค :</b> &nbsp; ภูผาและน้ำใสพนมมืออธิษฐานก่อนนอน</div>`),
    ],
  },

  // ============ WS 9: อ่านคล่อง ร้องเล่น “กลัวทำไม” ============
  {
    num: "๙",
    topic: "อ่านคล่อง ร้องเล่น — “กลัวทำไม”",
    objective: "อ่านคำคล้องจองง่าย ๆ ได้ และแสดงท่าทางประกอบคำคล้องจองได้",
    activities: [
      card("yellow", "๑", "คิดเปรียบเทียบ — เติมคำของนักเรียนเองลงในช่องว่าง (ดูตัวอย่าง)", `
        <div class="ex"><b>ตัวอย่าง :</b> &nbsp; ขาว เหมือน <b>สำลี</b></div>
        ${tableActivity("yellow",
          ["สิ่งที่กำหนด", "เหมือน..."],
          [["มืด เหมือน", ""], ["สว่าง เหมือน", ""], ["เรียบ เหมือน", ""], ["เย็น เหมือน", ""], ["หินย้อยลงมา เหมือน", ""]])}`),

      card("green", "๒", "อ่านบท “กลัวทำไม” แล้วเติมคำที่หายไปลงในช่องว่าง",
        songActivity("กลัวทำไม",
          [
            `มองทางไหนก็ไม่<span class="blank"></span>`,
            `มือเท้าเย็นเหมือนน้ำ<span class="blank"></span>`,
            `ไฟส่องถ้ำงามจับ<span class="blank"></span>`,
            `หัวเราะร่าว่ากลัว<span class="blank"></span>`,
          ],
          "เห็น &nbsp;•&nbsp; แข็ง &nbsp;•&nbsp; ตา &nbsp;•&nbsp; ทำไม")),

      card("pink", "๓", "วาดภาพภูผาและน้ำใสในถ้ำ พร้อมเขียนชื่อภาพใต้ภาพ",
        drawBox("pink", 120, "ชื่อภาพที่วาด:")),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["กลัวทำไม", "ในถ้ำ", "หินย้อย", "ไฟฉาย", "อมยิ้ม", "พนมมือ", "อธิษฐาน", "เพชร"])),
    ],
  },

  // ============ WS 10: ชวนคิด ชวนทำ — มาตราตัวสะกด ============
  {
    num: "๑๐",
    topic: "ชวนคิด ชวนทำ — มาตราตัวสะกด (แม่กด • แม่เกอว)",
    objective: "หาคำที่มีตัวสะกดในแม่กดและแม่เกอวจากเรื่องได้ และใช้คำได้ถูกต้องตามบริบท",
    activities: [
      card("yellow", "๑", "แยกประเภทคำต่อไปนี้ลงในตารางมาตราตัวสะกดให้ถูกต้อง",
        catActivity(
          ["แม่กด (จ ช ด ต ถ ท ธ ศ ส ษ ฎ ฏ)", "แม่เกอว (ว)"],
          [["", ""], ["", ""]],
          "รถ • โกรธ • หนาว • เดี๋ยว • อากาศ • ขอโทษ • ก้าว • แมว • ปรากฏ • อ้วน")),

      card("blue", "๒", "เติมตัวสะกดที่หายไป พร้อมบอกชื่อมาตราตัวสะกด",
        tableActivity("blue",
          ["คำ", "เติมตัวสะกด", "มาตรา"],
          [
            ["ร_ (รถ)", "", ""],
            ["หนา_ (หนาว)", "", ""],
            ["โกร_ (โกรธ)", "", ""],
            ["ก้า_ (ก้าว)", "", ""],
            ["อากา_ (อากาศ)", "", ""],
          ])),

      card("green", "๓", "แยกส่วนประกอบของคำลงในตารางให้ถูกต้อง",
        tableActivity("green",
          ["คำ", "พยัญชนะต้น", "สระ", "ตัวสะกด"],
          [
            ["รถ", "", "", ""],
            ["หนาว", "", "", ""],
            ["โกรธ", "", "", ""],
            ["เดี๋ยว", "", "", ""],
          ])),

      card("pink", "๔", "วงกลมคำที่มีตัวสะกดในมาตรา “แม่เกอว”",
        wordGridActivity([
          "หนาว", "เดี๋ยว", "ก้าว", "รถ",
          "แมว", "ดาว", "โกรธ", "อ้วน",
          "อากาศ", "เหว", "ขอโทษ", "สาว",
        ])),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["รถ", "โกรธ", "อากาศ", "ปรากฏ", "ขอโทษ", "หนาว", "เดี๋ยว", "ก้าว", "อ้วน", "แมว"])),
    ],
  },
];

// ========== GENERATE ALL HTML FILES ==========
console.log("Generating HTML files...");
for (const ws of WORKSHEETS) {
  const html = buildPage(ws.num, ws.topic, ws.objective, ws.activities);
  const path = join(__dirname, `worksheet_${ws.num}.html`);
  writeFileSync(path, html, "utf8");
  console.log(`  ✓ ${path}`);
}

// ========== CONVERT TO PDF VIA EDGE HEADLESS ==========
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
console.log("\nConverting HTML → PDF via Edge headless...");
for (const ws of WORKSHEETS) {
  const htmlPath = join(__dirname, `worksheet_${ws.num}.html`);
  const pdfPath = join(__dirname, `ใบงานที่_${ws.num}_บทที่_๔_กลัวทำไม.pdf`);
  const htmlUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const cmd = `"${EDGE}" --headless=new --disable-gpu --no-margins --print-to-pdf="${pdfPath}" --print-to-pdf-no-header "${htmlUrl}"`;
  try {
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
    console.log(`  ✓ ${pdfPath}`);
  } catch (e) {
    console.error(`  ✗ Failed for ${ws.num}: ${e.message}`);
  }
}

console.log("\nDone.");
