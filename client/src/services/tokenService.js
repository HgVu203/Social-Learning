/**
 * Dịch vụ quản lý token trong ứng dụng
 * Tách logic token ra khỏi authService và axiosService để tránh circular dependency
 */

// Constants
export const TOKEN_KEY = "accessToken";
export const USER_KEY = "user";

/**
 * Kiểm tra xem localStorage có khả dụng không
 * @returns {boolean} - true nếu localStorage khả dụng
 */
const isLocalStorageAvailable = () => {
  try {
    const testKey = "__test_storage_availability__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error("LocalStorage is not available:", e);
    return false;
  }
};

// Use memory storage as fallback when localStorage is not available
const memoryStorage = {
  token: null,
  user: null,
};

/**
 * Lưu token vào localStorage và cập nhật header Authorization nếu có instance axios
 * @param {string} token - Access token cần lưu
 * @param {object} axiosInstance - (Optional) Instance axios để cập nhật header
 */
export const setToken = (token, axiosInstance = null) => {
  if (!token) {
    console.warn("Attempted to set empty token");
    return;
  }

  try {
    console.log(
      "Setting token to localStorage:",
      token.substring(0, 15) + "..."
    );

    if (isLocalStorageAvailable()) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      memoryStorage.token = token;
      console.log("Saved token to memory storage instead of localStorage");
    }

    if (axiosInstance) {
      console.log("Updating axios instance headers with token");
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error saving token:", error);
    // Store in memory as fallback
    memoryStorage.token = token;
    console.log("Saved token to memory storage as fallback");
  }
};

/**
 * Kiểm tra xem token có hết hạn không
 * @returns {boolean} - true nếu token đã hết hạn, false nếu chưa hoặc không có token
 */
export const isTokenExpired = () => {
  let token = null;

  // Try localStorage first
  if (isLocalStorageAvailable()) {
    token = localStorage.getItem(TOKEN_KEY);
  }

  // Fall back to memory storage if needed
  if (!token && memoryStorage.token) {
    token = memoryStorage.token;
  }

  if (!token) return false; // Không có token nên không thể xác định là đã hết hạn

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = Date.now() >= payload.exp * 1000;
    if (isExpired) {
      console.log(
        `Token has expired. Expiration: ${new Date(
          payload.exp * 1000
        ).toISOString()}, Current: ${new Date().toISOString()}`
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return false; // Không xác định được nên coi như chưa hết hạn
  }
};

/**
 * Lấy token từ localStorage
 * @returns {string|null} - Access token hoặc null nếu không có hoặc hết hạn
 */
export const getToken = () => {
  let token = null;

  // Try localStorage first
  if (isLocalStorageAvailable()) {
    token = localStorage.getItem(TOKEN_KEY);
  }

  // Fall back to memory storage if needed
  if (!token && memoryStorage.token) {
    token = memoryStorage.token;
  }

  if (!token) {
    return null;
  }

  // Check if token is valid
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Return null if token is expired
    if (Date.now() >= payload.exp * 1000) {
      return null;
    }
    return token;
  } catch (error) {
    console.error("Invalid token format:", error);
    return null;
  }
};

/**
 * Kiểm tra xem token có tồn tại và còn hiệu lực không
 * @returns {boolean} - true nếu token còn hiệu lực, false nếu không
 */
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
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
  if (!user) {
    console.warn("Attempted to set empty user data");
    return;
  }

  try {
    console.log(
      "Setting user data to localStorage:",
      user._id || user.id || "unknown ID"
    );

    if (isLocalStorageAvailable()) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      memoryStorage.user = user;
      console.log("Saved user to memory storage instead of localStorage");
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    // Store in memory as fallback
    memoryStorage.user = user;
    console.log("Saved user to memory storage as fallback");
  }
};

/**
 * Lấy thông tin người dùng từ localStorage
 * @returns {object|null} - Đối tượng người dùng hoặc null nếu không có
 */
export const getUser = () => {
  // Try localStorage first
  if (isLocalStorageAvailable()) {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
      }
    }
  }

  // Fall back to memory storage
  if (memoryStorage.user) {
    console.log("Retrieved user from memory storage");
    return memoryStorage.user;
  }

  return null;
};

/**
 * Xóa token và thông tin người dùng khỏi localStorage
 * @param {object} axiosInstance - (Optional) Instance axios để xóa header
 */
export const clearTokens = (axiosInstance = null) => {
  // Clear localStorage if available
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // Always clear memory storage
  memoryStorage.token = null;
  memoryStorage.user = null;

  if (axiosInstance) {
    delete axiosInstance.defaults.headers.common["Authorization"];
  }
};

// Export default object chứa tất cả các hàm
const tokenService = {
  setToken,
  getToken,
  isTokenValid,
  isTokenExpired,
  setUser,
  getUser,
  clearTokens,
  TOKEN_KEY,
  USER_KEY,
};

export default tokenService;
