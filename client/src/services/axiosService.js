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
      this.listeners[event].forEach((callback) => callback(data));
    }
  },
};

// Export function để components khác có thể lắng nghe sự kiện logout
export const onLogout = (callback) => {
  eventBus.on("logout", callback);
};

// Hàm xử lý logout chung
const handleLogout = () => {
  tokenService.clearTokens();
  eventBus.emit("logout");

  // Chỉ redirect nếu người dùng không ở trang liên quan đến xác thực
  const authPages = [
    "/login",
    "/signup",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ];
  if (!authPages.some((page) => window.location.pathname.includes(page))) {
    window.location.href = "/login";
  }
};

// Tạo axios instance với cấu hình mặc định
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL.replace(/\/api$/, ""), // Loại bỏ /api ở cuối nếu có
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Đảm bảo cookies được gửi trong các request
  timeout: 10000, // Timeout sau 10 giây
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

console.log("API Base URL (original):", import.meta.env.VITE_API_URL);
console.log("API Base URL (modified):", axiosInstance.defaults.baseURL);

// Helper function for file uploads
export const uploadFile = (url, data, config = {}) => {
  // Log the upload attempt
  console.log(`Uploading file to ${url}`);

  // Ensure FormData is handled properly
  if (!(data instanceof FormData)) {
    console.error("uploadFile called without FormData");
    return Promise.reject(new Error("uploadFile requires FormData"));
  }

  // For debugging, log the FormData entries without exposing sensitive content
  try {
    const entries = [...data.entries()].map(([key, value]) => {
      if (value instanceof File) {
        return `${key}: File(${value.name}, ${value.size} bytes, ${value.type})`;
      }
      return `${key}: ${value}`;
    });
    console.log("FormData entries:", entries);
  } catch (e) {
    console.warn("Could not log FormData entries:", e.message);
  }

  // Make sure the URL follows the correct pattern
  if (!url.startsWith("/")) {
    url = `/${url}`;
  }

  // Don't set Content-Type for FormData - the browser will set it with the correct boundary
  return axiosInstance.post(url, data, {
    ...config,
    headers: {
      ...config.headers,
      // Remove Content-Type to let the browser set it with boundary
    },
    // Add timeout to prevent hanging requests
    timeout: 30000, // 30 seconds for uploads
  });
};

