import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { useEffect } from "react";
import { subscribeToMessages } from "../../socket";
import { useAuth } from "../../contexts/AuthContext";

export const MESSAGE_QUERY_KEYS = {
  all: ["messages"],
  conversations: () => [...MESSAGE_QUERY_KEYS.all, "conversations"],
  messages: () => [...MESSAGE_QUERY_KEYS.all, "chat"],
  messagesWithUser: (userId) => [...MESSAGE_QUERY_KEYS.messages(), userId],
  unreadCount: () => [...MESSAGE_QUERY_KEYS.all, "unread"],
};

// Get conversations list
export const useConversations = (params = {}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: MESSAGE_QUERY_KEYS.conversations(),
    queryFn: async () => {
      const response = await axiosService.get("/message/conversations", {
        params,
      });
      return response.data.data || [];
    },
    refetchInterval: 20000, // Automatically refresh every 20 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Listen for conversation updates via socket
  useEffect(() => {
    if (!user) return;

    // Set up a global event listener for conversation updates
    const onConversationUpdated = () => {
      console.log("Global conversation update detected");
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
    };

    // Add event listener to the window object
    window.addEventListener("conversation_updated", onConversationUpdated);

    return () => {
      window.removeEventListener("conversation_updated", onConversationUpdated);
    };
  }, [queryClient, user]);

  return query;
};

// Get unread message count
export const useUnreadMessageCount = () => {
  return useQuery({
    queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
    queryFn: async () => {
      const response = await axiosService.get("/message/unread-count");
      return response.data.count;
    },
    refetchInterval: 20000, // Refresh every 20 seconds
  });
};

