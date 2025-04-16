import axios from "axios";
import axiosInstance from "./axiosService";
import tokenService from "./tokenService";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Hàm chuẩn hóa lỗi API để đảm bảo định dạng nhất quán
 * @param {Error} error - Đối tượng lỗi
 * @returns {Object} - Đối tượng lỗi chuẩn hóa
 */
const normalizeError = (error) => {
  if (error.response?.data) {
    return {
      success: false,
      message:
        error.response.data.message ||
        error.response.data.error ||
        "An error occurred",
      data: error.response.data.data || null,
    };
  }
  return {
    success: false,
    message:
      error.message ||
      error.response.data.error ||
      "Unable to connect to server",
    data: null,
  };
};

/**
 * Dịch vụ quản lý xác thực người dùng
 */
const authService = {
  /**
   * Đăng nhập với email và mật khẩu
   * @param {object} credentials - Thông tin đăng nhập {email, password}
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  login: async (credentials) => {
    try {
      const response = await axiosInstance.post("/auth/login", credentials);

      // Nếu đăng nhập thành công, lưu token và thông tin người dùng
      if (response.data.success && response.data.data?.accessToken) {
        const { accessToken, user } = response.data.data;
        tokenService.setToken(accessToken, axiosInstance);
        tokenService.setUser(user);
      }

      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Đăng ký tài khoản mới
   * @param {object} userData - Thông tin người dùng
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  signup: async (userData) => {
    try {
      const response = await axiosInstance.post("/auth/signup", userData);

      // Nếu đăng ký thành công, trả về thông tin xác thực
      if (response.data.success) {
        return {
          success: true,
          data: {
            email: userData.email,
            verificationToken: response.data.data.verificationToken,
            verificationData: response.data.data,
          },
        };
      }

      return response.data;
    } catch (error) {
      console.error("Signup error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Đăng xuất người dùng
   * @returns {Promise<object>} - Kết quả đăng xuất
   */
  logout: async () => {
    try {
      const response = await axiosInstance.post("/auth/logout");
      // Luôn xóa token khi đăng xuất, kể cả khi API lỗi
      tokenService.clearTokens(axiosInstance);
      return response.data;
    } catch (error) {
      console.error("Logout error:", error);
      // Vẫn xóa token khi có lỗi
      tokenService.clearTokens(axiosInstance);
      return normalizeError(error);
    }
  },

  /**
   * Đăng nhập với Google
   */
  loginWithGoogle: () => {
    // Generate a unique state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("oauth_state", state);

    // Add timestamp and state parameter to prevent caching and CSRF
    const timestamp = Date.now();
    const redirectUrl = `${
      import.meta.env.VITE_API_URL
    }/auth/google?state=${state}&t=${timestamp}`;

    console.log("Redirecting to Google OAuth:", redirectUrl);
    window.location.href = redirectUrl;
  },

  /**
   * Đăng nhập với Facebook
   */
  loginWithFacebook: () => {
    // Generate a unique state parameter to prevent CSRF
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("oauth_state", state);

    // Add timestamp and state parameter to prevent caching and CSRF
    const timestamp = Date.now();
    const redirectUrl = `${
      import.meta.env.VITE_API_URL
    }/auth/facebook?state=${state}&t=${timestamp}`;

    console.log("Redirecting to Facebook OAuth:", redirectUrl);
    window.location.href = redirectUrl;
  },

  /**
   * Xác thực email bằng mã code
   * @param {object} data - Dữ liệu xác thực {email, code}
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  verifyEmail: async (data) => {
    try {
      const response = await axiosInstance.post(`/auth/verify-email`, data);
      return response.data;
    } catch (error) {
      console.error("Email verification error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Gửi yêu cầu đặt lại mật khẩu
   * @param {string} email - Email người dùng
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  forgotPassword: async (email) => {
    try {
      const response = await axiosInstance.post("/auth/forgot-password", {
        email,
      });
      return response.data;
    } catch (error) {
      console.error("Forgot password error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Xác minh mã đặt lại mật khẩu
   * @param {object} data - {email, code}
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  verifyResetCode: async (data) => {
    try {
      const response = await axiosInstance.post(
        "/auth/verify-reset-code",
        data
      );
      return response.data;
    } catch (error) {
      console.error("Verify reset code error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Đặt lại mật khẩu
   * @param {object} data - {email, password}
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  resetPassword: async (data) => {
    try {
      const response = await axiosInstance.post("/auth/reset-password", data);
      return response.data;
    } catch (error) {
      console.error("Reset password error:", error);
      return normalizeError(error);
    }
  },

  /**
   * Kiểm tra trạng thái xác thực
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  checkAuth: async () => {
    try {
      const response = await axiosInstance.get("/auth/check");

      if (response.data.success && response.data.data?.user) {
        tokenService.setUser(response.data.data.user);
      }

      return response.data;
    } catch (error) {
      console.error("Check auth error:", error);

      // Chỉ xóa token khi lỗi xác thực (401/403)
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        tokenService.clearTokens(axiosInstance);
      }

      return normalizeError(error);
    }
  },

  /**
   * Làm mới token
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  refreshToken: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const { accessToken } = response.data.data;

      if (!accessToken) {
        throw new Error("Không nhận được access token mới");
      }

      tokenService.setToken(accessToken, axiosInstance);
      return response.data;
    } catch (error) {
      console.error("Refresh token error:", error);
      tokenService.clearTokens(axiosInstance);
      return normalizeError(error);
    }
  },

  /**
   * Lấy token từ localStorage
   * @returns {string|null} - Access token hoặc null nếu không có
   */
  getStoredToken: () => tokenService.getToken(),

  /**
   * Lấy thông tin người dùng từ localStorage
   * @returns {object|null} - Đối tượng người dùng hoặc null nếu không có
   */
  getStoredUser: () => tokenService.getUser(),

  /**
   * Kiểm tra xem người dùng đã đăng nhập hay chưa
   * @returns {boolean} - true nếu đã đăng nhập, false nếu chưa
   */
  isAuthenticated: () => tokenService.isTokenValid(),
};

export { authService };

// Xuất các hàm riêng lẻ để dễ import
export const {
  login,
  signup,
  logout,
  loginWithGoogle,
  loginWithFacebook,
  verifyEmail,
  verifyResetCode,
  forgotPassword,
  resetPassword,
  checkAuth,
  refreshToken,
  getStoredToken,
  getStoredUser,
  isAuthenticated,
} = authService;
