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
import { getSocket, isSocketConnected } from "../socket";

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
      const connected = isSocketConnected();
      setSocketConnected(connected);
    };

    // Check connection status every 5 seconds
    const intervalId = setInterval(checkSocketConnection, 5000);

    // Also check on mount and when visibility changes
    checkSocketConnection();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSocketConnection();

        // When page becomes visible again, refresh messages for active conversation
        if (currentConversation?._id) {
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

      // When changing conversation, make sure socket is connected
      reconnectSocket();
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
