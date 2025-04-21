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
let disconnectReason = null;
let lastConnectionTime = 0;
let socketConnected = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

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
    socket.disconnect();
    socket = null;
  }
  disconnectReason = null;
  socketConnected = false;
  connectionAttempts = 0;
};

/**
 * Initialize socket connection
 */
export const initSocket = () => {
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
  if (now - lastConnectionTime < 1000) {
    console.log("Throttling socket reconnection attempts");
    return socket;
  }

  // Track connection attempt time
  lastConnectionTime = now;

  // If already connected, return existing socket
  if (socket && socket.connected) {
    console.log("Socket already connected");
    return socket;
  }

  // If socket exists but was disconnected for navigation, just reconnect
  if (socket && disconnectReason === "navigation") {
    console.log("Reconnecting existing socket after navigation");
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
    socket.disconnect();
  }

  // Extract the base URL from the API URL
  const apiUrl = import.meta.env.VITE_API_URL || "";
  const baseUrlMatch = apiUrl.match(/^(https?:\/\/[^/]+)/);
  const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "http://localhost:8000";

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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected successfully", socket.id);
      disconnectReason = null;
      socketConnected = true;
      connectionAttempts = 0;

      // Send authentication immediately on connection - FIX: send token as a string
      socket.emit("authenticate", token);

      // Send user ID for easier server-side user tracking
      socket.emit("identify_user", { userId });
      console.log("User identification sent to socket server:", userId);

      // Dispatch event for reconnection
      window.dispatchEvent(new CustomEvent("socket_reconnected"));
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      socketConnected = false;

      // Dispatch event for socket error
      window.dispatchEvent(
        new CustomEvent("socket_disconnect", {
          detail: { reason: error.message },
        })
      );

      // Don't auto-reconnect if token is invalid
      if (
        error.message === "Authentication error" ||
        error.message.includes("authentication")
      ) {
        socket.disconnect();
        // Don't remove token here as it might be needed for API calls
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
            // FIX: send token as a string
            socket.emit("authenticate", refreshedToken);

            // Also re-identify the user
            const userId = getUserIdFromToken();
            if (userId) {
              socket.emit("identify_user", { userId });
            }

            console.log("Retrying socket authentication");
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

      // If disconnected due to transport close, try to reconnect
      if (reason === "transport close" || reason === "ping timeout") {
        setTimeout(() => {
          if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log("Attempting to reconnect socket after transport close");
            if (socket) socket.connect();
          }
        }, 1000);
      }
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      socketConnected = false;
    });

    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit("ping");
      } else if (
        socket &&
        !socket.connected &&
        connectionAttempts < MAX_RECONNECT_ATTEMPTS
      ) {
        console.log(
          "Ping detected disconnected socket, attempting to reconnect"
        );
        socket.connect();
      }
    }, 15000);

    // Auto-refresh heartbeat to detect stale connections
    const heartbeatInterval = setInterval(() => {
      if (socketConnected && socket && !socket.connected) {
        console.log("Heartbeat detected stale connection, resetting socket");
        socket.disconnect();
        setTimeout(() => {
          if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            socket.connect();
          }
        }, 500);
      }
    }, 20000);

    // Clean up intervals on window unload
    window.addEventListener("beforeunload", () => {
      clearInterval(pingInterval);
      clearInterval(heartbeatInterval);
    });

    return socket;
  } catch (error) {
    console.error("Error initializing socket:", error);
    socketConnected = false;
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
      socket.disconnect();
      socket = null;
      disconnectReason = null;
      commentListeners.clear();
      messageListeners.clear();
      socketConnected = false;
      console.log("Socket connection closed completely");
    }
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }

  // If socket exists but is not connected, try to reconnect
  if (socket && !socket.connected) {
    console.log(
      "Socket instance exists but not connected, trying to reconnect"
    );
    socket.connect();
  }

  return socket;
};

/**
 * Check if socket is currently connected
 */
export const isSocketConnected = () => {
  return socketConnected && socket && socket.connected;
};

/**
 * Join a post room to receive comment events
 */
