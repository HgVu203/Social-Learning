import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// Variable to hold the socket.io instance
let io = null;

/**
 * Initialize socket.io server
 * @param {Object} httpServer - HTTP server instance
 */
export const initSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL,
        "http://localhost:3000",
        "http://localhost:5173",
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    },
    transports: ["websocket", "polling"],
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token is required to connect to socket server"));
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });

  // Socket connection event
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}, socketId: ${socket.id}`);

    // Join a room named after the user ID
    socket.join(socket.userId);

    // Join post-specific rooms when user requests
    socket.on("join_post", (postId) => {
      socket.join(`post:${postId}`);
      console.log(`User ${socket.userId} joined post room: post:${postId}`);
    });

    // Leave post-specific rooms
    socket.on("leave_post", (postId) => {
      socket.leave(`post:${postId}`);
      console.log(`User ${socket.userId} left post room: post:${postId}`);
    });

    // Listen for socket disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.userId}, reason: ${reason}`);
    });

    // Handle error
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

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

  console.log(`Emitting ${eventType} for post ${postId}`);

  // Emit to the specific post room
  io.to(`post:${postId}`).emit(eventType, data);

  // Also emit to the post owner's room if applicable
  if (data.postOwnerId) {
    io.to(data.postOwnerId).emit(eventType, data);
  }
};

export default {
  initSocketServer,
  getIO,
  emitCommentEvent,
};
