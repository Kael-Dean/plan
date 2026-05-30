// สร้างใบงานคณิตศาสตร์ ป.1 (บทที่ 1 จำนวนนับ 1 ถึง 10 และ 0) — 6 ใบ
// HTML + CSS -> PDF ผ่าน Microsoft Edge headless. เลขอารบิกล้วน, ภาพ = อีโมจิ + SVG.
// โรงเรียนบ้านหนองเต่า. รันในโฟลเดอร์ ใบงานคณิตศาสตร์\ :  node build_math_worksheets.mjs
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHOOL = "โรงเรียนบ้านหนองเต่า";
const SUBJECT_LINE = "วิชาคณิตศาสตร์&nbsp;&nbsp;&nbsp;ชั้นประถมศึกษาปีที่ 1";
const UNIT_LINE = "บทที่ 1&nbsp;&nbsp;จำนวนนับ 1 ถึง 10 และ 0";

// ================= CSS =================
const CSS = `
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@page{size:A4;margin:9mm 10mm;}
html,body{margin:0;padding:0;}
body{font-family:"Sarabun","Leelawadee UI","Tahoma",sans-serif;color:#1f2330;font-size:15px;}
.sheet{position:relative;}

/* ---- header ---- */
.head{display:flex;align-items:stretch;gap:10px;margin-bottom:6px;position:relative;}
.tag{flex:none;width:74px;border:2.5px solid #111;border-radius:14px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:8px 4px 10px;position:relative;background:#fff;}
.tag::before{content:"";position:absolute;top:7px;width:12px;height:12px;border-radius:50%;
  border:2.5px solid #111;background:#fff;}
.tag span{font-family:"Mali";font-size:12px;margin-top:10px;color:#222;}
.tag b{font-family:"Mali";font-size:34px;line-height:1;font-weight:700;color:#111;}
.titlewrap{flex:1;display:flex;align-items:center;}
.titlebar{width:100%;background:#111;border-radius:16px;padding:9px 20px;color:#fff;
  border:2.5px solid #111;}
.titlebar .t1{font-family:"Mali";font-weight:700;font-size:21px;text-align:center;line-height:1.15;}
.titlebar .t2{font-family:"Mali";font-weight:500;font-size:14px;text-align:center;margin-top:3px;color:#fdfdfd;}
.titlebar .t3{font-family:"Sarabun";font-size:13px;text-align:center;color:#e6e6e6;}
.cloud{position:absolute;right:-2px;top:-6px;opacity:.9;}

/* ---- name line ---- */
.nameline{display:flex;gap:6px;align-items:flex-end;font-family:"Mali";font-size:15px;
  margin:4px 2px 8px;}
.nameline .d{flex:1;border-bottom:1.6px dotted #555;min-width:30px;}
.nameline .s{flex:none;border-bottom:1.6px dotted #555;width:70px;}

/* ---- instruction ---- */
.instruct{font-family:"Mali";font-weight:600;font-size:16px;color:#0b3d2e;
  background:#eafaf1;border:2px solid #2faa6e;border-radius:10px;padding:6px 14px;margin-bottom:10px;}
.instruct b{color:#d2691e;}
.sub-h{font-family:"Mali";font-weight:600;font-size:15px;color:#1d4ed8;margin:10px 2px 6px;}

/* ---- count & write rows ---- */
.cw-row{display:flex;align-items:center;gap:12px;border:2.5px solid var(--bc);
  border-radius:16px;padding:7px 14px;margin-bottom:9px;background:var(--bg);}
.cw-no{flex:none;width:30px;height:30px;border-radius:50%;background:var(--bc);color:#fff;
  font-family:"Mali";font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;}
.cw-emoji{flex:1;font-size:30px;letter-spacing:7px;line-height:1.1;}
.cw-empty{flex:1;font-family:"Sarabun";font-size:14px;color:#888;font-style:italic;}
.cw-ans{flex:none;width:58px;height:58px;border:2.5px dashed var(--bc);border-radius:50%;background:#fff;}

/* ---- choose circle ---- */
.choose{display:flex;align-items:center;gap:14px;border:2.5px solid #7b5cf0;border-radius:16px;
  padding:8px 14px;margin-bottom:9px;background:#f3efff;}
.choose .em{flex:1;font-size:28px;letter-spacing:6px;}
.choose .opts{flex:none;display:flex;gap:12px;}
.choose .opt{width:46px;height:46px;border:2px solid #7b5cf0;border-radius:50%;background:#fff;
  font-family:"Mali";font-weight:700;font-size:20px;color:#4c1d95;display:flex;align-items:center;justify-content:center;}

/* ---- draw box ---- */
.draw-row{display:flex;align-items:center;gap:14px;border:2.5px solid #e85a8c;border-radius:16px;
  padding:8px 14px;margin-bottom:9px;background:#ffeef5;}
.draw-num{flex:none;width:52px;height:52px;border-radius:12px;background:#e85a8c;color:#fff;
  font-family:"Mali";font-weight:700;font-size:26px;display:flex;align-items:center;justify-content:center;}
.draw-num small{font-size:11px;font-weight:500;}
.draw-area{flex:1;height:60px;border:2px dashed #e85a8c;border-radius:10px;background:#fff;}

/* ---- match groups ---- */
.match{display:flex;flex-direction:column;gap:14px;border:2.5px solid #2563eb;border-radius:16px;
  padding:12px 18px;margin-bottom:9px;background:#eef3ff;}
.match-row{display:flex;align-items:center;justify-content:space-between;}
.match-left{font-size:26px;letter-spacing:6px;}
.match-mid{flex:1;text-align:center;color:#94a3b8;font-size:13px;font-family:"Sarabun";}
.match-num{flex:none;width:48px;height:48px;border:2.5px solid #2563eb;border-radius:50%;background:#fff;
  font-family:"Mali";font-weight:700;font-size:22px;color:#1d4ed8;display:flex;align-items:center;justify-content:center;}
.dotL{width:11px;height:11px;border-radius:50%;background:#2563eb;margin-left:8px;}
.dotR{width:11px;height:11px;border-radius:50%;background:#2563eb;margin-right:8px;}

/* ---- compare sign ---- */
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;
  border:2.5px solid #0ea5a0;border-radius:16px;padding:14px 18px;margin-bottom:9px;background:#e9fbfa;}
.cmp{display:flex;align-items:center;justify-content:center;gap:14px;}
.cmp .n{width:50px;height:50px;border-radius:12px;background:#fff;border:2px solid #0ea5a0;
  font-family:"Mali";font-weight:700;font-size:24px;color:#0b6f6b;display:flex;align-items:center;justify-content:center;}
.cmp .box{width:50px;height:50px;border:2.5px dashed #0ea5a0;border-radius:12px;background:#fff;}

/* ---- circle bigger ---- */
.big-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;
  border:2.5px solid #f59e0b;border-radius:16px;padding:14px 18px;margin-bottom:9px;background:#fff8e6;}
.big{display:flex;align-items:center;justify-content:center;gap:24px;}
.big .n{width:54px;height:54px;border-radius:50%;background:#fff;border:2px solid #f59e0b;
  font-family:"Mali";font-weight:700;font-size:24px;color:#b45309;display:flex;align-items:center;justify-content:center;}
.big .vs{font-family:"Sarabun";color:#b45309;font-size:13px;}

/* ---- order ---- */
.order{border:2.5px solid #db2777;border-radius:16px;padding:12px 18px;margin-bottom:9px;background:#fff0f7;}
.order-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.order-row:last-child{margin-bottom:0;}
.order-no{flex:none;width:28px;height:28px;border-radius:50%;background:#db2777;color:#fff;
  font-family:"Mali";font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;}
.given{display:flex;gap:8px;}
.given .g{width:42px;height:42px;border-radius:10px;background:#fff;border:2px solid #db2777;
  font-family:"Mali";font-weight:700;font-size:20px;color:#9d174d;display:flex;align-items:center;justify-content:center;}
.arrow{font-size:20px;color:#db2777;}
.ans{display:flex;gap:8px;}
.ans .a{width:42px;height:42px;border-radius:10px;border:2.5px dashed #db2777;background:#fff;}

/* ---- number bond ---- */
.bond-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 30px;
  border:2.5px solid #7c3aed;border-radius:16px;padding:16px 18px;margin-bottom:9px;background:#f5f0ff;}
.bond{display:flex;flex-direction:column;align-items:center;gap:4px;}
.bond .whole{width:56px;height:56px;border-radius:50%;border:2.5px solid #7c3aed;background:#fff;
  font-family:"Mali";font-weight:700;font-size:24px;color:#5b21b6;display:flex;align-items:center;justify-content:center;}
.bond .legs{width:90px;height:18px;border-top:0;position:relative;}
.bond .legs svg{display:block;}
.bond .parts{display:flex;gap:22px;}
.bond .p{width:50px;height:50px;border-radius:12px;border:2px solid #7c3aed;background:#fff;
  font-family:"Mali";font-weight:700;font-size:22px;color:#5b21b6;display:flex;align-items:center;justify-content:center;}
.bond .p.blank{border-style:dashed;background:#fff;}

/* ---- split ---- */
.split{display:flex;flex-direction:column;gap:12px;border:2.5px solid #16a34a;border-radius:16px;
  padding:14px 18px;margin-bottom:9px;background:#effdf3;}
.split-row{display:flex;align-items:center;gap:14px;font-family:"Mali";font-weight:700;font-size:24px;color:#14532d;}
.split .tot{width:52px;height:52px;border-radius:12px;background:#16a34a;color:#fff;
  display:flex;align-items:center;justify-content:center;}
.split .eq{color:#16a34a;}
.split .blk{width:52px;height:52px;border:2.5px dashed #16a34a;border-radius:12px;background:#fff;}
.split .plus{color:#16a34a;}

/* ---- compare two groups (จับคู่ 2 กลุ่มภาพ) ---- */
.cg{border:2.5px solid #2563eb;border-radius:16px;padding:10px 16px;margin-bottom:9px;background:#eef3ff;}
.cg-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.cg-row:last-child{margin-bottom:0;}
.cg-no{flex:none;width:28px;height:28px;border-radius:50%;background:#2563eb;color:#fff;
  font-family:"Mali";font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;}
.cg-side{flex:1;min-height:54px;border:2px solid #2563eb;border-radius:12px;background:#fff;
  display:flex;align-items:center;justify-content:center;flex-wrap:wrap;font-size:26px;letter-spacing:5px;padding:4px 8px;}
.cg-mid{flex:none;width:120px;text-align:center;color:#94a3b8;font-size:13px;font-family:"Sarabun";}

/* ---- footer ---- */
.foot{margin-top:12px;text-align:center;font-family:"Mali";font-weight:600;font-size:15px;color:#475569;
  border-top:2px dashed #cbd5e1;padding-top:6px;}
`;