// Helper function for updates with FormData
export const updateWithFormData = (url, data, config = {}) => {
  // Log the update attempt
  console.log(`Updating with FormData to ${url}`);

  // Ensure FormData is handled properly
  if (!(data instanceof FormData)) {
    console.error("updateWithFormData called without FormData");
    return Promise.reject(new Error("updateWithFormData requires FormData"));
  }

  // For debugging, log the FormData entries
  try {
    const entries = [...data.entries()].map(([key, value]) => {
      if (value instanceof File) {
        return `${key}: File(${value.name}, ${value.size} bytes, ${value.type})`;
      }
      return `${key}: ${value}`;
    });
    console.log("FormData entries for update:", entries);

    // Check specifically for image files
    for (let [key, value] of data.entries()) {
      if (value instanceof File && value.type.startsWith("image/")) {
        console.log(
          `Found image file in FormData: ${key} = ${value.name} (${value.type}, ${value.size} bytes)`
        );
      }
    }
  } catch (e) {
    console.warn("Could not log FormData entries:", e.message);
  }

  // Make sure the URL follows the correct pattern
  if (!url.startsWith("/")) {
    url = `/${url}`;
  }

  // Create a clean copy of the FormData to avoid any potential mutations
  const formDataCopy = new FormData();
  for (let [key, value] of data.entries()) {
    formDataCopy.append(key, value);
  }

  // Don't set Content-Type for FormData - the browser will set it with the correct boundary
  return axiosInstance.patch(url, formDataCopy, {
    ...config,
    headers: {
      ...config.headers,
      // Content-Type is intentionally not set here - browser will handle it
    },
    transformRequest: [
      (data) => {
        console.log("TransformRequest called with FormData");
        // Return the original FormData object without modifications
        return data;
      },
    ],
    timeout: 60000, // 60 seconds for uploads (increased timeout)
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload progress: ${percentCompleted}%`);
    },
  });
};

// Xử lý hàng đợi các request bị lỗi 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - thêm token vào header và log request
axiosInstance.interceptors.request.use(
  (config) => {
    // LUÔN lấy token mới nhất từ localStorage trước mỗi request
    const token = tokenService.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Kiểm tra nếu data là FormData thì không set Content-Type
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Tự động thêm tiền tố /api vào đường dẫn nếu chưa có và thêm dấu / ở đầu nếu cần
    if (!config.url.startsWith("/api/") && !config.url.startsWith("api/")) {
      config.url = `/api/${config.url.replace(/^\/+/, "")}`;
    } else if (config.url.startsWith("api/")) {
      // Đảm bảo có dấu / trước api
      config.url = `/api/${config.url.substring(4)}`;
    }

    // Fix incorrect 'groups' endpoint to 'group', but don't change admin routes
    if (
      (config.url.includes("/api/groups/") || config.url === "/api/groups") &&
      !config.url.includes("/api/admin/groups")
    ) {
      config.url = config.url.replace("/api/groups", "/api/group");
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - xử lý refresh token khi gặp lỗi 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Nếu lỗi không phải do response hoặc không có status code, trả về reject
    if (!error.response) {
      console.error("Network error:", error);
      return Promise.reject({
        ...error,
        message:
          "Unable to connect to server. Please check your internet connection.",
      });
    }

    const originalRequest = error.config;

    // Log tất cả các lỗi API để dễ debug
    console.error(
      `API Error [${error.response.status}] [${originalRequest.method}]: ${originalRequest.url}`,
      error.response.data
    );

    // Better logging for recommendation errors
    if (originalRequest.url.includes("/api/posts/recommended")) {
      console.error("Recommendation API error details:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          url: originalRequest.url,
          method: originalRequest.method,
          headers: originalRequest.headers,
        },
      });
    }

    // Special case: If the error is a 404 for groups endpoint, try with group endpoint
    if (
      error.response.status === 404 &&
      originalRequest.url.includes("/api/groups")
    ) {
      console.warn("Attempting to retry request with correct group endpoint");
      const correctedUrl = originalRequest.url.replace(
        "/api/groups",
        "/api/group"
      );
      const correctedRequest = {
        ...originalRequest,
        url: correctedUrl,
      };
      return axiosInstance(correctedRequest);
    }

    // Xử lý lỗi 404 Not Found - Có thể trả về dữ liệu null thay vì lỗi trong một số trường hợp
    if (error.response.status === 404) {
      // Nếu là API lấy thông tin user, trả về dữ liệu null
      if (originalRequest.url.match(/\/users\/[^/]+$/)) {
        console.log(
          "User not found, returning empty data instead of throwing error"
        );
        return Promise.resolve({
          data: {
            success: false,
            data: null,
            message: "User not found",
          },
        });
      }

      // For group/user endpoints, return empty data instead of error
      if (
        originalRequest.url.includes("/api/group") ||
        originalRequest.url.includes("/api/user")
      ) {
        console.log("Resource not found, returning empty data");
        return Promise.resolve({
          data: {
            success: false,
            data: [],
            message: "Not found",
          },
        });
      }
    }

    // Xử lý lỗi 401 Unauthorized
    if (error.response.status === 401) {
      // Các lỗi 401 đặc biệt cần xử lý ngay lập tức
      const specialErrors = [
        "Refresh token is required",
        "Refresh token expired",
        "Invalid refresh token",
      ];

      if (
        specialErrors.includes(error.response.data?.error) ||
        specialErrors.includes(error.response.data?.message)
      ) {
        handleLogout();
        return Promise.reject(error);
      }

      // Nếu đây là lỗi đăng nhập, trả về lỗi trực tiếp từ server
      if (originalRequest.url?.includes("/auth/login")) {
        return Promise.reject(error);
      }

      // Nếu request không phải là refresh token và chưa thử lại
      if (
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/refresh-token")
      ) {
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
          // Kiểm tra xem có refresh token không trước khi gọi API
          const cookies = document.cookie.split(";").reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split("=");
            acc[key] = value;
            return acc;
          }, {});

          if (!cookies.refreshToken) {
            console.log(
              "Không tìm thấy refresh token trong cookie, bỏ qua refresh"
            );
            throw new Error("Không tìm thấy refresh token");
          }

          // Gọi API refresh token
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh-token`,
            {},
            {
              withCredentials: true,
              timeout: 5000, // Timeout ngắn hơn cho refresh token
            }
          );

          if (!response.data?.success || !response.data?.data?.accessToken) {
            throw new Error("Không nhận được access token mới");
          }

          const { accessToken } = response.data.data;

          // Lưu token mới
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

          // Đăng xuất người dùng nếu đây không phải lỗi do thiếu refresh token
          if (refreshError.message !== "Không tìm thấy refresh token") {
            handleLogout();
          } else {
            // Nếu chỉ là thiếu refresh token, đừng log người dùng ra nếu họ đang ở trang đăng nhập
            const authPages = [
              "/login",
              "/signup",
              "/verify-email",
              "/forgot-password",
              "/reset-password",
            ];
            if (
              !authPages.some((page) => window.location.pathname.includes(page))
            ) {
              handleLogout();
            }
          }

          return Promise.reject({
            ...refreshError,
            message:
              refreshError.message === "Không tìm thấy refresh token"
                ? "Vui lòng đăng nhập"
                : "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          });
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Xử lý lỗi 403 Forbidden
    if (error.response.status === 403) {
      console.error("Forbidden access:", error.response.data);
      // Không logout người dùng trong trường hợp này, chỉ thông báo lỗi
    }

    // Xử lý các lỗi khác
    return Promise.reject(error);
  }
);

export default axiosInstance;
