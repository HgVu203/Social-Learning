/**
 * Script để trích xuất các chuỗi văn bản từ các component và tạo file dịch
 * Chạy bằng lệnh: node src/scripts/generateTranslations.js
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Cấu hình
const SRC_DIR = path.resolve(__dirname, "..");
const COMPONENT_DIRS = ["components", "pages"];
const OUTPUT_EN = path.resolve(SRC_DIR, "locales/en/translation.json");
const OUTPUT_VI = path.resolve(SRC_DIR, "locales/vi/translation.json");

// Đọc file translation hiện có
let enTranslation = {};
let viTranslation = {};

try {
  enTranslation = JSON.parse(fs.readFileSync(OUTPUT_EN, "utf8"));
  console.log("Loaded existing English translations");
} catch (error) {
  console.log("No existing English translations found, creating new file");
}

try {
  viTranslation = JSON.parse(fs.readFileSync(OUTPUT_VI, "utf8"));
  console.log("Loaded existing Vietnamese translations");
} catch (error) {
  console.log("No existing Vietnamese translations found, creating new file");
}

// Tự động tạo khóa dịch cho tất cả trang và component
COMPONENT_DIRS.forEach((dir) => {
  const pattern = path.join(SRC_DIR, dir, "**/*.{jsx,js}");
  const files = glob.sync(pattern);

  console.log(`Processing ${files.length} files in ${dir}...`);

  files.forEach((file) => {
    const relativePath = path.relative(SRC_DIR, file);
    console.log(`Scanning ${relativePath}`);
    // Đọc nội dung file
    const content = fs.readFileSync(file, "utf8");

    // Scan các chuỗi
    scanForTranslationStrings(content, relativePath);
  });
});

// Lưu file translation
fs.writeFileSync(OUTPUT_EN, JSON.stringify(enTranslation, null, 2));
console.log(`English translations saved to ${OUTPUT_EN}`);

fs.writeFileSync(OUTPUT_VI, JSON.stringify(viTranslation, null, 2));
console.log(`Vietnamese translations saved to ${OUTPUT_VI}`);

// Hàm quét chuỗi văn bản và tự động tạo khung dịch
function scanForTranslationStrings(content, filePath) {
  // Lấy tên component từ đường dẫn file
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1].replace(/\.(jsx|js)$/, "");
  let namespace = "";

  // Xác định namespace dựa trên thư mục
  if (filePath.includes("/pages/")) {
    const pageName = fileName.replace("Page", "").toLowerCase();
    namespace = pageName;
  } else if (filePath.includes("/components/")) {
    // Lấy thư mục con cuối cùng làm namespace
    const componentType = parts[parts.length - 2].toLowerCase();
    namespace = componentType === "common" ? "common" : componentType;
  }

  if (!namespace) {
    namespace = "common";
  }

  // Tự động tạo cấu trúc cho namespace nếu chưa tồn tại
  if (!enTranslation[namespace]) {
    enTranslation[namespace] = {};
    if (!viTranslation[namespace]) {
      viTranslation[namespace] = {};
    }
  }

  // Thông báo
  console.log(`Using namespace: ${namespace} for ${filePath}`);
}
