/**
 * Dịch vụ quản lý token trong ứng dụng
 * Tách logic token ra khỏi authService và axiosService để tránh circular dependency
 */

// Constants
export const TOKEN_KEY = "accessToken";
export const USER_KEY = "user";

/**
 * Lưu token vào localStorage và cập nhật header Authorization nếu có instance axios
 * @param {string} token - Access token cần lưu
 * @param {object} axiosInstance - (Optional) Instance axios để cập nhật header
 */
export const setToken = (token, axiosInstance = null) => {
  if (!token) return;
  
  localStorage.setItem(TOKEN_KEY, token);
  
  if (axiosInstance) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

/**
 * Lấy token từ localStorage
 * @returns {string|null} - Access token hoặc null nếu không có
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Kiểm tra xem token có tồn tại và còn hiệu lực không
 * @returns {boolean} - true nếu token còn hiệu lực, false nếu không
 */
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
};

/**
 * Lưu thông tin người dùng vào localStorage
 * @param {object} user - Đối tượng thông tin người dùng
 */
export const setUser = (user) => {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * Lấy thông tin người dùng từ localStorage
 * @returns {object|null} - Đối tượng người dùng hoặc null nếu không có
 */
export const getUser = () => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

/**
 * Xóa token và thông tin người dùng khỏi localStorage
 * @param {object} axiosInstance - (Optional) Instance axios để xóa header
 */
export const clearTokens = (axiosInstance = null) => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  if (axiosInstance) {
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

// Export default object chứa tất cả các hàm
const tokenService = {
  setToken,
  getToken,
  isTokenValid,
  setUser,
  getUser,
  clearTokens,
  TOKEN_KEY,
  USER_KEY
};

export default tokenService; 