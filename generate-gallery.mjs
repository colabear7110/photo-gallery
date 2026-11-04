import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const photoDirectory = join(root, "photos");
const thumbnailDirectory = join(root, "thumbnails");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const files = readdirSync(photoDirectory)
  .filter((filename) => supportedExtensions.has(extname(filename).toLowerCase()))
  .sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));

if (files.length === 0) {
  throw new Error("photos 폴더에서 사진을 찾지 못했습니다.");
}

mkdirSync(thumbnailDirectory, { recursive: true });

let generated = 0;
for (const [index, filename] of files.entries()) {
  const source = join(photoDirectory, filename);
  const destination = join(thumbnailDirectory, filename);
  const sourceModified = statSync(source).mtimeMs;
  let shouldGenerate = true;

  try {
    shouldGenerate = statSync(destination).mtimeMs < sourceModified;
  } catch {
    shouldGenerate = true;
  }

  if (shouldGenerate) {
    const result = spawnSync(
      "/usr/bin/sips",
      ["-Z", "600", "-s", "format", "jpeg", "-s", "formatOptions", "62", source, "--out", destination],
      { stdio: "ignore" },
    );

    if (result.status !== 0) {
      throw new Error(`썸네일 생성 실패: ${filename}`);
    }
    generated += 1;
  }

  if ((index + 1) % 50 === 0 || index + 1 === files.length) {
    console.log(`썸네일 처리: ${index + 1}/${files.length}`);
  }
}

writeFileSync(
  join(root, "photos.js"),
  `window.PHOTO_FILES = ${JSON.stringify(files.map((filename) => filename.normalize("NFC")), null, 2)};\n`,
  "utf8",
);

console.log(`완료: 사진 ${files.length}장, 새 썸네일 ${generated}장`);
