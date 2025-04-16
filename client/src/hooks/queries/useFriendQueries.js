import { useQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import tokenService from "../../services/tokenService";

export const FRIEND_QUERY_KEYS = {
  all: ["friends"],
  lists: () => [...FRIEND_QUERY_KEYS.all, "list"],
  requests: () => [...FRIEND_QUERY_KEYS.all, "requests"],
  suggestions: () => [...FRIEND_QUERY_KEYS.all, "suggestions"],
};

export const useFriendQueries = {
  // Fetch all friends
  useFriends: () => {
    return useQuery({
      queryKey: FRIEND_QUERY_KEYS.lists(),
      queryFn: async () => {
        console.log("Fetching friends list");
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          console.log("Token không hợp lệ, bỏ qua việc fetch friends");
          return { success: false, data: [], message: "Chưa đăng nhập" };
        }

        try {
          const response = await axiosService.get("/friendship");
          console.log("Friends response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching friends:", error);
          throw error;
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      refetchOnMount: tokenService.isTokenValid(),
      enabled: tokenService.isTokenValid(),
    });
  },

  // Fetch friend requests
  useFriendRequests: () => {
    return useQuery({
      queryKey: FRIEND_QUERY_KEYS.requests(),
      queryFn: async () => {
        console.log("Fetching friend requests");
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          console.log("Token không hợp lệ, bỏ qua việc fetch friend requests");
          return { success: false, data: [], message: "Chưa đăng nhập" };
        }

        try {
          const response = await axiosService.get("/friendship/pending");
          console.log("Friend requests response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching friend requests:", error);
          throw error;
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      refetchOnMount: tokenService.isTokenValid(),
      enabled: tokenService.isTokenValid(),
    });
  },

  // Fetch friend suggestions
  useFriendSuggestions: (limit = 5) => {
    return useQuery({
      queryKey: [...FRIEND_QUERY_KEYS.suggestions(), { limit }],
      queryFn: async () => {
        console.log(`Fetching friend suggestions, limit: ${limit}`);
        if (!tokenService.getToken() || !tokenService.isTokenValid()) {
          console.log(
            "Token không hợp lệ, bỏ qua việc fetch friend suggestions"
          );
          return { success: false, data: [], message: "Chưa đăng nhập" };
        }

        try {
          // Generate suggestions from users not already connected
          const response = await axiosService.get(
            `/users?limit=${limit}&suggestions=true`
          );
          console.log("Friend suggestions response:", response.data);
          return response.data;
        } catch (error) {
          console.error("Error fetching friend suggestions:", error);
          throw error;
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
      refetchOnMount: tokenService.isTokenValid(),
      enabled: tokenService.isTokenValid(),
    });
  },
};

// Add individual exports for backward compatibility
export const useFriends = () => useFriendQueries.useFriends();
export const useFriendRequests = () => useFriendQueries.useFriendRequests();
export const useFriendSuggestions = (limit) =>
  useFriendQueries.useFriendSuggestions(limit);

export default useFriendQueries;
