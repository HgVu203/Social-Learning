import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { useEffect } from "react";
import { useSocket } from "../../contexts/SocketContext";
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
  const { subscribeToMessages, isConnected } = useSocket();

  // New: Track last seen messages to prevent disappearance when switching conversations
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
          console.log(
            `Saved ${currentData.messages.length} messages to cache for ${userId}`
          );
        }
      } catch (error) {
        console.error("Error saving message cache:", error);
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

      // Only use cache if it's less than 3 minutes old
      if (cachedData?.messages?.length > 0 && cacheAge < 1000 * 60 * 3) {
        console.log(
          `Restored ${cachedData.messages.length} messages from cache for ${userId}`
        );
        queryClient.setQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId),
          cachedData
        );
      } else if (cacheAge >= 1000 * 60 * 3) {
        // Clear expired cache
        sessionStorage.removeItem(`message_cache_${userId}`);
      }
    } catch (error) {
      console.error("Error restoring message cache:", error);
    }
  }, [userId, queryClient]);

  // Get messages history with a specific user
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: MESSAGE_QUERY_KEYS.messagesWithUser(userId),
    queryFn: async () => {
      try {
        if (!userId) return { messages: [], hasMore: false };

        console.log(
          `Fetching messages for conversation ${userId}, page ${page}`
        );

        // First get the current cached data to preserve it in case of error
        const previousData = queryClient.getQueryData(
          MESSAGE_QUERY_KEYS.messagesWithUser(userId)
        );

        const response = await axiosService.get("/message", {
          params: { partnerId: userId, page, limit },
        });

        console.log(
          `Fetched ${response.data.data?.length || 0} messages for ${userId}`
        );

        // Validate response data
        if (!response.data.data || !Array.isArray(response.data.data)) {
          console.warn("Invalid message data format:", response.data);
          // Return previous messages instead of empty array to prevent disappearing
          return (
            previousData || {
              messages: [],
              hasMore: false,
              currentPage: parseInt(page),
              error: "Invalid data format from server",
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
          console.warn(
            "Received empty message array but had previous messages, preserving cache"
          );
          return previousData;
        }

        // Process messages to ensure structure consistency
        const processedMessages = response.data.data.map((message) => {
          // Ensure senderId is consistent
          if (message.senderId && typeof message.senderId === "object") {
            // Message with populated sender
            console.log(
              "Message with populated sender:",
              message.senderId._id,
              message.message
            );
          } else if (message.senderId) {
            // Message with sender ID only
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
          }
        );
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 2, // 2 seconds
    refetchOnWindowFocus: true,
    // Reduced polling frequency to prevent race conditions
    refetchInterval: isConnected ? 8000 : 3000, // Less aggressive polling
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // This is crucial - tell React Query how to merge new data with old data
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

  // Set up a function to refresh messages when socket reconnects
  useEffect(() => {
    const handleSocketReconnect = () => {
      console.log("Socket reconnected, refreshing messages");
      if (userId) {
        refetch();
      }
    };

    window.addEventListener("socket_reconnected", handleSocketReconnect);

    return () => {
      window.removeEventListener("socket_reconnected", handleSocketReconnect);
    };
  }, [refetch, userId]);

  // Set up a function to handle forced message refresh
  useEffect(() => {
    const handleForceRefresh = (event) => {
      const { conversationId } = event.detail || {};
      if (conversationId && conversationId === userId) {
        console.log(`Force refreshing messages for conversation ${userId}`);
        refetch();
      }
    };

    window.addEventListener("force_message_refresh", handleForceRefresh);

    return () => {
      window.removeEventListener("force_message_refresh", handleForceRefresh);
    };
  }, [refetch, userId]);

  // Watch for new message event - trigger refetch
  useEffect(() => {
    const handleNewMessage = (event) => {
      try {
        const { partnerId, message, updateId } = event?.detail || {};

        // Skip if no partner ID
        if (!partnerId) return;

        // Only process if this is for our conversation
        if (partnerId === userId) {
          console.log("New message notification, refreshing data");

          // Track processed messages to prevent duplicates
          const processedKey = `processed_${updateId || Date.now()}`;
          if (window[processedKey]) return;
          window[processedKey] = true;

          // For urgent updates with actual message data, update cache directly
          if (message && updateId) {
            // Add message directly to cache for immediate display
            queryClient.setQueryData(
              MESSAGE_QUERY_KEYS.messagesWithUser(userId),
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

            // Also update conversations
            queryClient.invalidateQueries({
              queryKey: MESSAGE_QUERY_KEYS.conversations(),
            });

            // Clean up after a delay
            setTimeout(() => {
              delete window[processedKey];
            }, 5000);
          } else {
            // For regular updates, just refetch
            refetch();
          }
        }
      } catch (error) {
        console.error("Error handling new message notification:", error);
      }
    };

    // Listen for message events
    window.addEventListener("new_message_received", handleNewMessage);
    window.addEventListener("urgent_new_message", handleNewMessage);

    return () => {
      window.removeEventListener("new_message_received", handleNewMessage);
      window.removeEventListener("urgent_new_message", handleNewMessage);
    };
  }, [userId, refetch, queryClient]);

  // Websocket subscription for notifications only
  useEffect(() => {
    if (!userId || !user) return;

    console.log(`Setting up message notification for user ${userId}`);

    try {
      // Set up message subscriptions using Socket Context
      const unsubscribe = subscribeToMessages(userId, {
        onMessageReceived: (message) => {
          console.log("New message received via socket:", message);

          // Create a unique update ID
          const socketUpdateId = `socket_${message._id}_${Date.now()}`;

          // Dispatch event to trigger refetch with full message data
          window.dispatchEvent(
            new CustomEvent("urgent_new_message", {
              detail: {
                partnerId: userId,
                message: message,
                updateId: socketUpdateId,
              },
            })
          );

          // Also update other caches
          queryClient.invalidateQueries({
            queryKey: MESSAGE_QUERY_KEYS.conversations(),
          });
        },
        onMessageRead: () => {
          refetch();
        },
        onMessageDeleted: () => {
          refetch();
        },
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error subscribing to messages:", error);
      return () => {};
    }
  }, [userId, user, queryClient, subscribeToMessages, refetch]);

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

      // Prevent duplicate messages by checking before update
      // CRITICAL: Create a unique ID to track this specific update
      const updateId = `msg_${sentMessage._id}_${Date.now()}`;
      window.lastMessageUpdate = updateId;

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

          // Add the new message while preserving all existing messages
          return {
            ...oldData,
            messages: [sentMessage, ...oldData.messages],
          };
        }
      );

      // IMPORTANT: Wait a moment before dispatching socket events to prevent event race conditions
      setTimeout(() => {
        // Dispatch an urgent event to force update of both sides
        window.dispatchEvent(
          new CustomEvent("urgent_new_message", {
            detail: {
              message: sentMessage,
              partnerId: variables.receiverId,
              updateId: updateId,
            },
          })
        );
      }, 300);

      // Delay cache invalidation to prevent duplicate processing
      setTimeout(() => {
        // Only proceed if this is still the latest update
        if (window.lastMessageUpdate !== updateId) return;

        // Invalidate conversations to update the last message preview
        queryClient.invalidateQueries({
          queryKey: MESSAGE_QUERY_KEYS.conversations(),
        });

        // Dispatch global event for conversation updates
        window.dispatchEvent(new Event("conversation_updated"));
      }, 1000);
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
