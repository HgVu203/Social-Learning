/**
 * Socket service - Cung cấp các chức năng socket cho các component
 */

import * as socketManager from "../socket";

/**
 * Kết nối socket
 * @returns {boolean} Kết quả kết nối
 */
export const connectSocket = () => {
  console.log("Checking if socket connection is needed");

  // Kiểm tra xem có đang ở trang message không
  if (!socketManager.isOnMessagePage()) {
    console.log("Not on messages page, skipping socket connection");
    return false;
  }

  console.log("On messages page, initializing socket connection");
  const socket = socketManager.initSocket();
  return !!socket;
};

/**
 * Ngắt kết nối socket
 * @returns {boolean} Kết quả ngắt kết nối
 */
export const disconnectSocket = () => {
  try {
    socketManager.disconnect();
    return true;
  } catch (error) {
    console.error("Error disconnecting socket:", error);
    return false;
  }
};

/**
 * Kiểm tra socket đã kết nối chưa
 * @returns {boolean} Trạng thái kết nối
 */
export const isSocketConnected = () => {
  return socketManager.isSocketConnected();
};

/**
 * Lấy instance của socket
 * @returns {Object} Socket instance
 */
export const getSocketInstance = () => {
  return socketManager.getSocket();
};

/**
 * Gửi tin nhắn
 * @param {Object} message - Dữ liệu tin nhắn cần gửi
 * @returns {boolean} Kết quả gửi tin nhắn
 */
export const sendMessage = (message) => {
  return socketManager.sendMessage(message);
};

/**
 * Đánh dấu tin nhắn đã đọc
 * @param {Object} data - Dữ liệu tin nhắn cần đánh dấu đã đọc
 * @returns {boolean} Kết quả đánh dấu
 */
export const markMessageAsRead = (data) => {
  return socketManager.markMessageAsRead(data);
};

/**
 * Tham gia phòng chat
 * @param {string} chatId - ID của phòng chat
 * @returns {boolean} Kết quả tham gia
 */
export const joinChatRoom = (chatId) => {
  return socketManager.joinChatRoom(chatId);
};

/**
 * Rời phòng chat
 * @param {string} chatId - ID của phòng chat
 * @returns {boolean} Kết quả rời phòng
 */
export const leaveChatRoom = (chatId) => {
  return socketManager.leaveChatRoom(chatId);
};

/**
 * Bắt đầu gõ tin nhắn
 * @param {string} chatId - ID của phòng chat
 * @returns {boolean} Kết quả bắt đầu gõ
 */
export const startTyping = (chatId) => {
  return socketManager.startTyping(chatId);
};

/**
 * Dừng gõ tin nhắn
 * @param {string} chatId - ID của phòng chat
 * @returns {boolean} Kết quả dừng gõ
 */
export const stopTyping = (chatId) => {
  return socketManager.stopTyping(chatId);
};

/**
 * Lắng nghe tin nhắn mới
 * @param {string} chatId - ID của phòng chat
 * @param {function} callback - Hàm xử lý khi có tin nhắn mới
 * @returns {function} Hàm hủy lắng nghe
 */
export const subscribeToMessages = (chatId, callback) => {
  return socketManager.subscribeToMessages(chatId, callback);
};

/**
 * Lắng nghe trạng thái đang gõ
 * @param {string} chatId - ID của phòng chat
 * @param {function} callback - Hàm xử lý khi có người đang gõ
 * @returns {function} Hàm hủy lắng nghe
 */
export const subscribeToTyping = (chatId, callback) => {
  return socketManager.subscribeToTyping(chatId, callback);
};

/**
 * Lắng nghe trạng thái online/offline
 * @param {function} callback - Hàm xử lý khi có thay đổi trạng thái
 * @returns {function} Hàm hủy lắng nghe
 */
export const subscribeToUserStatus = (callback) => {
  return socketManager.subscribeToUserStatus(callback);
};

/**
 * Buộc kết nối lại socket
 * @returns {boolean} Kết quả kết nối lại
 */
export const forceReconnect = () => {
  if (!socketManager.isOnMessagePage()) {
    console.log("Not on messages page, skipping reconnection");
    return false;
  }

  // Đánh dấu trạng thái đang kết nối lại
  console.log("Forcing socket reconnection...");

  try {
    // Ngắt kết nối hiện tại trước
    socketManager.disconnect();

    // Tạm dừng một chút để đảm bảo kết nối cũ đã đóng hoàn toàn
    setTimeout(() => {
      try {
        // Khởi tạo kết nối mới
        const socket = socketManager.initSocket();

        if (socket) {
          console.log("Socket reconnection successful:", socket.id);

          // Phát sự kiện kết nối thành công nếu chưa được phát từ socket.js
          if (socket.connected) {
            window.dispatchEvent(new CustomEvent("socket_connected"));
          }

          return true;
        } else {
          console.error("Socket reconnection failed - initialization error");

          // Thử lại lần nữa sau 2 giây
          setTimeout(() => {
            console.log("Trying one final connection attempt...");
            socketManager.initSocket();
          }, 2000);

          return false;
        }
      } catch (innerError) {
        console.error("Error during socket reinitialization:", innerError);
        return false;
      }
    }, 500);

    // Trả về true vì đã bắt đầu quá trình kết nối lại
    return true;
  } catch (error) {
    console.error("Error forcing socket reconnection:", error);
    return false;
  }
};

export default {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getSocketInstance,
  sendMessage,
  markMessageAsRead,
  joinChatRoom,
  leaveChatRoom,
  startTyping,
  stopTyping,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToUserStatus,
  forceReconnect,
};
