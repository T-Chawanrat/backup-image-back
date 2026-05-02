import xlsx from "xlsx";
import fs from "fs";
import fetch from "node-fetch";
import pLimit from "p-limit";
import https from "https";

const FILE_PATH = "./close_bill.xlsx";
const BASE_URL = "https://admin.trantech.co.th/document/uploads/files/";
const SAVE_DIR = "./sign";

// ⚖️ เร็ว + นิ่ง
const CONCURRENCY = 8;
const BASE_DELAY_MIN = 200;
const BASE_DELAY_MAX = 500;

const limit = pLimit(CONCURRENCY);

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 2,
});

// ===== util =====
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () =>
  BASE_DELAY_MIN +
  Math.floor(Math.random() * (BASE_DELAY_MAX - BASE_DELAY_MIN));

// ===== excel =====
function getFilesFromSheets() {
  const wb = xlsx.readFile(FILE_PATH);

  // ✅ ใช้ Sheet1 ตรงๆ
  const sheet = wb.Sheets["Sheet1"];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const files = data
    .slice(1) // ข้าม header
    .map((r) => r[7]) // ✅ column H = index 7
    .map((f) => f?.toString().trim())
    .filter(Boolean);

  console.log("Sheet1:", files.length);
  console.log("UNIQUE:", [...new Set(files)].length);

  return [...new Set(files)];
}

// ===== folder =====
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR);

// ===== download =====
async function download(file, attempt = 1) {
  const basePath = `${SAVE_DIR}/${file}`;

  // ❌ logic เดิม (skip ถ้ามี)
  if (
    fs.existsSync(basePath + ".jpg") ||
    fs.existsSync(basePath + ".png") ||
    fs.existsSync(basePath + ".webp")
  ) {
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(BASE_URL + file, {
      headers: { "User-Agent": "Mozilla/5.0" },
      agent,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // ❌ ไม่ retry 404
    if (res.status === 404) {
      console.log("skip:", file, 404);
      return;
    }

    // 🔁 retry เฉพาะ 5xx
    if (!res.ok && attempt < 2 && res.status >= 500) {
      return download(file, attempt + 1);
    }

    if (!res.ok) {
      console.log("skip:", file, res.status);
      return;
    }

    const buf = Buffer.from(await res.arrayBuffer());

    const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng =
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46;

    if (!isJpg && !isPng && !isWebp) {
      console.log("skip (not real image):", file);
      return;
    }

    let ext = ".jpg";
    if (isPng) ext = ".png";
    else if (isWebp) ext = ".webp";

    fs.writeFileSync(basePath + ext, buf);
    console.log("saved:", file + ext);

    await sleep(jitter());
  } catch (e) {
    // 🔁 retry timeout / network แค่ 1 รอบ
    if ((e.name === "AbortError" || e.code) && attempt < 2) {
      return download(file, attempt + 1);
    }

    if (e.name === "AbortError") {
      console.log("skip (timeout):", file);
    } else {
      console.log("skip:", file, "error");
    }
  }
}

// ===== main =====
async function main() {
  const files = getFilesFromSheets();
  console.log("TOTAL:", files.length);

  await Promise.all(files.map((f) => limit(() => download(f))));

  console.log("DONE");
}

main();
