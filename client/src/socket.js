import io from "socket.io-client";
import tokenService from "./services/tokenService";

// ===== STATE MANAGEMENT =====
let socket = null;
let reconnectTimer = null;
let isConnecting = false;
let connectionAttemptTimestamp = 0; // Timestamp của lần thử kết nối gần nhất
const MIN_CONNECTION_INTERVAL = 3000; // Thời gian tối thiểu giữa 2 lần thử kết nối (3 giây)

// Listeners và mapping
const messageListeners = new Map(); // chatId -> callbacks
const statusListeners = new Map(); // id -> callbacks
const messageDeliveryListeners = new Map(); // messageId -> callbacks

// Theo dõi tin nhắn và trạng thái
const pendingMessages = new Map(); // tempId -> message object
const onlineUsers = new Set(); // Set of userId

// ===== CONFIGURATION =====
const baseUrl =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL || "/"
    : "http://localhost:3000";

// Socket options
const socketOptions = {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  autoConnect: false,
  forceNew: false,
  pingInterval: 30000,
  pingTimeout: 60000,
};

/**
 * Kiểm tra đang ở trang message không
 */
const isOnMessagePage = () => {
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

// ===== SOCKET EVENT HANDLERS =====
/**
 * Xử lý các sự kiện socket
 */
const setupSocketEvents = (socket) => {
  if (!socket) return;

  // Xử lý sự kiện kết nối
  socket.on("connect", () => {
    console.log("[Socket] Connected successfully:", socket.id);
    isConnecting = false; // Reset trạng thái kết nối

    // Xác thực với server
    const token = tokenService.getToken();
    if (token) {
      socket.emit("authenticate", token);
    }

    // Thông báo kết nối thành công
    window.dispatchEvent(new CustomEvent("socket_connected"));

    // Gửi ping định kỳ để giữ kết nối
    startPingInterval();

    // Đặt lại flag trạng thái
    window._socketReconnecting = false;
  });

  // Xử lý xác thực thành công
  socket.on("authentication_success", ({ userId }) => {
    console.log(`Socket authentication successful for user ${userId}`);
    // Sau khi xác thực thành công, yêu cầu danh sách người dùng online
    socket.emit("get_online_status");
  });

  // Xử lý xác thực thất bại
  socket.on("authentication_failed", ({ message }) => {
    console.error(`Socket authentication failed: ${message}`);
    disconnect();
  });

  // Xử lý ngắt kết nối
  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected. Reason: ${reason}`);
    isConnecting = false;

    // Thông báo ngắt kết nối
    window.dispatchEvent(
      new CustomEvent("socket_disconnected", {
        detail: { reason },
      })
    );

    // Xóa interval ping
    if (window.socketPingInterval) {
      clearInterval(window.socketPingInterval);
      window.socketPingInterval = null;
    }

    // Thử kết nối lại nếu không phải do người dùng ngắt
    if (
      reason !== "io client disconnect" &&
      reason !== "io server disconnect"
    ) {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log("Attempting to reconnect after disconnect...");
        initSocket(true); // Truyền true để force reconnect
      }, 3000);
    }
  });

  // Xử lý lỗi
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    isConnecting = false;
  });

  // ===== MESSAGE EVENTS =====
  // Lắng nghe tin nhắn mới
  socket.on("new_message", (message) => {
    console.log("Received new message:", message);

    // Gọi tất cả listeners cho chat này
    const chatId = message.chatId;
    const listeners = messageListeners.get(chatId) || [];
    listeners.forEach((callback) => callback(message));

    // Dispatch sự kiện cập nhật conversation
    window.dispatchEvent(new CustomEvent("conversation_updated"));
  });

  // Lắng nghe thông báo tin nhắn mới (khi không ở trong chat room)
  socket.on("new_message_notification", (message) => {
    console.log("Received new message notification:", message);

    // Dispatch sự kiện notification
    window.dispatchEvent(
      new CustomEvent("new_message_notification", {
        detail: message,
      })
    );

    // Dispatch sự kiện cập nhật conversation
    window.dispatchEvent(new CustomEvent("conversation_updated"));
  });

  // Lắng nghe xác nhận tin nhắn đã gửi đến server
  socket.on("message_delivered", ({ messageId, status, timestamp }) => {
    console.log(`Message ${messageId} status: ${status}`);

    // Xử lý các callback cho tin nhắn
    const listeners = messageDeliveryListeners.get(messageId) || [];
    listeners.forEach((callback) => callback({ messageId, status, timestamp }));

    // Xóa tin nhắn khỏi danh sách chờ nếu có
    if (pendingMessages.has(messageId)) {
      pendingMessages.delete(messageId);
    }
  });

  // Lắng nghe lỗi gửi tin nhắn
  socket.on("message_error", ({ messageId, error }) => {
    console.error(`Error with message ${messageId}: ${error}`);

    // Xử lý các callback cho tin nhắn
    const listeners = messageDeliveryListeners.get(messageId) || [];
    listeners.forEach((callback) =>
      callback({ messageId, status: "error", error })
    );
  });

  // ===== STATUS EVENTS =====
  // Lắng nghe thay đổi trạng thái online/offline
  socket.on("user_status_change", (data) => {
    console.log(
      `User ${data.userId} ${
        data.isOnline ? "is now online" : "is now offline"
      }`
    );

    // Cập nhật danh sách người dùng online
    if (data.isOnline) {
      onlineUsers.add(data.userId);
    } else {
      onlineUsers.delete(data.userId);
    }

    // Gọi tất cả listeners
    const listeners = Array.from(statusListeners.values());
    listeners.forEach((callback) => callback(data));

    // Dispatch event để các components khác có thể lắng nghe
    window.dispatchEvent(
      new CustomEvent("user_status_change", {
        detail: data,
      })
    );
  });

  // Lắng nghe danh sách users online
  socket.on("online_users_list", (userIds) => {
    console.log("Received online users list:", userIds);

    // Cập nhật danh sách
    onlineUsers.clear();
    userIds.forEach((id) => onlineUsers.add(id));

    // Thông báo cho các components
    window.dispatchEvent(
      new CustomEvent("online_users_updated", {
        detail: { users: userIds },
      })
    );
  });

  // Lắng nghe phản hồi từ yêu cầu trạng thái online
  socket.on("online_status_response", (statusMap) => {
    console.log("Received online status response:", statusMap);

    // Cập nhật danh sách
    for (const [userId, isOnline] of Object.entries(statusMap)) {
      if (isOnline) {
        onlineUsers.add(userId);
      } else {
        onlineUsers.delete(userId);
      }
    }

    // Thông báo cho các components
    window.dispatchEvent(
      new CustomEvent("online_status_updated", {
        detail: { statusMap },
      })
    );
  });

  // Lắng nghe thông báo mới từ server
  socket.on("new_notification", (notification) => {
    console.log("Received new notification:", notification);

    // Dispatch sự kiện cho NotificationContext
    window.dispatchEvent(
      new CustomEvent("notification_received", {
        detail: notification,
      })
    );
  });

  // ===== CONNECTION EVENTS =====
  // Lắng nghe ping từ server
  socket.on("server_probe", ({ timestamp }) => {
    // Gửi lại pong để xác nhận kết nối
    if (socket && socket.connected) {
      socket.emit("client_ping", {
        timestamp,
        response: Date.now(),
      });
    }
  });

  // Lắng nghe pong từ server
  socket.on("server_pong", ({ timestamp }) => {
    // Tính toán độ trễ
    const latency = Date.now() - timestamp;
    console.log(`Socket latency: ${latency}ms`);
  });

  // Lắng nghe sự kiện connect_error
  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
    isConnecting = false;
  });

  // Thêm theo dõi trạng thái kết nối socket
  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`[Socket] Reconnect attempt #${attempt}`);
    window._socketReconnecting = true;
  });

  socket.io.on("reconnect", (attempt) => {
    console.log(`[Socket] Reconnected after ${attempt} attempts`);
    isConnecting = false;
    window._socketReconnecting = false;

    // Thông báo kết nối lại thành công
    window.dispatchEvent(new CustomEvent("socket_reconnected"));
  });

  socket.io.on("reconnect_error", (error) => {
    console.error(`[Socket] Reconnect error: ${error.message}`);

    // Nếu lỗi nhiều lần, thử tạo kết nối mới hoàn toàn
    if (!window._socketReconnectionReset && window._socketReconnecting) {
      window._socketReconnectionReset = true;
      setTimeout(() => {
        console.log("[Socket] Trying to create a completely new connection");
        disconnect();
        initSocket(true);
        window._socketReconnectionReset = false;
      }, 3000);
    }
  });

  socket.io.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after all attempts");
    isConnecting = false;
    window._socketReconnecting = false;

    // Thông báo kết nối lại thất bại
    window.dispatchEvent(new CustomEvent("socket_reconnect_failed"));
  });
};

