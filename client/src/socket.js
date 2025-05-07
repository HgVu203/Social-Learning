/**
 * Socket.io connection utilities - Optimized version
 * This version only connects socket when on message pages
 */

// Uncomment these imports for socket connection
import io from "socket.io-client";
import tokenService from "./services/tokenService";

// Socket state management
let socket = null;
let messageListeners = new Map();
let userStatusListeners = new Map();
let disconnectReason = null;
let lastConnectionTime = 0;
let socketConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 30;
let heartbeatInterval = null;
let lastPingResponse = 0;
let manuallyDisconnected = false;

// Cấu hình Socket.io
const baseUrl =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL || "/"
    : "http://localhost:3000";

/**
 * Check if the current page is a message-related page
 * @returns {boolean} - True if on a message page
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
 * Get backoff time for reconnection attempts
 * @param {number} attempt - The current attempt number
 * @returns {number} - Milliseconds to wait before next attempt
 */
const getBackoffTime = (attempt) => {
  // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
  return Math.min(1000 * Math.pow(2, Math.min(attempt, 5)), 30000);
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

  disconnectReason = null;
  socketConnected = false;
  connectionAttempts = 0;
};

/**
 * Setup heartbeat mechanism to keep connection alive
 */
const setupHeartbeat = () => {
  if (!isOnMessagePage()) return;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Update last ping response time
  lastPingResponse = Date.now();

  heartbeatInterval = setInterval(() => {
    // Only process heartbeat if on message page
    if (!isOnMessagePage()) return;

    if (socket && socket.connected) {
      // Check time since last ping response
      const now = Date.now();
      const timeSinceLastResponse = now - lastPingResponse;

      // If no response for more than 45 seconds, connection might be stale
      if (timeSinceLastResponse > 45000) {
        console.warn(
          "No ping response for 45+ seconds, connection may be stale"
        );

        // Try to reconnect
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          checkAndRestoreConnection();
        }
      }

      // Send a ping to keep the connection alive
      try {
        socket.emit("client_ping", { timestamp: now });
      } catch (err) {
        console.error("Error sending heartbeat ping:", err);
      }
    } else if (socket && !manuallyDisconnected) {
      // Socket exists but not connected and not manually disconnected
      checkAndRestoreConnection();
    }
  }, 25000); // Sync with server (25 seconds)
};

/**
 * Initialize socket connection
 */
export const initSocket = () => {
  try {
    // Check if on message page
    if (!isOnMessagePage()) {
      console.log("Not on message page, skipping socket connection");
      return null;
    }

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

    // Throttle reconnection attempts
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
      } catch (err) {
        console.error("Error closing existing socket:", err);
      }
      socket = null;
    }

    console.log(
      `Socket connecting to: ${baseUrl} (attempt ${connectionAttempts})`
    );

    // Create new socket with auth token
    socket = io(baseUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 30000,
      pingTimeout: 60000,
      pingInterval: 25000,
      autoConnect: true,
      withCredentials: true,
    });

    // Create socket state tracking variable
    window.socketState = { socket, connected: false };

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected successfully", socket.id);
      disconnectReason = null;
      socketConnected = true;
      connectionAttempts = 0;
      window.socketState.connected = true;
      lastPingResponse = Date.now();

      // Handle user status changes
      socket.on("user_status_change", (data) => {
        if (!isOnMessagePage()) return;

        try {
          const { userId, isOnline } = data;

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

      // Setup heartbeat after connection
      setupHeartbeat();

      // Authenticate with server
      socket.emit("authenticate", token);
      socket.emit("identify_user", { userId });

      // Dispatch event for reconnection
      window.dispatchEvent(new CustomEvent("socket_reconnected"));

      // Rejoin all active chat rooms
      for (const userId of messageListeners.keys()) {
        joinChatRoom(userId);
      }
    });

    // Server response to heartbeat
    socket.on("server_pong", () => {
      lastPingResponse = Date.now();
    });

    // Connection error handling
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

      // Retry connection unless authentication failed
      if (
        !error.message.includes("authentication") &&
        connectionAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        setTimeout(() => {
          if (isOnMessagePage() && socket) socket.connect();
        }, getBackoffTime(connectionAttempts));
      }
    });

    // Authentication handling
    socket.on("authentication_failed", (error) => {
      console.error("Socket authentication failed:", error);
      socketConnected = false;
    });

    socket.on("authentication_success", () => {
      socketConnected = true;
      connectionAttempts = 0;
    });

    // Disconnect handling
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

      // Only attempt reconnection if on message page
      if (!isOnMessagePage()) return;

      // Handle disconnection based on reason
      if (
        ["transport close", "ping timeout", "transport error"].includes(reason)
      ) {
        const reconnectDelay = getBackoffTime(connectionAttempts);
        setTimeout(() => {
          if (
            isOnMessagePage() &&
            connectionAttempts < MAX_RECONNECT_ATTEMPTS
          ) {
            if (socket) socket.connect();
          }
        }, reconnectDelay);
      }

      // Dispatch event for disconnect
      window.dispatchEvent(
        new CustomEvent("socket_disconnect", { detail: { reason } })
      );
    });

    // Error handling
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      socketConnected = false;
      window.socketState.connected = false;
    });

    // Set up message event handlers
    setupMessageHandlers();

    return socket;
  } catch (error) {
    console.error("Fatal error in socket initialization:", error);
    return null;
  }
};

