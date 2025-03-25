import axios from "axios";
import axiosInstance from "./axiosService";
import tokenService from "./tokenService";

const API_URL = import.meta.env.VITE_API_URL;

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
    const response = await axiosInstance.post("/auth/login", credentials);
    const { accessToken, user } = response.data.data;
    
    // Lưu token và thông tin người dùng
    tokenService.setToken(accessToken, axiosInstance);
    tokenService.setUser(user);
    
    return response.data;
  },

  /**
   * Đăng ký tài khoản mới
   * @param {object} userData - Thông tin người dùng
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  signup: async (userData) => {
    const response = await axiosInstance.post("/auth/signup", userData);
    return response.data;
  },

  /**
   * Đăng xuất người dùng
   * @returns {Promise<void>}
   */
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } finally {
      // Xóa token và thông tin người dùng
      tokenService.clearTokens(axiosInstance);
    }
  },

  /**
   * Đăng nhập với Google
   */
  loginWithGoogle: () => {
    window.location.href = `${API_URL}/auth/google`;
  },

  /**
   * Đăng nhập với Facebook
   */
  loginWithFacebook: () => {
    window.location.href = `${API_URL}/auth/facebook`;
  },

  /**
   * Làm mới token
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  refreshToken: async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
        withCredentials: true
      });
      
      const { accessToken } = response.data.data;
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      tokenService.setToken(accessToken, axiosInstance);
      return response;
    } catch (error) {
      tokenService.clearTokens(axiosInstance);
      throw error;
    }
  },

  /**
   * Xác thực email
   * @param {string} token - Token xác thực
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  verifyEmail: async (token) => {
    const response = await axiosInstance.get(`/auth/verify/${token}`);
    return response.data;
  },

  /**
   * Gửi yêu cầu đặt lại mật khẩu
   * @param {string} email - Email người dùng
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  forgotPassword: async (email) => {
    const response = await axiosInstance.post("/auth/forgot-password", { email });
    return response.data;
  },

  /**
   * Đặt lại mật khẩu
   * @param {string} token - Token đặt lại mật khẩu
   * @param {string} password - Mật khẩu mới
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  resetPassword: async (token, password) => {
    const response = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  },

  /**
   * Kiểm tra trạng thái xác thực
   * @returns {Promise<object>} - Dữ liệu phản hồi từ API
   */
  checkAuth: async () => {
    try {
      const response = await axiosInstance.get("/auth/check");
      const { user } = response.data.data;
      tokenService.setUser(user);
      return response.data;
    } catch (error) {
      tokenService.clearTokens(axiosInstance);
      throw error;
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
  isAuthenticated: () => tokenService.isTokenValid()
};

export { authService };

// Xuất các hàm riêng lẻ để dễ import
export const {
  login,
  signup,
  logout,
  loginWithGoogle,
  loginWithFacebook,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  checkAuth,
  getStoredToken,
  getStoredUser,
  isAuthenticated
} = authService;