// ===== SOCKET CONNECTION MANAGEMENT =====

/**
 * Gửi ping định kỳ để giữ kết nối
 */
const startPingInterval = () => {
  // Xóa interval cũ nếu có
  if (window.socketPingInterval) {
    clearInterval(window.socketPingInterval);
  }

  // Theo dõi ping timeouts
  let consecutivePingFailures = 0;
  let lastSuccessfulPing = Date.now();

  // Tạo interval mới để ping server mỗi 30 giây
  window.socketPingInterval = setInterval(() => {
    if (socket && socket.connected) {
      // Gửi ping với callback để đảm bảo nhận được phản hồi
      socket.emit("client_ping", { timestamp: Date.now() }, (response) => {
        // Nếu có phản hồi, reset biến đếm
        if (response && response.received) {
          consecutivePingFailures = 0;
          lastSuccessfulPing = Date.now();
        }
      });

      // Nếu không nhận được phản hồi trong thời gian dài, thử kết nối lại
      setTimeout(() => {
        // Nếu đã quá lâu từ lần ping thành công cuối
        if (Date.now() - lastSuccessfulPing > 120000) {
          // 2 phút không có ping thành công
          console.warn(
            "[Socket] No successful ping for 2 minutes, attempting to reconnect"
          );
          consecutivePingFailures = 0;

          // Tạo kết nối mới nếu đang ở trang message
          if (isOnMessagePage()) {
            disconnect();
            initSocket(true);
          }
        }
      }, 3000); // Kiểm tra sau 3 giây
    } else {
      // Tăng số lần thất bại liên tiếp
      consecutivePingFailures++;

      // Nếu mất kết nối quá nhiều lần, xóa interval
      if (consecutivePingFailures >= 5) {
        console.warn("[Socket] Too many ping failures, clearing interval");
        clearInterval(window.socketPingInterval);
        window.socketPingInterval = null;

        // Thử kết nối lại nếu cần
        if (isOnMessagePage()) {
          setTimeout(() => {
            initSocket(true);
          }, 5000); // Thử lại sau 5 giây
        }
      }
    }
  }, 30000);
};

