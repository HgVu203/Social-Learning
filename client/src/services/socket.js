/**
 * Socket service - Chuyển tiếp các chức năng socket từ module chính
 * Lưu ý: File này chỉ là wrapper để tương thích ngược với code cũ
 * Khuyến nghị sử dụng trực tiếp module socket.js thay vì qua service này
 */

import * as socketManager from "../socket";

// Re-export các hàm cần thiết
export const {
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
} = socketManager;

// Functions duy trì tương thích ngược
export const connectSocket = () => {
  if (!isOnMessagePage()) {
    console.log("Not on messages page, skipping socket connection");
    return false;
  }
  return !!initSocket();
};

export const disconnectSocket = disconnect;
export const getSocketInstance = getSocket;

// Default export cho tương thích với code cũ
export default {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getSocketInstance,
  sendMessage,
  markMessageAsRead,
  joinChatRoom,
  leaveChatRoom,
  subscribeToMessages,
  subscribeToUserStatus,
  getPendingMessages,
  trackMessageDelivery,
  isUserOnline,
  requestOnlineStatus,
};
