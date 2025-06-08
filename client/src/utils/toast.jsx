/* eslint-disable */
import React from "react";
import { toast } from "react-toastify";
import i18n from "../i18n";

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

// Icons for different toast types
const ToastIcons = {
  success: (
    <div className="rounded-full bg-green-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-green-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  ),
  error: (
    <div className="rounded-full bg-red-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-red-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  ),
  info: (
    <div className="rounded-full bg-blue-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-blue-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  ),
  warning: (
    <div className="rounded-full bg-amber-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-amber-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  ),
  loading: (
    <div className="rounded-full bg-gray-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        className="animate-spin h-5 w-5 text-gray-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  ),
  logout: (
    <div className="rounded-full bg-blue-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-blue-500"
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
  ),
  trash: (
    <div className="rounded-full bg-red-500/20 p-2 mr-3 flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-red-500"
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
  ),
};

// Helper function to translate toast messages
const translate = (key, defaultValue, options = {}) => {
  if (!key) return defaultValue || "";

  // Check if the key exists in i18n
  const hasKey = i18n.exists(key);

  if (hasKey) {
    return i18n.t(key, options);
  }

  return defaultValue || key;
};

/**
 * Toast service - API tập trung cho tất cả thông báo toast
 */
const Toast = {
  /**
   * Thông báo thành công
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  success: (message, options = {}) => {
    const translatedMessage = translate(message, message, options.i18nOptions);

    return toast.success(
      ({ closeToast }) => (
        <div className="flex items-center py-1">
          {ToastIcons.success}
          <p className="text-[15px] font-medium">{translatedMessage}</p>
        </div>
      ),
      {
        ...defaultConfig,
        theme: getTheme(),
        icon: false,
        className: "success-toast !rounded-xl !shadow-lg",
        ...options,
      }
    );
  },

  /**
   * Thông báo lỗi
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  error: (message, options = {}) => {
    const translatedMessage = translate(message, message, options.i18nOptions);

    // Nếu không có toastId được cung cấp, tạo một ID mặc định
    const toastId = options.toastId || "error-toast";

    // Create toast content
    const content = ({ closeToast }) => (
      <div className="flex items-center py-1">
        {ToastIcons.error}
        <p className="text-[15px] font-medium">{translatedMessage}</p>
      </div>
    );

    // Kiểm tra xem toast với ID đó đã tồn tại chưa
    if (toast.isActive(toastId)) {
      // Nếu đã tồn tại, cập nhật nội dung
      return toast.update(toastId, {
        render: content,
        ...defaultConfig,
        theme: getTheme(),
        autoClose: 4000,
        icon: false,
        className: "error-toast !rounded-xl !shadow-lg",
        ...options,
      });
    }

    // Nếu chưa tồn tại, tạo mới với ID đã chỉ định
    return toast.error(content, {
      ...defaultConfig,
      theme: getTheme(),
      autoClose: 4000,
      icon: false,
      className: "error-toast !rounded-xl !shadow-lg",
      ...options,
      toastId: toastId,
    });
  },

  /**
   * Thông báo thông tin
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  info: (message, options = {}) => {
    const translatedMessage = translate(message, message, options.i18nOptions);

    return toast.info(
      ({ closeToast }) => (
        <div className="flex items-center py-1">
          {ToastIcons.info}
          <p className="text-[15px] font-medium">{translatedMessage}</p>
        </div>
      ),
      {
        ...defaultConfig,
        theme: getTheme(),
        icon: false,
        className: "info-toast !rounded-xl !shadow-lg",
        ...options,
      }
    );
  },

  /**
   * Thông báo cảnh báo
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  warning: (message, options = {}) => {
    const translatedMessage = translate(message, message, options.i18nOptions);

    return toast.warning(
      ({ closeToast }) => (
        <div className="flex items-center py-1">
          {ToastIcons.warning}
          <p className="text-[15px] font-medium">{translatedMessage}</p>
        </div>
      ),
      {
        ...defaultConfig,
        theme: getTheme(),
        icon: false,
        className: "warning-toast !rounded-xl !shadow-lg",
        ...options,
      }
    );
  },

  /**
   * Thông báo đang tải
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  loading: (message = "common.processing", options = {}) => {
    const translatedMessage = translate(
      message,
      "Processing...",
      options.i18nOptions
    );

    return toast.loading(
      ({ closeToast }) => (
        <div className="flex items-center py-1">
          {ToastIcons.loading}
          <p className="text-[15px] font-medium">{translatedMessage}</p>
        </div>
      ),
      {
        ...defaultConfig,
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        closeButton: false,
        icon: false,
        className: "loading-toast !rounded-xl !shadow-lg",
        ...options,
      }
    );
  },

  /**
   * Cập nhật thông báo đang tải
   * @param {string|number} toastId - ID của toast cần cập nhật
   * @param {string} message - Nội dung thông báo mới hoặc key i18n
   * @param {string} type - Loại toast mới (success, error, info, warning)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  update: (toastId, message, type = "success", options = {}) => {
    const translatedMessage = translate(message, message, options.i18nOptions);

    // Determine icon based on type
    let icon;
    switch (type) {
      case "success":
        icon = ToastIcons.success;
        break;
      case "error":
        icon = ToastIcons.error;
        break;
      case "warning":
        icon = ToastIcons.warning;
        break;
      case "info":
        icon = ToastIcons.info;
        break;
      default:
        icon = ToastIcons.success;
    }

    return toast.update(toastId, {
      render: ({ closeToast }) => (
        <div className="flex items-center py-1">
          {icon}
          <p className="text-[15px] font-medium">{translatedMessage}</p>
        </div>
      ),
      type,
      isLoading: false,
      autoClose: 2000,
      closeButton: true,
      closeOnClick: true,
      icon: false,
      className: `${type}-toast !rounded-xl !shadow-lg`,
      ...options,
    });
  },

  /**
   * Thông báo xác nhận với các nút
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {function} onConfirm - Hàm callback khi xác nhận
   * @param {function} onCancel - Hàm callback khi hủy bỏ (optional)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  confirm: (message, onConfirm, onCancel, options = {}) => {
    const {
      confirmText = "common.confirm",
      confirmColor = "blue",
      cancelText = "common.cancel",
      icon = null,
      i18nOptions = {},
      ...restOptions
    } = options;

    const translatedMessage = translate(message, message, i18nOptions);
    const translatedConfirmText = translate(confirmText, "Confirm");
    const translatedCancelText = translate(cancelText, "Cancel");

    // Determine which icon to show
    let iconToShow;
    if (icon === "logout") {
      iconToShow = ToastIcons.logout;
    } else if (icon === "trash") {
      iconToShow = ToastIcons.trash;
    } else {
      iconToShow = ToastIcons.info;
    }

    return toast.info(
      ({ closeToast }) => (
        <div className="py-4 px-5">
          <div className="flex items-center mb-4">
            {iconToShow}
            <p className="flex-1 text-[15px] font-medium">
              {translatedMessage}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 mt-3">
            <button
              className="px-5 py-2 bg-gray-700/80 text-gray-100 rounded-lg text-sm font-medium hover:bg-gray-600 transition-all"
              onClick={() => {
                closeToast();
                if (typeof onCancel === "function") onCancel();
              }}
            >
              {translatedCancelText}
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
                if (typeof onConfirm === "function") onConfirm();
              }}
            >
              {translatedConfirmText}
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
          "confirm-toast !bg-[var(--color-bg-primary)] !border !border-[var(--color-border)] !rounded-xl !shadow-lg !max-w-md",
        ...restOptions,
      }
    );
  },

  /**
   * Thông báo xác nhận xóa với biểu tượng cảnh báo
   * @param {string} message - Nội dung thông báo hoặc key i18n
   * @param {function} onConfirm - Hàm callback khi xác nhận
   * @param {function} onCancel - Hàm callback khi hủy bỏ (optional)
   * @param {object} options - Tùy chọn bổ sung (optional)
   */
  confirmDelete: (message, onConfirm, onCancel, options = {}) => {
    return Toast.confirm(message, onConfirm, onCancel, {
      confirmText: "common.delete",
      confirmColor: "red",
      icon: "trash",
      ...options,
    });
  },

  /**
   * Thông báo thành công rồi chuyển hướng sau đó
   * @param {string} message - Nội dung thông báo hoặc key i18n
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
    const translatedMessage = translate(message, message, options.i18nOptions);

    return toast.success(
      ({ closeToast }) => (
        <div className="flex items-center py-1">
          {ToastIcons.success}
          <div>
            <p className="text-[15px] font-medium">{translatedMessage}</p>
            <p className="text-xs text-gray-400 mt-1">
              {translate("common.redirecting", "Redirecting...")}
            </p>
          </div>
        </div>
      ),
      {
        ...defaultConfig,
        autoClose: delay,
        onClose: () => navigate(path),
        icon: false,
        className: "success-toast !rounded-xl !shadow-lg",
        ...options,
      }
    );
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