/**
 * Khởi tạo kết nối socket
 * @param {boolean} forceNew - Có cưỡng chế tạo kết nối mới không
 */
const initSocket = (forceNew = false) => {
  // Kiểm tra khoảng thời gian giữa 2 lần gọi hàm này
  const now = Date.now();
  if (now - connectionAttemptTimestamp < MIN_CONNECTION_INTERVAL && !forceNew) {
    console.log("Connection attempt too frequent, skipping");
    return socket;
  }

  connectionAttemptTimestamp = now;

  // Ngăn nhiều lần kết nối đồng thời
  if (isConnecting) {
    console.warn("Socket connection already in progress, ignoring request");
    return socket;
  }

  // Nếu đã kết nối và không yêu cầu kết nối mới, trả về socket hiện tại
  if (socket && socket.connected && !forceNew) {
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

  try {
    // Đánh dấu đang trong quá trình kết nối
    isConnecting = true;

    // Đóng kết nối cũ nếu có
    if (socket) {
      console.log("Closing existing socket before creating new connection");
      socket.disconnect();
      socket = null;

      // Thêm một khoảng trễ nhỏ để đảm bảo kết nối cũ đã đóng hoàn toàn
      setTimeout(() => {
        _createNewConnection(token);
      }, 500);
    } else {
      _createNewConnection(token);
    }

    return socket;
  } catch (error) {
    console.error("Error initializing socket:", error);
    isConnecting = false;
    return null;
  }
};

/**
 * Hàm nội bộ để tạo kết nối socket mới
 */
const _createNewConnection = (token) => {
  console.log(
    `[Socket] Connecting to: ${baseUrl} at ${new Date().toISOString()}`
  );

  try {
    // Tạo kết nối socket mới với options đã định nghĩa
    socket = io(baseUrl, {
      ...socketOptions,
      auth: { token },
    });

    // Thiết lập timeout để reset isConnecting nếu kết nối không thành công
    const connectTimeout = setTimeout(() => {
      if (isConnecting) {
        console.warn(
          "[Socket] Connection timed out, resetting connection state"
        );
        isConnecting = false;

        // Tự động thử kết nối lại sau một khoảng thời gian
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          console.log("[Socket] Auto-reconnect after timeout");
          if (isOnMessagePage()) {
            initSocket(true);
          }
        }, 5000);
      }
    }, 20000);

    // Đăng ký callback cho sự kiện connect_error và connect để xử lý isConnecting
    socket.io.on("connect_error", (err) => {
      console.error(`[Socket] Connect error: ${err.message}`);
      clearTimeout(connectTimeout);
      isConnecting = false;
    });

    socket.io.on("connect", () => {
      console.log(
        `[Socket] Connected successfully at ${new Date().toISOString()}`
      );
      clearTimeout(connectTimeout);
      // isConnecting sẽ được reset trong event "connect" trong setupSocketEvents
    });

    // Thiết lập các event handlers
    setupSocketEvents(socket);
  } catch (error) {
    console.error(`[Socket] Error creating connection: ${error.message}`);
    isConnecting = false;
  }
};

