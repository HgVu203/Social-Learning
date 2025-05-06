/**
 * Socket.io connection utilities
 */

// Uncomment these imports for socket connection
import io from "socket.io-client";
import tokenService from "./services/tokenService";

// Socket state management
let socket = null;
let commentListeners = new Map();
let messageListeners = new Map();
let userStatusListeners = new Map();
let disconnectReason = null;
let lastConnectionTime = 0;
let socketConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 100; // Tăng số lần thử kết nối tối đa
let heartbeatInterval = null;
let autoReconnectTimeout = null;
let lastPingResponse = 0;
let serverProbeTimeout = null;
let manuallyDisconnected = false;

// Cấu hình Socket.io
const baseUrl =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL || "/"
    : "http://localhost:3000";

// Thời gian chờ giữa các lần thử kết nối (ms)
const getBackoffTime = (attempt) => {
  // Exponential backoff: 1s, 2s, 4s, 8s... tối đa 60s
  return Math.min(1000 * Math.pow(2, Math.min(attempt, 6)), 60000);
};

/**
 * Get the user ID from the stored token
 * @returns {string|null} - The user ID or null if not found
 */
const getUserIdFromToken = () => {
  try {
    // First try to get user ID from stored user object
    const user = tokenService.getUser();
    if (user && (user.id || user._id)) {
      return user.id || user._id;
    }

    // If not found in user object, try to extract from token
    const token = tokenService.getToken();
    if (!token) return null;

    const tokenData = JSON.parse(atob(token.split(".")[1]));
    return (
      tokenData?.id ||
      tokenData?._id ||
      tokenData?.userId ||
      tokenData?.user?._id ||
      tokenData?.user?.id
    );
  } catch (err) {
    console.error("Failed to extract user ID:", err);
    return null;
  }
};

/**
 * Reset socket connection state for fresh connection
 */
const resetConnectionState = () => {
  if (socket) {
    try {
      socket.disconnect();
      socket = null;
    } catch (err) {
      console.error("Error during socket disconnect in reset:", err);
    }
  }

  // Clear any existing intervals
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (autoReconnectTimeout) {
    clearTimeout(autoReconnectTimeout);
    autoReconnectTimeout = null;
  }

  disconnectReason = null;
  socketConnected = false;
  connectionAttempts = 0;
};

/**
 * Setup heartbeat mechanism to keep connection alive
 * This is the only heartbeat mechanism we should use
 */
const setupHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Cập nhật thời gian phản hồi cuối cùng
  lastPingResponse = Date.now();

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      // Check time since last ping response
      const now = Date.now();
      const timeSinceLastResponse = now - lastPingResponse;

      // If no response for more than 50 seconds, connection might be stale
      if (timeSinceLastResponse > 50000) {
        console.warn(
          "No ping response for 50+ seconds, connection may be stale"
        );

        // Try to reconnect
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          checkAndRestoreConnection();
        }
      }

      // Send a ping to keep the connection alive
      try {
        socket.emit("client_ping", { timestamp: now }, (response) => {
          if (response && response.received) {
            // Cập nhật thời gian phản hồi
            lastPingResponse = Date.now();
          } else {
            console.warn("No/invalid response to ping");
            // Không ngắt kết nối ngay, chỉ ghi log để theo dõi
          }
        });
      } catch (err) {
        console.error("Error sending heartbeat ping:", err);
        // Không ngắt kết nối ngay, thử lại sau
      }
    } else if (socket && !manuallyDisconnected) {
      // Socket exists but not connected and not manually disconnected
      checkAndRestoreConnection();
    }
  }, 25000); // Sync với server (25 seconds)

  // Handle server probes (lắng nghe ping từ server)
  if (socket) {
    socket.on("server_probe", (data) => {
      // Khi nhận được probe từ server, cập nhật thời gian phản hồi
      lastPingResponse = Date.now();

      // Respond to server probe
      socket.emit("client_pong", {
        timestamp: data.timestamp,
        receivedAt: Date.now(),
      });
    });
  }

  // Set up timeout to detect server probe missing
  if (serverProbeTimeout) {
    clearTimeout(serverProbeTimeout);
  }

  // Kiểm tra mỗi 2.5 phút nếu không nhận được probe từ server
  serverProbeTimeout = setInterval(() => {
    const now = Date.now();

    // Also send our own ping periodically to keep connection alive
    if (socket && socket.connected) {
      sendKeepAlive();
    }

    // Nếu không nhận probe trong 2.5 phút, kết nối có thể đã mất
    if (now - lastPingResponse > 150000) {
      console.warn(
        "No server probe received for 2.5 minutes, checking connection"
      );
      checkAndRestoreConnection();
    }
  }, 150000);
};

