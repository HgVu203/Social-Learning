import axios from "axios";
import tokenService from "./tokenService";

// Tạo event bus đơn giản để xử lý sự kiện logout
const eventBus = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
};

// Export function để components khác có thể lắng nghe sự kiện logout
export const onLogout = (callback) => {
  eventBus.on('logout', callback);
};

// Hàm xử lý logout chung
const handleLogout = () => {
  eventBus.emit('logout');
  // Chỉ redirect nếu người dùng không ở trang login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Tạo axios instance với cấu hình mặc định
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Xử lý hàng đợi các request bị lỗi 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - thêm token vào header
axiosInstance.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - xử lý refresh token khi gặp lỗi 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Xử lý lỗi 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh token, thêm request hiện tại vào hàng đợi
        try {
          const token = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      // Bắt đầu quá trình refresh token
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Gọi API refresh token
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh-token`, 
          {}, 
          { withCredentials: true }
        );
        
        const { accessToken } = response.data.data;
        
        if (!accessToken) {
          throw new Error('No access token received');
        }
        
        // Lưu token mới bằng tokenService
        tokenService.setToken(accessToken, axiosInstance);
        
        // Cập nhật header cho request hiện tại
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Xử lý hàng đợi
        processQueue(null, accessToken);
        
        // Thực hiện lại request ban đầu với token mới
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Xử lý lỗi refresh token
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Xử lý các lỗi khác
    return Promise.reject(error);
  }
);

export default axiosInstance;
