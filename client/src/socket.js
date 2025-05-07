import io from "socket.io-client";
import tokenService from "./services/tokenService";

// Socket state management
let socket = null;
let reconnectTimer = null;
let messageListeners = new Map();
let typingListeners = new Map();
let statusListeners = new Map();

// Cấu hình Socket.io
const baseUrl =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL || "/"
    : "http://localhost:3000";

/**
 * Kiểm tra đang ở trang message không
 */
export const isOnMessagePage = () => {
  const currentPath = window.location.pathname;
  return (
    currentPath.includes("/message") ||
    currentPath.includes("/messages") ||
    currentPath.includes("/chat")
  );
};

/**
 * Lấy userId từ token
 */
const getUserId = () => {
  try {
    const user = tokenService.getUser();
    if (user && user.id) return user.id;

    const token = tokenService.getToken();
    if (!token) return null;

    const tokenData = JSON.parse(atob(token.split(".")[1]));
    return tokenData?.userId || tokenData?.id;
  } catch (err) {
    console.error("Failed to extract user ID:", err);
    return null;
  }
};

/**
 * Khởi tạo kết nối socket
 */
export const initSocket = () => {
  // Nếu đã kết nối, trả về socket hiện tại
  if (socket && socket.connected) {
    return socket;
  }

  // Kiểm tra token
  const token = tokenService.getToken();
  if (!token) {
    console.warn("Cannot connect socket - no authentication token");
    return null;
  }

  // Kiểm tra user ID
  const userId = getUserId();
  if (!userId) {
    console.warn("Cannot connect socket - user ID not found");
    return null;
  }

  // Đóng kết nối cũ nếu có
  if (socket) {
    socket.disconnect();
  }

  console.log(`Connecting socket to: ${baseUrl}`);

  // Tạo kết nối socket mới
  socket = io(baseUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Xử lý sự kiện kết nối
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);

    // Xác thực với server
    socket.emit("authenticate", token);

    // Thông báo kết nối thành công
    window.dispatchEvent(new CustomEvent("socket_connected"));
  });

  // Xử lý xác thực thành công
  socket.on("authentication_success", ({ userId }) => {
    console.log(`Socket authentication successful for user ${userId}`);
  });

  // Xử lý xác thực thất bại
  socket.on("authentication_failed", ({ message }) => {
    console.error(`Socket authentication failed: ${message}`);
    disconnect();
  });

  // Xử lý ngắt kết nối
  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected. Reason: ${reason}`);

    // Thông báo ngắt kết nối
    window.dispatchEvent(
      new CustomEvent("socket_disconnected", {
        detail: { reason },
      })
    );

    // Thử kết nối lại nếu không phải do người dùng ngắt
    if (reason !== "io client disconnect") {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log("Attempting to reconnect...");
        initSocket();
      }, 3000);
    }
  });

  // Lắng nghe tin nhắn mới
  socket.on("new_message", (message) => {
    console.log("Received new message:", message);

    // Gọi tất cả listeners
    const chatId = message.chatId;
    const listeners = messageListeners.get(chatId) || [];
    listeners.forEach((callback) => callback(message));
  });

  // Lắng nghe trạng thái đang gõ
  socket.on("typing_update", ({ chatId, usersTyping }) => {
    const listeners = typingListeners.get(chatId) || [];
    listeners.forEach((callback) => callback(usersTyping));
  });

  // Lắng nghe thay đổi trạng thái online/offline
  socket.on("user_status_change", (data) => {
    console.log(
      `User ${data.userId} ${
        data.isOnline ? "is now online" : "is now offline"
      }`
    );

    // Gọi tất cả listeners
    const listeners = Array.from(statusListeners.values());
    listeners.forEach((callback) => callback(data));
  });

  // Lắng nghe cập nhật trạng thái tin nhắn
  socket.on("message_status_update", (data) => {
    const chatId = data.chatId;
    const listeners = messageListeners.get(chatId) || [];
    listeners.forEach((callback) => {
      if (callback.onStatusUpdate) {
        callback.onStatusUpdate(data);
      }
    });
  });

  return socket;
};

/**
 * Ngắt kết nối socket
 */
export const disconnect = () => {
  if (socket) {
    socket.disconnect();
    socket = null;

    // Xóa reconnect timer nếu có
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    console.log("Socket disconnected");
  }
};

/**
 * Đồng nghĩa với disconnect - để tương thích với code cũ
 */
export const closeSocket = disconnect;

/**
 * Lấy socket instance
 */
export const getSocket = () => {
  // Tự động kết nối nếu chưa có
  if (!socket && isOnMessagePage()) {
    return initSocket();
  }
  return socket;
};

/**
 * Kiểm tra socket đã kết nối chưa
 */
export const isSocketConnected = () => {
  return socket && socket.connected;
};

/**
 * Tham gia phòng chat
 */
export const joinChatRoom = (chatId) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("join_chat", chatId);
    return true;
  }
  return false;
};

/**
 * Rời phòng chat
 */
export const leaveChatRoom = (chatId) => {
  if (socket && socket.connected) {
    socket.emit("leave_chat", chatId);
    return true;
  }
  return false;
};

/**
 * Gửi tin nhắn
 */
export const sendMessage = (message) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("send_message", message);
    return true;
  }
  return false;
};

/**
 * Đánh dấu tin nhắn đã đọc
 */
export const markMessageAsRead = ({ messageId, chatId, senderId }) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("message_read", { messageId, chatId, senderId });
    return true;
  }
  return false;
};

/**
 * Bắt đầu gõ tin nhắn
 */
export const startTyping = (chatId) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("typing_start", { chatId });
    return true;
  }
  return false;
};

/**
 * Dừng gõ tin nhắn
 */
export const stopTyping = (chatId) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("typing_end", { chatId });
    return true;
  }
  return false;
};

/**
 * Lắng nghe tin nhắn mới
 * @param {string} chatId - ID của đoạn chat
 * @param {function} callback - Function xử lý khi có tin nhắn mới
 * @returns {function} - Function để hủy lắng nghe
 */
export const subscribeToMessages = (chatId, callback) => {
  // Đảm bảo đã tham gia phòng chat
  joinChatRoom(chatId);

  // Thêm callback vào danh sách listeners
  const listeners = messageListeners.get(chatId) || [];
  listeners.push(callback);
  messageListeners.set(chatId, listeners);

  // Trả về function hủy đăng ký
  return () => {
    const updatedListeners = messageListeners.get(chatId) || [];
    const index = updatedListeners.indexOf(callback);
    if (index > -1) {
      updatedListeners.splice(index, 1);
      if (updatedListeners.length > 0) {
        messageListeners.set(chatId, updatedListeners);
      } else {
        messageListeners.delete(chatId);
        leaveChatRoom(chatId);
      }
    }
  };
};

/**
 * Lắng nghe trạng thái đang gõ
 */
export const subscribeToTyping = (chatId, callback) => {
  const listeners = typingListeners.get(chatId) || [];
  listeners.push(callback);
  typingListeners.set(chatId, listeners);

  return () => {
    const updatedListeners = typingListeners.get(chatId) || [];
    const index = updatedListeners.indexOf(callback);
    if (index > -1) {
      updatedListeners.splice(index, 1);
      if (updatedListeners.length > 0) {
        typingListeners.set(chatId, updatedListeners);
      } else {
        typingListeners.delete(chatId);
      }
    }
  };
};

/**
 * Lắng nghe trạng thái online/offline
 */
export const subscribeToUserStatus = (callback) => {
  const listenerId = Date.now().toString();
  statusListeners.set(listenerId, callback);

  return () => {
    statusListeners.delete(listenerId);
  };
};

/**
 * Buộc kết nối lại socket
 */
export const forceReconnect = () => {
  if (!isOnMessagePage()) {
    console.log("Not on messages page, skipping reconnection");
    return false;
  }

  console.log("Force reconnecting socket...");

  // Ngắt kết nối hiện tại
  if (socket) {
    socket.disconnect();
  }

  // Xóa các timer nếu có
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  // Khởi tạo lại kết nối sau 500ms
  setTimeout(() => {
    const newSocket = initSocket();
    return !!newSocket;
  }, 500);

  return true;
};

export default {
  initSocket,
  disconnect,
  getSocket,
  isSocketConnected,
  joinChatRoom,
  leaveChatRoom,
  sendMessage,
  markMessageAsRead,
  startTyping,
  stopTyping,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToUserStatus,
  isOnMessagePage,
  forceReconnect,
};
