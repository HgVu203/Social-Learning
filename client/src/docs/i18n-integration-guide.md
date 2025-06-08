# Hướng Dẫn Tích Hợp Đa Ngôn Ngữ (i18n)

Tài liệu này giúp bạn áp dụng chức năng đa ngôn ngữ (i18n) cho toàn bộ ứng dụng.

## Cài đặt thư viện

Đã cài đặt các thư viện:

- i18next
- react-i18next
- i18next-browser-languagedetector
- i18next-http-backend

```bash
npm install i18next react-i18next i18next-browser-languagedetector i18next-http-backend
```

## Cấu trúc file

- `src/i18n.js`: Cấu hình i18next
- `src/contexts/LanguageContext.jsx`: Context quản lý ngôn ngữ
- `src/components/ui/LanguageToggle.jsx`: Component toggle ngôn ngữ
- `src/locales/en/translation.json`: File dịch tiếng Anh
- `src/locales/vi/translation.json`: File dịch tiếng Việt

## Tích hợp vào Component

Để áp dụng đa ngôn ngữ cho một component, thực hiện các bước sau:

### 1. Import hook useTranslation

```jsx
import { useTranslation } from "react-i18next";
```

### 2. Sử dụng hook trong component

```jsx
const { t } = useTranslation();
```

### 3. Thay thế text cứng bằng hàm t()

```jsx
// Trước:
<h1>Welcome</h1>

// Sau:
<h1>{t('home.welcome')}</h1>
```

### 4. Sử dụng tham số trong dịch

```jsx
// Trước:
<p>Welcome, {user.name}!</p>

// Sau:
<p>{t('home.welcomeUser', { name: user.name })}</p>
```

### 5. Đảm bảo đã thêm khóa vào file dịch

Trong file `locales/en/translation.json`:

```json
{
  "home": {
    "welcome": "Welcome",
    "welcomeUser": "Welcome, {{name}}!"
  }
}
```

Trong file `locales/vi/translation.json`:

```json
{
  "home": {
    "welcome": "Chào mừng",
    "welcomeUser": "Chào mừng, {{name}}!"
  }
}
```

## Quy chuẩn đặt tên khóa dịch

Chúng ta đặt tên theo cấu trúc phân cấp sau:

1. `[trang].[thành phần].[phần tử]`
   Ví dụ: `home.welcome`, `profile.stats.followers`

2. Đối với các component được sử dụng nhiều nơi, đặt tên theo:
   `[loại component].[phần tử]`
   Ví dụ: `button.submit`, `form.required`

3. Các phần dùng chung cho toàn ứng dụng:
   `common.[phần tử]`
   Ví dụ: `common.save`, `common.cancel`

## Kiểm tra ứng dụng

Khi áp dụng xong, kiểm tra ứng dụng với các bước:

1. Vào trang Settings
2. Chuyển đổi ngôn ngữ từ English sang Vietnamese
3. Kiểm tra xem tất cả các văn bản đã được dịch đúng chưa
4. Kiểm tra các chức năng và xác nhận không có lỗi hiển thị

## Các trang cần áp dụng

- [x] Settings (Đã hoàn thành)
- [x] Home (Đã hoàn thành)
- [x] Login (Đã hoàn thành)
- [ ] SignUp
- [ ] ForgotPassword
- [ ] Profile
- [ ] Message
- [ ] Notification
- [ ] Post
- [ ] Comment
- [ ] Search
- [ ] Admin

## Các component chung cần áp dụng

- [ ] Navbar
- [ ] Sidebar
- [ ] Footer
- [ ] Button
- [ ] Form
- [ ] Modal
- [ ] Toast
- [ ] Error

## Thử thách và giải pháp

1. **Text dài**: Sử dụng component `TranslatedText`
2. **Các thông báo lỗi**: Đảm bảo thêm vào file dịch
3. **Định dạng ngày tháng**: Sử dụng thư viện `date-fns` với locale tương ứng

## Cải tiến trong tương lai

1. Chuyển từ tất cả file JSON sang định dạng phân tách với key/value riêng biệt
2. Tích hợp công cụ quản lý bản dịch
3. Thêm kiểm tra tự động để đảm bảo không bỏ sót khóa dịch
