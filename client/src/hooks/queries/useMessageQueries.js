import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

export const MESSAGE_QUERY_KEYS = {
  all: ["messages"],
  conversations: () => [...MESSAGE_QUERY_KEYS.all, "conversations"],
  messages: () => [...MESSAGE_QUERY_KEYS.all, "chat"],
  messagesWithUser: (userId) => [...MESSAGE_QUERY_KEYS.messages(), userId],
  unreadCount: () => [...MESSAGE_QUERY_KEYS.all, "unread"],
};

export const useConversations = (params = { page: 1, limit: 20 }) => {
  return useQuery({
    queryKey: MESSAGE_QUERY_KEYS.conversations(),
    queryFn: async () => {
      try {
        console.log("Fetching conversations with params:", params);
        const response = await axiosService.get("/message/conversations", {
          params,
        });
        console.log("Conversations response:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }
    },
  });
};

export const useMessages = (partnerId, params = { page: 1, limit: 20 }) => {
  return useQuery({
    queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(partnerId),
    queryFn: async () => {
      if (!partnerId) return { messages: [], hasMore: false, currentPage: 1 };

      try {
        console.log(
          `Fetching messages with partner ${partnerId}, params:`,
          params
        );
        const response = await axiosService.get(`/message`, {
          params: { ...params, partnerId },
        });
        console.log("Messages response:", response.data);
        return {
          messages: response.data.data || [],
          hasMore: response.data.hasMore || false,
          currentPage: params.page,
        };
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }
    },
    enabled: !!partnerId,
  });
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
    queryFn: async () => {
      try {
        console.log("Fetching unread count");
        const response = await axiosService.get("/message/unread");
        console.log("Unread count response:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching unread count:", error);
        throw error;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMessageMutations = () => {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async ({ receiverId, message, type = "text" }) => {
      console.log(`Sending message to ${receiverId}:`, { message, type });
      const response = await axiosService.post("/message/send", {
        receiverId,
        message,
        type,
      });
      console.log("Send message response:", response.data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate both conversations and messages with the specific user
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(variables.receiverId),
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId) => {
      console.log(`Marking message ${messageId} as read`);
      const response = await axiosService.patch(`/message/${messageId}/read`);
      console.log("Mark as read response:", response.data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate unread count and possibly conversations
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.unreadCount(),
      });
      queryClient.invalidateQueries({
        queryKey: MESSAGE_QUERY_KEYS.conversations(),
      });
    },
  });

  return {
    sendMessage,
    markAsRead,
  };
};

// Combined export
export const useMessageQueries = {
  useConversations,
  useMessages,
  useUnreadCount,
};

export default useMessageQueries;