// ================= shared bits =================
const CLOUD = `<svg class="cloud" width="120" height="50" viewBox="0 0 120 50">
  <g fill="none" stroke="#111" stroke-width="2.2">
    <path d="M14 40 q-10 0 -10 -10 q0 -9 9 -9 q1 -10 12 -10 q9 0 11 8 q9 -1 11 8 q8 0 8 7 q0 7 -8 7 Z"/>
    <path d="M78 22 q4 -10 13 -7 M95 12 q7 -6 14 1 q6 -1 7 6" />
  </g></svg>`;

const COLORS = [
  { bg: "#eef7ff", bc: "#2563eb" },
  { bg: "#fff6e6", bc: "#f59e0b" },
  { bg: "#fdeef6", bc: "#db2777" },
  { bg: "#eefcf2", bc: "#16a34a" },
  { bg: "#f3efff", bc: "#7c3aed" },
  { bg: "#fff0f0", bc: "#ef4444" },
];

function header(num, title) {
  return `<div class="head">
    <div class="tag"><span>ใบงานที่</span><b>${num}</b></div>
    <div class="titlewrap"><div class="titlebar">
      <div class="t1">${title}</div>
      <div class="t2">${SUBJECT_LINE}</div>
      <div class="t3">${UNIT_LINE}</div>
    </div></div>
    ${CLOUD}
  </div>
  <div class="nameline">ชื่อ <span class="d"></span> ชั้น <span class="s"></span> เลขที่ <span class="s"></span></div>`;
}
function instruct(text) { return `<div class="instruct"><b>คำชี้แจง</b> : ${text}</div>`; }
function subH(text) { return `<div class="sub-h">${text}</div>`; }
const footer = `<div class="foot">${SCHOOL}</div>`;