// Get messages with a specific user
export const useMessages = (
  userId,
  options = { page: 1, limit: 20 },
  queryOptions = {}
) => {
  const { page, limit } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get messages history with a specific user
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
    queryFn: async () => {
      try {
        if (!userId) return { messages: [], hasMore: false };

        console.log(
          `Fetching messages for conversation ${userId}, page ${page}`
        );

        const response = await axiosService.get("/message", {
          params: { partnerId: userId, page, limit },
        });

        console.log(
          `Fetched ${response.data.data?.length || 0} messages for ${userId}`
        );

        // Kiểm tra thêm dữ liệu trả về để gỡ lỗi
        if (!response.data.data || !Array.isArray(response.data.data)) {
          console.warn("Invalid message data format:", response.data);
          return {
            messages: [],
            hasMore: false,
            currentPage: parseInt(page),
            error: "Invalid data format from server",
          };
        }

        // Tiền xử lý tin nhắn để đảm bảo cấu trúc senderId đúng
        const processedMessages = response.data.data.map((message) => {
          // Đảm bảo senderId là chuỗi nếu nó là ID, hoặc là object nếu đã populate
          if (message.senderId && typeof message.senderId === "object") {
            // Tin nhắn đã được populate với thông tin người gửi
            console.log(
              "Message with populated sender:",
              message.senderId._id,
              message.message
            );
          } else if (message.senderId) {
            // Tin nhắn chỉ có ID người gửi
            console.log(
              "Message with sender ID only:",
              message.senderId,
              message.message
            );
          }

          return message;
        });

        return {
          messages: processedMessages,
          hasMore: response.data.hasMore || false,
          currentPage: parseInt(page),
        };
      } catch (error) {
        console.error("Error fetching messages:", error);
        // Trả về dữ liệu trống thay vì throw lỗi để tránh màn hình trắng
        return {
          messages: [],
          hasMore: false,
          error: error.message,
          currentPage: parseInt(page),
        };
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 5, // Giảm xuống 5 giây để cập nhật nhanh hơn
    refetchOnWindowFocus: true,
    retry: 3, // Tăng số lần retry lên 3
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    ...queryOptions, // Cho phép override các options
  });

  // Websocket subscription to listen for new messages
  useEffect(() => {
    if (!userId || !user) return;

    console.log(`Setting up message subscription for user ${userId}`);

    // Add a retry mechanism for socket subscription
    let retries = 0;
    const maxRetries = 3;
    let unsubscribe = null;

    const setupSubscription = () => {
      try {
        // Clear any existing subscription
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }

        unsubscribe = subscribeToMessages(userId, {
          onMessageReceived: (message) => {
            console.log("Message received from socket:", message);

            // PRIORITY FIX: Ensure message has priority in queryClient cache
            // Assign an ID to ensure message tracking in logs
            const logId = `msg-${Date.now()}`;
            console.log(
              `Processing message ${logId}:`,
              message._id || "unknown"
            );

            // Force invalidate and refetch immediately
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
              refetchType: "active",
            });

            // CRITICAL FIX: Always update cache with new message
            queryClient.setQueryData(
              MESSAGE_QUERY_KEYS.messagesWithUser(userId),
              (oldData) => {
                // If no existing data, create new structure
                if (!oldData)
                  return {
                    messages: [message],
                    hasMore: false,
                    currentPage: 1,
                  };

                // Skip if message already exists
                const messageExists = oldData.messages.some(
                  (m) =>
                    m._id === message._id ||
                    (m.message === message.message &&
                      Math.abs(
                        new Date(m.createdAt) - new Date(message.createdAt)
                      ) < 5000)
                );

                if (messageExists) return oldData;

                // Add message to existing messages array
                return {
                  ...oldData,
                  messages: [...oldData.messages, message],
                };
              }
            );

            // Invalidate conversations to update UI
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.conversations(),
              exact: true,
              refetchType: "all",
            });

            // Update unread count
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
              exact: true,
            });

            // Dispatch global event for conversation updates with data
            window.dispatchEvent(
              new CustomEvent("conversation_updated", {
                detail: {
                  message,
                  partnerId: userId,
                  timestamp: Date.now(),
                },
              })
            );
          },

          onMessageRead: (message) => {
            console.log("Message read event received:", message);
            // Update the read status of this message in the cache
            queryClient.setQueryData(
              MESSAGE_QUERY_KEYS.messagesWithUser(userId),
              (oldData) => {
                if (!oldData) return oldData;

                return {
                  ...oldData,
                  messages: oldData.messages.map((m) => {
                    if (m._id === message._id) {
                      return { ...m, read: true };
                    }
                    return m;
                  }),
                };
              }
            );

            // Update conversation list when read status changes
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.conversations(),
              exact: true,
            });
          },

          onMessageDeleted: (message) => {
            console.log("Message deleted event received:", message);
            // Remove the deleted message from the cache
            queryClient.setQueryData(
              MESSAGE_QUERY_KEYS.messagesWithUser(userId),
              (oldData) => {
                if (!oldData) return oldData;

                return {
                  ...oldData,
                  messages: oldData.messages.filter(
                    (m) => m._id !== message._id
                  ),
                };
              }
            );

            // Also invalidate conversations list to update the last message preview
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.conversations(),
              exact: true,
            });

            // Dispatch global event for conversation updates
            window.dispatchEvent(new CustomEvent("conversation_updated"));
          },

          onConversationUpdated: () => {
            console.log("Conversation updated event received");
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.conversations(),
              exact: true,
            });

            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
              exact: true,
            });

            // Dispatch global event for conversation updates
            window.dispatchEvent(new CustomEvent("conversation_updated"));
          },
        });

        // Reset retries on successful connection
        retries = 0;
      } catch (error) {
        console.error(
          `Error setting up message subscription for user ${userId}:`,
          error
        );

        // Retry the subscription if under max retries
        if (retries < maxRetries) {
          retries++;
          console.log(
            `Retrying subscription (attempt ${retries}/${maxRetries})...`
          );
          setTimeout(setupSubscription, 1000 * retries);
        }
      }
    };

    // Initial setup
    setupSubscription();

    // Listen for socket reconnection events to reestablish the subscription
    const handleReconnect = () => {
      console.log("Socket reconnected, setting up message subscription again");
      setupSubscription();
    };

    window.addEventListener("socket_reconnected", handleReconnect);

    return () => {
      console.log(`Cleaning up message subscription for user ${userId}`);
      window.removeEventListener("socket_reconnected", handleReconnect);
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [userId, user, queryClient]);

  return {
    data: data || { messages: [], hasMore: false },
    isLoading,
    error,
    refetch,
  };
};

