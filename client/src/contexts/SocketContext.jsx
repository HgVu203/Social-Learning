import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import socketService from "../socket";

// Tạo Socket Context
const SocketContext = createContext({
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  joinChat: () => {},
  leaveChat: () => {},
  subscribeToMessages: () => () => {},
  forceReconnect: () => {},
  checkConnection: () => {},
});

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const reconnectTimerRef = useRef(null);
  const connectionCheckTimerRef = useRef(null);
  const lastReconnectAttemptRef = useRef(0);
  const periodicPingTimerRef = useRef(null);

  // Kết nối socket khi user đăng nhập
  useEffect(() => {
    let unsubscribe = null;

    const initializeSocket = async () => {
      try {
        if (isAuthenticated && user) {
          console.log("Initializing socket connection from context");
          // Kết nối socket
          const socket = await socketService.initSocket();

          if (socket) {
            setIsConnected(true);

            // Theo dõi sự kiện kết nối/ngắt kết nối socket
            const handleReconnect = () => {
              console.log("Socket reconnected - Context updated");
              setIsConnected(true);
              // Reset reconnect attempt tracking
              lastReconnectAttemptRef.current = 0;
            };

            const handleDisconnect = (event) => {
              console.log(
                `Socket disconnected - Context updated. Reason: ${
                  event?.detail?.reason || "unknown"
                }`
              );
              setIsConnected(false);

              // Implement exponential backoff for reconnect
              const now = Date.now();
              const timeSinceLastAttempt =
                now - lastReconnectAttemptRef.current;

              // Only attempt reconnect if we haven't tried in the last 3 seconds
              if (timeSinceLastAttempt > 3000) {
                lastReconnectAttemptRef.current = now;
                scheduleReconnect();
              }
            };

            window.addEventListener("socket_reconnected", handleReconnect);
            window.addEventListener("socket_disconnect", handleDisconnect);

            unsubscribe = () => {
              window.removeEventListener("socket_reconnected", handleReconnect);
              window.removeEventListener("socket_disconnect", handleDisconnect);
            };
          }
        }
      } catch (error) {
        console.error("Error initializing socket from context:", error);
        setIsConnected(false);
      }
    };

    initializeSocket();

    // Định kỳ kiểm tra kết nối mỗi 1 phút
    connectionCheckTimerRef.current = setInterval(() => {
      if (isAuthenticated && user) {
        const isSocketActive = socketService.isSocketConnected();

        // Cập nhật trạng thái nếu có sự khác biệt
        if (isConnected !== isSocketActive) {
          console.log(
            `[SocketContext] Kiểm tra định kỳ: socket ${
              isSocketActive ? "đang kết nối" : "không kết nối"
            }`
          );
          setIsConnected(isSocketActive);
        }

        // Nếu không kết nối, thử kết nối lại với backoff
        if (!isSocketActive) {
          const now = Date.now();
          const timeSinceLastAttempt = now - lastReconnectAttemptRef.current;

          // Chỉ thử kết nối lại nếu đã qua ít nhất 5 giây kể từ lần cuối
          if (timeSinceLastAttempt > 5000) {
            console.log(
              "[SocketContext] Phát hiện mất kết nối, đang khôi phục..."
            );
            lastReconnectAttemptRef.current = now;
            scheduleReconnect(true);
          }
        }
      }
    }, 60000); // Kiểm tra mỗi 1 phút thay vì 30 giây

    // Thêm ping chủ động để giữ kết nối
    periodicPingTimerRef.current = setInterval(() => {
      if (isAuthenticated && user && isConnected) {
        // Gửi ping trực tiếp (không qua heartbeat)
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
          try {
            socket.emit("client_ping", {
              timestamp: Date.now(),
              keepAlive: true,
            });
          } catch (error) {
            console.warn("Error sending periodic ping:", error);
          }
        }
      }
    }, 90000); // Mỗi 1.5 phút gửi ping đảm bảo kết nối

    // Kiểm tra kết nối khi tab trở nên active
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isAuthenticated && user) {
        checkConnection(true); // Force check and reconnect if needed
      }
    };

    // Kiểm tra khi có thay đổi về network
    const handleNetworkChange = () => {
      if (navigator.onLine && isAuthenticated && user) {
        console.log("Network status change detected, checking connection");
        setTimeout(() => {
          // Delay để đảm bảo network ổn định
          checkConnection(true);
        }, 2000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleNetworkChange);

    // Xử lý cleanup khi unmount
    return () => {
      if (unsubscribe) unsubscribe();

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (connectionCheckTimerRef.current) {
        clearInterval(connectionCheckTimerRef.current);
      }

      if (periodicPingTimerRef.current) {
        clearInterval(periodicPingTimerRef.current);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleNetworkChange);
    };
  }, [isAuthenticated, user, isConnected]);

  // Function to check connection and update state
  const checkConnection = useCallback(
    (forceReconnect = false) => {
      const isSocketActive = socketService.isSocketConnected();

      // Update state if there's a difference
      if (isConnected !== isSocketActive) {
        console.log(
          `[SocketContext] Manual check: socket ${
            isSocketActive ? "is connected" : "is not connected"
          }`
        );
        setIsConnected(isSocketActive);
      }

      // If force reconnect is requested or socket is not connected
      if (forceReconnect || !isSocketActive) {
        console.log("[SocketContext] Reconnecting socket");
        return socketService.checkAndRestoreConnection();
      }

      return isSocketActive;
    },
    [isConnected]
  );

  // Schedule reconnection with backoff
  const scheduleReconnect = (immediate = false) => {
    // Clear old timer if exists
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    // Calculate delay with exponential backoff
    const calculateDelay = () => {
      if (immediate) return 0;

      // Attempts count from 0-5
      const attempts = Math.min(
        5,
        Math.floor((Date.now() - lastReconnectAttemptRef.current) / 10000)
      );
      // 1s, 2s, 4s, 8s, 16s
      return Math.min(1000 * Math.pow(2, attempts), 16000);
    };

    const delay = calculateDelay();

    reconnectTimerRef.current = setTimeout(() => {
      if (isAuthenticated && user) {
        console.log(
          `[SocketContext] Attempting to reconnect after ${delay}ms...`
        );

        // Update last reconnection attempt time
        lastReconnectAttemptRef.current = Date.now();

        // Use forceReconnect when immediate to ensure new connection
        if (immediate) {
          socketService.forceReconnect();
        } else {
          socketService.checkAndRestoreConnection();
        }
      }
    }, delay);
  };

  // Connect socket
  const connect = useCallback(async () => {
    try {
      if (!isConnected) {
        await socketService.checkAndRestoreConnection();
        const connected = socketService.isSocketConnected();
        setIsConnected(connected);
        return connected;
      }
      return true;
    } catch (error) {
      console.error("Error connecting socket from context:", error);
      return false;
    }
  }, [isConnected]);

  // Disconnect socket
  const disconnect = useCallback((isNavigation = false) => {
    try {
      socketService.closeSocket(isNavigation);
      if (!isNavigation) setIsConnected(false);
      return true;
    } catch (error) {
      console.error("Error disconnecting socket from context:", error);
      return false;
    }
  }, []);

  // Force reconnection (mandatory reinitialization)
  const forceReconnect = useCallback(() => {
    console.log("[SocketContext] Force reconnect requested");

    try {
      lastReconnectAttemptRef.current = Date.now();
      const result = socketService.forceReconnect();
      setIsConnected(!!result);
      return !!result;
    } catch (error) {
      console.error("Error force reconnecting:", error);
      return false;
    }
  }, []);

  // Join chat
  const joinChat = useCallback(
    (userId) => {
      if (!userId) return false;
      try {
        connect().then(() => {
          socketService.joinChatRoom(userId);
        });
        return true;
      } catch (error) {
        console.error(`Error joining chat with ${userId}:`, error);
        return false;
      }
    },
    [connect]
  );

  // Leave chat
  const leaveChat = useCallback((userId) => {
    if (!userId) return false;
    try {
      socketService.leaveChatRoom(userId);
      return true;
    } catch (error) {
      console.error(`Error leaving chat with ${userId}:`, error);
      return false;
    }
  }, []);

  // Subscribe to messages
  const subscribeToMessages = useCallback(
    (userId, callbacks) => {
      if (!userId) return () => {};
      try {
        connect();

        // Add retry logic for subscription
        const unsubscribe = socketService.subscribeToMessages(
          userId,
          callbacks
        );

        return unsubscribe;
      } catch (error) {
        console.error(`Error subscribing to messages with ${userId}:`, error);
        return () => {};
      }
    },
    [connect]
  );

  const contextValue = {
    isConnected,
    connect,
    disconnect,
    joinChat,
    leaveChat,
    subscribeToMessages,
    forceReconnect,
    checkConnection,
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