// ================= activity builders =================
// นับแล้วเขียนจำนวน — items: [{emoji, n, count}]  (ถ้า count=0 ใช้ช่องว่าง)
function countWrite(items) {
  return items.map((it, i) => {
    const ci = i % COLORS.length;
    const body = it.count === 0
      ? `<div class="cw-empty">(ไม่มีสิ่งของ — จานว่าง 🍽️)</div>`
      : `<div class="cw-emoji">${it.emoji.repeat(it.count)}</div>`;
    return `<div class="cw-row" style="--bg:${COLORS[ci].bg};--bc:${COLORS[ci].bc}">
      <div class="cw-no">${it.n}</div>${body}<div class="cw-ans"></div></div>`;
  }).join("");
}
// วงกลมตัวเลขที่ตรงกับจำนวนภาพ — items: [{emoji, count, opts:[a,b,c]}]
function chooseNumber(items) {
  return items.map(it => `<div class="choose">
    <div class="em">${it.emoji.repeat(it.count)}</div>
    <div class="opts">${it.opts.map(o => `<div class="opt">${o}</div>`).join("")}</div>
  </div>`).join("");
}
// วาดให้ครบตามจำนวน — nums: [n,...]
function drawCount(nums) {
  return nums.map(n => `<div class="draw-row">
    <div class="draw-num">${n}<br><small>วาด</small></div><div class="draw-area"></div></div>`).join("");
}
// โยงเส้นจับคู่ — pairs: [{emoji,count,num}] (num อยู่คนละฝั่ง สลับให้เด็กโยง)
function matchGroups(rows) {
  return `<div class="match">${rows.map(r => `<div class="match-row">
    <div class="match-left">${r.emoji.repeat(r.count)}</div><div class="dotL"></div>
    <div class="match-mid">…………… โยงเส้น ……………</div>
    <div class="dotR"></div><div class="match-num">${r.num}</div></div>`).join("")}</div>`;
}
// เปรียบเทียบสองกลุ่มภาพ — rows:[{lEmoji,lCount,rEmoji,rCount}]
function compareGroups(rows) {
  return `<div class="cg">${rows.map((r, i) => `<div class="cg-row">
    <div class="cg-no">${i + 1}</div>
    <div class="cg-side">${r.lEmoji.repeat(r.lCount)}</div>
    <div class="cg-mid">…… โยงเส้น ……</div>
    <div class="cg-side">${r.rEmoji.repeat(r.rCount)}</div></div>`).join("")}</div>`;
}
// เติมเครื่องหมาย >,<,= — pairs: [[a,b],...]
function compareSign(pairs) {
  return `<div class="cmp-grid">${pairs.map(([a, b]) => `<div class="cmp">
    <div class="n">${a}</div><div class="box"></div><div class="n">${b}</div></div>`).join("")}</div>`;
}
// วงกลมจำนวนที่มากกว่า — pairs
function circleBigger(pairs) {
  return `<div class="big-grid">${pairs.map(([a, b]) => `<div class="big">
    <div class="n">${a}</div><div class="vs">กับ</div><div class="n">${b}</div></div>`).join("")}</div>`;
}
// เรียงลำดับ — sets:[{given:[..], dir:'asc'|'desc'}]
function orderRows(sets) {
  return `<div class="order">${sets.map((s, i) => `<div class="order-row">
    <div class="order-no">${i + 1}</div>
    <div class="given">${s.given.map(g => `<div class="g">${g}</div>`).join("")}</div>
    <div class="arrow">➜</div>
    <div class="ans">${s.given.map(() => `<div class="a"></div>`).join("")}</div></div>`).join("")}</div>`;
}
// number bond — triples:[{whole, a, b}] โดยใส่ null ในช่องที่ให้เติม
function numberBond(triples) {
  const legs = `<div class="legs"><svg width="90" height="18">
    <line x1="45" y1="0" x2="14" y2="18" stroke="#7c3aed" stroke-width="2.2"/>
    <line x1="45" y1="0" x2="76" y2="18" stroke="#7c3aed" stroke-width="2.2"/></svg></div>`;
  const cell = (v) => v === null
    ? `<div class="p blank"></div>`
    : `<div class="p">${v}</div>`;
  return `<div class="bond-grid">${triples.map(t => `<div class="bond">
    <div class="whole">${t.whole === null ? "?" : t.whole}</div>${legs}
    <div class="parts">${cell(t.a)}${cell(t.b)}</div></div>`).join("")}</div>`;
}
// แยกจำนวนเป็นสองส่วน — totals:[n,...]
function splitNumber(totals) {
  return `<div class="split">${totals.map(t => `<div class="split-row">
    <div class="tot">${t}</div><span class="eq">=</span>
    <div class="blk"></div><span class="plus">+</span><div class="blk"></div></div>`).join("")}</div>`;
}

