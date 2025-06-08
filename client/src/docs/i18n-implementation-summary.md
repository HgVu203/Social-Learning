# Tóm tắt triển khai đa ngôn ngữ (i18n)

## Các bước đã thực hiện

1. **Cài đặt thư viện**

   ```bash
   npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
   ```

2. **Tạo cấu trúc file**

   - `src/i18n.js`: Cấu hình i18next
   - `src/contexts/LanguageContext.jsx`: Context quản lý ngôn ngữ
   - `src/components/ui/LanguageToggle.jsx`: Component chuyển đổi ngôn ngữ
   - `src/locales/en/translation.json`: File dịch tiếng Anh
   - `src/locales/vi/translation.json`: File dịch tiếng Việt

3. **Tích hợp vào ứng dụng**

   - Thêm `LanguageProvider` vào `main.jsx`
   - Import `i18n.js` vào `main.jsx`

4. **Cập nhật trang Settings**

   - Thêm nút chuyển đổi ngôn ngữ
   - Sử dụng hàm `t()` để dịch nội dung

5. **Cập nhật các trang chính**

   - HomePage
   - LoginPage
   - Navbar

6. **Tạo các công cụ hỗ trợ**
   - `TranslatedText.jsx`: Component dịch văn bản
   - `translationHelper.js`: Các tiện ích hỗ trợ dịch
   - `generateTranslations.js`: Script tạo file dịch
   - `i18nTransform.js`: Script chuyển đổi component

## Các trang đã được cập nhật

- [x] Settings
- [x] Home
- [x] Login
- [x] Navbar

## Các mã khóa dịch đã được thêm

- settings.\*: 18 khóa
- navbar.\*: 17 khóa
- home.\*: 7 khóa
- auth.\*: 14 khóa
- profile.\*: 16 khóa
- common.\*: 8 khóa

## Hướng dẫn áp dụng cho các trang còn lại

Thực hiện các bước sau cho mỗi trang:

1. Import hook useTranslation:

   ```jsx
   import { useTranslation } from "react-i18next";
   ```

2. Sử dụng hook trong component:

   ```jsx
   const { t } = useTranslation();
   ```

3. Thêm khóa dịch vào file `translation.json` (cả tiếng Anh và tiếng Việt)

4. Thay thế các chuỗi cứng trong code bằng hàm `t()`:

   ```jsx
   // Trước
   <h1>Welcome</h1>

   // Sau
   <h1>{t('home.welcome')}</h1>
   ```

5. Đối với chuỗi có tham số:
   ```jsx
   <p>{t("profile.joinedDate", { date: formattedDate })}</p>
   ```

## Công cụ hỗ trợ

1. Có thể sử dụng script `i18nTransform.js` để chuyển đổi nhanh các component:

   - Paste nội dung component vào biến `sourceCode`
   - Chạy script
   - Kết quả được biến đổi sẽ được in ra console

2. Theo dõi quá trình với file hướng dẫn `i18n-integration-guide.md`

## Lưu ý quan trọng

- Luôn cập nhật cả file `en/translation.json` và `vi/translation.json`
- Tuân thủ quy chuẩn đặt tên khóa dịch
- Kiểm tra hiển thị trang với cả hai ngôn ngữ
- Đặc biệt chú ý các ngôn ngữ dài hơn có thể gây lỗi giao diện
