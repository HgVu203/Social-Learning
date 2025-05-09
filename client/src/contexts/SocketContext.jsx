import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import socketService from "../services/socket";
import { isOnMessagePage } from "../socket";

// Tạo Socket Context
const SocketContext = createContext({
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
  startTyping: () => {},
  stopTyping: () => {},
  subscribeToMessages: () => () => {},
  subscribeToTyping: () => () => {},
  subscribeToUserStatus: () => () => {},
});

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const reconnectTimerRef = useRef(null);
  const checkConnectionTimerRef = useRef(null);

  // Khởi tạo kết nối socket khi user đăng nhập và ở trang message
  useEffect(() => {
    let unsubscribe = null;

    const setupSocket = () => {
      try {
        if (isAuthenticated && user) {
          console.log("Initializing socket connection from context");

          // Kiểm tra nếu đang ở trang message thì kết nối ngay
          if (isOnMessagePage()) {
            console.log("On messages page, connecting socket immediately");
            // Kết nối socket
            const socket = socketService.connectSocket();
            // Cập nhật trạng thái kết nối
            setIsConnected(!!socket);

            // Thử kết nối lại sau 2 giây nếu không thành công
            if (!socket) {
              setTimeout(() => {
                console.log("Trying to reconnect after 2 seconds...");
                const reconnected = socketService.forceReconnect();
                setIsConnected(reconnected);
              }, 2000);
            }
          }

          // Theo dõi sự kiện kết nối/ngắt kết nối
          const handleConnected = () => {
            console.log("Socket connected - Context updated");
            setIsConnected(true);
          };

          const handleDisconnected = () => {
            console.log("Socket disconnected - Context updated");
            setIsConnected(false);
          };

          window.addEventListener("socket_connected", handleConnected);
          window.addEventListener("socket_disconnected", handleDisconnected);

          unsubscribe = () => {
            window.removeEventListener("socket_connected", handleConnected);
            window.removeEventListener(
              "socket_disconnected",
              handleDisconnected
            );
          };
        }
      } catch (error) {
        console.error("Lỗi khởi tạo socket từ context:", error);
        setIsConnected(false);
      }
    };

    setupSocket();

    // Kiểm tra kết nối định kỳ
    checkConnectionTimerRef.current = setInterval(() => {
      if (isAuthenticated && user && isOnMessagePage()) {
        const socketActive = socketService.isSocketConnected();

        // Cập nhật trạng thái nếu có sự khác biệt
        if (isConnected !== socketActive) {
          console.log(
            `[SocketContext] Connection status: ${
              socketActive ? "connected" : "disconnected"
            }`
          );
          setIsConnected(socketActive);
        }

        // Thử kết nối lại nếu chưa được kết nối
        if (!socketActive) {
          console.log("[SocketContext] Attempting to reconnect...");
          socketService.connectSocket();
        }
      }
    }, 60000); // Kiểm tra mỗi 1 phút

    // Kiểm tra kết nối khi tab trở nên active
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        isAuthenticated &&
        user &&
        isOnMessagePage()
      ) {
        checkConnection(true);
      }
    };

    // Kiểm tra khi có thay đổi về network
    const handleNetworkChange = () => {
      if (navigator.onLine && isAuthenticated && user && isOnMessagePage()) {
        console.log("Network change detected, checking connection");
        setTimeout(() => {
          checkConnection(true);
        }, 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleNetworkChange);

    // Cleanup khi unmount
    return () => {
      if (unsubscribe) unsubscribe();

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (checkConnectionTimerRef.current) {
        clearInterval(checkConnectionTimerRef.current);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleNetworkChange);
    };
  }, [isAuthenticated, user, isConnected]);

  // Kiểm tra kết nối
  const checkConnection = useCallback(
    (forceReconnect = false) => {
      if (!isOnMessagePage()) return false;

      const socketActive = socketService.isSocketConnected();

      // Cập nhật trạng thái nếu có sự khác biệt
      if (isConnected !== socketActive) {
        setIsConnected(socketActive);
      }

      // Kết nối lại nếu cần
      if (forceReconnect || !socketActive) {
        console.log("[SocketContext] Reconnecting socket");
        socketService.forceReconnect();
      }

      return socketActive;
    },
    [isConnected]
  );

  // Kết nối socket
  const connect = useCallback(() => {
    if (!isOnMessagePage()) return false;

    try {
      const connected = socketService.connectSocket();
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error("Error connecting socket from context:", error);
      return false;
    }
  }, []);

  // Ngắt kết nối socket
  const disconnect = useCallback(() => {
    try {
      const result = socketService.disconnectSocket();
      setIsConnected(false);
      return result;
    } catch (error) {
      console.error("Error disconnecting socket from context:", error);
      return false;
    }
  }, []);

  // Tham gia phòng chat
  const joinChat = useCallback((chatId) => {
    if (!chatId) return false;
    return socketService.joinChatRoom(chatId);
  }, []);

  // Rời phòng chat
  const leaveChat = useCallback((chatId) => {
    if (!chatId) return false;
    return socketService.leaveChatRoom(chatId);
  }, []);

  // Gửi tin nhắn
  const sendMessage = useCallback((message) => {
    return socketService.sendMessage(message);
  }, []);

  // Đánh dấu tin nhắn đã đọc
  const markAsRead = useCallback((data) => {
    return socketService.markMessageAsRead(data);
  }, []);

  // Bắt đầu gõ tin nhắn
  const startTyping = useCallback((chatId) => {
    return socketService.startTyping(chatId);
  }, []);

  // Dừng gõ tin nhắn
  const stopTyping = useCallback((chatId) => {
    return socketService.stopTyping(chatId);
  }, []);

  // Lắng nghe tin nhắn mới
  const subscribeToMessages = useCallback((chatId, callback) => {
    if (!chatId) return () => {};
    return socketService.subscribeToMessages(chatId, callback);
  }, []);

  // Lắng nghe trạng thái đang gõ
  const subscribeToTyping = useCallback((chatId, callback) => {
    if (!chatId) return () => {};
    return socketService.subscribeToTyping(chatId, callback);
  }, []);

  // Lắng nghe trạng thái online/offline
  const subscribeToUserStatus = useCallback((callback) => {
    return socketService.subscribeToUserStatus(callback);
  }, []);

  // Giá trị context
  const contextValue = {
    isConnected,
    connect,
    disconnect,
    joinChat,
    leaveChat,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    subscribeToMessages,
    subscribeToTyping,
    subscribeToUserStatus,
    checkConnection,
    forceReconnect: () => socketService.forceReconnect(),
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Hook để sử dụng Socket Context
export const useSocket = () => useContext(SocketContext);

export default SocketContext;