/**
 * Initialize socket connection
 */
export const initSocket = () => {
  try {
    // Kiểm tra xem có đang ở trang message hay không
    const currentPath = window.location.pathname;
    const isMessagePage =
      currentPath.includes("/message") ||
      currentPath.includes("/messages") ||
      currentPath.includes("/chat");

    // Nếu không phải trang message, không kết nối socket
    if (!isMessagePage) {
      console.log("Not on message page, skipping socket connection");
      return null;
    }

    console.log("On message page, connecting socket");

    // Reset manually disconnected flag when initializing
    manuallyDisconnected = false;

    const now = Date.now();

    // Check if user is authenticated
    const token = tokenService.getToken();
    if (!token) {
      console.warn("Cannot initialize socket - no authentication token");
      return null;
    }

    // Get user ID
    const userId = getUserIdFromToken();
    if (!userId) {
      console.warn("Cannot initialize socket - no user ID found in token");
      return null;
    }

    // Throttle reconnection attempts (sử dụng backoff thay vì thời gian cố định)
    if (now - lastConnectionTime < getBackoffTime(connectionAttempts)) {
      return socket;
    }

    // Track connection attempt time
    lastConnectionTime = now;

    // If already connected, return existing socket
    if (socket && socket.connected) {
      return socket;
    }

    // If socket exists but was disconnected for navigation, just reconnect
    if (socket && disconnectReason === "navigation") {
      socket.connect();
      disconnectReason = null;
      return socket;
    }

    // Maximum reconnection attempts reached
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Resetting connection state.`
      );
      resetConnectionState();
    }

    // Increment connection attempts
    connectionAttempts++;

    // Close existing socket connection if any
    if (socket) {
      try {
        socket.disconnect();
        socket.close();
      } catch (err) {
        console.error("Error closing existing socket:", err);
      }
      socket = null;
    }

    console.log(
      `Socket connecting to: ${baseUrl} (attempt ${connectionAttempts})`
    );

    try {
      // Create new socket with auth token
      socket = io(baseUrl, {
        auth: {
          token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        timeout: 45000, // Tăng lên đồng bộ với server
        forceNew: connectionAttempts > 10,
        pingTimeout: 60000, // 60 seconds - đồng bộ với server
        pingInterval: 25000, // 25 seconds - đồng bộ với server
        autoConnect: true,
        withCredentials: true,
        path: "/socket.io",
        upgrade: true,
        rememberUpgrade: true,
      });

      // Tạo biến phòng tránh lỗi
      window.socketState = { socket, connected: false };

      // Socket event handlers
      socket.on("connect", () => {
        console.log("Socket connected successfully", socket.id);
        disconnectReason = null;
        socketConnected = true;
        connectionAttempts = 0;
        window.socketState.connected = true;
        lastPingResponse = Date.now(); // Reset ping response time

        // Add user_status_change event listener
        socket.on("user_status_change", (data) => {
          try {
            const { userId, isOnline } = data;
            console.log(
              `Received status update: User ${userId} is ${
                isOnline ? "online" : "offline"
              }`
            );

            // Notify all registered listeners about the status change
            if (userStatusListeners.size > 0) {
              userStatusListeners.forEach((callback) => {
                if (typeof callback === "function") {
                  callback(userId, isOnline);
                }
              });
            }

            // Dispatch a global event for components that aren't directly subscribed
            window.dispatchEvent(
              new CustomEvent("user_status_updated", {
                detail: { userId, isOnline },
              })
            );
          } catch (error) {
            console.error("Error handling user status change:", error);
          }
        });

        // Setup heartbeat after connection - chỉ cài đặt một cơ chế duy nhất
        setupHeartbeat();

        // Setup server probe handler
        setupServerProbeHandler();

        // Send authentication immediately on connection
        socket.emit("authenticate", token);

        // Send user ID for easier server-side user tracking
        socket.emit("identify_user", { userId });

        // Dispatch event for reconnection
        window.dispatchEvent(new CustomEvent("socket_reconnected"));

        // Rejoin all active chat rooms
        for (const userId of messageListeners.keys()) {
          joinChatRoom(userId);
        }
      });

      // Server response to heartbeat
      socket.on("server_pong", (data) => {
        // Connection is healthy
        lastPingResponse = Date.now();
        const latency = Date.now() - data.timestamp;
        if (latency > 1000) {
          console.warn(`Socket latency is high: ${latency}ms`);
        }
      });

      // Thêm xử lý sự kiện connect_timeout
      socket.on("connect_timeout", (timeout) => {
        console.error("Socket connect timeout:", timeout);
        socketConnected = false;
        window.socketState.connected = false;

        // Khởi tạo lại kết nối với delay tùy theo số lần thử
        setTimeout(() => {
          resetConnectionState();
          initSocket();
        }, getBackoffTime(connectionAttempts));
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        socketConnected = false;
        window.socketState.connected = false;

        // Dispatch event for socket error
        window.dispatchEvent(
          new CustomEvent("socket_disconnect", {
            detail: { reason: error.message },
          })
        );

        // Retry connection with backoff delay unless authentication failed
        if (
          !error.message.includes("authentication") &&
          connectionAttempts < MAX_RECONNECT_ATTEMPTS
        ) {
          setTimeout(() => {
            try {
              if (socket) socket.connect();
            } catch (e) {
              console.error("Error during reconnect:", e);
              // Reset socket if connection attempt fails
              if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
                resetConnectionState();

                // Try with a completely fresh connection after reset
                setTimeout(() => {
                  initSocket();
                }, getBackoffTime(connectionAttempts));
              }
            }
          }, getBackoffTime(connectionAttempts));
        } else if (error.message.includes("authentication")) {
          socket.disconnect();

          // Try to refresh the token
          setTimeout(() => {
            const newToken = tokenService.getToken();
            if (newToken) {
              initSocket();
            }
          }, 3000);
        }
      });

      socket.on("authentication_failed", (error) => {
        console.error("Socket authentication failed:", error);
        socketConnected = false;

        // Try to reauthenticate after a delay
        setTimeout(() => {
          if (socket && socket.connected) {
            const refreshedToken = tokenService.getToken();
            if (refreshedToken) {
              socket.emit("authenticate", refreshedToken);

              // Also re-identify the user
              const userId = getUserIdFromToken();
              if (userId) {
                socket.emit("identify_user", { userId });
              }
            }
          }
        }, 2000);
      });

      socket.on("authentication_success", (data) => {
        console.log("Socket authentication successful:", data);
        socketConnected = true;
        connectionAttempts = 0;
      });

      socket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        disconnectReason = reason;
        socketConnected = false;
        window.socketState.connected = false;

        // If manually disconnected, don't automatically reconnect
        if (manuallyDisconnected) {
          console.log("Socket was manually disconnected, not reconnecting");
          return;
        }

        // More intelligent handling of different disconnect reasons
        if (
          reason === "transport close" ||
          reason === "ping timeout" ||
          reason === "transport error"
        ) {
          const reconnectDelay = getBackoffTime(connectionAttempts);
          console.log(
            `Reconnecting in ${reconnectDelay}ms (attempt ${connectionAttempts})`
          );

          setTimeout(() => {
            if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
              if (socket) socket.connect();
            } else {
              // Reset and try with a fresh connection
              resetConnectionState();
              initSocket();
            }
          }, reconnectDelay);
        } else if (reason === "io server disconnect") {
          // Server forced disconnect, may need a completely new connection
          console.log("Server forced disconnect, creating new connection");
          setTimeout(() => {
            resetConnectionState();
            initSocket();
          }, getBackoffTime(connectionAttempts));
        }

        // Dispatch event for disconnect
        window.dispatchEvent(
          new CustomEvent("socket_disconnect", {
            detail: { reason },
          })
        );
      });

      // Handle socket errors
      socket.on("error", (error) => {
        console.error("Socket error:", error);
        socketConnected = false;
        window.socketState.connected = false;
      });

      return socket;
    } catch (socketError) {
      console.error("Socket.io initialization error:", socketError);
      return null;
    }
  } catch (error) {
    console.error("Fatal error in socket initialization:", error);
    // Return null instead of throwing to prevent UI crashes
    return null;
  }
};

/**
 * Close socket connection
 * @param {boolean} isNavigation - Whether the close is due to navigation (not logout)
 */
export const closeSocket = (isNavigation = false) => {
  if (socket) {
    if (isNavigation) {
      disconnectReason = "navigation";
      socket.disconnect();
      console.log("Socket connection paused for navigation");
    } else {
      try {
        // Set the flag to prevent auto-reconnect
        manuallyDisconnected = true;

        // Thông báo cho server về việc client đang disconnect
        if (socket.connected) {
          socket.emit("client_disconnect");
        }
        socket.disconnect();
        socket = null;
        disconnectReason = null;
        commentListeners.clear();
        messageListeners.clear();
        userStatusListeners.clear();
        socketConnected = false;
        console.log("Socket connection closed completely");

        // Clear any intervals
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        if (autoReconnectTimeout) {
          clearTimeout(autoReconnectTimeout);
          autoReconnectTimeout = null;
        }

        if (serverProbeTimeout) {
          clearTimeout(serverProbeTimeout);
          serverProbeTimeout = null;
        }
      } catch (error) {
        console.error("Error during socket close:", error);
      }
    }
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  // Kiểm tra xem có đang ở trang message không
  const currentPath = window.location.pathname;
  const isMessagePage =
    currentPath.includes("/messages") || currentPath.includes("/chat");

  if (!isMessagePage) {
    // Không tự động kết nối socket nếu không phải trong message
    console.log(
      "getSocket called outside of message page - avoiding automatic connection"
    );
    return null;
  }

  // Chỉ thực hiện kết nối khi đang ở trang message
  if (!socket) {
    return initSocket();
  }
  return socket;
};

/**
 * Check if socket is connected
 */
export const isSocketConnected = () => {
  return socket && socket.connected && socketConnected;
};

/**
 * Join a chat room to receive message events
 */
export const joinChatRoom = (userId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("join_chat", userId);
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = (userId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("leave_chat", userId);
};

/**
 * Subscribe to message events for a specific user
 */
export const subscribeToMessages = (userId, callbacks) => {
  const socket = getSocket();
  if (!socket) {
    console.error("No socket connection available");
    return () => {}; // Return empty function instead of null
  }

  // Join the chat room
  joinChatRoom(userId);

  // Store callbacks for this userId
  messageListeners.set(userId, callbacks);

  // Set up the event handlers if they don't exist
  if (!socket._hasMessageHandlers) {
    // CRITICAL FIX: Add direct new message handler for immediate updates
    socket.on("new_message_received", (data) => {
      try {
        const { message, fromId } = data;

        if (!message || !fromId) {
          console.error("Invalid direct message data received:", data);
          return;
        }

        // Find appropriate listener
        const listener = messageListeners.get(fromId.toString());

        // Call the onMessageReceived callback immediately
        if (listener && listener.onMessageReceived) {
          listener.onMessageReceived(message);

          // Dispatch high-priority global event with data
          window.dispatchEvent(
            new CustomEvent("urgent_new_message", {
              detail: {
                message,
                partnerId: fromId,
                timestamp: Date.now(),
              },
            })
          );
        }
      } catch (error) {
        console.error("Error handling direct new message event:", error);
      }
    });

    socket.on("message_sent", (data) => {
      try {
        // Safely extract IDs
        const senderId = data.senderId && (data.senderId._id || data.senderId);
        const receiverId =
          data.receiverId && (data.receiverId._id || data.receiverId);

        if (!senderId || !receiverId) {
          console.error("Invalid message data received:", data);
          return;
        }

        // Get user ID from decoded token instead of relying on socket.userId
        let currentUserId = null;
        try {
          const token = tokenService.getToken();
          if (token) {
            const tokenData = JSON.parse(atob(token.split(".")[1]));
            currentUserId = tokenData.id;
          }
        } catch (err) {
          console.error("Error extracting user ID from token:", err);
        }

        // Fallback: If we couldn't get user ID from token, try socket
        if (!currentUserId) {
          currentUserId = socket.auth?.userId || socket.userId;
        }

        // Log and handle the case when we still don't have user ID
        if (!currentUserId) {
          console.error(
            "Cannot determine current user ID from token or socket"
          );
          // Just use senderId as backup - will at least show messages in some cases
          // We'll still continue processing since this shouldn't break functionality
          currentUserId = senderId; // This is a fallback that might not be correct
        }

        // Find the listener for the conversation partner
        const partnerId =
          senderId.toString() === currentUserId.toString()
            ? receiverId
            : senderId;
        const listener = messageListeners.get(partnerId.toString());

        // Call the onMessageReceived callback if it exists
        if (listener && listener.onMessageReceived) {
          listener.onMessageReceived(data);

          // Dispatch standard conversation update event
          window.dispatchEvent(
            new CustomEvent("conversation_updated", {
              detail: {
                message: data,
                partnerId: partnerId,
                timestamp: Date.now(),
              },
            })
          );
        }
      } catch (error) {
        console.error("Error handling message_sent event:", error);
      }
    });

    socket.on("message_read", (data) => {
      try {
        // Safely extract sender ID
        const senderId = data.senderId && (data.senderId._id || data.senderId);

        if (!senderId) {
          console.error("Invalid message data received:", data);
          return;
        }

        const listener = messageListeners.get(senderId.toString());

        if (listener && listener.onMessageRead) {
          listener.onMessageRead(data);
        }
      } catch (error) {
        console.error("Error handling message_read event:", error);
      }
    });

    socket.on("message_deleted", (data) => {
      try {
        // Safely extract IDs
        const senderId = data.senderId && (data.senderId._id || data.senderId);
        const receiverId =
          data.receiverId && (data.receiverId._id || data.receiverId);

        if (!senderId || !receiverId) {
          console.error("Invalid message data received:", data);
          return;
        }

        // Get user ID from decoded token instead of relying on socket.userId
        let currentUserId = null;
        try {
          const token = tokenService.getToken();
          if (token) {
            const tokenData = JSON.parse(atob(token.split(".")[1]));
            currentUserId = tokenData.id;
          }
        } catch (err) {
          console.error("Error extracting user ID from token:", err);
        }

        // Fallback: If we couldn't get user ID from token, try socket
        if (!currentUserId) {
          currentUserId = socket.auth?.userId || socket.userId;
        }

        // Log and handle the case when we still don't have user ID
        if (!currentUserId) {
          console.error(
            "Cannot determine current user ID from token or socket"
          );
          // Just use senderId as backup - will at least show messages in some cases
          currentUserId = senderId; // This is a fallback that might not be correct
        }

        // Find the listener for the conversation partner
        const partnerId =
          senderId.toString() === currentUserId.toString()
            ? receiverId
            : senderId;
        const listener = messageListeners.get(partnerId.toString());

        if (listener && listener.onMessageDeleted) {
          listener.onMessageDeleted(data);
        }
      } catch (error) {
        console.error("Error handling message_deleted event:", error);
      }
    });

    socket.on("conversation_updated", (data) => {
      try {
        const { partnerId } = data;
        if (!partnerId) {
          console.error("Invalid conversation data received:", data);
          return;
        }

        const listener = messageListeners.get(partnerId.toString());

        if (listener && listener.onConversationUpdated) {
          listener.onConversationUpdated(partnerId);
        }

        // Dispatch a global event for other components to react
        window.dispatchEvent(new CustomEvent("conversation_updated"));
      } catch (error) {
        console.error("Error handling conversation_updated event:", error);
      }
    });

    // Add reconnection logic for message rooms
    socket.on("reconnect", () => {
      // Rejoin all active chat rooms
      for (const userId of messageListeners.keys()) {
        joinChatRoom(userId);
      }
    });

    socket._hasMessageHandlers = true;
  }

  // Return an unsubscribe function
  return () => {
    messageListeners.delete(userId);
    leaveChatRoom(userId);
  };
};

/**
 * Check socket connection and try to restore if needed
 * @returns {boolean} Whether connection is now active or being restored
 */
export const checkAndRestoreConnection = () => {
  // Kiểm tra xem có đang ở trang message hay không
  const currentPath = window.location.pathname;
  const isMessagePage =
    currentPath.includes("/message") ||
    currentPath.includes("/messages") ||
    currentPath.includes("/chat");

  // Nếu không phải trang message, không kết nối socket
  if (!isMessagePage) {
    console.log("Not on message page, skipping socket reconnection");
    return false;
  }

  console.log("On message page, checking socket connection");

  // If manually disconnected, don't auto reconnect
  if (manuallyDisconnected) {
    console.log(
      "Socket was manually disconnected, not attempting to reconnect"
    );
    return false;
  }

  // If socket doesn't exist or window was reloaded, initialize
  if (!socket || !window.socketState) {
    return !!initSocket();
  }

  // If socket exists but is disconnected, try to reconnect
  if (
    socket &&
    !socket.connected &&
    connectionAttempts < MAX_RECONNECT_ATTEMPTS
  ) {
    try {
      // Reset token before reconnecting to ensure fresh authentication
      const token = tokenService.getToken();
      if (token) {
        socket.auth = { token };
      }

      // Try to reconnect existing socket
      socket.connect();

      // Dispatch reconnecting event
      window.dispatchEvent(new CustomEvent("socket_reconnecting"));

      // Setup fresh heartbeat when reconnecting
      setupHeartbeat();

      return true;
    } catch (error) {
      console.error("Error reconnecting socket:", error);

      // If reconnection fails, try to initialize a fresh connection after a delay
      setTimeout(() => {
        resetConnectionState();
        initSocket();
      }, getBackoffTime(connectionAttempts));

      return false;
    }
  }

  // If socket isn't active for more than 45 seconds, force a refresh
  if (socket && socket.connected && Date.now() - lastPingResponse > 45000) {
    try {
      // Send a test ping to verify connection
      socket.emit("client_ping", { timestamp: Date.now() }, (response) => {
        if (!response || !response.received) {
          console.log("No ping response, force reconnecting");
          resetConnectionState();
          initSocket();
        } else {
          lastPingResponse = Date.now();
        }
      });
    } catch (error) {
      console.error("Error sending ping:", error);
      // Force reconnect on error
      resetConnectionState();
      initSocket();
    }
  }

  // Socket is already connected
  return socket && socket.connected;
};

// Cách khác để khôi phục kết nối
export const forceReconnect = () => {
  // Kiểm tra xem có đang ở trang message hay không
  const currentPath = window.location.pathname;
  const isMessagePage =
    currentPath.includes("/message") ||
    currentPath.includes("/messages") ||
    currentPath.includes("/chat");

  // Nếu không phải trang message, không kết nối socket
  if (!isMessagePage) {
    console.log("Not on message page, skipping socket force reconnect");
    return false;
  }

  console.log("On message page, force reconnecting socket");

  manuallyDisconnected = false; // Reset flag
  resetConnectionState();
  return initSocket();
};

// Handle unload/beforeunload to clean up connections
window.addEventListener("beforeunload", () => {
  try {
    // Clean shutdown of socket connections
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }

    if (autoReconnectTimeout) {
      clearTimeout(autoReconnectTimeout);
    }

    if (socket && socket.connected) {
      socket.emit("client_disconnect");
      socket.disconnect();
    }
  } catch (err) {
    console.error("Error during page unload cleanup:", err);
  }
});

// Check connection when page becomes visible again
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Kiểm tra xem có đang ở trang message hay không
    const currentPath = window.location.pathname;
    const isMessagePage =
      currentPath.includes("/message") ||
      currentPath.includes("/messages") ||
      currentPath.includes("/chat");

    if (isMessagePage) {
      console.log("Tab visible on message page, checking connection");
      // Immediately check connection when tab becomes visible
      checkAndRestoreConnection();
    }
  }
});

// Add network status checking to detect connection changes
window.addEventListener("online", () => {
  // Kiểm tra xem có đang ở trang message hay không
  const currentPath = window.location.pathname;
  const isMessagePage =
    currentPath.includes("/message") ||
    currentPath.includes("/messages") ||
    currentPath.includes("/chat");

  if (isMessagePage) {
    console.log("Network back online on message page, checking connection");
    checkAndRestoreConnection();
  }
});

window.addEventListener("offline", () => {
  console.warn("Network offline, socket will reconnect when back online");
});

// Thêm kiểm tra khi tab nhận focus
window.addEventListener("focus", () => {
  // Kiểm tra xem có đang ở trang message hay không
  const currentPath = window.location.pathname;
  const isMessagePage =
    currentPath.includes("/message") ||
    currentPath.includes("/messages") ||
    currentPath.includes("/chat");

  if (isMessagePage) {
    console.log("Tab focused on message page, checking connection");
    checkAndRestoreConnection();
  }
});

/**
 * Subscribe to user status changes
 * @param {Function} callback - Function to call when a user's status changes
 * @returns {Function} - Function to unsubscribe
 */
export const subscribeToUserStatus = (callback) => {
  if (typeof callback !== "function") {
    console.error("Invalid callback provided to subscribeToUserStatus");
    return () => {};
  }

  // Generate a unique ID for this subscription
  const subscriptionId =
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Store the callback
  userStatusListeners.set(subscriptionId, callback);

  // Return unsubscribe function
  return () => {
    userStatusListeners.delete(subscriptionId);
  };
};

// Thêm cơ chế keep-alive chủ động cho socket đã kết nối
export const sendKeepAlive = () => {
  try {
    if (socket && socket.connected) {
      socket.emit("client_ping", {
        timestamp: Date.now(),
        isKeepAlive: true,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error sending keep-alive ping:", error);
    return false;
  }
};

// Handle server probes separately from heartbeat
const setupServerProbeHandler = () => {
  if (!socket) return;

  // Remove existing handler if any
  socket.off("server_probe");

  // Add handler for server probes
  socket.on("server_probe", (data) => {
    // Update ping response time
    lastPingResponse = Date.now();

    // Send an immediate response
    socket.emit("client_pong", {
      timestamp: data.timestamp,
      receivedAt: Date.now(),
      userId: getUserIdFromToken(),
    });

    // Also ensure connection state is up to date
    socketConnected = true;

    // Ensure socketState is updated
    if (window.socketState) {
      window.socketState.connected = true;
    }
  });
};

export default {
  initSocket,
  getSocket,
  closeSocket,
  joinChatRoom,
  leaveChatRoom,
  subscribeToMessages,
  isSocketConnected,
  checkAndRestoreConnection,
  forceReconnect,
  subscribeToUserStatus,
  sendKeepAlive,
  setupServerProbeHandler,
};
