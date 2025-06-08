/**
 * Dịch vụ quản lý token trong ứng dụng
 * Tách logic token ra khỏi authService và axiosService để tránh circular dependency
 */

// Constants
export const TOKEN_KEY = "accessToken";
export const USER_KEY = "user";
export const TOKEN_TIMESTAMP_KEY = "token_timestamp";

// Thêm cache trong bộ nhớ để giảm truy cập localStorage
const memoryCache = {
  token: null,
  user: null,
  tokenTimestamp: null,
};

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
    // Cập nhật timestamp cho token để theo dõi thời gian lưu
    const timestamp = Date.now();

    // Lưu vào memory cache trước
    memoryCache.token = token;
    memoryCache.tokenTimestamp = timestamp;

    if (isLocalStorageAvailable()) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_TIMESTAMP_KEY, timestamp.toString());
    } else {
      memoryStorage.token = token;
    }

    if (axiosInstance) {
      axiosInstance.defaults.headers.common[
        "Authorization"
      ] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error saving token:", error);
    // Store in memory as fallback
    memoryStorage.token = token;
  }
};

/**
 * Kiểm tra xem token có hết hạn không
 * @returns {boolean} - true nếu token đã hết hạn, false nếu chưa hoặc không có token
 */
export const isTokenExpired = () => {
  // Ưu tiên dùng bộ nhớ cache
  let token = memoryCache.token;

  // Nếu không có trong cache, thử localStorage
  if (!token) {
    if (isLocalStorageAvailable()) {
      token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        // Cập nhật lại cache
        memoryCache.token = token;
      }
    }
  }

  // Fall back to memory storage if needed
  if (!token && memoryStorage.token) {
    token = memoryStorage.token;
    // Cập nhật lại cache
    memoryCache.token = token;
  }

  if (!token) return false; // Không có token nên không thể xác định là đã hết hạn

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = Date.now() >= payload.exp * 1000;
    return isExpired;
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
  // Ưu tiên dùng bộ nhớ cache
  let token = memoryCache.token;

  // Nếu không có trong cache, thử localStorage
  if (!token) {
    // Try localStorage first
    if (isLocalStorageAvailable()) {
      token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        // Cập nhật lại cache
        memoryCache.token = token;
      }
    }

    // Fall back to memory storage if needed
    if (!token && memoryStorage.token) {
      token = memoryStorage.token;
      // Cập nhật lại cache
      memoryCache.token = token;
    }
  }

  if (!token) {
    return null;
  }

  // Check if token is valid
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Return null if token is expired
    if (Date.now() >= payload.exp * 1000) {
      // Cập nhật lại cache là null vì token đã hết hạn
      memoryCache.token = null;
      return null;
    }
    return token;
  } catch (error) {
    console.error("Invalid token format:", error);
    // Cập nhật lại cache là null vì token không hợp lệ
    memoryCache.token = null;
    return null;
  }
};

/**
 * Kiểm tra xem token có tồn tại và còn hiệu lực không
 * @returns {boolean} - true nếu token còn hiệu lực, false nếu không
 */
export const isTokenValid = () => {
  // Ưu tiên lấy token từ cache hoặc localStorage
  const token = getToken();
  if (!token) return false;

  try {
    // Giải mã payload của token
    const payload = JSON.parse(atob(token.split(".")[1]));

    // Kiểm tra expiry time - tính theo milliseconds
    const tokenExpiry = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    // Thêm logging để dễ debug
    if (currentTime >= tokenExpiry) {
      console.log(
        "Token đã hết hạn vào: ",
        new Date(tokenExpiry).toLocaleString()
      );
      console.log(
        "Thời gian hiện tại: ",
        new Date(currentTime).toLocaleString()
      );
      return false;
    }

    // Nếu còn hơn 15 phút trước khi hết hạn, token được coi là hợp lệ
    return true;
  } catch (error) {
    console.error("Error validating token:", error);
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
    // Cập nhật cache trước
    memoryCache.user = user;

    if (isLocalStorageAvailable()) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      memoryStorage.user = user;
    }
  } catch (error) {
    console.error("Error saving user data:", error);
    // Store in memory as fallback
    memoryStorage.user = user;
  }
};

/**
 * Lấy thông tin người dùng từ localStorage
 * @returns {object|null} - Đối tượng người dùng hoặc null nếu không có
 */
export const getUser = () => {
  // Ưu tiên dùng bộ nhớ cache
  if (memoryCache.user) {
    return memoryCache.user;
  }

  // Try localStorage first
  if (isLocalStorageAvailable()) {
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        // Cập nhật cache
        memoryCache.user = user;
        return user;
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        return null;
      }
    }
  }

  // Fall back to memory storage if needed
  if (memoryStorage.user) {
    // Cập nhật cache
    memoryCache.user = memoryStorage.user;
  }

  return memoryStorage.user;
};

/**
 * Xóa token và thông tin người dùng khỏi localStorage
 * @param {object} axiosInstance - (Optional) Instance axios để xóa header
 */
export const clearTokens = (axiosInstance = null) => {
  // Xóa cache trước
  memoryCache.token = null;
  memoryCache.user = null;
  memoryCache.tokenTimestamp = null;

  // Clear localStorage if available
  if (isLocalStorageAvailable()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
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
