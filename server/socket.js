import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Variable to hold the socket.io instance
let io = null;

// Track online users with Map of userId -> socketId
const onlineUsers = new Map();

// Last ping times for each user
const lastPingTimes = new Map();

// Helper function to publish online status to friends
const publishOnlineStatus = async (userId, isOnline) => {
  try {
    console.log(`User ${userId} is now ${isOnline ? "online" : "offline"}`);

    // Broadcast the status change to all connected clients
    if (io) {
      // Broadcast to everyone
      io.emit("user_status_change", {
        userId: userId,
        isOnline: isOnline,
      });

      console.log(
        `Broadcasted online status: ${userId} is ${
          isOnline ? "online" : "offline"
        }`
      );
    } else {
      console.warn("Socket.io not initialized, cannot emit user status change");
    }
  } catch (error) {
    console.error("Error publishing online status:", error);
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
    pingTimeout: 60000, // Increased to 60 seconds
    pingInterval: 25000, // Increased to 25 seconds
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e8,
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 32768,
    },
    connectTimeout: 45000, // 45 seconds timeout for connection
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle client pings to monitor connection health
    socket.on("client_ping", (data, callback) => {
      // Update last ping time
      if (socket.userId) {
        lastPingTimes.set(socket.userId, Date.now());
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

    // Store user ID for reference
    socket.on("authenticate", (token) => {
      try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decodedToken.userId;

        // Join the user's personal room
        socket.join(socket.userId);

        // Add to the online users list
        onlineUsers.set(socket.userId, socket.id);

        // Set initial ping time
        lastPingTimes.set(socket.userId, Date.now());

        // Emit authentication success
        socket.emit("authentication_success", { userId: socket.userId });

        // Emit online status change to friends
        publishOnlineStatus(socket.userId, true);
      } catch (error) {
        console.error("Socket authentication failed:", error);
        socket.emit("authentication_failed", {
          message: "Authentication failed",
        });
      }
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

    // Handle explicit client disconnect
    socket.on("client_disconnect", () => {
      console.log(`Client initiated disconnect: ${socket.id}`);
      if (socket.userId) {
        // Remove from online users
        onlineUsers.delete(socket.userId);
        lastPingTimes.delete(socket.userId);

        // Publish offline status to friends
        publishOnlineStatus(socket.userId, false);
      }
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);

      if (socket.userId) {
        // Remove from online users
        onlineUsers.delete(socket.userId);
        lastPingTimes.delete(socket.userId);

        // Publish offline status to friends
        publishOnlineStatus(socket.userId, false);
      }
    });
  });

  // Periodic cleanup of stale connections reduced to 5 minutes (instead of 30s)
  setInterval(() => {
    const now = Date.now();
    const staleTimeout = 300000; // 5 minutes without ping

    lastPingTimes.forEach((lastPing, userId) => {
      if (now - lastPing > staleTimeout) {
        console.log(`Removing stale connection for user ${userId}`);

        // Get socket ID
        const socketId = onlineUsers.get(userId);
        if (socketId) {
          // Get socket instance
          const socket = io.sockets.sockets.get(socketId);
          if (socket) {
            // Disconnect the socket
            socket.disconnect(true);
          }
        }

        // Clean up
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
 * Emit comment events to connected clients
 */
export const emitCommentEvent = (eventType, postId, data) => {
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit comment event");
    return;
  }

  // Emit to the specific post room
  io.to(`post:${postId}`).emit(eventType, data);

  // Also emit to the post owner's room if applicable
  if (data.postOwnerId) {
    io.to(data.postOwnerId).emit(eventType, data);
  }
};

/**
 * Emit message events to connected clients
 */
export const emitMessageEvent = (eventType, message) => {
  if (!io) {
    console.warn("Socket.io not initialized, cannot emit message event");
    return;
  }

  try {
    // Make sure we're working with strings to prevent type mismatches
    const senderId =
      message.senderId && (message.senderId._id || message.senderId).toString();
    const receiverId =
      message.receiverId &&
      (message.receiverId._id || message.receiverId).toString();

    if (!senderId || !receiverId) {
      console.warn("Missing sender or receiver ID in message:", message);
      return;
    }

    console.log(`Emitting ${eventType} from ${senderId} to ${receiverId}`);

    // Create a unique room name for the chat (sorted user IDs to ensure consistency)
    const participants = [senderId, receiverId].sort();
    const roomName = `chat:${participants.join("-")}`;

    // Log that we're emitting to a specific chat room
    console.log(`Emitting to chat room: ${roomName}`);

    // CRITICAL FIX: Get the socket IDs for sender and receiver
    const senderSocketId = onlineUsers.get(senderId);
    const receiverSocketId = onlineUsers.get(receiverId);

    // Emit to the specific chat room
    io.to(roomName).emit(eventType, message);

    // Also emit to individual users' rooms for notifications
    io.to(senderId).emit(eventType, message);
    io.to(receiverId).emit(eventType, message);

    // CRITICAL FIX: Emit directly to specific socket connections for immediate update
    if (senderSocketId) {
      io.to(senderSocketId).emit(eventType, message);
    }

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(eventType, message);
      // Also emit to receiver that this is a new message specifically for them
      io.to(receiverSocketId).emit("new_message_received", {
        message,
        fromId: senderId,
      });
    }

    // Emit conversation_updated to both users
    io.to(senderId).emit("conversation_updated", { partnerId: receiverId });
    io.to(receiverId).emit("conversation_updated", { partnerId: senderId });

    return true;
  } catch (error) {
    console.error("Error emitting message event:", error);
    return false;
  }
};

/**
 * Check if a user is online
 * @param {string} userId - User ID to check
 * @returns {boolean} - Whether the user is online
 */
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

/**
 * Get online users
 * @returns {Array} - Array of online user IDs
 */
export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};

export default {
  initSocketServer,
  getIO,
  emitCommentEvent,
  emitMessageEvent,
  isUserOnline,
  getOnlineUsers,
};
