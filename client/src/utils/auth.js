import tokenService from "../services/tokenService";

/**
 * Kiểm tra xem người dùng đã đăng nhập chưa
 * @returns {boolean} - true nếu đã đăng nhập, false nếu chưa
 */
export const isAuthenticated = () => {
  return tokenService.isTokenValid();
};

/**
 * Lấy thông tin người dùng hiện tại
 * @returns {object|null} - Đối tượng người dùng hoặc null
 */
export const getCurrentUser = () => {
  return tokenService.getUser();
};

/**
 * Kiểm tra xem người dùng có quyền admin không
 * @returns {boolean} - true nếu là admin, false nếu không
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.role === 'admin';
};

/**
 * Kiểm tra xem người dùng có quyền truy cập tài nguyên không
 * @param {string} userId - ID của tài nguyên cần kiểm tra
 * @returns {boolean} - true nếu có quyền, false nếu không
 */
export const hasPermission = (userId) => {
  const user = getCurrentUser();
  return user && (user._id === userId || isAdmin());
};

export default {
  isAuthenticated,
  getCurrentUser,
  isAdmin,
  hasPermission
}; 