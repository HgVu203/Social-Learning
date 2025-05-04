/* eslint-disable */
import React from "react";
import { toast } from "react-toastify";

// Get theme from localStorage or default to dark
const getTheme = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("theme") || "dark";
  }
  return "dark";
};

/**
 * Cấu hình mặc định cho tất cả các toast
 */
export const defaultConfig = {
  position: "top-center",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  pauseOnFocusLoss: false,
  theme: getTheme(),
  limit: 3,
};

/**
 * Toast service - API tập trung cho tất cả thông báo toast
 */
const Toast = {
  /**
   * Thông báo thành công
   * @param {string} message - Nội dung thông báo
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  success: (message, options = {}) => {
    return toast.success(message, {
      ...defaultConfig,
      theme: getTheme(),
      ...options,
    });
  },

  /**
   * Thông báo lỗi
   * @param {string} message - Nội dung thông báo
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  error: (message, options = {}) => {
    // Nếu không có toastId được cung cấp, tạo một ID mặc định
    const toastId = options.toastId || "error-toast";

    // Kiểm tra xem toast với ID đó đã tồn tại chưa
    if (toast.isActive(toastId)) {
      // Nếu đã tồn tại, cập nhật nội dung
      return toast.update(toastId, {
        render: message,
        ...defaultConfig,
        theme: getTheme(),
        autoClose: 4000,
        ...options,
      });
    }

    // Nếu chưa tồn tại, tạo mới với ID đã chỉ định
    return toast.error(message, {
      ...defaultConfig,
      theme: getTheme(),
      autoClose: 4000,
      ...options,
      toastId: toastId,
    });
  },

  /**
   * Thông báo thông tin
   * @param {string} message - Nội dung thông báo
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  info: (message, options = {}) => {
    return toast.info(message, {
      ...defaultConfig,
      theme: getTheme(),
      ...options,
    });
  },

  /**
   * Thông báo cảnh báo
   * @param {string} message - Nội dung thông báo
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  warning: (message, options = {}) => {
    return toast.warning(message, {
      ...defaultConfig,
      theme: getTheme(),
      ...options,
    });
  },

  /**
   * Thông báo đang tải
   * @param {string} message - Nội dung thông báo
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  loading: (message = "Processing...", options = {}) => {
    return toast.loading(message, {
      ...defaultConfig,
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: false,
      closeButton: false,
      ...options,
    });
  },

  /**
   * Cập nhật thông báo đang tải
   * @param {string|number} toastId - ID của toast cần cập nhật
   * @param {string} message - Nội dung thông báo mới
   * @param {string} type - Loại toast mới (success, error, info, warning)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  update: (toastId, message, type = "success", options = {}) => {
    return toast.update(toastId, {
      render: message,
      type,
      isLoading: false,
      autoClose: 2000,
      closeButton: true,
      closeOnClick: true,
      ...options,
    });
  },

  /**
   * Thông báo xác nhận với các nút
   * @param {string} message - Nội dung thông báo
   * @param {function} onConfirm - Hàm callback khi xác nhận
   * @param {function} onCancel - Hàm callback khi hủy bỏ (optional)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  confirm: (message, onConfirm, onCancel, options = {}) => {
    const {
      confirmText = "Confirm",
      confirmColor = "blue",
      cancelText = "Cancel",
      icon,
      ...restOptions
    } = options;

    return toast.info(
      ({ closeToast }) => (
        <div className="py-4 px-5">
          <div className="flex items-center mb-4">
            {icon === "logout" ? (
              <div className="rounded-full bg-blue-500/20 p-2 mr-3 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
            ) : null}
            <p className="flex-1 text-[15px] font-medium">{message}</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-3">
            <button
              className="px-5 py-2 bg-gray-700/80 text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
              onClick={() => {
                closeToast();
                if (onCancel) onCancel();
              }}
            >
              {cancelText}
            </button>
            <button
              className={`px-5 py-2 ${
                confirmColor === "purple"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : confirmColor === "red"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              } text-white rounded-lg text-sm font-medium transition-all`}
              onClick={() => {
                closeToast();
                if (onConfirm) onConfirm();
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        ...defaultConfig,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: true,
        icon: false,
        className:
          "confirm-toast !bg-[#2a2d38] !border !border-[#3d4157] !rounded-xl !shadow-lg !max-w-md",
        ...restOptions,
      }
    );
  },

  /**
   * Thông báo xác nhận xóa với biểu tượng cảnh báo
   * @param {string} message - Nội dung thông báo
   * @param {function} onConfirm - Hàm callback khi xác nhận
   * @param {function} onCancel - Hàm callback khi hủy bỏ (optional)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  confirmDelete: (message, onConfirm, onCancel, options = {}) => {
    const {
      confirmText = "Delete",
      cancelText = "Cancel",
      ...restOptions
    } = options;

    return toast.error(
      ({ closeToast }) => (
        <div className="py-4 px-5">
          <div className="flex items-center mb-4">
            <div className="rounded-full bg-red-500/20 p-2 mr-3 flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <p className="flex-1 text-[15px] font-medium">{message}</p>
          </div>
          <div className="flex justify-end space-x-3 mt-3">
            <button
              className="px-5 py-2 bg-gray-700/80 text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
              onClick={() => {
                closeToast();
                if (onCancel) onCancel();
              }}
            >
              {cancelText}
            </button>
            <button
              className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
              onClick={() => {
                closeToast();
                if (onConfirm) onConfirm();
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ),
      {
        ...defaultConfig,
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: true,
        icon: false,
        className:
          "delete-toast !bg-[#2a2d38] !border !border-[#3d4157] !rounded-xl !shadow-lg !max-w-md",
        ...options,
      }
    );
  },

  /**
   * Thông báo thành công rồi chuyển hướng sau đó
   * @param {string} message - Nội dung thông báo
   * @param {function} navigate - Hàm navigate từ react-router-dom
   * @param {string} path - Đường dẫn cần chuyển hướng
   * @param {number} delay - Thời gian chờ trước khi chuyển hướng (ms)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  successWithRedirect: (
    message,
    navigate,
    path,
    delay = 1500,
    options = {}
  ) => {
    return toast.success(message, {
      ...defaultConfig,
      autoClose: delay,
      onClose: () => navigate(path),
      ...options,
    });
  },

  /**
   * Đóng toàn bộ toast đang hiển thị
   */
  dismiss: () => toast.dismiss(),
};

// Backwards compatibility
export const showSuccessToast = Toast.success;
export const showErrorToast = Toast.error;
export const showInfoToast = Toast.info;
export const showWarningToast = Toast.warning;
export const showLoadingToast = Toast.loading;
export const updateLoadingToast = Toast.update;
export const showConfirmToast = Toast.confirm;
export const showDeleteConfirmToast = Toast.confirmDelete;
export const showSuccessWithDelay = Toast.successWithRedirect;

// Xuất mặc định
export default Toast;
