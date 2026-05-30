// Generate 10 worksheet HTML files for Chapter 3 (ครัวป่า)
// Same visual style as Chapter 2, content derived from each plan's "๖. กิจกรรมการเรียนรู้".
// (Activities that merely ask the student to read words off the textbook page were removed —
//  students read those directly from the book.) Then convert each HTML to PDF via Edge headless.
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== SHARED CSS (identical to chapter 2 worksheet style) ==========
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
    <h2>บทที่ ๓  ครัวป่า</h2>
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

// ========== ACTIVITY BUILDERS (same as chapter 2) ==========
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
<meta charset="utf-8"><title>ใบงานที่ ${num} บทที่ ๓ ครัวป่า</title>
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

// ========== WORKSHEET DEFINITIONS (10 worksheets for chapter 3) ==========
const WORKSHEETS = [
  // ============ WS 1: เรียนรู้คำ นำเรื่อง ============
  {
    num: "๑",
    topic: "เรียนรู้คำ นำเรื่อง",
    objective: "อ่านแจกลูกสะกดคำได้ และบอกความหมายของคำในบทเรียนได้",
    activities: [
      card("yellow", "๑", "อ่านบทร้องเล่น “โยกเยก” แล้วเติมคำที่หายไปลงในช่องว่าง",
        songActivity("โยกเยก",
          [
            `โยกเยกเอย น้ำท่วม<span class="blank"></span>`,
            `กระต่าย<span class="blank"></span>คอ หมาหาง<span class="blank"></span>กอดคอโยกเยก`,
          ],
          "เมฆ &nbsp;•&nbsp; ลอย &nbsp;•&nbsp; งอ")),

      card("green", "๒", "เขียนแจกลูกสะกดคำตามตัวอย่าง",
        spellActivity(
          ["ไฟ", "ย่าง", "นึ่ง", "ผัก", "เมฆ"],
          "นก &nbsp;→&nbsp; <b>น – โอะ – ก</b> &nbsp; อ่านว่า &nbsp; <b>นก</b>")),

      card("pink", "๓", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "ไฟ", m: "ความร้อนและแสงจากการเผาไหม้" },
          { w: "ห่อ", m: "หุ้มของด้วยใบไม้หรือกระดาษ" },
          { w: "ย่าง", m: "ทำให้สุกด้วยการวางใกล้ไฟ" },
          { w: "นึ่ง", m: "ทำให้สุกด้วยไอน้ำ" },
          { w: "โยน", m: "ขว้างให้ลอยไปข้างหน้า" },
          { w: "ลอย", m: "อยู่บนผิวน้ำหรือในอากาศ" },
        ])),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ไฟ", "แกะ", "งอ", "ห่อ", "ย่าง", "สูง", "นึ่ง", "ทิ้ง", "ผัก", "โยน"])),
    ],
  },

  // ============ WS 2: เรียนรู้คำ นำเรื่อง (ต่อ) ============
  {
    num: "๒",
    topic: "เรียนรู้คำ นำเรื่อง (ทบทวนและคัดคำ)",
    objective: "อ่านแจกลูกสะกดคำได้ และบอกความหมายของคำได้",
    activities: [
      card("blue", "๑", "เขียนแจกลูกสะกดคำตามตัวอย่าง",
        spellActivity(
          ["ปลา", "หมา", "มะเขือ", "มะขาม", "กิ่งไม้"],
          "<b>ลอย</b> &nbsp;→&nbsp; ล – ออ – ย – ลอย &nbsp; อ่านว่า &nbsp; <b>ลอย</b>")),

      card("green", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "เมฆ", m: "ไอน้ำที่รวมตัวลอยอยู่บนฟ้า" },
          { w: "ปลา", m: "สัตว์น้ำที่ใช้เหงือกหายใจ" },
          { w: "จักจั่น", m: "แมลงที่ส่งเสียงร้องดัง" },
          { w: "กระต่าย", m: "สัตว์สี่เท้าหูยาว" },
          { w: "กระบอก", m: "ภาชนะทรงยาวทำจากไม้ไผ่" },
          { w: "ใบตอง", m: "ใบของต้นกล้วย" },
        ])),

      card("pink", "๓", "วงกลมคำที่เป็น “ชื่อสัตว์” ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "เมฆ", "ปลา", "หมา", "ผีเสื้อ",
          "มะเขือ", "จักจั่น", "กระต่าย", "มะขาม",
          "กิ่งไม้", "นก", "กระบอก", "ใบตอง",
        ])),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["เมฆ", "ลอย", "ปลา", "หมา", "ผีเสื้อ", "มะเขือ", "มะขาม", "กิ่งไม้", "จักจั่น", "กระต่าย"])),
    ],
  },

  // ============ WS 3: การอ่านออกเสียง ============
  {
    num: "๓",
    topic: "การอ่านออกเสียง — เรื่อง ครัวป่า",
    objective: "อ่านออกเสียงเนื้อหาในบทเรียนได้ และตอบคำถามจากเรื่องที่อ่านได้",
    activities: [
      card("blue", "๑", "ตอบคำถามจากเรื่อง “ครัวป่า” โดยเขียนคำตอบลงในช่องว่าง",
        qaBox("blue", [
          "ภูผาและน้ำใสเดินทางเข้าป่าอย่างไร?",
          "ช้างพลายและช้างพังแตกต่างกันอย่างไร?",
          "นักเรียนเคยเดินป่าหรือไม่ รู้สึกอย่างไร?",
        ])),

      card("green", "๒", "เขียนชื่ออาหารที่ปรุงในเรื่อง “ครัวป่า” ลงในแผนภาพความคิด", `
        <div style="background:#fff;border:1.5px solid var(--green-b);border-radius:10px;padding:10px;">
          <div style="text-align:center;font-family:Mali;color:#0f6b3f;font-size:13pt;margin-bottom:8px;">
            <span style="display:inline-block;background:var(--green);border:1.8px solid var(--green-b);border-radius:99px;padding:4px 22px;">อาหารในครัวป่า</span>
          </div>
          <div class="word-grid" style="grid-template-columns:repeat(3,1fr);">
            ${Array.from({ length: 6 }).map(() =>
              `<div style="border:1.5px dashed var(--green-b);border-radius:8px;height:34px;background:#f4fbf6;"></div>`).join("")}
          </div>
        </div>`),

      card("pink", "๓", "ลองคิดดู — ถ้านักเรียนได้ไปเที่ยวป่า อยากทำอาหารอะไร เพราะอะไร?", `
        <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#9d174d;margin-bottom:6px;"><b>เขียนคำตอบ:</b></div>
          ${writeBox()}
        </div>`),
    ],
  },

  // ============ WS 4: การอ่านจับใจความ ============
  {
    num: "๔",
    topic: "การอ่านจับใจความ — คิดวิเคราะห์เรื่อง ครัวป่า",
    objective: "บอกเนื้อหาสาระ วิเคราะห์และแสดงความคิดเห็น และนำข้อคิดไปใช้ในชีวิตประจำวันได้",
    activities: [
      card("blue", "๑", "ตอบคำถามคิดวิเคราะห์จากเรื่อง “ครัวป่า”",
        qaBox("blue", [
          "เหตุใดเรื่องนี้จึงตั้งชื่อว่า “ครัวป่า”?",
          "ถ้านักเรียนเป็นภูผาและน้ำใส จะรู้สึกอย่างไร?",
          "ทำไมต้องเอาดินมาพอกตัวปลาก่อนนำไปย่าง?",
        ])),

      card("green", "๒", "เขียนบอกอาหารที่นักเรียนทำเป็น พร้อมบอกส่วนผสมที่ใช้", `
        <table class="cat-table">
          <tr><th style="width:45%">ชื่ออาหารที่ทำเป็น</th><th>ส่วนผสมที่ใช้</th></tr>
          <tr><td></td><td></td></tr>
          <tr><td></td><td></td></tr>
        </table>`),

      card("pink", "๓", "เลือกอาหารจากครัวป่าที่ประทับใจ ๑ อย่าง วาดภาพและบอกขั้นตอนการทำ",
        drawBox("pink", 120, "ขั้นตอนการทำ:")),

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
          ["หิว", "เช้าตรู่", "ท่วม", "กลิ่น", "หุง"],
          "<b>หุง</b> &nbsp;→&nbsp; ห – อุ – ง &nbsp; อ่านว่า &nbsp; <b>หุง</b>")),

      card("blue", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "หิว", m: "อยากกินอาหาร" },
          { w: "เช้าตรู่", m: "เวลาเช้ามืด ยังไม่สาย" },
          { w: "ท่วม", m: "น้ำเอ่อขึ้นมามาก" },
          { w: "กลิ่น", m: "สิ่งที่รับรู้ได้ด้วยจมูก" },
          { w: "หุง", m: "ทำให้ข้าวสุกด้วยน้ำและไฟ" },
          { w: "อร่อย", m: "มีรสชาติดี น่ากิน" },
        ])),

      card("green", "๓", "เลือกคำที่กำหนดให้เติมลงในประโยคให้ถูกต้อง",
        fillSentences("green", "หิว • เช้าตรู่ • ท่วม • กลิ่น • หุง", [
          "แม่ตื่นแต่ @ มาหุงข้าวให้ลูก",
          "พี่ @ ข้าวจนสุกหอม",
          "ฝนตกหนักจนน้ำ @ ถนน",
          "ฉันได้ @ อาหารหอม จึงรู้สึก @ ข้าว",
        ])),

      card("pink", "๔", "เลือกคำศัพท์ที่กำหนดให้ มาแต่งประโยค (อย่างน้อย ๕ ประโยค)", `
        <div class="hint"><b>คำที่ใช้ :</b> หิว • เช้าตรู่ • ท่วม • กลิ่น • หุง • ย่าง • นึ่ง • ผัก</div>
        ${writeBox()}`),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["หิว", "เช้าตรู่", "ท่วม", "กลิ่น", "หุง", "ย่าง", "นึ่ง", "ผัก", "เมฆ", "ลอย"])),
    ],
  },

  // ============ WS 6: สระเอือะ สระเอือ ============
  {
    num: "๖",
    topic: "สระเอือะ สระเอือ",
    objective: "บอกรูปสระเอือะและสระเอือได้ ประสมคำและอ่านแจกลูกสะกดคำได้",
    activities: [
      card("yellow", "๑", "อ่านบท “เพลงสระเอือ” แล้วเติมคำที่หายไปลงในช่องว่าง",
        songActivity("เพลงสระเอือ",
          [
            `เอ อือ <span class="blank"></span> เอ อือ ออ รวมเรียกสระ<span class="blank"></span>`,
            `เอนั้นเดินนำหน้า อือนั้นอยู่ข้าง<span class="blank"></span>`,
            `ออ ขอตามด้วยคน สุขเหลือล้นไปกันสาม<span class="blank"></span>`,
          ],
          "ออ &nbsp;•&nbsp; เอือ &nbsp;•&nbsp; บน &nbsp;•&nbsp; เกลอ")),

      card("green", "๒", "เติมพยัญชนะต้นที่กำหนด แล้วประสมคำกับสระเอือ ( เ–ือ )",
        tableActivity("green",
          ["พยัญชนะต้น", "+ สระ", "= คำ (ให้นักเรียนเขียน)"],
          [
            ["จ", "เ–ือ", ""],
            ["บ", "เ–ือ", ""],
            ["ส", "เ–ือ", ""],
            ["ถ", "เ–ือ", ""],
            ["ล", "เ–ือ", ""],
          ])),

      card("pink", "๓", "อ่านแจกลูกสะกดคำต่อไปนี้แล้วเขียนคำที่อ่านได้",
        spellActivity(
          ["เนื้อ", "เมื่อ", "เพื่อน", "เครื่อง", "เปลือก"],
          "<b>เสือ</b> &nbsp;→&nbsp; ส – เอือ – เสือ &nbsp; อ่านว่า &nbsp; <b>เสือ</b>")),

      card("purple", "๔", "คัดคำที่ประสมด้วยสระเอือต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["เนื้อ", "เมื่อ", "เพื่อน", "เลื้อย", "เครื่อง", "เกลื่อน", "เปลือก", "เชื้อ", "เอื่อย", "เปลือง"])),
    ],
  },

  // ============ WS 7: คำควบกล้ำ ============
  {
    num: "๗",
    topic: "การอ่านและสังเกตคำ — คำควบกล้ำ",
    objective: "อ่านสะกดคำในบทเรียนได้ บอกความหมายของคำและนำคำไปใช้ได้ถูกต้อง",
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

      card("green", "๒", "แยกประเภทคำต่อไปนี้ลงในตารางให้ถูกต้อง",
        catActivity(
          ["คำควบแท้", "คำควบไม่แท้", "อักษร ทร (อ่าน ซ)"],
          [["", "", ""], ["", "", ""]],
          "กราบ • ขวาน • จริง • สร้าง • ทราบ • พุทรา • กวาง • เศร้า • ครู • ไทร")),

      card("pink", "๓", "วงกลมคำที่เป็น “คำควบกล้ำ” ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "พริก", "จริง", "กราบ", "สร้าง",
          "เกลียด", "โกรธ", "ทราบ", "คลอง",
          "กวาง", "สร้อย", "นก", "ปลา",
        ])),

      card("purple", "๔", "คัดคำควบกล้ำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["พริก", "กราบ", "สร้าง", "เกลียด", "โกรธ", "คลอง", "กวาง", "สร้อย", "ความ", "ขวาน"])),
    ],
  },

  // ============ WS 8: มาตราตัวสะกด ============
  {
    num: "๘",
    topic: "มาตราตัวสะกด — แม่เกย แม่กก แม่กบ",
    objective: "อ่านสะกดคำในบทเรียนได้ บอกความหมายของคำและนำคำไปใช้ได้ถูกต้อง",
    activities: [
      card("yellow", "๑", "แยกประเภทคำต่อไปนี้ลงในตารางมาตราตัวสะกดให้ถูกต้อง",
        catActivity(
          ["แม่เกย (ย)", "แม่กก (ก ข ค ฆ)", "แม่กบ (บ ป พ ฟ ภ)"],
          [["", "", ""], ["", "", ""]],
          "กล้วย • ช่วย • หลาย • เมฆ • โรค • ภาพ • เสียบ • หยาบ")),

      card("blue", "๒", "เติมตัวสะกดที่หายไป พร้อมบอกชื่อมาตราตัวสะกด",
        tableActivity("blue",
          ["คำ", "เติมตัวสะกด", "มาตรา"],
          [
            ["กล้ว_", "", ""],
            ["เม_", "", ""],
            ["โร_", "", ""],
            ["ภา_", "", ""],
            ["เสีย_", "", ""],
          ])),

      card("green", "๓", "แยกส่วนประกอบของคำลงในตารางให้ถูกต้อง",
        tableActivity("green",
          ["คำ", "พยัญชนะต้น", "สระ", "ตัวสะกด"],
          [
            ["กล้วย", "", "", ""],
            ["เมฆ", "", "", ""],
            ["ภาพ", "", "", ""],
            ["เสียบ", "", "", ""],
          ])),

      card("pink", "๔", "วงกลมคำที่มีตัวสะกดในมาตรา “แม่กก”",
        wordGridActivity([
          "เมฆ", "โรค", "กล้วย", "ภาพ",
          "เสียบ", "ช่วย", "หลาย", "นก",
          "ปลา", "โชค", "หยาบ", "ปาก",
        ])),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["กล้วย", "เมฆ", "โรค", "หยาบ", "ช่วย", "ปลี", "ภาพ", "เสียบ", "ร้อน", "หลาย"])),
    ],
  },

  // ============ WS 9: อ่านคล่อง ร้องเล่น ============
  {
    num: "๙",
    topic: "อ่านคล่อง ร้องเล่น — “อร่อย อร่อย”",
    objective: "อ่านคำง่าย ๆ ได้ และร้องเล่นแสดงท่าทางประกอบบทร้องเล่นได้",
    activities: [
      card("blue", "๑", "อ่านคำคล้องจอง แล้วเติมคำตอบลงในช่องว่างให้ถูกต้อง",
        fillSentences("blue", "ต้นไทร • ต้นโพ • นก • ผีเสื้อ • ช้าง", [
          "เอ๊ะ! นั่นอะไร ต้นใหญ่ต้นโต → @ @",
          "เอ๊ะ! นั่นเสียงใคร ร้องจิ๊บ จิ๊บ → @",
          "เอ๊ะ! อะไรน่ามอง เหมือนดอกไม้บิน → @",
          "เอ๊ะ! มีงวงมีงา วางท่าใหญ่โต → @",
        ])),

      card("green", "๒", "หาคำที่ “คล้องจอง” กับคำที่กำหนด แล้วเขียนลงในช่องว่าง",
        tableActivity("green",
          ["คำที่กำหนด", "คำที่คล้องจอง"],
          [["ป่า", ""], ["ไว", ""], ["โต", ""], ["บิน", ""]])),

      card("pink", "๓", "วาดภาพสัตว์หรือสิ่งที่พบในป่า พร้อมเขียนชื่อใต้ภาพ",
        drawBox("pink", 120, "ชื่อภาพที่วาด:")),

      card("purple", "๔", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["อร่อย", "เดินป่า", "ต้นไทร", "ผีเสื้อ", "ช้าง", "นก", "งวง", "จิ๊บ"])),
    ],
  },

  // ============ WS 10: ชวนคิด ชวนทำ คำคล้องจอง ============
  {
    num: "๑๐",
    topic: "ชวนคิด ชวนทำ — คำคล้องจอง",
    objective: "ต่อคำคล้องจองได้ และใช้คำได้ถูกต้องตามบริบท",
    activities: [
      card("blue", "๑", "ต่อคำคล้องจอง ๒ พยางค์ จากคำที่กำหนด (ดูตัวอย่าง)", `
        <div class="ex" style="border-left-color:var(--blue-b)"><b>ตัวอย่าง :</b> &nbsp; ไปเที่ยว &nbsp;→&nbsp; เลี้ยวมา</div>
        ${tableActivity("blue",
          ["คำที่กำหนด", "ต่อคำคล้องจอง"],
          [["น้ำพริก", ""], ["เดินป่า", ""], ["กินข้าว", ""], ["ดอกไม้", ""]])}`),

      card("green", "๒", "โยงเส้นจับคู่คำที่ “คล้องจอง” กัน",
        matchActivity([
          { w: "นา", m: "ปลา" },
          { w: "มือ", m: "ถือ" },
          { w: "ใจ", m: "ไป" },
          { w: "กิน", m: "ดิน" },
          { w: "ดาว", m: "ขาว" },
          { w: "มี", m: "ปี" },
        ])),

      card("pink", "๓", "แต่งคำคล้องจอง ๒ พยางค์ ของนักเรียนเอง มา ๕ คู่", `
        <div class="ex" style="border-left-color:var(--pink-b)"><b>ตัวอย่าง :</b> &nbsp; กินนา &nbsp;→&nbsp; ปลาทู</div>
        ${writeBox()}`),

      card("purple", "๔", "สรุปสิ่งที่ได้เรียนรู้จากบทเรียน “ครัวป่า” และการนำไปใช้",
        panelsActivity([
          { label: "✦ สิ่งที่ได้เรียนรู้จากบท ครัวป่า" },
          { label: "♥ ฉันจะนำไปใช้อย่างไร" },
        ])),
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
  const pdfPath = join(__dirname, `ใบงานที่_${ws.num}_บทที่_๓_ครัวป่า.pdf`);
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
