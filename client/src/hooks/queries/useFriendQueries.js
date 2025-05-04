import { useQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import tokenService from "../../services/tokenService";

export const FRIEND_QUERY_KEYS = {
  all: ["friends"],
  lists: () => [...FRIEND_QUERY_KEYS.all, "list"],
  requests: () => [...FRIEND_QUERY_KEYS.all, "requests"],
  suggestions: () => [...FRIEND_QUERY_KEYS.all, "suggestions"],
  status: (userId) => [...FRIEND_QUERY_KEYS.all, "status", userId],
};

export const useFriendQueries = {
  // Fetch all friends
  useFriends: (options = {}) => {
    const { page = 1, limit = 20, enabled = true } = options;

    return useQuery({
      queryKey: [...FRIEND_QUERY_KEYS.lists(), { page, limit }],
      queryFn: async () => {
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          return { success: false, data: [], message: "Not logged in" };
        }

        try {
          const response = await axiosService.get("/friendship", {
            params: { page, limit },
          });

          // Filter out duplicate friends based on _id
          const uniqueFriends = response.data.data.reduce((acc, friend) => {
            if (!acc.some((f) => f._id === friend._id)) {
              acc.push(friend);
            }
            return acc;
          }, []);

          return {
            ...response.data,
            data: uniqueFriends,
          };
        } catch (error) {
          console.error("Error fetching friends:", error);
          throw error;
        }
      },
      staleTime: 20 * 1000, // Reduced to 20 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 2, // Try 2 times if error occurs
      retryDelay: 1000, // Wait 1 second before retry
      refetchOnMount: "always", // Always refetch when component mounts
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when network reconnects
      // Cache placeholder data
      placeholderData: (previousData) => previousData || { data: [] },
      enabled,
    });
  },

  // Fetch friend requests
  useFriendRequests: (options = {}) => {
    const { page = 1, limit = 10, enabled = true } = options;

    return useQuery({
      queryKey: [...FRIEND_QUERY_KEYS.requests(), { page, limit }],
      queryFn: async () => {
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          return { success: false, data: [], message: "Not logged in" };
        }

        try {
          const response = await axiosService.get("/friendship/pending", {
            params: { page, limit },
          });
          return response.data;
        } catch (error) {
          console.error("Error fetching friend requests:", error);
          throw error;
        }
      },
      staleTime: 20 * 1000, // Reduced to 20 seconds
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 2, // Try 2 times if error occurs
      retryDelay: 1000, // Wait 1 second before retry
      refetchOnMount: "always", // Always refetch when component mounts
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when network reconnects
      // Cache placeholder data
      placeholderData: (previousData) => previousData || { data: [] },
      enabled,
    });
  },

  // Fetch friend suggestions
  useFriendSuggestions: (limit = 5) => {
    return useQuery({
      queryKey: [...FRIEND_QUERY_KEYS.suggestions(), { limit }],
      queryFn: async () => {
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          return { success: false, data: [], message: "Not logged in" };
        }

        try {
          // Generate suggestions from users not already connected
          const response = await axiosService.get(
            `/users?limit=${limit}&suggestions=true`
          );
          return response.data;
        } catch (error) {
          console.error("Error fetching friend suggestions:", error);
          throw error;
        }
      },
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes cache
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      placeholderData: (previousData) => previousData,
      enabled: tokenService.isTokenValid(),
    });
  },

  // Check friendship status
  useFriendshipStatus: (userId, options = {}) => {
    const { enabled = !!userId } = options;

    return useQuery({
      queryKey: FRIEND_QUERY_KEYS.status(userId),
      queryFn: async () => {
        if (!userId) return { status: "NOT_FRIEND" };

        try {
          const response = await axiosService.get(
            `/friendship/status/${userId}`
          );
          return response.data;
        } catch (error) {
          console.error("Error checking friendship status:", error);
          return { status: "NOT_FRIEND" };
        }
      },
      enabled,
      staleTime: 60 * 1000, // 1 phút
      cacheTime: 5 * 60 * 1000,
      retry: 1,
    });
  },
};

// Add individual exports for backward compatibility
export const useFriends = (options = {}) =>
  useFriendQueries.useFriends(options);
export const useFriendRequests = (options = {}) =>
  useFriendQueries.useFriendRequests(options);
export const useFriendSuggestions = (limit) =>
  useFriendQueries.useFriendSuggestions(limit);
export const useFriendshipStatus = (userId, options = {}) =>
  useFriendQueries.useFriendshipStatus(userId, options);

export default useFriendQueries;