/**
 * Ngắt kết nối socket
 */
const disconnect = () => {
  if (!socket) return true;

  try {
    // Thông báo server trước khi disconnect
    if (socket.connected) {
      socket.emit("client_disconnect");
    }

    socket.disconnect();
    socket = null;
    isConnecting = false;

    // Xóa reconnect timer nếu có
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Xóa ping interval
    if (window.socketPingInterval) {
      clearInterval(window.socketPingInterval);
      window.socketPingInterval = null;
    }

    console.log("Socket disconnected");
    return true;
  } catch (error) {
    console.error("Error disconnecting socket:", error);
    return false;
  }
};

/**
 * Lấy socket instance
 */
const getSocket = () => {
  // Tự động kết nối nếu chưa có và đang ở trang message
  if ((!socket || !socket.connected) && isOnMessagePage()) {
    // Kiểm tra xem đã quá lâu từ lần kết nối cuối hay chưa để tránh spam
    const now = Date.now();
    if (now - connectionAttemptTimestamp > MIN_CONNECTION_INTERVAL) {
      return initSocket();
    } else {
      console.log("Recent connection attempt, not reconnecting automatically");
    }
  }
  return socket;
};

/**
 * Kiểm tra socket đã kết nối chưa
 */
const isSocketConnected = () => {
  return !!(socket && socket.connected);
};

// ===== MESSAGE FUNCTIONS =====

/**
 * Gửi tin nhắn qua socket
 * @param {Object} message - Dữ liệu tin nhắn cần gửi
 * @returns {String} - Temp ID của tin nhắn hoặc null nếu không gửi được
 */
const sendMessage = (message) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    // Tạo một tempId cho tin nhắn
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Thêm tempId vào message
    const messageWithTempId = {
      ...message,
      tempId,
      status: "sending",
      sentAt: Date.now(),
    };

    // Lưu message vào danh sách chờ
    pendingMessages.set(tempId, messageWithTempId);

    // Gửi qua socket
    socket.emit("send_message", messageWithTempId);

    return tempId;
  }
  return null;
};

