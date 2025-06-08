import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { useEffect, useCallback } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  sendMessage as socketSendMessage,
  markMessageAsRead,
  trackMessageDelivery,
  getPendingMessages,
  isUserOnline,
} from "../../socket";

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

      // Add online status for each conversation
      if (response.data && Array.isArray(response.data.data)) {
        response.data.data.forEach((conversation) => {
          if (conversation.participant && conversation.participant._id) {
            conversation.participant.isOnline = isUserOnline(
              conversation.participant._id
            );
          }
        });
      }

      return response.data.data || [];
    },
    refetchInterval: 20000, // Automatically refresh every 20 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Listen for conversation updates via socket
  useEffect(() => {
    if (!user) return;

    // Set up event listeners for conversation updates
    const handleSocketEvents = [
      "conversation_updated",
      "new_message_notification",
      "online_users_updated",
      "user_status_change",
    ];

    const invalidateQueries = () => {
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
    };

    // Add all event listeners
    handleSocketEvents.forEach((eventName) => {
      window.addEventListener(eventName, invalidateQueries);
    });

    return () => {
      // Remove all event listeners
      handleSocketEvents.forEach((eventName) => {
        window.removeEventListener(eventName, invalidateQueries);
      });
    };
  }, [queryClient, user]);

  return query;
};

