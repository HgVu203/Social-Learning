/**
 * Socket.io connection utilities
 */

// Uncomment these imports for socket connection
import io from "socket.io-client";
import tokenService from "./services/tokenService";

let socket = null;
let commentListeners = new Map();

/**
 * Initialize socket connection
 */
export const initSocket = () => {
  if (socket) {
    // Close existing socket connection
    socket.disconnect();
  }

  // Get auth token
  const token = tokenService.getToken();

  if (!token) {
    console.warn("Cannot initialize socket without authentication token");
    return null;
  }

  // Extract the base URL from the API URL
  const apiUrl = import.meta.env.VITE_API_URL || "";
  // Extract the protocol and domain from the API URL
  const baseUrlMatch = apiUrl.match(/^(https?:\/\/[^/]+)/);
  const baseUrl = baseUrlMatch ? baseUrlMatch[1] : "http://localhost:8080";

  console.log("Socket connecting to:", baseUrl);

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
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      // Don't auto-reconnect if token is invalid
      if (error.message === "Authentication error") {
        socket.disconnect();
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    return socket;
  } catch (error) {
    console.error("Error initializing socket:", error);
    return null;
  }
};

/**
 * Close socket connection
 */
export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket connection closed");
  }
};

/**
 * Get socket instance
 */
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
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

export default {
  initSocket,
  getSocket,
  closeSocket,
  joinPostRoom,
  leavePostRoom,
  subscribeToComments,
};
