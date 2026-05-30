---
name: lesson-plan-docx
description: >-
  แปลง PDF หน่วยการเรียนรู้/แผนการจัดการเรียนรู้ (ทุกวิชา ทุกชั้น) เป็นไฟล์ Word จัดรูปแบบมาตรฐานราชการไทย
  พร้อมใบงาน (worksheets) — normalize เวลา ๑ ชม./แผน รวม ๑๐ ชม., จัดหน้า keep-together (หัวข้อ/ตารางไม่ขาดหน้า),
  ฝังใบงานท้ายแต่ละแผน. ใช้เมื่อผู้ใช้ให้ PDF แผนการสอน หรือสั่งทำ/แปลงแผนการเรียนรู้เป็น Word, สร้างใบงาน,
  หรือจัดหน้าเอกสารแผนการสอน. Convert Thai lesson-plan PDFs to formatted Word docs + worksheets.
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Lesson Plan → Word + Worksheets

แปลง PDF หน่วยการเรียนรู้เป็นไฟล์ Word จัดรูปแบบมาตรฐาน + ใบงาน ใช้ได้ทุกวิชา/ชั้น
รายละเอียดเฉพาะวิชาอยู่ใน `config.json` ต่อหน่วย (ค่า default = ภาษาไทย ป.๒)

## เมื่อไรใช้
- ผู้ใช้วาง/ชี้ PDF หน่วยการเรียนรู้ (แผนการจัดการเรียนรู้) แล้วอยากได้ไฟล์ Word
- ขอสร้างใบงาน (แบบฝึกหัด) ของบท/หน่วยนั้น
- ขอจัดหน้า/แก้ปัญหาหัวข้อหรือตารางขาดหน้าในเอกสารแผนการสอน

## ภาพรวม pipeline
```
extract_pdf → build_docx → validate → (generate_worksheets → embed_worksheets) → validate
```
สคริปต์ทั้งหมดอยู่ที่ `scripts/` ของ skill นี้ รับ `<unitDir>` เป็น argument และอ่าน `<unitDir>/config.json`
**ติดตั้ง deps ครั้งเดียว:** `cd <skill>/scripts && npm install` (สคริปต์ import แบบ bare resolve จาก node_modules ข้างตัว)

## ขั้นตอน (ทำตามนี้)
1. **เตรียมหน่วย:** ยืนยันโฟลเดอร์ที่มี PDF ต้นฉบับ + โฟลเดอร์รูปหน้าหนังสือเรียน
2. **สร้าง `config.json`:** คัดจาก `scripts/config.example.json` ไปไว้ใน unitDir แล้วแก้ค่าเฉพาะวิชา/หน่วย
   (ถ้าผู้ใช้ไม่ระบุ ให้ถาม subject/grade/instructor/section9; ค่าที่เหลือใช้ default ได้)
3. **extract:** `node scripts/extract_pdf.mjs "<unitDir>"` → ดูจำนวนแผนที่เจอ
   - ถ้าแผน **> ๑๐** ให้ **ถามผู้ใช้** ว่าจะยุบเหลือ ๑๐ อย่างไร แล้วตั้ง `keepPlans` ให้ตรง
4. **build:** `node scripts/build_docx.mjs "<unitDir>"` → ไฟล์ `.docx` (จัดหน้า keep-together อัตโนมัติ)
5. **ใบงาน:** คัด `scripts/generate_worksheets.mjs` ไปที่ `<unitDir>/แบบฝึกหัด/` → **เติม `WORKSHEETS` array**
   จากหัวข้อ ๖ ของแต่ละแผน + เนื้อหาจริงในรูปหนังสือเรียน → รัน → ได้ PDF ใบงาน
6. **embed:** `node scripts/embed_worksheets.mjs "<unitDir>"` (ต้องรันหลัง build) → ฝังใบงานท้ายแต่ละแผน
7. **validate:** `node scripts/validate_docx.mjs "<unitDir>"` → ตรวจ ๐ PUA / จำนวนแผน / keep-together / จำนวนรูปใบงาน
8. **แจ้งผู้ใช้:** เครื่องไม่มี Word → ตรวจ property ได้เท่านั้น ให้ผู้ใช้เปิด Word ยืนยันการแบ่งหน้าจริง

## config.json (สรุปคีย์สำคัญ)
`subject`, `grade`, `unitNo`, `unitName`, `unitTitle`, `pdfName`, `outputName`, `font`, `fontSizePt`,
`planHours`(๑), `unitTotalHours`(๑๐), `keepPlans`(เลือก/ยุบแผน), `instructor`, `school`, `deputyLabel`,
`homeroomLabel`, `kulaksana[]`(คุณลักษณะ), `section9Rows[]`(ตารางวัดผล — ต่างตามวิชา), `gradingScale[]`,
`imageFolder`, `worksheetCount` — ดูตัวอย่างเต็มใน `scripts/config.example.json`

