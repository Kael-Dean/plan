const { pdf } = require("pdf-to-img");
const fs = require("fs");

async function main() {
  const doc = await pdf("D:/แผน/แบบฝึกหัด/ใบงานที่_๑_บทที่_๑_น้ำใส.pdf", { scale: 2 });
  let i = 0;
  for await (const page of doc) {
    i++;
    fs.writeFileSync(`D:/แผน/แบบฝึกหัด/test_page${i}.png`, page);
    console.log(`Saved test_page${i}.png (${(page.length/1024).toFixed(0)} KB)`);
    if (i >= 1) break;
  }
}
main().catch(console.error);
