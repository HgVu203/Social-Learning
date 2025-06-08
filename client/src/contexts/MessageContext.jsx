import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MESSAGE_QUERY_KEYS } from "../hooks/queries/useMessageQueries.js";
import { getSocket, isSocketConnected, isOnMessagePage } from "../socket";

const MessageContext = createContext({
  currentConversation: null,
  setCurrentConversation: () => {},
  clearMessages: () => {},
  markAllAsRead: () => {},
  isConversationActive: () => false,
  isSocketConnected: false,
  reconnectSocket: () => {},
  lastMessageTimestamp: null,
});

export const MessageProvider = ({ children }) => {
  const [currentConversation, setCurrentConversation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(isSocketConnected());
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState(Date.now());
  const queryClient = useQueryClient();

  // Track socket connection status
  useEffect(() => {
    const checkSocketConnection = () => {
      // Only check connection if on a message page
      if (!isOnMessagePage()) return;

      const connected = isSocketConnected();

      // Nếu trạng thái kết nối thay đổi, cập nhật state
      if (connected !== socketConnected) {
        setSocketConnected(connected);

        // Nếu mất kết nối, thử kết nối lại sau một khoảng thời gian
        if (!connected) {
          console.log(
            "[MessageContext] Socket disconnected, scheduling reconnect..."
          );

          // Tránh nhiều lần thử kết nối đồng thời
          clearTimeout(window._messageReconnectTimer);
          window._messageReconnectTimer = setTimeout(() => {
            reconnectSocket();
          }, 3000);
        } else {
          console.log("[MessageContext] Socket connected successfully");
        }
      }
    };

    // Check connection status every 8 seconds thay vì 10 seconds
    const intervalId = setInterval(checkSocketConnection, 8000);

    // Also check on mount and when visibility changes
    checkSocketConnection();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSocketConnection();

        // When page becomes visible again, refresh messages for active conversation
        if (currentConversation?._id && isOnMessagePage()) {
          queryClient.invalidateQueries({
            queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(
              currentConversation._id
            ),
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for socket reconnections
    const handleSocketReconnect = () => {
      if (!isOnMessagePage()) return;

      setSocketConnected(true);

      // When socket reconnects, refresh data
      if (currentConversation?._id) {
        queryClient.invalidateQueries({
          queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(
            currentConversation._id
          ),
        });
      }
    };

    window.addEventListener("socket_reconnected", handleSocketReconnect);

    // Listen for message events to update the timestamp
    const handleConversationUpdated = () => {
      if (!isOnMessagePage()) return;
      setLastMessageTimestamp(Date.now());
    };

    window.addEventListener("conversation_updated", handleConversationUpdated);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("socket_reconnected", handleSocketReconnect);
      window.removeEventListener(
        "conversation_updated",
        handleConversationUpdated
      );
    };
  }, [currentConversation, queryClient]);

  // Manually reconnect socket if needed
  const reconnectSocket = useCallback(() => {
    if (!isOnMessagePage()) return false;

    // Thêm flag để tránh kết nối nhiều lần
    const lastReconnectAttempt = window._lastSocketReconnect || 0;
    const now = Date.now();

    // Đảm bảo cách nhau ít nhất 5 giây giữa các lần thử kết nối
    if (now - lastReconnectAttempt < 5000) {
      return false;
    }

    window._lastSocketReconnect = now;

    if (!isSocketConnected()) {
      const socket = getSocket();
      if (socket) {
        socket.connect();
        return true;
      }
    }
    return false;
  }, []);

  // Use useCallback for all functions to prevent unnecessary re-renders
  const setConversation = useCallback(
    (conversation) => {
      // Only update if the conversation changed to avoid infinite loops
      setCurrentConversation((prevConversation) => {
        if (!prevConversation) return conversation;
        if (!conversation) return null;
        // Only update if the id changes
        return prevConversation._id === conversation._id
          ? prevConversation
          : conversation;
      });

      // When changing conversation, make sure socket is connected (only if on message page)
      if (isOnMessagePage()) {
        reconnectSocket();
      }
    },
    [reconnectSocket]
  );

  const clearMessages = useCallback(() => {
    if (currentConversation) {
      queryClient.removeQueries({
        queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(currentConversation._id),
      });
    }
  }, [currentConversation, queryClient]);

  const markAllAsRead = useCallback(
    (partnerId) => {
      if (!partnerId) return;

      // Mark all messages as read in the client-side cache
      queryClient.setQueryData(
        MESSAGE_QUERY_KEYS.messagesWithUser(partnerId),
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            messages: oldData.messages.map((message) => {
              if (message.read) return message;

              return {
                ...message,
                read: true,
              };
            }),
          };
        }
      );

      // Also update conversations list to reflect read status
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
    [queryClient]
  );

  const isConversationActive = useCallback(
    (userId) => {
      return currentConversation?._id === userId;
    },
    [currentConversation]
  );

  // Listen for global message events to ensure real-time updates
  useEffect(() => {
    const handleNewMessage = (event) => {
      // Skip if not on message page
      if (!isOnMessagePage()) return;

      const { message, partnerId } = event?.detail || {};

      // Skip if no valid data
      if (!message || !partnerId) return;

      // Track if we've processed this message already
      const processedKey = `msg_processed_${message._id}`;
      if (window[processedKey]) return;
      window[processedKey] = true;

      console.log("MessageContext detected new message:", message.message);

      try {
        // 1. Update the messages cache for this conversation
        queryClient.setQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(partnerId),
          (oldData) => {
            if (!oldData) {
              return {
                messages: [message],
                hasMore: false,
                currentPage: 1,
              };
            }

            // Check if message already exists
            const messageExists = oldData.messages.some(
              (m) => m._id === message._id
            );

            if (messageExists) return oldData;

            // Add the message to the cache
            return {
              ...oldData,
              messages: [message, ...oldData.messages],
            };
          }
        );

        // 2. Force conversations list to update
        queryClient.invalidateQueries({
          queryKey: MESSAGE_QUERY_KEYS.conversations(),
        });

        // 3. Update last refresh time to trigger UI updates
        setLastMessageTimestamp(Date.now());

        // Clean up after a delay
        setTimeout(() => {
          delete window[processedKey];
        }, 5000);
      } catch (error) {
        console.error("Error updating message in context:", error);
      }
    };

    // Listen for message events from both socket and direct sends
    window.addEventListener("urgent_new_message", handleNewMessage);
    window.addEventListener("new_message_received", handleNewMessage);

    return () => {
      window.removeEventListener("urgent_new_message", handleNewMessage);
      window.removeEventListener("new_message_received", handleNewMessage);
    };
  }, [queryClient]);

  // Use useMemo for context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      currentConversation,
      setCurrentConversation: setConversation,
      clearMessages,
      markAllAsRead,
      isConversationActive,
      isSocketConnected: socketConnected,
      reconnectSocket,
      lastMessageTimestamp,
    }),
    [
      currentConversation,
      setConversation,
      clearMessages,
      markAllAsRead,
      isConversationActive,
      socketConnected,
      reconnectSocket,
      lastMessageTimestamp,
    ]
  );

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

export const useMessageContext = () => useContext(MessageContext);

export default MessageContext;
