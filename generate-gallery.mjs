import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const photoDirectory = join(root, "photos");
const thumbnailDirectory = join(root, "thumbnails");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const discoveredFiles = readdirSync(photoDirectory)
  .filter((filename) => supportedExtensions.has(extname(filename).toLowerCase()))
  .map((filename) => filename.normalize("NFC"))
  .sort((left, right) => left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" }));

if (discoveredFiles.length === 0) {
  throw new Error("photos 폴더에서 사진을 찾지 못했습니다.");
}

const manifestPath = join(root, "photos.js");
let previousFiles = [];

try {
  const manifest = readFileSync(manifestPath, "utf8");
  const match = manifest.match(/window\.PHOTO_FILES\s*=\s*(\[[\s\S]*\]);/);
  if (match) {
    previousFiles = JSON.parse(match[1]).map((filename) => filename.normalize("NFC"));
  }
} catch {
  previousFiles = [];
}

const discoveredSet = new Set(discoveredFiles);
const previousSet = new Set(previousFiles);
const newFiles = discoveredFiles.filter((filename) => !previousSet.has(filename));
const existingFiles = previousFiles.filter((filename) => discoveredSet.has(filename));
const files = [...newFiles, ...existingFiles];

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
  manifestPath,
  `window.PHOTO_FILES = ${JSON.stringify(files, null, 2)};\n`,
  "utf8",
);

console.log(`완료: 사진 ${files.length}장, 새 사진 ${newFiles.length}장, 새 썸네일 ${generated}장`);