## variant: แผนคณิตศาสตร์ ป.๑ (โครง PDF ต่างจากภาษาไทย)
PDF คณิต ป.๑ ใช้โครงคนละแบบ (เลขหัวข้ออารบิก, ตารางกิจกรรม ๓ คอลัมน์ กิจกรรม|เวลา(นาที)|สมรรถนะ,
ตารางแบบสังเกตพฤติกรรม ๒ ใบ, บันทึกหลังสอน + ลงชื่อ ผู้ประเมิน×๒/ผู้สอน/ผู้บริหาร) → **ใช้ build_docx เดิมไม่ได้**
ใช้ pipeline แยก: `extract_math_pdf.mjs` → `build_math_docx.mjs` → `validate_math_docx.mjs` (รับ `<planDir>` + config.json
ที่มี `numerals:"arabic"`, `evaluator`, `instructor`, `directorLabel`, `worksheetCount:0`). batch ด้วย loop PowerShell
(สร้างโฟลเดอร์/copy/config/extract/build ต่อแผน). หมายเหตุ env: bash รีเซ็ต cwd → เรียก node ด้วย absolute path เสมอ;
config จาก PowerShell มี BOM (`loadConfig` strip `﻿` แล้ว).

**กฎ layout คณิต (แก้ตามฟีดแบ็กผู้ใช้ — ห้ามถอยกลับ):**
- **หน้าแรกต้องมีเนื้อหา ไม่ใช่แค่หัวเรื่อง** → pre-table ผูก `keepNext` แค่ "หัวข้อ→บรรทัดแรกใต้มัน" (ห้ามผูกทุกบรรทัด)
- **ตารางกิจกรรมต้องคอลัมน์ตรง** → FIXED layout + columnWidths ตายตัว `[5350,1300,2422]` twips (DXA) มิฉะนั้นคอลัมน์เพี้ยน/ตัวอักษรตกแนวตั้ง
- **เส้นจุด `....` บันทึกหลังสอนต้องเต็มบรรทัด** → ใช้ right tab + `LeaderType.DOT` (ห้ามใช้จุดจำนวนคงที่)
- **ตัดคำไทยไม่ขาดกลางคำ** → ต้องทำคู่กัน: (ก) ทุก run + default style ตั้ง `language:{value:"en-US",bidirectional:"th-TH"}` + (ข) **แทรก ZWSP (U+200B) ที่ขอบเขตคำ** ด้วย `Intl.Segmenter("th")` ใน helper `run()` (ลำพัง bidi ไม่พอ เพราะไทยไม่มีช่องว่างคำ → เซลล์แคบบังคับตัดกลางคำ "สรุปผลการประเ/มิน"). validator ต้อง strip ZWSP ก่อนเทียบข้อความ

รายละเอียด `references/math-spec.md`.

## รายละเอียดเพิ่มเติม (อ่านเมื่อต้องลงลึก)
- `references/format-spec.md` — โครงสร้างเอกสาร, header, หัวข้อ ๑–๑๐, ตาราง ๙, ลายเซ็น ๓ บล็อก, normalize เวลา
- `references/page-format.md` — กฎ keep-together (หัวข้อ/ตารางไม่ขาดหน้า) + วิธีตรวจ
- `references/worksheet-spec.md` — สไตล์ใบงาน, ตัวช่วยสร้างกิจกรรม, กฎเนื้อหา (ห้ามอ่านตามหนังสือ/ห้ามซ้ำ)
- `references/pipeline.md` — ลำดับรันเต็ม + แก้ปัญหา (EBUSY, ShadingType, PUA, section detection)

## หลักการสำคัญ (อย่าลืม)
- **เวลา:** normalize ๑ ชม./แผน รวม ๑๐ ชม. เสมอ (override ค่าใน PDF)
- **จัดหน้า:** ทุก section เป็นบล็อก keepNext, ตาราง ๙ cantSplit, บันทึกหลังแผน pageBreakBefore
- **ใบงาน:** เป็นแบบฝึก (เติม/โยง/แยก/แต่ง/ตอบ/คัด) ไม่ใช่อ่านตามหนังสือ และห้ามถามซ้ำ
- **build ก่อน embed เสมอ**
- เลขข้อใช้เลขไทยทุกที่ • ชื่อไฟล์ในพาธมีภาษาไทย → ใส่ double-quote ใน shell