/**
 * Đánh dấu tin nhắn đã đọc
 */
const markMessageAsRead = ({ messageId, chatId, senderId }) => {
  const socket = getSocket();
  if (socket && socket.connected) {
    socket.emit("mark_read", { messageId, chatId, senderId });
    return true;
  }
  return false;
};

/**
 * Lấy danh sách tin nhắn đang chờ
 */
const getPendingMessages = (chatId) => {
  if (!chatId) return [];

  const pendingForChat = [];
  pendingMessages.forEach((message) => {
    if (message.receiverId === chatId || message.chatId === chatId) {
      pendingForChat.push(message);
    }
  });

  return pendingForChat;
};

/**
 * Đăng ký lắng nghe khi tin nhắn được gửi thành công
 * @param {String} messageId - ID hoặc tempId của tin nhắn
 * @param {Function} callback - Hàm callback khi trạng thái thay đổi
 */
const trackMessageDelivery = (messageId, callback) => {
  if (!messageId) return () => {};

  // Thêm callback vào danh sách
  if (!messageDeliveryListeners.has(messageId)) {
    messageDeliveryListeners.set(messageId, []);
  }
  messageDeliveryListeners.get(messageId).push(callback);

  // Return một hàm để unsubscribe
  return () => {
    const listeners = messageDeliveryListeners.get(messageId) || [];
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    // Xóa key nếu không còn listeners
    if (listeners.length === 0) {
      messageDeliveryListeners.delete(messageId);
    }
  };
};

/**
 * Đăng ký lắng nghe tin nhắn mới
 */
const subscribeToMessages = (chatId, callback) => {
  if (!chatId || !callback) return () => {};

  // Initialize list for this chat if it doesn't exist
  if (!messageListeners.has(chatId)) {
    messageListeners.set(chatId, []);
  }

  // Add callback
  messageListeners.get(chatId).push(callback);

  // Return unsubscribe function
  return () => {
    const callbacks = messageListeners.get(chatId) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    if (callbacks.length === 0) {
      messageListeners.delete(chatId);
    }
  };
};

// ===== CHAT ROOM FUNCTIONS =====

/**
 * Tham gia phòng chat
 */
const joinChatRoom = (chatId) => {
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
const leaveChatRoom = (chatId) => {
  if (socket && socket.connected) {
    socket.emit("leave_chat", chatId);
    return true;
  }
  return false;
};

// ===== USER STATUS FUNCTIONS =====

/**
 * Kiểm tra user có đang online không
 * @param {string} userId - ID của user cần kiểm tra
 * @returns {boolean} - true nếu user đang online
 */
const isUserOnline = (userId) => {
  if (!userId) return false;
  return onlineUsers.has(userId);
};

/**
 * Đăng ký lắng nghe thay đổi trạng thái người dùng
 */
const subscribeToUserStatus = (callback) => {
  const id = Math.random().toString(36).substr(2, 9);

  // Add callback
  statusListeners.set(id, callback);

  // Return unsubscribe function
  return () => {
    statusListeners.delete(id);
  };
};

/**
 * Yêu cầu trạng thái online của các bạn bè
 * @param {Array} userIds - Danh sách ID của bạn bè cần kiểm tra
 */
const requestOnlineStatus = (userIds) => {
  const socket = getSocket();
  if (!socket || !socket.connected) return false;

  socket.emit("get_online_status", userIds);
  return true;
};

// ===== EXPORT =====
// Export cụ thể từng chức năng
export {
  // Connection management
  initSocket,
  disconnect,
  getSocket,
  isSocketConnected,
  isOnMessagePage,

  // Message handling
  sendMessage,
  markMessageAsRead,
  getPendingMessages,
  trackMessageDelivery,
  subscribeToMessages,

  // Chat rooms
  joinChatRoom,
  leaveChatRoom,

  // User status
  isUserOnline,
  subscribeToUserStatus,
  requestOnlineStatus,
};