export const joinPostRoom = (postId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("join_post", postId);
  console.log(`Joined post room: ${postId}`);
};

/**
 * Leave a post room
 */
export const leavePostRoom = (postId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("leave_post", postId);
  console.log(`Left post room: ${postId}`);
};

/**
 * Join a chat room to receive message events
 */
export const joinChatRoom = (userId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("join_chat", userId);
  console.log(`Joined chat room with user: ${userId}`);
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = (userId) => {
  const socket = getSocket();
  if (!socket) return;

  socket.emit("leave_chat", userId);
  console.log(`Left chat room with user: ${userId}`);
};

/**
 * Subscribe to comment events for a specific post
 */
export const subscribeToComments = (postId, callbacks) => {
  const socket = getSocket();
  if (!socket) return null;

  // Join the post room
  joinPostRoom(postId);

  // Store callbacks for this postId
  commentListeners.set(postId, callbacks);

  // Set up the event handlers if they don't exist
  if (!socket._hasCommentHandlers) {
    socket.on("comment_added", (data) => {
      const listener = commentListeners.get(data.postId);
      if (listener && listener.onCommentAdded) {
        listener.onCommentAdded(data.comment);
      }
    });

    socket.on("comment_deleted", (data) => {
      const listener = commentListeners.get(data.postId);
      if (listener && listener.onCommentDeleted) {
        listener.onCommentDeleted(data.commentId);
      }
    });

    socket.on("comment_updated", (data) => {
      const listener = commentListeners.get(data.postId);
      if (listener && listener.onCommentUpdated) {
        listener.onCommentUpdated(data.comment);
      }
    });

    socket.on("comment_liked", (data) => {
      const listener = commentListeners.get(data.postId);
      if (listener && listener.onCommentLiked) {
        // Pass the complete comment data including parentId and isNestedComment flags
        listener.onCommentLiked(data.comment, {
          commentId: data.commentId,
          parentId: data.parentId,
          isNestedComment: data.isNestedComment,
          likesCount: data.likesCount,
          isLiked: data.isLiked,
          postId: data.postId,
        });
      }
    });

    socket._hasCommentHandlers = true;
  }

  // Return an unsubscribe function
  return () => {
    commentListeners.delete(postId);
    leavePostRoom(postId);
  };
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

  console.log(`Subscribing to messages for user ${userId}`);

  // Store callbacks for this userId
  messageListeners.set(userId, callbacks);

  // Set up the event handlers if they don't exist
  if (!socket._hasMessageHandlers) {
    // CRITICAL FIX: Add direct new message handler for immediate updates
    socket.on("new_message_received", (data) => {
      try {
        console.log("✅ DIRECT message received event:", data);
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
        console.log("Received message_sent event:", data);

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

        console.log("Current user ID for message processing:", currentUserId);

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
        console.log("Received message_read event:", data);

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
        console.error("Error handling message_read event:", error, data);
      }
    });

    socket.on("message_deleted", (data) => {
      try {
        console.log("Received message_deleted event:", data);

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
        console.error("Error handling message_deleted event:", error, data);
      }
    });

    socket.on("conversation_updated", (data) => {
      try {
        console.log("Received conversation_updated event:", data);

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
        console.error(
          "Error handling conversation_updated event:",
          error,
          data
        );
      }
    });

    // Add reconnection logic for message rooms
    socket.on("reconnect", () => {
      console.log("Socket reconnected, rejoining message rooms");
      // Rejoin all active chat rooms
      for (const userId of messageListeners.keys()) {
        joinChatRoom(userId);
      }
    });

    socket._hasMessageHandlers = true;
  }

  // Return an unsubscribe function
  return () => {
    console.log(`Unsubscribing from messages for user ${userId}`);
    messageListeners.delete(userId);
    leaveChatRoom(userId);
  };
};

export default {
  initSocket,
  getSocket,
  closeSocket,
  joinPostRoom,
  leavePostRoom,
  joinChatRoom,
  leaveChatRoom,
  subscribeToComments,
  subscribeToMessages,
  isSocketConnected,
};
