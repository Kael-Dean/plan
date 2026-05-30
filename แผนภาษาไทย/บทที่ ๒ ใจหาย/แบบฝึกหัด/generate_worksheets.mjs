// Generate 10 worksheet HTML files for Chapter 2 (ใจหาย)
// Then convert each to PDF via Edge headless
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== SHARED CSS (copied from chapter 1 worksheet style) ==========
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
  /* 3-line guide (like Thai handwriting paper): solid top + light middle guide + solid bottom */
  .spell td.line{background:
    linear-gradient(#22a06b,#22a06b) 0 0/100% 1.2px no-repeat,
    linear-gradient(#a3d9bb,#a3d9bb) 0 50%/100% 1px no-repeat,
    linear-gradient(#22a06b,#22a06b) 0 100%/100% 1.2px no-repeat;
    height:38px;}
  .ex{margin:0 0 5px; padding:4px 12px;
    background:#fff; border-left:5px solid var(--green-b); border-radius:8px;
    font-family:"Sarabun"; font-size:11.5pt;}
  .ex b{font-family:"Mali"; color:#0f6b3f}
  .pics{display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-top:4px;}
  .pic-card{background:#fff; border:1.6px solid var(--pink-b); border-radius:10px;
    padding:4px 4px 6px; text-align:center;}
  .pic-box{width:100%; aspect-ratio:1/0.85;
    border:1.5px dashed #f5a1c0; border-radius:8px; background:#fff7fb;
    display:flex; align-items:center; justify-content:center;
    font-size:36pt;}
  .pic-blank{margin-top:5px; height:20px; border-radius:6px;
    background:repeating-linear-gradient(to right,
      var(--pink-b) 0, var(--pink-b) 4px, transparent 4px, transparent 10px) bottom/100% 1.6px no-repeat;}
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
  /* extra for write/answer panels */
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
`;

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
    <h2>บทที่ ๒  ใจหาย</h2>
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

// ========== ACTIVITY BUILDERS ==========
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

function picActivity(hint, items) {
  return `<div class="hint"><b>คำที่ใช้ :</b> ${hint}</div>
    <div class="pics">${items.map(i => `
      <div class="pic-card">
        <div class="pic-box">${i.emoji || "🖼️"}</div>
        <div class="pic-blank"></div>
      </div>`).join("")}</div>`;
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
    <div class="note"><b>คำที่ใช้เติม :</b> ${hintWords}</div>
  </div>`;
}

function panelsActivity(panels) {
  return `<div class="panel-row">${panels.map(p => `
    <div class="panel">
      <div class="pl">${p.label}</div>
      <div class="lines-3"></div>
    </div>`).join("")}</div>`;
}

function catActivity(headers, rows) {
  return `<table class="cat-table">
    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
    ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
  </table>`;
}

function writeBox() {
  return `<div class="lines-tall"></div>`;
}

// ========== BUILD WHOLE PAGE ==========
function buildPage(num, topic, objective, activities) {
  return `<!doctype html><html lang="th"><head>
<meta charset="utf-8"><title>ใบงานที่ ${num} บทที่ ๒ ใจหาย</title>
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

// ========== WORKSHEET DEFINITIONS (10 worksheets for chapter 2) ==========
const WORKSHEETS = [
  // ============ WS 1: เรียนรู้คำ นำเรื่อง ============
  {
    num: "๑",
    topic: "เรียนรู้คำ นำเรื่อง",
    objective: "อ่านแจกลูกสะกดคำ และบอกความหมายของคำในบทเรียนได้",
    activities: [
      card("yellow", "๑", "อ่านบทร้องเล่น แล้วเติมคำที่หายไปลงในช่องว่าง",
        songActivity("คิดถึง เพื่อนรัก",
          [
            `ใจ<span class="blank"></span> คิดถึง เพื่อน<span class="blank"></span>`,
            `เคยอยู่พร้อมพรัก จะต้อง<span class="blank"></span>กัน`,
            `เคย<span class="blank"></span> เคยกิน เคย<span class="blank"></span>`,
            `อีกไม่นานนัก คงได้พบกัน`,
          ],
          "หาย &nbsp;•&nbsp; รัก &nbsp;•&nbsp; จาก &nbsp;•&nbsp; เล่น &nbsp;•&nbsp; ฝัน")),

      card("blue", "๒", "โยงเส้นจับคู่คำกับความหมายให้ถูกต้อง",
        matchActivity([
          { w: "ตะโกน", m: "พูดเสียงดังให้ได้ยินไกล" },
          { w: "ประชุม", m: "การมารวมตัวกันเพื่อพูดคุย" },
          { w: "ปางช้าง", m: "ที่อยู่ของช้าง" },
          { w: "ขบวน", m: "หมู่หรือแถวที่เคลื่อนตามกัน" },
          { w: "ใจหาย", m: "ตกใจ ใจสั่น เพราะรู้สึกเสียดาย" },
          { w: "พยักหน้า", m: "การก้มศีรษะเพื่อตอบรับ" },
          { w: "บริเวณ", m: "พื้นที่หรืออาณาเขต" },
          { w: "ปลอดภัย", m: "พ้นจากอันตราย" },
        ])),

      card("green", "๓", "เขียนแจกลูกสะกดคำตามตัวอย่าง",
        spellActivity(
          ["ไหล่", "ตะโกน", "ประชุม", "ปางช้าง", "ขบวน"],
          "ตัด &nbsp;→&nbsp; <b>ต – อะ – ด</b> &nbsp; อ่านว่า &nbsp; <b>ตัด</b>")),

      card("pink", "๔", "ดูภาพแล้วเลือกคำที่กำหนดให้เขียนลงในช่องว่าง",
        picActivity(
          "ช้าง &nbsp;•&nbsp; น้ำ &nbsp;•&nbsp; ครอบครัว &nbsp;•&nbsp; เพื่อน &nbsp;•&nbsp; กอด",
          [
            { emoji: "🐘" },
            { emoji: "💧" },
            { emoji: "👨‍👩‍👧" },
            { emoji: "👥" },
            { emoji: "🫂" },
          ])),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ใจหาย", "ตะโกน", "ประชุม", "ปางช้าง", "ขบวน", "พยักหน้า", "ปลอดภัย", "บริเวณ", "ใบโบก", "ใบบัว"])),
    ],
  },

  // ============ WS 2: อ่านจับใจความ ============
  {
    num: "๒",
    topic: "อ่านจับใจความ — เรื่อง ใจหาย",
    objective: "บอกเนื้อหาสาระจากบทเรียน และนำข้อคิดจากเรื่องไปใช้ในชีวิตประจำวันได้",
    activities: [
      card("yellow", "๑", "ตอบคำถามจากเรื่อง “ใจหาย” โดยเขียนคำตอบลงในช่องว่าง", `
        <div style="background:#fff;border:1.5px dashed var(--yellow-b);border-radius:10px;padding:10px;">
          <div style="margin-bottom:8px;"><b>๑.</b> ตัวเอกของเรื่องชื่ออะไร?<div class="lines-3" style="margin-top:4px"></div></div>
          <div style="margin-bottom:8px;"><b>๒.</b> ลูกช้างทั้งสองตัวชื่อว่าอะไร?<div class="lines-3" style="margin-top:4px"></div></div>
          <div style="margin-bottom:8px;"><b>๓.</b> เด็ก ๆ ทำอะไรกับลูกช้างริมบ่อทราย?<div class="lines-3" style="margin-top:4px"></div></div>
          <div><b>๔.</b> ทำไมภูผาจึงรู้สึก “ใจหาย”?<div class="lines-3" style="margin-top:4px"></div></div>
        </div>`),

      card("blue", "๒", "วงกลมคำที่ตรงกับนิสัยของ “ภูผา” ในเรื่อง", `
        <div class="chip-row">
          <span class="chip">ใจดี</span><span class="chip">มีน้ำใจ</span>
          <span class="chip">รักเพื่อน</span><span class="chip">รักสัตว์</span>
          <span class="chip">ขี้กลัว</span><span class="chip">เห็นแก่ตัว</span>
          <span class="chip">อ่อนโยน</span><span class="chip">ใจร้อน</span>
          <span class="chip">รู้จักคิด</span><span class="chip">ขี้โมโห</span>
        </div>`),

      card("green", "๓", "เปรียบเทียบความรู้สึกของ ภูผา และ ลูกช้าง เมื่อต้องจากกัน", `
        <table class="cat-table">
          <tr><th>ความรู้สึกของภูผา</th><th>ความรู้สึกของลูกช้าง</th></tr>
          <tr><td></td><td></td></tr>
          <tr><td></td><td></td></tr>
        </table>`),

      card("pink", "๔", "ลองคิดดู — ถ้านักเรียนต้องจากเพื่อนรักไป จะทำอย่างไร?", `
        <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#9d174d;margin-bottom:6px;"><b>เขียนคำตอบ:</b></div>
          ${writeBox()}
        </div>`),

      card("purple", "๕", "ข้อคิดจากเรื่อง “ใจหาย” และการนำไปใช้ในชีวิตประจำวัน",
        panelsActivity([
          { label: "✦ ข้อคิดที่ได้จากเรื่อง" },
          { label: "♥ ฉันจะนำไปใช้อย่างไร" },
        ])),
    ],
  },

  // ============ WS 3: คำและกลุ่มคำ ============
  {
    num: "๓",
    topic: "คำและกลุ่มคำ",
    objective: "อ่านสะกดคำในบทเรียนได้ และบอกความหมายของคำและนำไปใช้ได้ถูกต้อง",
    activities: [
      card("yellow", "๑", "แยกประเภทคำต่อไปนี้ลงในตารางให้ถูกต้อง", `
        <div class="hint"><b>คำที่ใช้ :</b> ปางช้าง • ประชุม • ตะโกน • ใบโบก • ไหล่ • ขบวน • ใบบัว • ภูผา • พยักหน้า • ลูกช้าง</div>
        <table class="cat-table">
          <tr><th style="width:33%">ชื่อตัวละคร</th><th style="width:33%">สถานที่/สิ่งของ</th><th style="width:33%">การกระทำ</th></tr>
          <tr><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td></tr>
        </table>`),

      card("blue", "๒", "อ่านคำต่อไปนี้แล้วโยงเส้นจับคู่กับคำที่มีความหมายใกล้เคียง",
        matchActivity([
          { w: "ตะโกน", m: "ร้อง / เปล่งเสียงดัง" },
          { w: "ประชุม", m: "รวมตัว / มาพร้อมกัน" },
          { w: "ปลอดภัย", m: "พ้นภัย / ไม่มีอันตราย" },
          { w: "พยักหน้า", m: "ตอบรับ / ผงกศีรษะ" },
          { w: "ใจหาย", m: "ตกใจ / รู้สึกหวิว" },
          { w: "บริเวณ", m: "อาณาเขต / พื้นที่" },
        ])),

      card("green", "๓", "เติมคำที่ขาดหายในประโยคต่อไปนี้", `
        <div class="hint"><b>คำที่ใช้ :</b> ใจหาย • ปางช้าง • พยักหน้า • ตะโกน • ปลอดภัย</div>
        <div style="background:#fff;border-left:5px solid var(--green-b);border-radius:8px;padding:8px 12px;font-family:Sarabun;font-size:12.5pt;line-height:2.4">
          <div><b>๑.</b> เด็ก ๆ ไปเล่นกับลูกช้างที่ <span style="border-bottom:1.5px dashed #0f6b3f;display:inline-block;min-width:80px;"></span></div>
          <div><b>๒.</b> ภูผารู้สึก <span style="border-bottom:1.5px dashed #0f6b3f;display:inline-block;min-width:80px;"></span> เมื่อรู้ว่าต้องจากลูกช้าง</div>
          <div><b>๓.</b> เมื่อเขาเข้าใจ เขา <span style="border-bottom:1.5px dashed #0f6b3f;display:inline-block;min-width:80px;"></span> รับ</div>
          <div><b>๔.</b> เด็ก ๆ <span style="border-bottom:1.5px dashed #0f6b3f;display:inline-block;min-width:80px;"></span> เรียกลูกช้างให้มาเล่น</div>
          <div><b>๕.</b> ลูกช้างอยู่อย่าง <span style="border-bottom:1.5px dashed #0f6b3f;display:inline-block;min-width:80px;"></span> ในปางช้าง</div>
        </div>`),

      card("pink", "๔", "เลือกคำที่กำหนดให้แต่งประโยคให้ถูกต้อง (เลือกอย่างน้อย ๕ คำ)", `
        <div class="hint"><b>คำที่ใช้ :</b> ภูผา • ลูกช้าง • บ่อทราย • ใจหาย • ปลอดภัย • กอด • อาสา • ประชุม</div>
        ${writeBox()}`),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง",
        copyActivity(["ใจหาย", "ปางช้าง", "ตะโกน", "ประชุม", "พยักหน้า", "ปลอดภัย", "บริเวณ", "ลูกช้าง", "อาสา", "ขบวน"])),
    ],
  },

  // ============ WS 4: สระเอียะ สระเอีย ============
  {
    num: "๔",
    topic: "สระเอียะ สระเอีย",
    objective: "บอกรูปสระเอียะและสระเอียได้ และประสมคำด้วยสระเอียะและสระเอียได้",
    activities: [
      card("yellow", "๑", "ดูตารางประสมคำ แล้วอ่านออกเสียงดัง ๆ", `
        <div style="background:#fff;border:1.5px dashed var(--yellow-b);border-radius:10px;padding:10px;">
          <div style="text-align:center;font-family:Mali;font-size:16pt;color:#a16207;margin-bottom:4px"><b>สระเอียะ ( เ–ียะ )</b></div>
          <table class="spell" style="border-color:#f3c64a">
            <thead><tr><th>พยัญชนะต้น</th><th>+ สระ</th><th>= คำ</th></tr></thead>
            <tbody>
              <tr><td class="w" style="color:#a16207;background:#fff6db">ก</td><td style="text-align:center">เ–ียะ</td><td style="text-align:center;font-family:Mali;font-size:15pt"><b>เกียะ</b></td></tr>
              <tr><td class="w" style="color:#a16207;background:#fff6db">ผ</td><td style="text-align:center">เ–ียะ</td><td style="text-align:center;font-family:Mali;font-size:15pt"><b>เผียะ</b></td></tr>
              <tr><td class="w" style="color:#a16207;background:#fff6db">พ</td><td style="text-align:center">เ–ียะ</td><td style="text-align:center;font-family:Mali;font-size:15pt"><b>เพียะ</b></td></tr>
            </tbody>
          </table>
        </div>`),

      card("blue", "๒", "เติมพยัญชนะต้นที่กำหนด แล้วประสมคำกับสระเอีย ( เ–ีย )", `
        <table class="spell" style="border-color:var(--blue-b)">
          <thead style="background:var(--blue-b)"><tr><th>พยัญชนะต้น</th><th>+ สระ</th><th>= คำ (ให้นักเรียนเขียน)</th></tr></thead>
          <tbody>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ก</td><td style="text-align:center">เ–ีย</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ป</td><td style="text-align:center">เ–ีย</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ข</td><td style="text-align:center">เ–ีย</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ส</td><td style="text-align:center">เ–ีย</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ม</td><td style="text-align:center">เ–ีย</td><td class="line"></td></tr>
          </tbody>
        </table>`),

      card("green", "๓", "อ่านแจกลูกสะกดคำต่อไปนี้แล้วเขียนคำที่อ่านได้",
        spellActivity(
          ["เกี๊ยะ", "เผียะ", "เปรี๊ยะ", "เดียง", "เสียม"],
          "<b>เลี้ยง</b> &nbsp;→&nbsp; ล – อ – เอีย – ง – เลียง – ไม้โท &nbsp; อ่านว่า &nbsp; <b>เลี้ยง</b>")),

      card("pink", "๔", "วงกลมคำที่ใช้สระเอีย (เ–ีย) ในกลุ่มคำต่อไปนี้",
        wordGridActivity([
          "เสียม", "ดอกไม้", "เลี้ยง", "ปลา",
          "เดียง", "ภูเขา", "เปียก", "ขี่",
          "เมียง", "หิน", "เสีย", "บ้าน",
        ])),

      card("purple", "๕", "คัดคำที่มีสระเอียและสระเอียะลงในตาราง",
        copyActivity(["เกี๊ยะ", "เผียะ", "เปรี๊ยะ", "เลี้ยง", "เดียง", "เสียม", "เปียก", "เสีย", "เมียง", "เปีย"])),
    ],
  },

  // ============ WS 5: มาตราตัวสะกด ============
  {
    num: "๕",
    topic: "มาตราตัวสะกด — แม่กก แม่กด แม่กน",
    objective: "อ่านสะกดคำในบทเรียนได้ และนำคำไปใช้ได้ถูกต้องตามสถานการณ์",
    activities: [
      card("yellow", "๑", "แยกประเภทคำต่อไปนี้ลงในตารางมาตราตัวสะกดให้ถูกต้อง", `
        <div class="hint"><b>คำที่ใช้ :</b> มองทาง • แก้มจัด • บ้านเรือน • ปางช้าง • ลาน • ยิ้มเอม • คุณ • ทาน • คนจน • ปลอดภัย</div>
        <table class="cat-table">
          <tr><th>แม่กก (ก)</th><th>แม่กด (ด)</th><th>แม่กน (น, ญ, ณ, ร, ล, ฬ)</th></tr>
          <tr><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td></tr>
        </table>`),

      card("blue", "๒", "เติมตัวสะกดที่หายไปลงในช่องว่าง พร้อมบอกชื่อมาตราตัวสะกด", `
        <table class="spell" style="border-color:var(--blue-b)">
          <thead style="background:var(--blue-b)"><tr><th>คำ</th><th>เติมตัวสะกด</th><th>มาตรา</th></tr></thead>
          <tbody>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">มอง_</td><td class="line"></td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ยิ้ม_</td><td class="line"></td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ลา_</td><td class="line"></td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">บ้า_</td><td class="line"></td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">วา_</td><td class="line"></td><td class="line"></td></tr>
          </tbody>
        </table>`),

      card("green", "๓", "อ่านคำต่อไปนี้แล้วบอกว่าตัวสะกดอ่านออกเสียงเหมือนตัวใด", `
        <div class="ex"><b>ตัวอย่าง :</b> <b>การ</b> → ตัวสะกด <b>ร</b> อ่านออกเสียงเหมือน <b>น</b></div>
        <table class="spell">
          <thead><tr><th>คำ</th><th>ตัวสะกด อ่านออกเสียงเหมือนตัว…</th></tr></thead>
          <tbody>
            <tr><td class="w">ควาญ</td><td class="line"></td></tr>
            <tr><td class="w">วาฬ</td><td class="line"></td></tr>
            <tr><td class="w">ปัจจุบัน</td><td class="line"></td></tr>
            <tr><td class="w">บันดาล</td><td class="line"></td></tr>
            <tr><td class="w">สัญญาณ</td><td class="line"></td></tr>
          </tbody>
        </table>`),

      card("pink", "๔", "วงกลมคำที่มีตัวสะกดในมาตราแม่กน",
        wordGridActivity([
          "การ", "ดอก", "ใจ", "วาฬ",
          "คุณ", "ปัก", "ทาน", "ปาก",
          "ลาน", "แมว", "บัน", "ครีบ",
        ])),

      card("purple", "๕", "คัดคำต่อไปนี้ด้วยตัวบรรจง พร้อมบอกชื่อมาตราตัวสะกด",
        copyActivity(["มองทาง", "ปางช้าง", "แก้มจัด", "ยิ้มเอม", "ลาน", "ทาน", "ควาญ", "วาฬ", "บ้านเรือน", "สัญญาณ"])),
    ],
  },

  // ============ WS 6: อ่านคล่อง ร้องเล่น ============
  {
    num: "๖",
    topic: "อ่านคล่อง ร้องเล่น — “คิดถึง เพื่อนรัก”",
    objective: "อ่านบทร้องเล่นง่ายๆได้ และร้องและแสดงท่าทางประกอบบทร้องเล่นได้",
    activities: [
      card("yellow", "๑", "เติมคำที่หายไปในบทร้องเล่น “คิดถึง เพื่อนรัก”",
        songActivity("คิดถึง เพื่อนรัก",
          [
            `<span class="blank"></span>หาย คิดถึง เพื่อนรัก`,
            `เคยอยู่พร้อม<span class="blank"></span> จะต้องจากกัน`,
            `เคย<span class="blank"></span> เคยกิน เคยฝัน`,
            `แม้ยามพักผ่อน ยังหวล<span class="blank"></span>`,
            `อาทร เพื่อนเล่น เพื่อน<span class="blank"></span>`,
            `อีกไม่นานนัก คงได้พบกัน`,
          ],
          "ใจ &nbsp;•&nbsp; พรัก &nbsp;•&nbsp; เล่น &nbsp;•&nbsp; รำลึก &nbsp;•&nbsp; รัก")),

      card("blue", "๒", "โยงเส้นจับคู่คำในบทร้องเล่นกับความหมาย",
        matchActivity([
          { w: "ใจหาย", m: "ตกใจ ใจสั่น" },
          { w: "พร้อมพรัก", m: "อยู่ด้วยกันอย่างพร้อมเพรียง" },
          { w: "รำลึก", m: "นึกถึง คิดถึง" },
          { w: "อาทร", m: "ห่วงใย เอื้ออาทร" },
          { w: "เพื่อนเล่น", m: "เพื่อนที่เคยเล่นด้วยกัน" },
          { w: "พบกัน", m: "เจอกัน มาเจอกันใหม่" },
        ])),

      card("green", "๓", "อ่านสะกดคำต่อไปนี้จากบทร้องเล่น",
        spellActivity(
          ["รัก", "หาย", "เล่น", "รำลึก", "อาทร"],
          "<b>คิด</b> &nbsp;→&nbsp; ค – อิ – ด &nbsp; อ่านว่า &nbsp; <b>คิด</b>")),

      card("pink", "๔", "ตอบคำถามจากบทร้องเล่น", `
        <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;padding:10px;">
          <div style="margin-bottom:8px;"><b>๑.</b> บทร้องเล่นนี้บอกความรู้สึกอะไร?<div class="lines-3" style="margin-top:4px"></div></div>
          <div style="margin-bottom:8px;"><b>๒.</b> คำใดในบทร้องเล่นที่หมายความว่า “นึกถึง”?<div class="lines-3" style="margin-top:4px"></div></div>
          <div><b>๓.</b> ผู้ร้องเชื่อว่าจะพบเพื่อนอีกหรือไม่ เพราะอะไร?<div class="lines-3" style="margin-top:4px"></div></div>
        </div>`),

      card("purple", "๕", "คัดบทร้องเล่นนี้ด้วยลายมือสวยงาม", `
        <div style="background:#fff;border:1.5px solid var(--purple-b);border-radius:10px;padding:10px;">
          <div class="lines-tall" style="height:160px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 24px,#d8cbff 24px,#d8cbff 25px);"></div>
        </div>`),
    ],
  },

  // ============ WS 7: ชวนคิด ชวนทำ — หาคำเสริม "ใจ" ============
  {
    num: "๗",
    topic: "ชวนคิด ชวนทำ — หาคำเสริม “ใจ”",
    objective: "อ่านคำที่กำหนดให้ได้ และใช้คำได้ถูกต้องตามบริบท",
    activities: [
      card("yellow", "๑", "เติมคำในตารางให้สมบูรณ์ โดยใช้คำว่า “ใจ” นำหน้าหรือต่อท้าย", `
        <div class="ex"><b>ตัวอย่าง :</b> <b>ใจ</b>หาย • หาย<b>ใจ</b> • <b>ใจ</b>เสีย • เสีย<b>ใจ</b></div>
        <table class="cat-table">
          <tr><th>คำที่ขึ้นต้นด้วย “ใจ”</th><th>คำที่ลงท้ายด้วย “ใจ”</th></tr>
          <tr><td>ใจหาย</td><td>หายใจ</td></tr>
          <tr><td></td><td></td></tr>
          <tr><td></td><td></td></tr>
          <tr><td></td><td></td></tr>
        </table>`),

      card("blue", "๒", "เลือกคำที่กำหนดให้เติมลงในประโยคให้ถูกต้อง", `
        <div class="hint"><b>คำที่ใช้ :</b> ใจดี • เสียใจ • ใจร้อน • พอใจ • ห่วงใย</div>
        <div style="background:#fff;border:1.5px solid var(--blue-b);border-radius:8px;padding:8px 12px;font-family:Sarabun;font-size:12.5pt;line-height:2.4">
          <div><b>๑.</b> คุณครู <span style="border-bottom:1.5px dashed #1d4ed8;display:inline-block;min-width:80px;"></span> ทุกคน จึงรักนักเรียน</div>
          <div><b>๒.</b> ภูผารู้สึก <span style="border-bottom:1.5px dashed #1d4ed8;display:inline-block;min-width:80px;"></span> ที่ต้องจากลูกช้าง</div>
          <div><b>๓.</b> อย่า <span style="border-bottom:1.5px dashed #1d4ed8;display:inline-block;min-width:80px;"></span> ค่อย ๆ คิดดี ๆ ก่อน</div>
          <div><b>๔.</b> คุณแม่ <span style="border-bottom:1.5px dashed #1d4ed8;display:inline-block;min-width:80px;"></span> ในผลการเรียนของลูก</div>
          <div><b>๕.</b> เพื่อน ๆ <span style="border-bottom:1.5px dashed #1d4ed8;display:inline-block;min-width:80px;"></span> ช้างทุกตัว</div>
        </div>`),

      card("green", "๓", "โยงเส้นจับคู่คำที่มี “ใจ” กับความหมาย",
        matchActivity([
          { w: "ใจดี", m: "มีน้ำใจ มีเมตตา" },
          { w: "ใจร้อน", m: "หงุดหงิดง่าย ทำอะไรเร็ว" },
          { w: "เสียใจ", m: "รู้สึกเศร้า ไม่สบายใจ" },
          { w: "พอใจ", m: "ชอบ ยินดี ถูกใจ" },
          { w: "ห่วงใย", m: "เป็นห่วง อาทรกัน" },
          { w: "หายใจ", m: "การสูดและปล่อยลม" },
        ])),

      card("pink", "๔", "ทายปริศนาเกี่ยวกับช้าง — เขียนคำตอบลงในช่อง", `
        <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;padding:10px;line-height:2;">
          <div><b>๑.</b> อะไรเอ่ย ดูดน้ำเอา เอาไว้เดิน → คำตอบ: <span style="border-bottom:1.5px dashed #be185d;display:inline-block;min-width:100px;"></span></div>
          <div><b>๒.</b> อะไรเอ่ย ขาวยาวเด่นอยู่ข้างปาก ใช้แทงและงัด → คำตอบ: <span style="border-bottom:1.5px dashed #be185d;display:inline-block;min-width:100px;"></span></div>
          <div><b>๓.</b> อะไรเอ่ย ใช้พัดกันยุง รับฟังเสียง → คำตอบ: <span style="border-bottom:1.5px dashed #be185d;display:inline-block;min-width:100px;"></span></div>
          <div><b>๔.</b> อะไรเอ่ย อยู่ปลายตัว ไว้ปัดยุง → คำตอบ: <span style="border-bottom:1.5px dashed #be185d;display:inline-block;min-width:100px;"></span></div>
        </div>`),

      card("purple", "๕", "วาดรูปและเขียนคำตอบของกิจกรรม “หาคำเสริม ใจ-”", `
        <div style="background:#fff;border:1.5px solid var(--purple-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#4c1d95;text-align:center;font-size:13pt;margin-bottom:6px;">วาดวงกลม ๒ วง — เขียนคำใน “ใจ” คำหน้า ในวงซ้าย / “ใจ” คำหลัง ในวงขวา</div>
          <div style="height:140px;border:1.5px dashed #c4b5fd;border-radius:8px;background:#faf7ff;"></div>
        </div>`),
    ],
  },

  // ============ WS 8: บทดอกสร้อย ============
  {
    num: "๘",
    topic: "การอ่านบทดอกสร้อย “กาดำ”",
    objective: "อ่านบทดอกสร้อย กาดำ ออกเสียงได้ถูกต้อง และบอกคำสัมผัสหรือคำคล้องจองได้",
    activities: [
      card("yellow", "๑", "อ่านบทดอกสร้อย “กาดำ” ด้วยน้ำเสียงไพเราะ",
        songActivity("ดอกสร้อย กาดำ",
          [
            `กาเอ๋ย กาดำ &nbsp; รูปก็ดำ &nbsp; ขนก็ดำ`,
            `หาเหยื่อในที่ลำ &nbsp;ธาร &nbsp; เป็นนิจสิน`,
            `ครั้นเห็นเงาตัวเอง &nbsp; ขนเปลี่ยนเป็นสีดี`,
            `ฯ ลฯ &nbsp; (อ่านต่อในหน้าหนังสือ)`,
          ],
          "อ่านตามครู • ออกเสียงให้ชัด • หาคำคล้องจอง")),

      card("blue", "๒", "หาคำที่คล้องจองกันในบทดอกสร้อย", `
        <table class="spell" style="border-color:var(--blue-b)">
          <thead style="background:var(--blue-b)"><tr><th>คำที่ ๑</th><th>คำที่คล้องจอง</th></tr></thead>
          <tbody>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ดำ</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">ธาร</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">นิจ</td><td class="line"></td></tr>
            <tr><td class="w" style="color:#1d4ed8;background:#dbeafe">เอง</td><td class="line"></td></tr>
          </tbody>
        </table>`),

      card("green", "๓", "ตอบคำถามจากบทดอกสร้อย “กาดำ”", `
        <div style="background:#fff;border-left:5px solid var(--green-b);border-radius:8px;padding:8px 12px;font-family:Sarabun;font-size:12.5pt;line-height:2.4">
          <div><b>๑.</b> กาในบทดอกสร้อยมีลักษณะอย่างไร?<div class="lines-3" style="margin-top:4px"></div></div>
          <div><b>๒.</b> กาหาอาหารจากไหน?<div class="lines-3" style="margin-top:4px"></div></div>
          <div><b>๓.</b> นักเรียนได้ข้อคิดอะไรจากบทดอกสร้อยนี้?<div class="lines-3" style="margin-top:4px"></div></div>
        </div>`),

      card("pink", "๔", "วงกลมคำที่ปรากฏในบทดอกสร้อย “กาดำ”",
        wordGridActivity([
          "กา", "ดำ", "ขน", "เงา",
          "ธาร", "เหยื่อ", "นิจ", "สิน",
          "ม้า", "วัว", "ตา", "เปลี่ยน",
        ])),

      card("purple", "๕", "คัดบทดอกสร้อย “กาดำ” ด้วยลายมือสวยงาม", `
        <div style="background:#fff;border:1.5px solid var(--purple-b);border-radius:10px;padding:10px;">
          <div class="lines-tall" style="height:180px;background:repeating-linear-gradient(to bottom,transparent 0,transparent 26px,#d8cbff 26px,#d8cbff 27px);"></div>
        </div>`),
    ],
  },

  // ============ WS 9: บทดอกสร้อย (ต่อ) ============
  {
    num: "๙",
    topic: "บทดอกสร้อย “กาดำ” (ต่อ) — ข้อคิดและการนำไปใช้",
    objective: "อ่านบทดอกสร้อย กาดำ ออกเสียงได้ถูกต้อง และบอกข้อคิดได้",
    activities: [
      card("yellow", "๑", "เติมคำที่หายไปในบทดอกสร้อย “กาดำ”", `
        <div class="song">
          <div class="title">♪  ดอกสร้อย กาดำ (ต่อ)  ♪</div>
          <div>กาเอ๋ย <span class="blank"></span> &nbsp; รูปก็ <span class="blank"></span></div>
          <div>หา <span class="blank"></span> ในที่ลำธาร &nbsp; เป็นนิจสิน</div>
          <div>ครั้นเห็น <span class="blank"></span> ตัวเอง &nbsp; ขนเปลี่ยนเป็นสีดี</div>
          <div class="note"><b>คำที่ใช้เติม :</b> เงา &nbsp;•&nbsp; กาดำ &nbsp;•&nbsp; ดำ &nbsp;•&nbsp; เหยื่อ</div>
        </div>`),

      card("blue", "๒", "บอกข้อคิดที่ได้จากบทดอกสร้อย “กาดำ”", `
        <div style="background:#fff;border:1.5px solid var(--blue-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#1d4ed8;margin-bottom:6px;"><b>ข้อคิดของฉัน:</b></div>
          ${writeBox()}
        </div>`),

      card("green", "๓", "นำคำในบทดอกสร้อยมาแต่งประโยค (เลือกอย่างน้อย ๓ คำ)", `
        <div class="hint"><b>คำที่ใช้ :</b> กา • ดำ • เงา • ธาร • นิจสิน • เหยื่อ</div>
        <div style="background:#fff;border:1.5px solid var(--green-b);border-radius:8px;padding:8px;">
          <div class="lines-3"></div>
          <div class="lines-3"></div>
          <div class="lines-3"></div>
        </div>`),

      card("pink", "๔", "วาดรูปประกอบบทดอกสร้อย “กาดำ” พร้อมเขียนคำบรรยายภาพ", `
        <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:8px;">
          <div style="background:#fff;border:1.5px dashed var(--pink-b);border-radius:10px;height:160px;"></div>
          <div style="background:#fff;border:1.5px solid var(--pink-b);border-radius:10px;padding:8px;">
            <div style="font-family:Mali;color:#9d174d;margin-bottom:4px;"><b>คำบรรยายภาพ:</b></div>
            <div class="lines-3"></div>
            <div class="lines-3"></div>
          </div>
        </div>`),

      card("purple", "๕", "การนำข้อคิดจากบทดอกสร้อยไปใช้ในชีวิตประจำวัน",
        panelsActivity([
          { label: "✦ ข้อคิดที่ได้" },
          { label: "♥ ฉันจะนำไปปฏิบัติอย่างไร" },
        ])),
    ],
  },

  // ============ WS 10: อ่านออกเสียงในบทเรียน — กากับเหยือกน้ำ ============
  {
    num: "๑๐",
    topic: "อ่านออกเสียงในบทเรียน — นิทาน “กากับเหยือกน้ำ”",
    objective: "อ่านออกเสียงนิทานเรื่อง กากับเหยือกน้ำได้ถูกต้อง และบอกข้อคิดได้",
    activities: [
      card("yellow", "๑", "อ่านนิทาน “กากับเหยือกน้ำ” ในใจ ๑ รอบ แล้วเล่าให้เพื่อนฟัง", `
        <div style="background:#fff;border:1.5px dashed var(--yellow-b);border-radius:10px;padding:10px;font-family:Sarabun;font-size:12pt;line-height:1.6;color:#7a4a00;">
          <div style="font-family:Mali;font-size:13pt;text-align:center;color:#a16207;margin-bottom:6px;"><b>กากับเหยือกน้ำ</b></div>
          <p>วันหนึ่ง กาตัวหนึ่งบินมาเหนื่อยและกระหายน้ำ มันเห็นเหยือกน้ำใบหนึ่งวางอยู่
          จึงรีบบินลงไป แต่ปากเหยือกแคบและน้ำในเหยือกเหลือน้อย กาจึงคิดอย่างมีสติ
          มันคาบก้อนหินทีละก้อนใส่ลงไปในเหยือก จนน้ำค่อย ๆ สูงขึ้น
          ในที่สุดกาก็ดื่มน้ำได้สำเร็จ</p>
        </div>`),

      card("blue", "๒", "ตอบคำถามจากนิทาน “กากับเหยือกน้ำ”", `
        <div style="background:#fff;border:1.5px solid var(--blue-b);border-radius:10px;padding:10px;">
          <div style="margin-bottom:8px;"><b>๑.</b> กากระหายน้ำเพราะอะไร?<div class="lines-3" style="margin-top:4px"></div></div>
          <div style="margin-bottom:8px;"><b>๒.</b> กาทำอย่างไรเพื่อให้น้ำในเหยือกสูงขึ้น?<div class="lines-3" style="margin-top:4px"></div></div>
          <div><b>๓.</b> ในที่สุดกาทำได้สำเร็จหรือไม่ เพราะเหตุใด?<div class="lines-3" style="margin-top:4px"></div></div>
        </div>`),

      card("green", "๓", "ข้อคิดจากนิทานเรื่อง “กากับเหยือกน้ำ”", `
        <div class="ex"><b>ข้อคิด :</b> ความอดทนและการใช้ปัญญาในการแก้ปัญหา จะนำไปสู่ความสำเร็จ</div>
        <div style="background:#fff;border-left:5px solid var(--green-b);border-radius:8px;padding:8px;">
          <div style="font-family:Mali;color:#0f6b3f;margin-bottom:6px;"><b>ข้อคิดของฉันคือ :</b></div>
          ${writeBox()}
        </div>`),

      card("pink", "๔", "วงกลมคำที่ปรากฏในนิทาน “กากับเหยือกน้ำ”",
        wordGridActivity([
          "กา", "เหยือก", "น้ำ", "กระหาย",
          "ก้อนหิน", "บิน", "ปากเหยือก", "สำเร็จ",
          "ช้าง", "ม้า", "ดื่ม", "ปัญญา",
        ])),

      card("purple", "๕", "อ่านออกเสียงนิทานให้ครูฟัง แล้วประเมินตนเองและคัดคำสำคัญ", `
        <div style="background:#fff;border:1.5px solid var(--purple-b);border-radius:10px;padding:10px;">
          <div style="font-family:Mali;color:#4c1d95;margin-bottom:6px;"><b>คัดคำสำคัญในนิทาน :</b></div>
          <table class="copy">
            <tr><td class="w">กา</td><td class="lines"></td></tr>
            <tr><td class="w">เหยือก</td><td class="lines"></td></tr>
            <tr><td class="w">กระหาย</td><td class="lines"></td></tr>
            <tr><td class="w">ก้อนหิน</td><td class="lines"></td></tr>
            <tr><td class="w">สำเร็จ</td><td class="lines"></td></tr>
          </table>
        </div>`),
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
  const pdfPath = join(__dirname, `ใบงานที่_${ws.num}_บทที่_๒_ใจหาย.pdf`);
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
