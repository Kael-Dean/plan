const { pdf } = require("pdf-to-img");
const THAI_NUMS = ["", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙", "๑๐"];

async function main() {
  let total = 0;
  for (let i = 1; i <= 10; i++) {
    const tn = THAI_NUMS[i];
    const pdfPath = `D:/แผน/แบบฝึกหัด/ใบงานที่_${tn}_บทที่_๑_น้ำใส.pdf`;
    let count = 0;
    const doc = await pdf(pdfPath, { scale: 2 });
    for await (const _ of doc) count++;
    total += count;
    console.log(`Worksheet ${i} (${tn}): ${count} pages`);
  }
  console.log(`Total pages: ${total}`);
}
main().catch(e => { console.error(e); process.exit(1); });