export const useMessageMutations = () => {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({ receiverId, message, type = "text" }) => {
      console.log(`Sending message to ${receiverId}:`, { message, type });

      if (!receiverId || !message) {
        throw new Error("Missing required parameters: receiverId or message");
      }

      const response = await axiosService.post("/message/send", {
        receiverId,
        message,
        type,
      });

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Get the message that was just sent
      const sentMessage = data.data;

      if (!sentMessage) {
        console.error("No message data in response:", data);
        return;
      }

      console.log("Message sent successfully:", sentMessage);

      // Update the messages cache with the new message
      queryClient.setQueryData(
        MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId),
        (oldData) => {
          if (!oldData)
            return {
              messages: [sentMessage],
              hasMore: false,
              currentPage: 1,
            };

          // Check if the message already exists in the cache
          const messageExists = oldData.messages.some(
            (m) => m._id === sentMessage._id
          );

          if (messageExists) return oldData;

          // Add the new message
          return {
            ...oldData,
            messages: [sentMessage, ...oldData.messages],
          };
        }
      );

      // Invalidate conversations to update the last message preview
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });

      // Dispatch global event for conversation updates
      window.dispatchEvent(new Event("conversation_updated"));
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId) => {
      console.log(`Marking message ${messageId} as read`);

      const response = await axiosService.patch(`/message/${messageId}/read`);
      return response.data;
    },
    onSuccess: (data, messageId) => {
      // Find the correct conversation for this message
      const userQueries = queryClient.getQueryCache().findAll({
        queryKey: MESSAGE_QUERY_KEYS.messages(),
        exact: false,
      });

      // Update the read status in all conversation caches
      userQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            messages: oldData.messages.map((m) => {
              if (m._id === messageId) {
                return { ...m, read: true };
              }
              return m;
            }),
          };
        });
      });

      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });

      // Invalidate conversations to update the read status
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async (partnerId) => {
      console.log(`Marking all messages from ${partnerId} as read`);

      const response = await axiosService.patch("/message/read-all", {
        partnerId,
      });
      return response.data;
    },
    onSuccess: (data, partnerId) => {
      // Update the read status in the conversation cache
      queryClient.setQueryData(
        MESSAGE_QUERY_KEYS.messagesWithUser(partnerId),
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            messages: oldData.messages.map((m) => {
              if (m.senderId._id === partnerId && !m.read) {
                return { ...m, read: true };
              }
              return m;
            }),
          };
        }
      );

      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });

      // Invalidate conversations to update the read status
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId) => {
      console.log(`Deleting message ${messageId}`);

      const response = await axiosService.delete(`/message/${messageId}`);
      return response.data;
    },
    onSuccess: (_, messageId) => {
      // Find the correct conversation for this message
      const userQueries = queryClient.getQueryCache().findAll({
        queryKey: MESSAGE_QUERY_KEYS.messages(),
        exact: false,
      });

      // Remove the message from all conversation caches
      userQueries.forEach((query) => {
        queryClient.setQueryData(query.queryKey, (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            messages: oldData.messages.filter((m) => m._id !== messageId),
          };
        });
      });

      // Invalidate conversations to update the last message preview
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });

      // Dispatch global event for conversation updates
      window.dispatchEvent(new Event("conversation_updated"));
    },
  });

  return {
    sendMessage,
    markAsRead,
    markAllAsRead,
    deleteMessage,
  };
};

// Combined export
export const useMessageQueries = {
  useConversations,
  useMessages,
  useUnreadMessageCount,
};

export default useMessageQueries;
