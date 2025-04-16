import { io } from "socket.io-client";
import tokenService from "./tokenService";

// Lấy URL từ biến môi trường với cơ chế dự phòng
const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
const SOCKET_URL = apiUrl.replace("/api", "");

console.log("Socket URL configuration:", SOCKET_URL);

// Tạo kết nối socket đến server
const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 30000,
  transports: ["websocket", "polling"],
});

// Xử lý các sự kiện socket
socket.on("connect", () => {
  console.log("Socket connected successfully with ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err.message);
  if (err.message.includes("Authentication error")) {
    // Token failure - no need to retry
    socket.disconnect();
    console.warn("Socket authentication failed - token may be invalid");
  } else {
    // Other errors may be temporary - continue retrying
    console.warn("Will retry socket connection...");
  }
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("error", (error) => {
  console.error("Socket general error:", error);
});

// Hàm kết nối socket
export const connectSocket = (token) => {
  try {
    // Nếu không có token được truyền vào, thử lấy từ localStorage
    if (!token) {
      token = tokenService.getToken();
      console.log(
        "Token not provided, retrieved from localStorage:",
        token ? "Found" : "Not found"
      );
    }

    if (!token) {
      console.error("Token is required to connect to socket server");
      return false;
    }

    // Kiểm tra định dạng token
    if (token.trim() === "" || token === "undefined" || token === "null") {
      console.error("Invalid token format:", token);
      return false;
    }

    // Kiểm tra nếu socket đã kết nối thì không cần kết nối lại
    if (socket.connected) {
      console.log("Socket is already connected");
      return true;
    }

    // Trước khi kết nối, ngắt kết nối cũ nếu có
    if (socket.connected) {
      socket.disconnect();
    }

    // Thêm token vào auth options
    socket.auth = { token };

    console.log("Connecting socket with token...");
    socket.connect();

    // Kiểm tra timeout để báo nếu kết nối không thành công sau khoảng thời gian
    const timeoutId = setTimeout(() => {
      if (!socket.connected) {
        console.warn("Socket connection timed out after 15 seconds");
        // Tự động thử kết nối lại nếu không thành công
        if (!socket.connected) {
          console.log("Attempting to reconnect socket...");
          socket.connect();
        }
      }
    }, 15000);

    // Clear timeout nếu kết nối thành công
    socket.on("connect", () => {
      clearTimeout(timeoutId);
    });

    return true;
  } catch (error) {
    console.error("Error connecting socket:", error);
    return false;
  }
};

// Hàm ngắt kết nối socket
export const disconnectSocket = () => {
  try {
    // Kiểm tra nếu socket chưa kết nối thì không cần ngắt kết nối
    if (!socket.connected) {
      console.log("Socket is already disconnected");
      return true;
    }

    socket.disconnect();
    return true;
  } catch (error) {
    console.error("Error disconnecting socket:", error);
    return false;
  }
};

// Kiểm tra trạng thái kết nối socket
export const isSocketConnected = () => {
  return socket.connected;
};

export default socket;
