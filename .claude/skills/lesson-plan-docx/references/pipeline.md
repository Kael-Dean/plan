# Pipeline — ลำดับการรัน + แก้ปัญหา

## ติดตั้ง deps (ครั้งเดียว)
```
cd C:\Users\User\.claude\skills\lesson-plan-docx\scripts
npm install
```
ติดตั้ง docx, jszip, pdf-to-img (+ pdfjs-dist) ไว้ใน `scripts/node_modules` — สคริปต์ทุกตัว import แบบ bare
(`import … from "docx"`) ซึ่ง Node resolve จาก node_modules ข้างสคริปต์เอง → รันจากที่ไหน/ไดรฟ์ไหนก็ได้

## เตรียมหน่วย (unitDir)
โฟลเดอร์ที่มี: PDF ต้นฉบับ, `config.json` (คัดจาก `config.example.json` แล้วแก้), โฟลเดอร์รูปหนังสือ (`imageFolder`)

## ลำดับรัน
```
SK=C:\Users\User\.claude\skills\lesson-plan-docx\scripts
node "%SK%\extract_pdf.mjs" "<unitDir>"        # PDF → pdf_data.json (+ pdf_raw.json)
#   ตรวจผล: Plans found = ? ถ้า > จำนวนที่ต้องการ → ปรับ keepPlans ใน config (ถามผู้ใช้เรื่องยุบ)
node "%SK%\build_docx.mjs" "<unitDir>"          # → <outputName>.docx (จัดหน้า keep-together ครบ)
node "%SK%\validate_docx.mjs" "<unitDir>"       # ตรวจ parts/0 PUA/จำนวนแผน/เวลา/keep-together props

# ใบงาน:
copy "%SK%\generate_worksheets.mjs" "<unitDir>\แบบฝึกหัด\"   # คัด template
#   → แก้ WORKSHEETS array ในไฟล์ที่คัดมา (ดู worksheet-spec.md)
cd "<unitDir>\แบบฝึกหัด" && node generate_worksheets.mjs     # → HTML + ใบงานที่_*_บทที่_*.pdf
node "%SK%\embed_worksheets.mjs" "<unitDir>"    # ฝังรูปใบงานท้ายแผน (ต้องรันหลัง build เสมอ)
node "%SK%\validate_docx.mjs" "<unitDir>"       # ตรวจอีกครั้ง: PNG = จำนวนหน้าใบงานรวม
```

> **build ต้องมาก่อน embed เสมอ** — embed แก้ docx ในที่ ถ้ารัน build ทีหลังจะทับใบงานที่ฝังไป

## การ extract (extract_pdf.mjs)
- normalize PUA (U+F7xx) ของ TH SarabunPSK → Unicode ไทยปกติ (ผล `validate` ต้องได้ ๐ ตัว PUA)
- ตรวจหัวข้อ section แบบ **ไม่ผูก font-id** — ใช้ตำแหน่ง x < 85 + คำสำคัญหัวข้อ (ต่าง PDF ใช้ font-id ต่างกัน)
- ถ้าวิชาใหม่ใช้ชื่อหัวข้อ/โครงสร้างต่างจาก ๑–๘ มาตรฐาน → เพิ่มคำใน `sectionTitleHints` หรือปรับ threshold x

## Troubleshooting
- **`EBUSY: resource busy or locked`** ตอนเขียน docx → ผู้ใช้เปิดไฟล์ค้างใน Word ให้ปิดก่อนแล้วรันใหม่
- **`Unsupported ShadingType: 1`** ตอน render ใบงาน → แค่ glow วงกลมตกแต่งที่ pdf-to-img ไม่ render; พื้นแบนเนอร์ปกติ (ไม่ต้องแก้)
- **`Expected N plans, got M`** ใน build/embed → `keepPlans` ไม่ตรงกับที่ extract เจอ; เช็ค pdf_data.json
- **ภาษาไทยในชื่อไฟล์/พาธ** → ใช้ double-quote เสมอใน shell
- **ไม่มี Word/LibreOffice** → ตรวจ pagination จริงไม่ได้ ต้องให้ผู้ใช้เปิด Word ดู (ดู page-format.md)

## ตรวจสอบความถูกต้อง (validate_docx.mjs)
parts ครบ • ๐ PUA • จำนวนแผน = keepPlans.length • `เวลา <planHours>`/`<unitTotalHours>` ครบ •
cantSplit = ๗×แผน • pageBreakBefore = ๑×แผน • หลัง embed: PNG/a:blip = จำนวนหน้าใบงานรวม
