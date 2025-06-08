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
  const { isAuthenticated, user } = useAuth();

  // Chỉ kích hoạt query khi đã đăng nhập
  const {
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
  } = useFriendQueries.useFriends({
    enabled: isAuthenticated && !!user && tokenService.isTokenValid(),
  });

  const {
    data: friendRequestsData,
    isLoading: friendRequestsLoading,
    error: friendRequestsError,
  } = useFriendQueries.useFriendRequests({
    enabled: isAuthenticated && !!user && tokenService.isTokenValid(),
  });

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
        staleTime: 5 * 60 * 1000, // Tăng lên 5 phút
        cacheTime: 30 * 60 * 1000, // Tăng lên 30 phút
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
        priority: "high", // Đặt priority cao
      };

      // Chỉ prefetch một lần khi người dùng đăng nhập
      // Sử dụng tham chiếu để đảm bảo không prefetch lại
      const prefetchedRef = queryClient.getQueryData(["prefetchStatus"]);

      if (!prefetchedRef) {
        // Đánh dấu đã prefetch
        queryClient.setQueryData(["prefetchStatus"], { done: true });

        // Prefetch dữ liệu bạn bè
        queryClient
          .prefetchQuery({
            queryKey: FRIEND_QUERY_KEYS.lists(),
            queryFn: fetchFriendsData,
            ...prefetchOptions,
          })
          .catch((err) => {
            console.error("Error prefetching friends:", err);
          });

        // Chỉ prefetch friend requests sau khi đã hoàn thành prefetch friends
        setTimeout(() => {
          if (isAuthenticated && tokenService.isTokenValid()) {
            queryClient
              .prefetchQuery({
                queryKey: FRIEND_QUERY_KEYS.requests(),
                queryFn: fetchFriendRequestsData,
                ...prefetchOptions,
              })
              .catch((err) => {
                console.error("Error prefetching friend requests:", err);
              });
          }
        }, 1000);
      }
    }

    // Không cần invalidate query liên tục, đã được xử lý bởi cache và stale time
    // Bỏ setTimeout để tránh gọi invalidateQueries không cần thiết
  }, [isAuthenticated, queryClient]);

  // Methods for fetching data
  const fetchFriends = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      return;
    }

    // Sử dụng biến để theo dõi thời gian lần cuối invalidate query
    const lastInvalidateTime = queryClient.getQueryData([
      "friendsLastInvalidate",
    ]);
    const now = Date.now();

    // Chỉ invalidate nếu đã qua ít nhất 1 phút kể từ lần trước
    if (!lastInvalidateTime || now - lastInvalidateTime > 60 * 1000) {
      queryClient.setQueryData(["friendsLastInvalidate"], now);
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    } else {
      console.log("Skipping friends invalidate - throttled");
    }
  };

  const fetchFriendRequests = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      return;
    }

    // Sử dụng biến để theo dõi thời gian lần cuối invalidate query
    const lastInvalidateTime = queryClient.getQueryData([
      "requestsLastInvalidate",
    ]);
    const now = Date.now();

    // Chỉ invalidate nếu đã qua ít nhất 1 phút kể từ lần trước
    if (!lastInvalidateTime || now - lastInvalidateTime > 60 * 1000) {
      queryClient.setQueryData(["requestsLastInvalidate"], now);
      queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
    } else {
      console.log("Skipping requests invalidate - throttled");
    }
  };

  // Derived state
  const friends = friendsData?.data || [];
  const rawFriendRequests = friendRequestsData?.data || [];

  // Lọc các friend requests để loại bỏ những người đã là bạn bè
  const friendRequests = rawFriendRequests.filter((request) => {
    // Kiểm tra xem người gửi request có trong danh sách bạn bè không
    const isFriend = friends.some(
      (friend) => friend._id === request.userId._id
    );
    return !isFriend;
  });

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
