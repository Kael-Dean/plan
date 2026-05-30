const { pdf } = require("pdf-to-img");

async function main() {
  const doc = await pdf("D:/แผน/แบบฝึกหัด/ใบงานที่_๑_บทที่_๑_น้ำใส.pdf", { scale: 2 });
  console.log("Pages:", doc.length);
  let i = 0;
  for await (const page of doc) {
    i++;
    console.log(`Page ${i}: buffer length ${page.length}`);
    if (i >= 2) break;
  }
  console.log("OK");
}
main().catch(e => console.error("ERROR:", e.message));