// Get unread message count
export const useUnreadMessageCount = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
    queryFn: async () => {
      const response = await axiosService.get("/message/unread-count");
      return response.data.count;
    },
    refetchInterval: 20000, // Refresh every 20 seconds
  });

  // Update when receiving new messages
  useEffect(() => {
    const handleNewMessage = () => {
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
    };

    window.addEventListener("new_message_notification", handleNewMessage);

    return () => {
      window.removeEventListener("new_message_notification", handleNewMessage);
    };
  }, [queryClient]);

  return query;
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
  const { isConnected } = useSocket();

  // Always refetch on component mount to ensure fresh data
  useEffect(() => {
    if (userId) {
      // Force immediate refetch when component mounts
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
      });
    }
  }, [userId, queryClient]);

  // Track last seen messages to prevent disappearance when switching conversations
  useEffect(() => {
    if (!userId) return;

    // Save the current messages in localStorage when unmounting or changing conversations
    return () => {
      try {
        const currentData = queryClient.getQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId)
        );

        if (currentData?.messages?.length > 0) {
          // Store a timestamp with the cache to allow expiration
          const cacheEntry = {
            data: currentData,
            timestamp: Date.now(),
          };

          // Save to session storage (cleared when browser is closed)
          sessionStorage.setItem(
            `message_cache_${userId}`,
            JSON.stringify(cacheEntry)
          );
        }
      } catch (error) {
        console.error("Error saving message cache:", error.message || error);
      }
    };
  }, [userId, queryClient]);

  // Check for cached messages at the beginning
  useEffect(() => {
    if (!userId) return;

    try {
      // Check if we have cached messages for this conversation
      const cachedDataRaw = sessionStorage.getItem(`message_cache_${userId}`);
      if (!cachedDataRaw) return;

      const cachedEntry = JSON.parse(cachedDataRaw);
      const cachedData = cachedEntry.data;
      const cacheAge = Date.now() - cachedEntry.timestamp;

      // Only use cache if it's less than 1 minute old (reduced from 3 minutes)
      if (cachedData?.messages?.length > 0 && cacheAge < 1000 * 60 * 1) {
        queryClient.setQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId),
          cachedData
        );
      } else {
        // Clear expired cache
        sessionStorage.removeItem(`message_cache_${userId}`);
      }
    } catch (error) {
      console.error("Error restoring message cache:", error.message || error);
    }
  }, [userId, queryClient]);

  // Thêm tính năng xử lý reconnect
  const handleSocketReconnect = useCallback(() => {
    if (userId) {
      // Force refetch khi socket reconnect
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
      });
    }
  }, [userId, queryClient]);

  useEffect(() => {
    window.addEventListener("socket_connected", handleSocketReconnect);
    return () => {
      window.removeEventListener("socket_connected", handleSocketReconnect);
    };
  }, [handleSocketReconnect]);

  // Xử lý force refresh khi có yêu cầu từ components khác
  const handleForceRefresh = useCallback(
    (event) => {
      if (event.detail && event.detail.conversationId === userId) {
        console.log(`Force refreshing messages for conversation ${userId}`);
        queryClient.invalidateQueries({
          queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
        });
      }
    },
    [userId, queryClient]
  );

  useEffect(() => {
    window.addEventListener("force_message_refresh", handleForceRefresh);
    return () => {
      window.removeEventListener("force_message_refresh", handleForceRefresh);
    };
  }, [handleForceRefresh]);

  // Xử lý clear cache khi có yêu cầu
  const handleClearCache = useCallback(
    (event) => {
      if (
        event.detail &&
        (!event.detail.conversationId || event.detail.conversationId === userId)
      ) {
        console.log(
          `Clearing message cache for ${event.detail.conversationId || "all"}`
        );
        if (userId) {
          sessionStorage.removeItem(`message_cache_${userId}`);
        } else {
          // Xóa tất cả message cache
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith("message_cache_")) {
              sessionStorage.removeItem(key);
            }
          });
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    window.addEventListener("clear_message_cache", handleClearCache);
    return () => {
      window.removeEventListener("clear_message_cache", handleClearCache);
    };
  }, [handleClearCache]);

  // Xử lý sự kiện nhận tin nhắn mới để cập nhật danh sách
  const handleNewMessage = useCallback(
    (event) => {
      let message;

      // Xử lý 2 loại event: từ socket trực tiếp và từ custom event
      if (event.type === "new_message") {
        message = event;
      } else if (event.detail) {
        message = event.detail;
      } else {
        return;
      }

      // Kiểm tra message có phải là của conversation này không
      if (!message || !message.senderId || !message.receiverId) return;

      const messagePartnerId =
        message.senderId._id === user?.id
          ? message.receiverId._id
          : message.senderId._id;

      if (messagePartnerId !== userId && message.chatId !== userId) return;

      // Lấy dữ liệu hiện tại của cuộc hội thoại
      const currentData = queryClient.getQueryData(
        MESSAGE_QUERY_KEYS.messagesWithUser(userId)
      );

      if (!currentData) return;

      // Kiểm tra tin nhắn đã tồn tại chưa
      const messageExists = currentData.messages.some(
        (msg) => msg._id === message._id || msg.tempId === message.tempId
      );

      if (messageExists) return;

      // Thêm tin nhắn mới vào đầu danh sách
      const updatedMessages = [message, ...currentData.messages];

      // Cập nhật cache
      queryClient.setQueryData(MESSAGE_QUERY_KEYS.messagesWithUser(userId), {
        ...currentData,
        messages: updatedMessages,
      });

      // Đồng thời cập nhật danh sách hội thoại
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
    [userId, queryClient, user?.id]
  );

  useEffect(() => {
    // Lắng nghe tin nhắn mới từ socket trực tiếp
    window.addEventListener("new_message", handleNewMessage);

    // Lắng nghe tin nhắn mới từ custom event
    window.addEventListener("new_message_notification", handleNewMessage);

    return () => {
      window.removeEventListener("new_message", handleNewMessage);
      window.removeEventListener("new_message_notification", handleNewMessage);
    };
  }, [handleNewMessage]);

  // Lấy danh sách tin nhắn từ server kết hợp với tin nhắn pending
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
    queryFn: async () => {
      try {
        if (!userId) return { messages: [], hasMore: false };

        // Lưu dữ liệu hiện tại để phòng lỗi
        const previousData = queryClient.getQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId)
        );

        // Xác định thời điểm lấy tin nhắn mới (nếu có)
        let lastSeen = null;
        if (previousData?.lastFetched && page === 1) {
          lastSeen = previousData.lastFetched;
        }

        // Gọi API lấy tin nhắn
        const response = await axiosService.get("/message", {
          params: {
            partnerId: userId,
            page,
            limit,
            lastSeen,
            _t: Date.now(), // Thêm timestamp vào query params để tránh cache
          },
        });

        // Validate response data
        if (!response.data.data || !Array.isArray(response.data.data)) {
          // Return previous messages instead of empty array to prevent disappearing
          return (
            previousData || {
              messages: [],
              hasMore: false,
              currentPage: parseInt(page),
              error: "Invalid data format from server",
              lastFetched: Date.now(),
            }
          );
        }

        // If we got an empty array but had previous messages, something may be wrong
        // So keep previous messages if this is the first page (avoid wiping out history)
        if (
          response.data.data.length === 0 &&
          page === 1 &&
          previousData?.messages?.length > 0
        ) {
          return {
            ...previousData,
            lastFetched: Date.now(),
          };
        }

        // Tin nhắn từ server
        let serverMessages = response.data.data;

        // Lấy tin nhắn đang chờ xác nhận
        const pendingMessages = getPendingMessages(userId);

        // Kết hợp tin nhắn từ server và tin nhắn đang chờ
        let combinedMessages = [...serverMessages];

        if (page === 1 && pendingMessages.length > 0) {
          // Lọc bỏ tin nhắn pending đã có trong danh sách server
          const filteredPending = pendingMessages.filter((pendingMsg) => {
            // Kiểm tra nếu có tempId thì không trùng với tin nhắn server nào
            return !serverMessages.some(
              (serverMsg) =>
                serverMsg.tempId === pendingMsg.tempId ||
                serverMsg.clientTempId === pendingMsg.tempId
            );
          });

          // Thêm tin nhắn đang chờ vào đầu danh sách
          combinedMessages = [...filteredPending, ...serverMessages];
        }

        return {
          messages: combinedMessages,
          hasMore: response.data.hasMore || false,
          currentPage: parseInt(page),
          lastFetched: Date.now(),
        };
      } catch (error) {
        console.error("Error fetching messages:", error);
        // Get current cached data
        const previousData = queryClient.getQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId)
        );

        // Return previous messages instead of empty array to prevent disappearing
        return (
          previousData || {
            messages: [],
            hasMore: false,
            error: error.message,
            currentPage: parseInt(page),
            lastFetched: Date.now(),
          }
        );
      }
    },
    enabled: !!userId,
    staleTime: 0, // Always consider data stale to force refetch
    cacheTime: 30 * 1000, // Reduce cache time to 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch when component mounts
    // Increased polling frequency to get latest messages faster
    refetchInterval: isConnected ? 15000 : 5000, // More aggressive polling when not connected via socket
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Tell React Query how to merge new data with old data
    structuralSharing: (oldData, newData) => {
      // If we have no new data or it has an error, keep old data
      if (!newData || newData.error)
        return oldData || { messages: [], hasMore: false };

      // If we have no messages in new data but had old messages, something's wrong
      if (newData.messages.length === 0 && oldData?.messages?.length > 0) {
        return oldData;
      }

      return newData;
    },
    ...queryOptions,
  });

  return {
    data: data || { messages: [], hasMore: false },
    isLoading,
    error,
    refetch,
  };
};

