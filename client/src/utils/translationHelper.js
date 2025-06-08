import i18n from "i18next";

/**
 * Gets the current translation for a key
 * @param {string} key - The translation key
 * @param {Object} options - Optional parameters
 * @returns {string} - The translated string
 */
export const getTranslation = (key, options = {}) => {
  return i18n.t(key, options);
};

/**
 * Changes the language
 * @param {string} lang - The language code to change to ('en' or 'vi')
 */
export const changeLanguage = (lang) => {
  if (lang !== "en" && lang !== "vi") {
    console.error('Invalid language code. Use "en" or "vi"');
    return;
  }

  i18n.changeLanguage(lang);
  localStorage.setItem("language", lang);
};

/**
 * Gets the current language
 * @returns {string} - The current language code
 */
export const getCurrentLanguage = () => {
  return i18n.language || localStorage.getItem("language") || "en";
};

/**
 * Helper to extract translation keys from component
 * Useful for development to identify which keys need translation
 * @returns {Array} - Array of translation keys used in the component
 */
export const extractTranslationKeys = () => {
  // This is a placeholder function
  // In real implementation, you would need to traverse the component tree
  // and extract all t() function calls
  console.warn("extractTranslationKeys is a placeholder function");
  return [];
};

/**
 * Các hàm tiện ích hỗ trợ dịch
 */

/**
 * Dịch một chuỗi nhanh chóng mà không cần hook useTranslation()
 * Hữu ích cho các hàm tiện ích bên ngoài component
 *
 * @param {string} key - Khóa dịch
 * @param {Object} params - Các tham số để chèn vào chuỗi dịch
 * @returns {string} - Chuỗi đã dịch
 */
export const translateText = (key, params = {}) => {
  return i18n.t(key, params);
};

/**
 * Dịch và định dạng ngày tháng theo ngôn ngữ hiện tại
 *
 * @param {Date|string} date - Đối tượng Date hoặc chuỗi ngày tháng
 * @param {Object} options - Tùy chọn định dạng ngày tháng
 * @returns {string} - Chuỗi ngày tháng đã định dạng
 */
export const formatDate = (date, options = {}) => {
  const dateObj = date instanceof Date ? date : new Date(date);

  const defaultOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  // Sử dụng ngôn ngữ hiện tại
  return dateObj.toLocaleDateString(i18n.language, {
    ...defaultOptions,
    ...options,
  });
};

/**
 * Xác định xem một khóa dịch có tồn tại không
 *
 * @param {string} key - Khóa dịch cần kiểm tra
 * @returns {boolean} - true nếu khóa tồn tại, ngược lại false
 */
export const translationExists = (key) => {
  return i18n.exists(key);
};

/**
 * Thêm namespace vào đầu khóa nếu chưa có
 *
 * @param {string} key - Khóa dịch
 * @param {string} namespace - Namespace mặc định
 * @returns {string} - Khóa dịch đã có namespace
 */
export const ensureNamespace = (key, namespace = "common") => {
  if (!key.includes(".")) {
    return `${namespace}.${key}`;
  }
  return key;
};

export default {
  getTranslation,
  changeLanguage,
  getCurrentLanguage,
  extractTranslationKeys,
  translateText,
  formatDate,
  translationExists,
  ensureNamespace,
};
