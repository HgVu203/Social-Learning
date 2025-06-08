/**
 * Cấu hình i18n cho ứng dụng
 * Hỗ trợ đa ngôn ngữ (tiếng Anh và tiếng Việt)
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

// Import translation resources
import enTranslation from "./locales/en/translation.json";
import viTranslation from "./locales/vi/translation.json";

const resources = {
  en: {
    translation: enTranslation,
  },
  vi: {
    translation: viTranslation,
  },
};

const isDevelopment = import.meta.env.MODE === "development";

i18n
  // Load translation using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    resources,
    fallbackLng: "en",
    debug: isDevelopment,

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },

    // Detect language from localStorage
    detection: {
      order: ["localStorage", "cookie", "navigator"],
      lookupLocalStorage: "language",
      caches: ["localStorage", "cookie"],
    },

    // Tùy chọn backend để tải các file ngôn ngữ
    backend: {
      loadPath: "/src/locales/{{lng}}/translation.json",
    },

    // Đoán ngôn ngữ tải trước
    preload: ["en", "vi"],
  });

export default i18n;