export const useMessageMutations = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Gửi tin nhắn mới
  const sendMessage = useMutation({
    mutationFn: async ({ receiverId, message, type = "text" }) => {
      try {
        // Tạo đối tượng tin nhắn
        const messageData = {
          receiverId,
          message,
          type,
        };

        // Gửi thông qua socket trước để phản hồi nhanh
        const tempId = socketSendMessage({
          senderId: user.id,
          receiverId: receiverId,
          message,
          type,
        });

        if (tempId) {
          messageData.tempId = tempId;
        }

        // Gửi thông qua HTTP API để lưu trên server
        const response = await axiosService.post("/message/send", messageData);

        return {
          ...response.data.data,
          tempId,
        };
      } catch (error) {
        console.error("Error sending message:", error);
        // Ném lỗi để mutation bị reject
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Lấy dữ liệu hiện tại của conversation
      const currentData = queryClient.getQueryData(
        MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId)
      );

      // Nếu không có dữ liệu hiện tại, không làm gì cả
      if (!currentData) return;

      // Kiểm tra tin nhắn đã tồn tại trong danh sách chưa
      const existingIndex = currentData.messages.findIndex(
        (msg) => msg._id === data._id || msg.tempId === data.tempId
      );

      if (existingIndex >= 0) {
        // Nếu đã tồn tại, cập nhật tin nhắn đó
        const updatedMessages = [...currentData.messages];
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex],
          ...data,
          status: "sent",
        };

        // Cập nhật lại danh sách tin nhắn
        queryClient.setQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId),
          {
            ...currentData,
            messages: updatedMessages,
          }
        );
      } else {
        // Nếu chưa tồn tại, thêm vào danh sách và giữ nguyên thứ tự theo thời gian
        const newMessage = {
          ...data,
          senderId: { _id: user.id },
          receiverId: { _id: variables.receiverId },
          read: false,
          status: "sent",
        };

        const allMessages = [...currentData.messages, newMessage];
        // Sắp xếp lại theo thời gian (cũ đến mới)
        allMessages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        queryClient.setQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId),
          {
            ...currentData,
            messages: allMessages,
          }
        );
      }

      // Theo dõi trạng thái tin nhắn thông qua socket
      if (data.tempId) {
        trackMessageDelivery(data.tempId, ({ status }) => {
          // Cập nhật trạng thái tin nhắn khi có thay đổi
          const updatedData = queryClient.getQueryData(
            MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId)
          );

          if (!updatedData) return;

          const msgIndex = updatedData.messages.findIndex(
            (msg) => msg.tempId === data.tempId || msg._id === data._id
          );

          if (msgIndex >= 0) {
            const updatedMessages = [...updatedData.messages];
            updatedMessages[msgIndex] = {
              ...updatedMessages[msgIndex],
              status,
            };

            queryClient.setQueryData(
              MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId),
              {
                ...updatedData,
                messages: updatedMessages,
              }
            );
          }
        });
      }

      // Cập nhật danh sách hội thoại
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
    onError: (error, variables) => {
      console.error("Error in sendMessage mutation:", error);

      // Hiển thị lỗi cho người dùng
      window.dispatchEvent(
        new CustomEvent("message_error", {
          detail: {
            receiverId: variables.receiverId,
            error: error.message || "Failed to send message",
          },
        })
      );
    },
  });

  // Đánh dấu tin nhắn đã đọc
  const markAsRead = useMutation({
    mutationFn: async ({ messageId, chatId, senderId }) => {
      // Gửi thông qua socket trước
      markMessageAsRead({ messageId, chatId, senderId });

      // Sau đó gửi HTTP request để đảm bảo dữ liệu được lưu
      return axiosService.patch(`/message/${messageId}/read`);
    },
    onSuccess: () => {
      // Cập nhật số lượng tin nhắn chưa đọc
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
    },
  });

  // Đánh dấu tất cả tin nhắn đã đọc
  const markAllAsRead = useMutation({
    mutationFn: async (partnerId) => {
      return axiosService.patch("/message/read-all", { partnerId });
    },
    onSuccess: () => {
      // Cập nhật số lượng tin nhắn chưa đọc và danh sách hội thoại
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
  });

  // Xóa tin nhắn
  const deleteMessage = useMutation({
    mutationFn: async (messageId) => {
      return axiosService.delete(`/message/${messageId}`);
    },
    onSuccess: (_, messageId) => {
      // Thông báo cho các components quan tâm
      window.dispatchEvent(
        new CustomEvent("message_deleted", {
          detail: { messageId },
        })
      );
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
