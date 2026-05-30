# แผน — แผนการจัดการเรียนรู้ + ใบงาน (ป.1)

โปรเจกต์รวมแผนการจัดการเรียนรู้และใบงาน พร้อม **agent/skill สำหรับแปลง PDF แผนการสอน → Word + สร้างใบงาน**
สำหรับ **โรงเรียนบ้านหนองเต่า**

## โครงสร้างโฟลเดอร์

| โฟลเดอร์ | รายละเอียด |
|----------|------------|
| `แผนคณิตศาสตร์/` | แผนคณิตศาสตร์ ป.1 (PDF) + `ใบงานคณิตศาสตร์/` (ใบงาน 6 ใบ + ตัวสร้าง `build_math_worksheets.mjs`) |
| `แผนภาษาไทย/` | แผนภาษาไทย/อังกฤษ (PDF + DOCX) |
| `docs/` | เอกสารออกแบบ (specs) |
| `.claude/` | **agent + skill ทำแผน** (ดูหัวข้อ "ติดตั้งบนเครื่องใหม่") |

## agent / skill ที่อยู่ในโปรเจกต์

- **agent:** `lesson-plan-maker` — ผู้เชี่ยวชาญทำแผนการเรียนรู้ (แปลง PDF → Word, สร้างใบงาน, จัดหน้า)
- **skill:** `lesson-plan-docx` — ไปป์ไลน์แปลง PDF หน่วยการเรียนรู้ → Word มาตรฐานราชการไทย + ใบงาน

ทั้งสองอยู่ใน `.claude/` จึงใช้งานได้แบบ **project-scoped** อัตโนมัติเมื่อเปิดโปรเจกต์นี้ใน Claude Code

## ติดตั้งบนเครื่องใหม่ (เช่น MacBook)

```bash
# 1) clone โปรเจกต์
git clone https://github.com/Kael-Dean/plan.git
cd plan

# 2) ติดตั้ง dependencies ของ skill (ได้ไบนารีตรงกับ OS ของเครื่อง)
cd .claude/skills/lesson-plan-docx/scripts
npm install
cd -

# 3) (ถ้าจะใช้ agent แบบ global ทุกโปรเจกต์ บน Mac)
mkdir -p ~/.claude/skills ~/.claude/agents
cp -R .claude/skills/lesson-plan-docx ~/.claude/skills/
cp .claude/agents/lesson-plan-maker.md ~/.claude/agents/
# แล้ว npm install ใน ~/.claude/skills/lesson-plan-docx/scripts ด้วย
```

### หมายเหตุความเข้ากันได้ข้าม OS
- สคริปต์ skill ส่วนใหญ่ทำงานได้ทั้ง Windows/macOS
- **ข้อยกเว้น:** การแปลง HTML→PDF ของใบงานใช้ Microsoft Edge headless โดย path ใน
  `generate_worksheets.mjs` และ `แผนคณิตศาสตร์/ใบงานคณิตศาสตร์/build_math_worksheets.mjs`
  ตั้งไว้เป็น path ของ Windows:
  `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
  บน macOS ให้แก้เป็น Chrome/Edge ของ Mac เช่น
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (โหมด `--headless=new --print-to-pdf`)

## สร้างใบงานคณิตศาสตร์ใหม่

```bash
cd แผนคณิตศาสตร์/ใบงานคณิตศาสตร์
node build_math_worksheets.mjs   # สร้าง PDF ทั้ง 6 ใบ
```
