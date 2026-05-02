import fs from "fs";
import path from "path";

const DIR = "./images";

const files = fs.readdirSync(DIR);

files.forEach(file => {
  const filePath = path.join(DIR, file);

  // ข้ามถ้ามีนามสกุลอยู่แล้ว
  if (file.includes(".")) return;

  const buffer = fs.readFileSync(filePath);

  let ext = "";

  // 🔥 ตรวจ magic number
  if (buffer.slice(0, 3).toString("hex") === "ffd8ff") {
    ext = ".jpg";
  } else if (buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a") {
    ext = ".png";
  } else if (buffer.slice(0, 4).toString("ascii") === "RIFF") {
    ext = ".webp";
  } else {
    console.log("unknown:", file);
    return;
  }

  const newPath = path.join(DIR, file + ext);

  fs.renameSync(filePath, newPath);
  console.log("fixed:", file, "->", file + ext);
});

console.log("DONE");