/**
 * Set up handlers for message-related events
 */
const setupMessageHandlers = () => {
  if (!socket || socket._hasMessageHandlers) return;

  // New direct message handler
  socket.on("new_message_received", (data) => {
    if (!isOnMessagePage()) return;

    try {
      const { message, fromId } = data;
      if (!message || !fromId) return;

      // Find appropriate listener
      const listener = messageListeners.get(fromId.toString());
      if (listener && listener.onMessageReceived) {
        listener.onMessageReceived(message);

        // Dispatch event
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
      console.error("Error handling new message event:", error);
    }
  });

  // Message sent handler
  socket.on("message_sent", (data) => {
    if (!isOnMessagePage()) return;

    try {
      // Extract IDs
      const senderId = data.senderId && (data.senderId._id || data.senderId);
      const receiverId =
        data.receiverId && (data.receiverId._id || data.receiverId);
      if (!senderId || !receiverId) return;

      // Get current user ID
      const currentUserId = getUserIdFromToken();
      if (!currentUserId) return;

      // Determine conversation partner
      const partnerId =
        senderId.toString() === currentUserId.toString()
          ? receiverId
          : senderId;
      const listener = messageListeners.get(partnerId.toString());

      // Notify listener
      if (listener && listener.onMessageReceived) {
        listener.onMessageReceived(data);

        // Dispatch event
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

  // Message read handler
  socket.on("message_read", (data) => {
    if (!isOnMessagePage()) return;

    try {
      const senderId = data.senderId && (data.senderId._id || data.senderId);
      if (!senderId) return;

      const listener = messageListeners.get(senderId.toString());
      if (listener && listener.onMessageRead) {
        listener.onMessageRead(data);
      }
    } catch (error) {
      console.error("Error handling message_read event:", error);
    }
  });

  // Message deleted handler
  socket.on("message_deleted", (data) => {
    if (!isOnMessagePage()) return;

    try {
      // Extract IDs
      const senderId = data.senderId && (data.senderId._id || data.senderId);
      const receiverId =
        data.receiverId && (data.receiverId._id || data.receiverId);
      if (!senderId || !receiverId) return;

      // Get current user ID
      const currentUserId = getUserIdFromToken();
      if (!currentUserId) return;

      // Determine conversation partner
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

  // Conversation updated handler
  socket.on("conversation_updated", (data) => {
    if (!isOnMessagePage()) return;

    try {
      const { partnerId } = data;
      if (!partnerId) return;

      const listener = messageListeners.get(partnerId.toString());
      if (listener && listener.onConversationUpdated) {
        listener.onConversationUpdated(partnerId);
      }

      // Dispatch event
      window.dispatchEvent(new CustomEvent("conversation_updated"));
    } catch (error) {
      console.error("Error handling conversation_updated event:", error);
    }
  });

  // Reconnection handler
  socket.on("reconnect", () => {
    if (!isOnMessagePage()) return;

    // Rejoin all active chat rooms
    for (const userId of messageListeners.keys()) {
      joinChatRoom(userId);
    }
  });

  // Mark as having handlers installed
  socket._hasMessageHandlers = true;
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

        // Notify server about client disconnect
        if (socket.connected) {
          socket.emit("client_disconnect");
        }

        socket.disconnect();
        socket = null;
        disconnectReason = null;
        messageListeners.clear();
        userStatusListeners.clear();
        socketConnected = false;
        console.log("Socket connection closed completely");

        // Clear heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
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
  // Only connect socket when on message page
  if (!isOnMessagePage()) {
    console.log(
      "getSocket called outside of message page - avoiding automatic connection"
    );
    return null;
  }

  // Create socket if it doesn't exist
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
  if (!isOnMessagePage()) return;

  const socket = getSocket();
  if (!socket) return;

  socket.emit("join_chat", userId);
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = (userId) => {
  if (!isOnMessagePage()) return;

  const socket = getSocket();
  if (!socket) return;

  socket.emit("leave_chat", userId);
};

/**
 * Subscribe to message events for a specific user
 */
export const subscribeToMessages = (userId, callbacks) => {
  if (!isOnMessagePage()) {
    return () => {}; // Return empty unsubscribe function
  }

  const socket = getSocket();
  if (!socket) {
    console.error("No socket connection available");
    return () => {};
  }

  // Join the chat room
  joinChatRoom(userId);

  // Store callbacks for this userId
  messageListeners.set(userId, callbacks);

  // Make sure message handlers are set up
  setupMessageHandlers();

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
  // Only attempt to restore connection on message pages
  if (!isOnMessagePage()) {
    console.log("Not on message page, skipping socket reconnection");
    return false;
  }

  // If manually disconnected, don't auto reconnect
  if (manuallyDisconnected) {
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
      // Update token before reconnecting
      const token = tokenService.getToken();
      if (token) {
        socket.auth = { token };
      }

      // Try to reconnect
      socket.connect();

      // Dispatch reconnecting event
      window.dispatchEvent(new CustomEvent("socket_reconnecting"));

      return true;
    } catch (error) {
      console.error("Error reconnecting socket:", error);
      return false;
    }
  }

  // Socket is already connected
  return socket && socket.connected;
};

/**
 * Force reconnection
 */
export const forceReconnect = () => {
  if (!isOnMessagePage()) {
    console.log("Not on message page, skipping socket force reconnect");
    return false;
  }

  manuallyDisconnected = false;
  resetConnectionState();
  return initSocket();
};

/**
 * Subscribe to user status changes
 * @param {Function} callback - Function to call when a user's status changes
 * @returns {Function} - Function to unsubscribe
 */
export const subscribeToUserStatus = (callback) => {
  if (!isOnMessagePage() || typeof callback !== "function") {
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

// Handle unload to clean up connections
window.addEventListener("beforeunload", () => {
  try {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
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
  if (document.visibilityState === "visible" && isOnMessagePage()) {
    checkAndRestoreConnection();
  }
});

// Add network status checking to detect connection changes
window.addEventListener("online", () => {
  if (isOnMessagePage()) {
    console.log("Network back online on message page, checking connection");
    checkAndRestoreConnection();
  }
});

window.addEventListener("offline", () => {
  console.warn("Network offline, socket will reconnect when back online");
});

window.addEventListener("focus", () => {
  if (isOnMessagePage()) {
    checkAndRestoreConnection();
  }
});

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
  isOnMessagePage,
};
