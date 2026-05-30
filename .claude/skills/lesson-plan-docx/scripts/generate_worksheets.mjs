// TEMPLATE worksheet generator. The agent COPIES this into <unitDir>/แบบฝึกหัด/ and fills
// the WORKSHEETS array (one entry per plan) with content drawn from each plan's
// "๖. กิจกรรมการเรียนรู้" + the real textbook page images. Reads ../config.json for the
// banner + filenames. Generates worksheet_<n>.html then prints each to PDF via Edge headless.
// Run from inside <unitDir>/แบบฝึกหัด/:  node generate_worksheets.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(join(__dirname, "..", "config.json"), "utf8"));
const SUBJECT = cfg.subject, GRADE = cfg.grade, UNIT_NO = cfg.unitNo, UNIT_NAME = cfg.unitName;

// ========== SHARED CSS (card-based worksheet style) ==========
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

const THAI = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐", "๑๑", "๑๒", "๑๓"];

// ========== HEADER + BANNER ==========
const drop = `<svg viewBox="0 0 24 24" width="22" height="22" style="vertical-align:-3px"><path fill="#3b82f6" d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/></svg>`;

function header(num, topic, objective) {
  return `
  <div class="top">
    <div class="field name"><b>ชื่อ–นามสกุล</b> </div>
    <div class="field cls"><b>ชั้น</b> </div>
    <div class="field no"><b>เลขที่</b> </div>
  </div>
  <div class="banner">
    <h1>${drop} ใบงานวิชา${SUBJECT} • ${GRADE} ${drop}</h1>
    <h2>บทที่ ${UNIT_NO}  ${UNIT_NAME}</h2>
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
  const row = (p) => `<div class="mw">${p.w}</div><div class="mm">${p.m}</div>`;
  return `<div class="match">
    <div class="match-half">${pairs.slice(0, mid).map(row).join("")}</div>
    <div class="match-half">${pairs.slice(mid).map(row).join("")}</div>
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
    <div class="panel"><div class="pl">${p.label}</div><div class="lines-3"></div></div>`).join("")}</div>`;
}
function catActivity(headers, rows, hint) {
  return `${hint ? `<div class="hint"><b>คำที่ใช้ :</b> ${hint}</div>` : ""}
  <table class="cat-table">
    <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
    ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
  </table>`;
}
function writeBox() { return `<div class="lines-tall"></div>`; }
function qaBox(color, questions) {
  return `<div style="background:#fff;border:1.5px dashed var(--${color}-b);border-radius:10px;padding:10px;">
    ${questions.map((q, i) =>
      `<div style="margin-bottom:${i < questions.length - 1 ? "8px" : "0"};"><b>${THAI[i + 1]}.</b> ${q}<div class="lines-3" style="margin-top:4px"></div></div>`,
    ).join("")}
  </div>`;
}
function fillSentences(color, hint, sentences) {
  const c = color === "blue" ? "#1d4ed8" : color === "green" ? "#0f6b3f" : color === "yellow" ? "#a16207" : "#be185d";
  return `<div class="hint"><b>คำที่ใช้ :</b> ${hint}</div>
  <div style="background:#fff;border:1.5px solid var(--${color}-b);border-radius:8px;padding:8px 12px;font-family:Sarabun;font-size:12.5pt;line-height:2.4">
    ${sentences.map((s, i) => `<div><b>${THAI[i + 1]}.</b> ${s.replace(/@/g, `<span class="blank-line" style="border-color:${c}"></span>`)}</div>`).join("")}
  </div>`;
}
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
function drawBox(color, h = 140, captionLabel = "") {
  return `<div style="background:#fff;border:1.5px solid var(--${color}-b);border-radius:10px;padding:8px;">
    <div style="height:${h}px;border:1.5px dashed var(--${color}-b);border-radius:8px;background:#fafafa;"></div>
    ${captionLabel ? `<div style="font-family:Mali;color:#4c1d95;margin:6px 0 2px;"><b>${captionLabel}</b></div><div class="lines-3"></div>` : ""}
  </div>`;
}

