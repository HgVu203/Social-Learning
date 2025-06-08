import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import * as socketService from "../socket";

// Tạo Socket Context
const SocketContext = createContext({
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
  subscribeToMessages: () => () => {},
  subscribeToUserStatus: () => () => {},
});

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const connectionCheckTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastReconnectAttemptRef = useRef(0);
  const MIN_RECONNECT_INTERVAL = 5000; // 5 giây giữa các lần thử kết nối

  // Hàm debounce kết nối
  const debouncedConnect = useCallback(() => {
    const now = Date.now();
    // Nếu đã kết nối gần đây, không cố gắng kết nối lại
    if (now - lastReconnectAttemptRef.current < MIN_RECONNECT_INTERVAL) {
      console.log("Too soon to reconnect, skipping");
      return;
    }

    // Cập nhật thời gian thử kết nối gần nhất
    lastReconnectAttemptRef.current = now;

    // Xóa timeout cũ nếu có
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Thiết lập timeout mới
    reconnectTimeoutRef.current = setTimeout(() => {
      if (socketService.isOnMessagePage()) {
        console.log("SocketContext: Attempting reconnect after delay");
        const socket = socketService.initSocket();
        setIsConnected(!!socket && socket.connected);
      }
    }, 500); // Chờ 500ms trước khi thực sự kết nối
  }, []);

  // Khởi tạo kết nối socket khi user đăng nhập và ở trang message
  useEffect(() => {
    // Nếu chưa đăng nhập hoặc không có user, không làm gì cả
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      return;
    }

    // Theo dõi sự kiện kết nối/ngắt kết nối
    const handleConnected = () => {
      console.log("Socket connected event received in context");
      setIsConnected(true);
    };

    const handleDisconnected = () => {
      console.log("Socket disconnected event received in context");
      setIsConnected(false);
    };

    // Đăng ký lắng nghe sự kiện kết nối/ngắt kết nối
    window.addEventListener("socket_connected", handleConnected);
    window.addEventListener("socket_disconnected", handleDisconnected);

    // Kiểm tra và kết nối socket nếu đang ở trang message
    const checkAndConnect = () => {
      if (socketService.isOnMessagePage()) {
        console.log("SocketContext: On message page, checking connection");
        const currentStatus = socketService.isSocketConnected();

        // Nếu không kết nối, thử kết nối lại
        if (!currentStatus) {
          console.log("SocketContext: Not connected, attempting to connect");
          debouncedConnect();
        } else {
          setIsConnected(true);
        }
      }
    };

    // Kiểm tra kết nối ban đầu
    checkAndConnect();

    // Thiết lập kiểm tra định kỳ - giảm tần suất kiểm tra xuống 60 giây
    connectionCheckTimerRef.current = setInterval(() => {
      if (socketService.isOnMessagePage()) {
        const currentStatus = socketService.isSocketConnected();
        if (isConnected !== currentStatus) {
          setIsConnected(currentStatus);

          // Nếu không còn kết nối, thử kết nối lại
          if (!currentStatus) {
            console.log("SocketContext: Connection lost, trying to reconnect");
            debouncedConnect();
          }
        }
      } else if (isConnected) {
        // Không ở trang message, ngắt kết nối nếu đang kết nối
        console.log("SocketContext: Left message page, disconnecting");
        socketService.disconnect();
        setIsConnected(false);
      }
    }, 60000); // Kiểm tra mỗi 60 giây thay vì 30 giây

    // Kiểm tra khi tab trở nên active
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        socketService.isOnMessagePage()
      ) {
        const currentStatus = socketService.isSocketConnected();
        setIsConnected(currentStatus);

        if (!currentStatus) {
          console.log("SocketContext: Tab active, reconnecting socket");
          debouncedConnect();
        }
      }
    };

    // Kiểm tra khi có thay đổi về network
    const handleNetworkChange = () => {
      if (navigator.onLine && socketService.isOnMessagePage()) {
        console.log("SocketContext: Network changed, checking connection");
        // Tăng delay để đảm bảo network đã ổn định
        setTimeout(() => {
          const currentStatus = socketService.isSocketConnected();
          if (!currentStatus) {
            console.log("SocketContext: Network recovered, reconnecting");
            debouncedConnect();
          }
        }, 3000); // Tăng từ 1s lên 3s
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleNetworkChange);

    // Cleanup khi unmount
    return () => {
      window.removeEventListener("socket_connected", handleConnected);
      window.removeEventListener("socket_disconnected", handleDisconnected);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleNetworkChange);

      if (connectionCheckTimerRef.current) {
        clearInterval(connectionCheckTimerRef.current);
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Ngắt kết nối socket khi unmount
      socketService.disconnect();
    };
  }, [isAuthenticated, user, isConnected, debouncedConnect]);

  // Kết nối socket
  const connect = useCallback(() => {
    if (!socketService.isOnMessagePage()) return false;

    try {
      debouncedConnect();
      // Trả về trạng thái hiện tại, debouncedConnect sẽ cập nhật sau
      return isConnected;
    } catch (error) {
      console.error("Error connecting socket from context:", error);
      setIsConnected(false);
      return false;
    }
  }, [debouncedConnect, isConnected]);

  // Ngắt kết nối socket
  const disconnect = useCallback(() => {
    try {
      const result = socketService.disconnect();
      setIsConnected(false);
      return result;
    } catch (error) {
      console.error("Error disconnecting socket from context:", error);
      setIsConnected(false);
      return false;
    }
  }, []);

  // Tham gia phòng chat
  const joinChat = useCallback(
    (chatId) => {
      if (!chatId) return false;

      // Đảm bảo đã kết nối trước khi tham gia phòng chat
      if (!isConnected) {
        const connected = connect();
        if (!connected) return false;
      }

      return socketService.joinChatRoom(chatId);
    },
    [isConnected, connect]
  );

  // Rời phòng chat
  const leaveChat = useCallback(
    (chatId) => {
      if (!chatId || !isConnected) return false;
      return socketService.leaveChatRoom(chatId);
    },
    [isConnected]
  );

  // Gửi tin nhắn
  const sendMessage = useCallback(
    (message) => {
      // Đảm bảo đã kết nối trước khi gửi tin nhắn
      if (!isConnected) {
        const connected = connect();
        if (!connected) return null;
      }

      return socketService.sendMessage(message);
    },
    [isConnected, connect]
  );

  // Đánh dấu tin nhắn đã đọc
  const markAsRead = useCallback(
    (data) => {
      if (!isConnected) return false;
      return socketService.markMessageAsRead(data);
    },
    [isConnected]
  );

  // Lắng nghe tin nhắn mới
  const subscribeToMessages = useCallback((chatId, callback) => {
    if (!chatId) return () => {};
    return socketService.subscribeToMessages(chatId, callback);
  }, []);

  // Lắng nghe trạng thái online/offline
  const subscribeToUserStatus = useCallback((callback) => {
    if (!callback) return () => {};
    return socketService.subscribeToUserStatus(callback);
  }, []);

  // Value object cho context
  const value = {
    isConnected,
    connect,
    disconnect,
    joinChat,
    leaveChat,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    subscribeToUserStatus,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
