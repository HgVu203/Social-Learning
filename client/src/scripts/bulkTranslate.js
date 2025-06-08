/**
 * Script để tự động chuyển đổi tất cả component sang sử dụng i18n
 * Chạy bằng lệnh: npx vite-node src/scripts/bulkTranslate.js
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";

// Cấu hình
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, "..");
const COMPONENT_DIRS = [
  "components/navbar",
  "components/sidebar",
  "components/post",
  "components/profile",
  "components/message",
  "components/friend",
  "components/group",
  "pages/home",
  "pages/profile",
  "pages/message",
  "pages/group",
  "pages/friend",
  "pages/post",
  "pages/search",
  "pages/auth",
];
const OUTPUT_EN = path.resolve(SRC_DIR, "locales/en/translation.json");
const OUTPUT_VI = path.resolve(SRC_DIR, "locales/vi/translation.json");

// Đọc file translation hiện có
let enTranslation = {};
let viTranslation = {};

try {
  enTranslation = JSON.parse(fs.readFileSync(OUTPUT_EN, "utf8"));
  console.log("Loaded existing English translations");
} catch {
  console.log("No existing English translations found, creating new file");
}

try {
  viTranslation = JSON.parse(fs.readFileSync(OUTPUT_VI, "utf8"));
  console.log("Loaded existing Vietnamese translations");
} catch {
  console.log("No existing Vietnamese translations found, creating new file");
}

// Đếm số lượng trang đã xử lý
let processedFiles = 0;
let modifiedFiles = 0;

// Xử lý từng thư mục component
COMPONENT_DIRS.forEach((dir) => {
  const pattern = path.join(SRC_DIR, dir, "**/*.{jsx,js}");
  const files = glob.sync(pattern);

  console.log(`Processing ${files.length} files in ${dir}...`);

  files.forEach((file) => {
    processedFiles++;
    const relativePath = path.relative(SRC_DIR, file);
    console.log(`Scanning ${relativePath}`);

    // Đọc nội dung file
    const content = fs.readFileSync(file, "utf8");

    // Kiểm tra xem file đã có useTranslation chưa
    if (content.includes("useTranslation")) {
      console.log(`- File already using i18n`);
      return;
    }

    // Thực hiện chuyển đổi
    const transformed = transformToI18n(content, relativePath);

    // Nếu có thay đổi, lưu lại
    if (transformed !== content) {
      fs.writeFileSync(file, transformed, "utf8");
      console.log(`- File transformed and saved`);
      modifiedFiles++;

      // Tìm các khóa dịch từ file đã chuyển đổi
      extractTranslationKeys(transformed, relativePath);
    } else {
      console.log(`- No changes needed`);
    }
  });
});

// Lưu file translation
fs.writeFileSync(OUTPUT_EN, JSON.stringify(enTranslation, null, 2), "utf8");
console.log(`English translations saved to ${OUTPUT_EN}`);

fs.writeFileSync(OUTPUT_VI, JSON.stringify(viTranslation, null, 2), "utf8");
console.log(`Vietnamese translations saved to ${OUTPUT_VI}`);

console.log(`\nSummary:`);
console.log(`Total files processed: ${processedFiles}`);
console.log(`Files modified: ${modifiedFiles}`);

// Hàm chuyển đổi component sang i18n
function transformToI18n(code, filePath) {
  // Thêm import useTranslation
  let result = code.replace(
    /import\s+{([^}]*)}/,
    (match, imports) =>
      `import { ${
        imports.trim() ? imports + ", " : ""
      }useTranslation } from "react-i18next"`
  );

  // Nếu không có import destructuring thì thêm một cái mới
  if (!result.includes("useTranslation")) {
    result = result.replace(
      /(import.*?;\n)/,
      '$1import { useTranslation } from "react-i18next";\n'
    );
  }

  // Thêm hook useTranslation vào component
  result = result.replace(
    /(const\s+\w+\s*=\s*\(\s*\w*\s*\)\s*=>\s*{)/,
    "$1\n  const { t } = useTranslation();"
  );

  // Tìm và chuyển đổi chuỗi trong JSX
  result = result.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>([^<>{}]*)<\/\1>/g,
    (match, tag, content) => {
      // Chỉ chuyển đổi chuỗi có ý nghĩa
      if (
        content.trim() &&
        content.trim().length > 1 &&
        !content.includes("{") &&
        !content.includes("}")
      ) {
        const key = generateTranslationKey(content.trim(), filePath);
        return match.replace(content, `{t('${key}')}`);
      }
      return match;
    }
  );

  return result;
}

// Hàm tạo khóa dịch từ nội dung và đường dẫn
function generateTranslationKey(content, filePath) {
  // Xác định namespace từ đường dẫn file
  let namespace = "common";

  // Ưu tiên xác định namespace bằng đường dẫn
  if (filePath.includes("/pages/")) {
    const parts = filePath.split("/");
    namespace = parts[parts.length - 2].toLowerCase();
  } else if (filePath.includes("/components/")) {
    const parts = filePath.split("/");
    namespace = parts[parts.length - 2].toLowerCase();
  }

  // Tạo key từ nội dung
  let key = content
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "") // Xóa ký tự đặc biệt
    .replace(/\s+/g, ".") // Khoảng trắng thành dấu chấm
    .substring(0, 30); // Giới hạn độ dài

  return `${namespace}.${key}`;
}