// ================= WORKSHEETS =================
const WORKSHEETS = [
  {
    num: 1, file: "ใบงานที่ 1 - การนับ 1 ถึง 5 และ 0",
    title: "การนับ 1 ถึง 5 และ 0",
    blocks: [
      instruct("นับจำนวนสิ่งของในแต่ละข้อ แล้ว<b>เขียนตัวเลข</b>แสดงจำนวนลงในวงกลม"),
      countWrite([
        { n: 1, emoji: "🍎", count: 3 },
        { n: 2, emoji: "🐠", count: 5 },
        { n: 3, emoji: "⭐", count: 2 },
        { n: 4, emoji: "🌸", count: 4 },
        { n: 5, emoji: "🍌", count: 1 },
        { n: 6, emoji: "", count: 0 },
      ]),
      subH("✏️ วงกลมตัวเลขที่ตรงกับจำนวนภาพ"),
      chooseNumber([
        { emoji: "🐰", count: 4, opts: [3, 4, 5] },
        { emoji: "🍓", count: 2, opts: [1, 2, 3] },
      ]),
    ],
  },
  {
    num: 2, file: "ใบงานที่ 2 - การนับ 6 ถึง 10",
    title: "การนับ 6 ถึง 10",
    blocks: [
      instruct("นับจำนวนสิ่งของในแต่ละข้อ แล้ว<b>เขียนตัวเลข</b>แสดงจำนวนลงในวงกลม"),
      countWrite([
        { n: 1, emoji: "🚗", count: 6 },
        { n: 2, emoji: "🎈", count: 8 },
        { n: 3, emoji: "🐤", count: 10 },
        { n: 4, emoji: "🍓", count: 7 },
        { n: 5, emoji: "🌼", count: 9 },
      ]),
      subH("✏️ โยงเส้นจับคู่กลุ่มภาพกับจำนวนให้ถูกต้อง"),
      matchGroups([
        { emoji: "🍩", count: 7, num: 9 },
        { emoji: "🐥", count: 9, num: 6 },
        { emoji: "🎁", count: 6, num: 8 },
        { emoji: "🍏", count: 8, num: 7 },
      ]),
    ],
  },
  {
    num: 3, file: "ใบงานที่ 3 - การเปรียบเทียบจำนวนนับโดยการจับคู่",
    title: "การเปรียบเทียบจำนวนนับโดยการจับคู่",
    blocks: [
      instruct("โยงเส้นจับคู่สิ่งของทีละคู่ แล้ว<b>วงกลมกลุ่มที่มีจำนวนมากกว่า</b>"),
      compareGroups([
        { lEmoji: "🍎", lCount: 3, rEmoji: "🍐", rCount: 5 },
        { lEmoji: "🐶", lCount: 6, rEmoji: "🐱", rCount: 4 },
        { lEmoji: "⭐", lCount: 4, rEmoji: "🌙", rCount: 7 },
      ]),
      subH("✏️ วงกลมกลุ่มที่มีจำนวน \"น้อยกว่า\""),
      compareGroups([
        { lEmoji: "🚙", lCount: 8, rEmoji: "✈️", rCount: 5 },
        { lEmoji: "🦆", lCount: 2, rEmoji: "🐧", rCount: 4 },
      ]),
    ],
  },
  {
    num: 4, file: "ใบงานที่ 4 - การเปรียบเทียบจำนวนนับ 1 ถึง 10 และ 0",
    title: "การเปรียบเทียบจำนวนนับ 1 ถึง 10 และ 0",
    blocks: [
      instruct("เติมเครื่องหมาย <b>&gt; , &lt; หรือ =</b> ลงในช่องสี่เหลี่ยมให้ถูกต้อง"),
      compareSign([[7, 4], [3, 8], [5, 5], [9, 6], [2, 2], [10, 7], [0, 4], [6, 9]]),
      subH("✏️ วงกลมจำนวนที่ \"มากกว่า\" ในแต่ละคู่"),
      circleBigger([[8, 5], [3, 7], [10, 6], [4, 9]]),
    ],
  },
  {
    num: 5, file: "ใบงานที่ 5 - การเรียงลำดับจำนวน 1 ถึง 10 และ 0",
    title: "การเรียงลำดับจำนวน 1 ถึง 10 และ 0",
    blocks: [
      instruct("เรียงลำดับจำนวนในแต่ละข้อ แล้วเขียนคำตอบลงในช่องว่าง"),
      subH("① เรียงลำดับจาก \"น้อยไปมาก\""),
      orderRows([
        { given: [3, 5, 4, 2] },
        { given: [7, 6, 9, 8] },
        { given: [1, 4, 0, 2] },
      ]),
      subH("② เรียงลำดับจาก \"มากไปน้อย\""),
      orderRows([
        { given: [8, 10, 7, 9] },
        { given: [5, 2, 4, 3] },
      ]),
    ],
  },
  {
    num: 6, file: "ใบงานที่ 6 - ความสัมพันธ์ส่วนย่อย-ส่วนรวม 0 ถึง 5",
    title: "ความสัมพันธ์ของจำนวนแบบส่วนย่อย-ส่วนรวม 0 ถึง 5",
    blocks: [
      instruct("เติมจำนวนที่หายไปในแผนภาพ <b>ส่วนย่อย-ส่วนรวม</b> ให้ถูกต้อง"),
      numberBond([
        { whole: 5, a: 2, b: null },
        { whole: 4, a: null, b: 1 },
        { whole: 5, a: 0, b: null },
        { whole: 3, a: 1, b: null },
      ]),
      subH("✏️ แยกจำนวนต่อไปนี้ออกเป็นสองส่วน (เติมได้หลายแบบ)"),
      splitNumber([5, 4, 3]),
    ],
  },
];

