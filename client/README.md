# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Pin Leaning - Client

Pin Leaning là ứng dụng mạng xã hội hỗ trợ đa ngôn ngữ, giúp kết nối mọi người với nhau.

## Tính năng chính

- Trang chủ với feed bài viết
- Hệ thống xác thực người dùng
- Tính năng tin nhắn
- Tạo và chia sẻ bài viết
- Thông báo thời gian thực
- Đa ngôn ngữ (Tiếng Anh/Tiếng Việt)

## Hỗ trợ đa ngôn ngữ (i18n)

Ứng dụng hỗ trợ hai ngôn ngữ:

- Tiếng Anh (mặc định)
- Tiếng Việt

### Cấu trúc

- `src/i18n.js`: Cấu hình i18next
- `src/contexts/LanguageContext.jsx`: Context quản lý ngôn ngữ
- `src/components/ui/LanguageToggle.jsx`: Component nút chuyển đổi ngôn ngữ
- `src/locales/`: Thư mục chứa các bản dịch
  - `en/translation.json`: Tiếng Anh
  - `vi/translation.json`: Tiếng Việt

### Cách sử dụng trong component

```jsx
import { useTranslation } from "react-i18next";

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("myComponent.title")}</h1>
      <p>{t("myComponent.description", { name: userName })}</p>
    </div>
  );
};
```

### Chuyển đổi ngôn ngữ

Người dùng có thể chuyển đổi ngôn ngữ trong trang Cài đặt của ứng dụng. Ứng dụng sẽ ghi nhớ lựa chọn ngôn ngữ trong localStorage.

## Phát triển

### Cài đặt

```bash
npm install
```

### Chạy ứng dụng

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Thêm ngôn ngữ mới

Để thêm ngôn ngữ mới:

1. Tạo file dịch trong `src/locales/<mã ngôn ngữ>/translation.json`
2. Cập nhật `src/i18n.js` để thêm ngôn ngữ mới
3. Thêm nút chọn ngôn ngữ mới trong trang Settings

## Đóng góp

Nếu bạn muốn đóng góp, vui lòng thêm các bản dịch mới hoặc cải thiện các bản dịch hiện có.