// ========== BUILD WHOLE PAGE ==========
function buildPage(num, topic, objective, activities) {
  return `<!doctype html><html lang="th"><head>
<meta charset="utf-8"><title>ใบงานที่ ${num} บทที่ ${UNIT_NO} ${UNIT_NAME}</title>
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

// ========== WORKSHEET DEFINITIONS ==========
// AGENT: fill one entry per plan. num = Thai numeral; topic/objective from the plan's
// จุดประสงค์ (หัวข้อ ๓); activities = array of card(...) calls using the builders above.
// Content MUST come from the plan's "๖. กิจกรรมการเรียนรู้" + real textbook content
// (read the imageFolder pages). RULES: worksheets are EXERCISES (เติม/โยง/แยก/แต่ง/ตอบ/คัด),
// NOT "ดูภาพ/อ่านตามหนังสือ"; no duplicate questions within or across sheets.
// See ../../references/worksheet-spec.md (or the skill's references/worksheet-spec.md).
const WORKSHEETS = [
  // {
  //   num: "๑",
  //   topic: "…",
  //   objective: "…",
  //   activities: [
  //     card("green", "๑", "เขียนแจกลูกสะกดคำตามตัวอย่าง", spellActivity(["…"], "…")),
  //     card("pink",  "๒", "โยงเส้นจับคู่คำกับความหมาย", matchActivity([{w:"…",m:"…"}])),
  //   ],
  // },
];

if (WORKSHEETS.length === 0) {
  console.error("WORKSHEETS array is empty — fill it with one entry per plan before running.");
  process.exit(1);
}

console.log("Generating HTML files...");
for (const ws of WORKSHEETS) {
  writeFileSync(join(__dirname, `worksheet_${ws.num}.html`), buildPage(ws.num, ws.topic, ws.objective, ws.activities), "utf8");
  console.log(`  ✓ worksheet_${ws.num}.html`);
}

// หา Chrome/Edge อัตโนมัติตาม OS (ตั้ง env BROWSER_PATH เพื่อระบุเองได้)
function findBrowser() {
  if (process.env.BROWSER_PATH && existsSync(process.env.BROWSER_PATH)) return process.env.BROWSER_PATH;
  const byOS = {
    win32: [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ],
    linux: [
      "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/microsoft-edge",
    ],
  };
  const candidates = byOS[process.platform] || byOS.linux;
  const found = candidates.find(p => existsSync(p));
  if (!found) {
    throw new Error(
      "ไม่พบ Chrome/Edge สำหรับแปลง PDF บน OS นี้ (" + process.platform + ")\n" +
      "ตั้งตัวแปรแวดล้อม BROWSER_PATH ให้ชี้ไปที่ไฟล์ browser เอง เช่น:\n" +
      "  (mac)  export BROWSER_PATH=\"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\"\n" +
      "  (win)  $env:BROWSER_PATH=\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\"\n" +
      "ตำแหน่งที่ลองหา:\n  " + candidates.join("\n  ")
    );
  }
  return found;
}
const EDGE = findBrowser();
console.log("\nConverting HTML → PDF via Edge headless...");
for (const ws of WORKSHEETS) {
  const htmlPath = join(__dirname, `worksheet_${ws.num}.html`);
  const pdfPath = join(__dirname, `ใบงานที่_${ws.num}_บทที่_${UNIT_NO}_${UNIT_NAME}.pdf`);
  const htmlUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const cmd = `"${EDGE}" --headless=new --disable-gpu --no-margins --print-to-pdf="${pdfPath}" --print-to-pdf-no-header "${htmlUrl}"`;
  try { execSync(cmd, { stdio: "pipe", timeout: 60000 }); console.log(`  ✓ ${pdfPath}`); }
  catch (e) { console.error(`  ✗ Failed for ${ws.num}: ${e.message}`); }
}
console.log("\nDone.");
