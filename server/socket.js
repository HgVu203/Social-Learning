import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Variable to hold the socket.io instance
let io = null;

// Track online users with Map of userId -> socketId
const onlineUsers = new Map();

// Track users who are connected by multiple devices/tabs
const userSockets = new Map(); // userId -> Set of socketIds

// Track socket to user mapping for quick lookup
const socketToUser = new Map(); // socketId -> userId

// Last ping times for each user
const lastPingTimes = new Map();

/**
 * Helper function to verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token data or null if invalid
 */
const verifyToken = (token) => {
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
};

/**
 * Helper function to publish online status to friends
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Online status
 */
const publishOnlineStatus = async (userId, isOnline) => {
  try {
    if (!userId || !io) return;

    console.log(`User ${userId} is now ${isOnline ? "online" : "offline"}`);

    // Broadcast the status change to all connected clients
    io.emit("user_status_change", {
      userId: userId,
      isOnline: isOnline,
      lastActive: Date.now(),
    });

    console.log(
      `Broadcasted online status: ${userId} is ${
        isOnline ? "online" : "offline"
      }`
    );
  } catch (error) {
    console.error("Error publishing online status:", error);
  }
};

/**
 * Handle socket disconnection
 * @param {Object} socket - Socket.io socket object
 * @param {string} reason - Disconnection reason
 */
const handleDisconnect = (socket, reason) => {
  console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

  const userId = socket.userId;

  if (userId) {
    // Remove this socket from the user's sockets
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);

      // If user has no more active connections, mark as offline
      if (userSockets.get(userId).size === 0) {
        onlineUsers.delete(userId);
        lastPingTimes.delete(userId);
        userSockets.delete(userId);

        // Publish offline status to friends
        publishOnlineStatus(userId, false);
      }
    } else {
      // For backward compatibility
      onlineUsers.delete(userId);
      lastPingTimes.delete(userId);

      // Publish offline status to friends
      publishOnlineStatus(userId, false);
    }

    // Remove from socketToUser mapping
    socketToUser.delete(socket.id);
  }
};

/**
 * Authenticate a socket connection
 * @param {Object} socket - Socket.io socket
 * @param {string} token - JWT token
 * @returns {boolean} Success status
 */
const authenticateSocket = (socket, token) => {
  try {
    // Skip if already authenticated
    if (socket.userId) return true;

    // Verify token
    const decodedToken = verifyToken(token);

    if (!decodedToken || !decodedToken.userId) {
      socket.emit("authentication_failed", {
        message: "Invalid authentication token",
      });
      return false;
    }

    const userId = decodedToken.userId;

    // Store user ID in socket
    socket.userId = userId;

    // Join the user's personal room
    socket.join(userId);

    // Add to the online users
    onlineUsers.set(userId, socket.id);

    // Add to userSockets map for multiple connections tracking
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Track socket to user mapping
    socketToUser.set(socket.id, userId);

    // Set initial ping time
    lastPingTimes.set(userId, Date.now());

    // Emit authentication success
    socket.emit("authentication_success", { userId });

    // Publish online status to friends
    publishOnlineStatus(userId, true);

    // Send current online status of all users to this socket
    const onlineUsersList = [...onlineUsers.keys()];
    socket.emit("online_users_list", onlineUsersList);

    console.log(
      `User ${userId} authenticated successfully via socket ${socket.id}`
    );
    return true;
  } catch (error) {
    console.error("Socket authentication failed:", error);
    socket.emit("authentication_failed", {
      message: "Authentication failed",
    });
    return false;
  }
};

/**
 * Initialize socket.io server
 * @param {Object} server - HTTP server instance
 */