// Hàm tìm và lưu các khóa dịch từ mã đã chuyển đổi
function extractTranslationKeys(code, filePath) {
  const tCalls = code.match(/t\('([^']+)'\)/g) || [];

  tCalls.forEach((call) => {
    const keyMatch = call.match(/t\('([^']+)'\)/);
    if (keyMatch) {
      const key = keyMatch[1];
      const parts = key.split(".");

      // Tạo cấu trúc lồng nhau
      let enCurrent = enTranslation;
      let viCurrent = viTranslation;

      // Duyệt qua các phần của khóa để tạo cấu trúc lồng nhau
      for (let i = 0; i < parts.length - 1; i++) {
        if (!enCurrent[parts[i]]) {
          enCurrent[parts[i]] = {};
          viCurrent[parts[i]] = {};
        }
        enCurrent = enCurrent[parts[i]];
        viCurrent = viCurrent[parts[i]];
      }

      // Tìm văn bản gốc từ code
      const lastPart = parts[parts.length - 1];

      // Nếu key đã tồn tại, không ghi đè
      if (!enCurrent[lastPart]) {
        // Thử tìm văn bản gốc từ code gần vị trí t()
        const originalContent = findOriginalContent(code, key);
        enCurrent[lastPart] = originalContent || lastPart;

        // Thêm bản dịch tiếng Việt nếu chưa có
        if (!viCurrent[lastPart]) {
          viCurrent[lastPart] = autoTranslateToVietnamese(enCurrent[lastPart]);
        }
      }
    }
  });
}

// Tìm nội dung gốc từ trước khi thay thế
function findOriginalContent(code, key) {
  // Đây là một hàm đơn giản, có thể cải thiện để tìm chính xác nội dung gốc
  const keyRegex = new RegExp(`t\\('${key}'\\)`);
  const index = code.search(keyRegex);

  if (index > -1) {
    // Quét ngược lại để tìm dấu mở ngoặc <
    let startTag = code.lastIndexOf("<", index);
    let endTag = code.indexOf(">", index);

    if (startTag > -1 && endTag > -1) {
      const tagContent = code.substring(startTag, endTag + 1);
      const tagMatch = tagContent.match(/<([a-zA-Z][a-zA-Z0-9]*)/);

      if (tagMatch) {
        const tagName = tagMatch[1];
        const closeTag = `</${tagName}>`;
        const closeTagIndex = code.indexOf(closeTag, endTag);

        if (closeTagIndex > -1) {
          // Extract content between tags
          const contentStart = endTag + 1;
          const contentEnd = closeTagIndex;
          const content = code.substring(contentStart, contentEnd).trim();

          // Kiểm tra xem content có chứa nội dung có ý nghĩa không
          if (content && !content.includes("{") && !content.includes("}")) {
            return content;
          }
        }
      }
    }
  }

  return null;
}

// Hàm giả lập dịch tiếng Việt
function autoTranslateToVietnamese(text) {
  // Từ điển chuyển đổi cơ bản
  const translations = {
    welcome: "Chào mừng",
    home: "Trang chủ",
    profile: "Hồ sơ",
    messages: "Tin nhắn",
    notifications: "Thông báo",
    settings: "Cài đặt",
    friends: "Bạn bè",
    groups: "Nhóm",
    search: "Tìm kiếm",
    post: "Bài viết",
    comment: "Bình luận",
    like: "Thích",
    share: "Chia sẻ",
    create: "Tạo",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    cancel: "Hủy",
    save: "Lưu",
    submit: "Gửi",
    login: "Đăng nhập",
    logout: "Đăng xuất",
    signup: "Đăng ký",
    password: "Mật khẩu",
    email: "Email",
    username: "Tên người dùng",
    name: "Tên",
    description: "Mô tả",
    content: "Nội dung",
    upload: "Tải lên",
    download: "Tải xuống",
    loading: "Đang tải",
    error: "Lỗi",
    success: "Thành công",
    follow: "Theo dõi",
    unfollow: "Bỏ theo dõi",
    add: "Thêm",
    remove: "Xóa",
    members: "Thành viên",
    admin: "Quản trị viên",
    user: "Người dùng",
    date: "Ngày",
    time: "Thời gian",
    today: "Hôm nay",
    yesterday: "Hôm qua",
    tomorrow: "Ngày mai",
    view: "Xem",
    details: "Chi tiết",
    more: "Thêm",
    less: "Ít hơn",
    all: "Tất cả",
    none: "Không có",
    confirm: "Xác nhận",
    agree: "Đồng ý",
    disagree: "Không đồng ý",
  };

  // Chuyển đổi cơ bản
  let result = text;
  for (const [en, vi] of Object.entries(translations)) {
    const regex = new RegExp(`\\b${en}\\b`, "gi");
    result = result.replace(regex, vi);
  }

  return result || text; // Trả về kết quả hoặc giữ nguyên văn bản gốc
}
