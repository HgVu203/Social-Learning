/**
 * Script để tự động chuyển đổi component để sử dụng i18n
 * Cách sử dụng:
 * 1. Sao chép nội dung component vào biến 'sourceCode'
 * 2. Chạy script
 * 3. Kết quả sẽ được in ra màn hình
 */

// Bước 1: Cung cấp nội dung component cần chuyển đổi
const sourceCode = `
import { useState } from "react";
import { Link } from "react-router-dom";

const ExampleComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Welcome to our app!</h1>
      <p>This is an example component</p>
      <button onClick={() => setCount(count + 1)}>
        Click me ({count} clicks)
      </button>
      <Link to="/home">Back to Home</Link>
      <div className="footer">
        <p>© 2023 Example App. All rights reserved.</p>
      </div>
    </div>
  );
};

export default ExampleComponent;
`;

// Bước 2: Chức năng phân tích và chuyển đổi code
function transformToI18n(code) {
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
  // Ví dụ: <h1>Welcome</h1> -> <h1>{t('example.welcome')}</h1>
  result = result.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)[^>]*>([^<>{}]*)<\/\1>/g,
    (match, tag, content) => {
      // Chỉ chuyển đổi chuỗi có ý nghĩa
      if (content.trim() && content.trim().length > 1) {
        const key = generateTranslationKey(content.trim());
        return match.replace(content, `{t('${key}')}`);
      }
      return match;
    }
  );

  return result;
}

// Hàm tạo khóa dịch từ nội dung
function generateTranslationKey(content) {
  // Lấy tên component từ code
  const componentNameMatch = sourceCode.match(/const\s+(\w+)\s*=/);
  const namespace = componentNameMatch
    ? componentNameMatch[1].replace(/Component$/, "").toLowerCase()
    : "common";

  // Tạo key từ nội dung
  let key = content
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Xóa ký tự đặc biệt
    .replace(/\s+/g, ".") // Khoảng trắng thành dấu chấm
    .substring(0, 30); // Giới hạn độ dài

  return `${namespace}.${key}`;
}

// Bước 3: Tạo các khóa dịch từ mã nguồn
function extractTranslationKeys(code) {
  const translations = {};
  const viTranslations = {};

  // Tìm tất cả các lệnh gọi t()
  const tCalls = code.match(/t\('([^']+)'\)/g) || [];

  tCalls.forEach((call) => {
    const keyMatch = call.match(/t\('([^']+)'\)/);
    if (keyMatch) {
      const key = keyMatch[1];
      const parts = key.split(".");

      // Tạo cấu trúc lồng nhau
      let enCurrent = translations;
      let viCurrent = viTranslations;

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
      const textMatch = code.match(
        new RegExp(`t\\('${key}'\\).*?(["'\`])([^"'\`]+)\\1`)
      );

      // Đặt giá trị cho key cuối cùng
      enCurrent[lastPart] = textMatch ? textMatch[2] : lastPart;

      // Tự động chuyển thành tiếng Việt cho mục đích minh họa
      // Thực tế nên dùng dịch vụ dịch thuật hoặc nhập thủ công
      viCurrent[lastPart] = autoTranslateToVietnamese(enCurrent[lastPart]);
    }
  });

  return { en: translations, vi: viTranslations };
}

// Hàm giả lập dịch tiếng Việt (thực tế nên dùng API dịch hoặc điền thủ công)
function autoTranslateToVietnamese(text) {
  // Đây chỉ là một mô phỏng đơn giản
  const translations = {
    welcome: "Chào mừng",
    to: "đến với",
    our: "của chúng tôi",
    app: "ứng dụng",
    "this is": "đây là",
    example: "ví dụ",
    component: "thành phần",
    click: "Nhấp",
    me: "vào đây",
    clicks: "lần nhấp",
    back: "Quay lại",
    home: "Trang chủ",
    all: "Tất cả",
    rights: "quyền",
    reserved: "được bảo lưu",
  };

  // Chuyển đổi cơ bản
  let result = text;
  Object.keys(translations).forEach((key) => {
    result = result.replace(new RegExp(key, "gi"), translations[key]);
  });

  return result;
}

// Bước 4: Chạy chuyển đổi và hiển thị kết quả
const transformedCode = transformToI18n(sourceCode);
console.log("=== Transformed Code ===");
console.log(transformedCode);

const keys = extractTranslationKeys(transformedCode);
console.log("\n=== English Translation Keys ===");
console.log(JSON.stringify(keys.en, null, 2));

console.log("\n=== Vietnamese Translation Keys ===");
console.log(JSON.stringify(keys.vi, null, 2));

/**
 * Hướng dẫn sử dụng:
 *
 * 1. Sao chép nội dung component vào biến 'sourceCode'
 * 2. Chạy script này
 * 3. Sao chép mã đã chuyển đổi và cập nhật component của bạn
 * 4. Thêm các khóa dịch vào file translation.json
 */
