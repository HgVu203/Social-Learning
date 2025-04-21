import { createContext, useContext, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFriendQueries,
  FRIEND_QUERY_KEYS,
} from "../hooks/queries/useFriendQueries";
import { useFriendMutations } from "../hooks/mutations/useFriendMutations";
import { useAuth } from "./AuthContext";
import tokenService from "../services/tokenService";
import axiosService from "../services/axiosService";

const FriendContext = createContext({
  friends: [],
  loading: false,
  error: null,
  fetchFriends: () => {},
  fetchFriendRequests: () => {},
  sendFriendRequest: () => {},
  acceptFriendRequest: () => {},
  rejectFriendRequest: () => {},
  removeFriend: () => {},
});

export const FriendProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Use the friend queries - Chỉ kích hoạt khi đã đăng nhập
  const {
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriendQueries.useFriends();

  const {
    data: friendRequestsData,
    isLoading: friendRequestsLoading,
    error: friendRequestsError,
  } = useFriendQueries.useFriendRequests();

  // Get mutations
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useFriendMutations();

  // Prefetch friends data when authenticated
  useEffect(() => {
    if (isAuthenticated && tokenService.isTokenValid()) {
      // Định nghĩa các hàm fetchData riêng biệt để tránh gọi hooks trực tiếp
      const fetchFriendsData = async () => {
        try {
          const response = await axiosService.get("/friendship", {
            params: { page: 1, limit: 20 },
          });
          return response.data;
        } catch (error) {
          console.error("Error prefetching friends:", error);
          return { success: false, data: [], message: "Failed to prefetch" };
        }
      };

      const fetchFriendRequestsData = async () => {
        try {
          const response = await axiosService.get("/friendship/pending", {
            params: { page: 1, limit: 20 },
          });
          return response.data;
        } catch (error) {
          console.error("Error prefetching friend requests:", error);
          return { success: false, data: [], message: "Failed to prefetch" };
        }
      };

      // Prefetch với priority cao để ưu tiên tải trước
      const prefetchOptions = {
        staleTime: 30 * 1000, // 30 giây
        cacheTime: 5 * 60 * 1000, // 5 phút
        retry: true,
        retryDelay: 1000,
        priority: "high", // Đặt priority cao
      };

      // Prefetch bằng Promise.all để tải song song
      Promise.all([
        // Prefetch friend list với ưu tiên cao
        queryClient.prefetchQuery({
          queryKey: FRIEND_QUERY_KEYS.lists(),
          queryFn: fetchFriendsData,
          ...prefetchOptions,
        }),

        // Prefetch friend requests
        queryClient.prefetchQuery({
          queryKey: FRIEND_QUERY_KEYS.requests(),
          queryFn: fetchFriendRequestsData,
          ...prefetchOptions,
        }),
      ]).catch((err) => {
        console.error("Error during prefetching:", err);
      });

      // Fetch lại sau 2 giây để đảm bảo data được cập nhật
      setTimeout(() => {
        if (isAuthenticated && tokenService.isTokenValid()) {
          queryClient.invalidateQueries({ queryKey: ["friends"] });
        }
      }, 2000);
    }
  }, [isAuthenticated, queryClient]);

  // Methods for fetching data
  const fetchFriends = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      console.log("Cannot fetch friends: Not logged in");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["friends"] });
  };

  const fetchFriendRequests = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      console.log("Cannot fetch friend requests: Not logged in");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
  };

  // Derived state
  const friends = friendsData?.data || [];
  const friendRequests = friendRequestsData?.data || [];

  const value = {
    // State
    friends,
    friendRequests,
    friendsLoading,
    friendsError,
    friendRequestsLoading,
    friendRequestsError,
    isAuthenticated,

    // Methods
    fetchFriends,
    fetchFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  };

  return (
    <FriendContext.Provider value={value}>{children}</FriendContext.Provider>
  );
};

export const useFriend = () => useContext(FriendContext);

export default FriendContext;