export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 120000, // Tăng từ 60000 lên 120000 (2 phút)
    pingInterval: 30000, // Tăng từ 25000 lên 30000 (30 giây)
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 32768,
    },
    connectTimeout: 60000, // Tăng từ 45000 lên 60000 (60 giây timeout cho connection)
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle client pings to monitor connection health
    socket.on("client_ping", (data, callback) => {
      // Update last ping time
      if (socket.userId) {
        lastPingTimes.set(socket.userId, Date.now());

        // Kiểm tra nếu user đang không có trong danh sách online thì thêm vào
        if (!onlineUsers.has(socket.userId)) {
          console.log(`[Socket] User ${socket.userId} reconnected via ping`);
          onlineUsers.set(socket.userId, socket.id);

          // Nếu chưa có trong userSockets, thêm vào
          if (!userSockets.has(socket.userId)) {
            userSockets.set(socket.userId, new Set());
          }
          userSockets.get(socket.userId).add(socket.id);

          // Thông báo user online
          publishOnlineStatus(socket.userId, true);
        }
      }

      // Send response to the client
      if (typeof callback === "function") {
        callback({ time: Date.now(), received: true });
      } else {
        socket.emit("server_pong", {
          timestamp: data?.timestamp || Date.now(),
        });
      }
    });

    // Handle authentication
    socket.on("authenticate", (token) => {
      authenticateSocket(socket, token);
    });

    // Handle ping-pong to keep connection alive
    socket.on("ping", () => {
      socket.emit("pong");

      // Update last ping time
      if (socket.userId) {
        lastPingTimes.set(socket.userId, Date.now());
      }
    });

    // Join chat room
    socket.on("join_chat", (partnerId) => {
      if (!socket.userId) {
        console.warn("Unauthenticated socket trying to join chat room");
        socket.emit("auth_error", { message: "Authentication required" });
        return;
      }

      try {
        const participants = [socket.userId, partnerId].sort();
        const roomName = `chat:${participants.join("-")}`;
        socket.join(roomName);
        console.log(`User ${socket.userId} joined chat room ${roomName}`);

        // Send acknowledgment
        socket.emit("chat_joined", { roomName, partnerId });
      } catch (error) {
        console.error("Error joining chat room:", error);
        socket.emit("error", { message: "Failed to join chat room" });
      }
    });

    // Leave chat room
    socket.on("leave_chat", (partnerId) => {
      if (!socket.userId) return;

      try {
        const participants = [socket.userId, partnerId].sort();
        const roomName = `chat:${participants.join("-")}`;
        socket.leave(roomName);
        console.log(`User ${socket.userId} left chat room ${roomName}`);
      } catch (error) {
        console.error("Error leaving chat room:", error);
      }
    });

    // Handle message sending
    socket.on("send_message", (messageData) => {
      if (!socket.userId) {
        socket.emit("error", { message: "Authentication required" });
        return;
      }

      try {
        // Create chat room ID from participants
        const participants = [
          messageData.senderId,
          messageData.receiverId,
        ].sort();
        const roomName = `chat:${participants.join("-")}`;

        // Add received timestamp to the message
        const messageWithTimestamp = {
          ...messageData,
          receivedByServer: Date.now(),
          status: "sent",
        };

        // Emit to the room (both sender and receiver)
        io.to(roomName).emit("new_message", messageWithTimestamp);

        // Also emit to the receiver's personal room in case they're not in the chat room
        io.to(messageData.receiverId).emit(
          "new_message_notification",
          messageWithTimestamp
        );

        // Confirm to the sender that message was received by server
        socket.emit("message_delivered", {
          messageId: messageData._id || messageData.tempId,
          status: "delivered_to_server",
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Error handling send_message event:", error);
        socket.emit("message_error", {
          messageId: messageData._id || messageData.tempId,
          error: "Failed to process message",
        });
      }
    });

    // Handle message read receipt
    socket.on("mark_read", ({ messageId, chatId, senderId }) => {
      if (!socket.userId) return;

      try {
        // Emit to the message sender
        io.to(senderId).emit("message_status_update", {
          messageId,
          chatId,
          status: "read",
          readBy: socket.userId,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error("Error handling mark_read event:", error);
      }
    });

    // Handle post room subscription
    socket.on("join_post", (postId) => {
      if (!socket.userId) {
        console.warn("Unauthenticated socket trying to join post room");
        socket.emit("auth_error", { message: "Authentication required" });
        return;
      }
      socket.join(`post:${postId}`);
      console.log(`User ${socket.userId} joined post room for post ${postId}`);
    });

    socket.on("leave_post", (postId) => {
      if (!socket.userId) return;
      socket.leave(`post:${postId}`);
    });

    // Request current online status
    socket.on("get_online_status", (userIds) => {
      if (!socket.userId) return;

      try {
        const statusMap = {};
        if (Array.isArray(userIds)) {
          userIds.forEach((id) => {
            statusMap[id] = userSockets.has(id) || onlineUsers.has(id);
          });
        }
        socket.emit("online_status_response", statusMap);
      } catch (error) {
        console.error("Error handling get_online_status:", error);
      }
    });

    // Handle explicit client disconnect
    socket.on("client_disconnect", () => {
      console.log(`Client initiated disconnect: ${socket.id}`);
      handleDisconnect(socket, "client_disconnect");
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      handleDisconnect(socket, reason);
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    const now = Date.now();
    const staleTimeout = 300000; // 5 minutes without ping

    lastPingTimes.forEach((lastPing, userId) => {
      if (now - lastPing > staleTimeout) {
        console.log(`Removing stale connection for user ${userId}`);

        // Get socket IDs for this user
        const socketIds = userSockets.get(userId);
        if (socketIds) {
          // Disconnect all sockets for this user
          socketIds.forEach((socketId) => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
              socket.disconnect(true);
            }

            // Remove from socket mappings
            socketToUser.delete(socketId);
          });

          // Clean up
          userSockets.delete(userId);
        }

        // Also cleanup from onlineUsers for safety
        onlineUsers.delete(userId);
        lastPingTimes.delete(userId);

        // Publish offline status
        publishOnlineStatus(userId, false);
      }
    });
  }, 300000); // Every 5 minutes (300000ms)

  // Start connection check mechanism - Probe connections every 2 minutes
  setInterval(() => {
    // Check all connected sockets
    io.sockets.sockets.forEach((socket) => {
      if (socket.userId) {
        // Update last ping time
        lastPingTimes.set(socket.userId, Date.now());

        // Send ping directly to client
        socket.emit("server_probe", { timestamp: Date.now() });
      }
    });
  }, 120000); // Every 2 minutes

  return io;
};

/**
 * Get the socket.io instance
 * @returns {Object} - Socket.io instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

/**
 * Emit message events to relevant users
 * @param {string} eventType - Event type
 * @param {Object} message - Message object
 */
export const emitMessageEvent = (eventType, message) => {
  try {
    if (!io) {
      console.warn("Socket.io not initialized, cannot emit message event");
      return;
    }

    if (!message) {
      console.warn("Cannot emit message event: No message provided");
      return;
    }

    // Get essential IDs
    const senderId = message.senderId?._id || message.senderId;
    const receiverId = message.receiverId?._id || message.receiverId;

    if (!senderId || !receiverId) {
      console.warn("Missing sender or receiver ID in message", message);
      return;
    }

    // Create room name for the conversation
    const participants = [senderId, receiverId].sort();
    const chatRoomId = `chat:${participants.join("-")}`;

    // Prepare the message data
    const messageData = {
      ...message,
      _id: message._id?.toString(),
      chatId: chatRoomId,
    };

    // Emit event to the chat room
    io.to(chatRoomId).emit(eventType, messageData);

    // Also emit to sender and receiver personal rooms for cases when they're not in the chat room
    if (eventType === "message_sent" || eventType === "new_message") {
      // Always notify receiver about new messages
      io.to(receiverId).emit("new_message_notification", messageData);

      // If message status is updated, notify both users
      io.to(senderId).emit("message_status_update", messageData);

      console.log(`Emitted ${eventType} event to chat ${chatRoomId}`);
    } else if (eventType === "message_read") {
      // Notify both users about read status
      io.to(senderId).emit("message_status_update", {
        ...messageData,
        status: "read",
      });
    }
  } catch (error) {
    console.error(`Error emitting ${eventType} event:`, error);
  }
};

/**
 * Emit comment events to post subscribers
 * @param {string} eventType - Event type
 * @param {string} postId - Post ID
 * @param {Object} data - Event data
 */
export const emitCommentEvent = (eventType, postId, data) => {
  try {
    if (!io) {
      console.warn("Socket.io not initialized, cannot emit comment event");
      return;
    }

    const roomName = `post:${postId}`;
    io.to(roomName).emit(eventType, { postId, ...data });
    console.log(`Emitted ${eventType} event to post ${postId}`);
  } catch (error) {
    console.error(`Error emitting ${eventType} event:`, error);
  }
};

/**
 * Check if a user is online
 * @param {string} userId - User ID
 * @returns {boolean} - Whether the user is online
 */
export const isUserOnline = (userId) => {
  return userSockets.has(userId) || onlineUsers.has(userId);
};

/**
 * Get list of online users
 * @returns {Array} - Array of user IDs
 */
export const getOnlineUsers = () => {
  return [...onlineUsers.keys()];
};

/**
 * Emit notification event to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification data
 */
export const emitNotificationEvent = (userId, notification) => {
  if (!io) return;

  console.log(`Emitting notification to user ${userId}`);

  // Send to all socket instances of this user
  if (userSockets.has(userId)) {
    io.to(userId).emit("new_notification", notification);
  }
};

export default {
  initSocketServer,
  getIO,
  emitCommentEvent,
  emitMessageEvent,
  isUserOnline,
  getOnlineUsers,
  emitNotificationEvent,
};