function buildPage(ws) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
<title>${ws.file}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Mali:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head>
<body><div class="sheet">
${header(ws.num, ws.title)}
${ws.blocks.join("\n")}
${footer}
</div></body></html>`;
}

// ================= render =================
console.log("สร้างไฟล์ HTML...");
for (const ws of WORKSHEETS) {
  const htmlPath = join(__dirname, `_ws_${ws.num}.html`);
  writeFileSync(htmlPath, buildPage(ws), "utf8");
  console.log(`  ✓ _ws_${ws.num}.html`);
}

const EDGE_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const EDGE = EDGE_CANDIDATES.find(p => existsSync(p)) || EDGE_CANDIDATES[0];

console.log("\nแปลง HTML → PDF ด้วย Edge headless...");
for (const ws of WORKSHEETS) {
  const htmlPath = join(__dirname, `_ws_${ws.num}.html`);
  const pdfPath = join(__dirname, `${ws.file}.pdf`);
  const htmlUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  const cmd = `"${EDGE}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlUrl}"`;
  try {
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
    console.log(`  ✓ ${ws.file}.pdf`);
  } catch (e) {
    console.error(`  ✗ ล้มเหลว ใบงานที่ ${ws.num}: ${e.message}`);
  }
}

// ลบ html ชั่วคราว
for (const ws of WORKSHEETS) {
  const htmlPath = join(__dirname, `_ws_${ws.num}.html`);
  try { unlinkSync(htmlPath); } catch {}
}
console.log("\nเสร็จสิ้น — PDF ทั้ง 6 ใบอยู่ในโฟลเดอร์ ใบงานคณิตศาสตร์");
