import { createContext, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFriendQueries } from "../hooks/queries/useFriendQueries";
import { useFriendMutations } from "../hooks/mutations/useFriendMutations";
import { useAuth } from "./AuthContext";
import tokenService from "../services/tokenService";

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

  // Methods for fetching data
  const fetchFriends = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      console.log("Không thể fetch friends: Chưa đăng nhập");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["friends"] });
  };

  const fetchFriendRequests = () => {
    if (!isAuthenticated || !tokenService.isTokenValid()) {
      console.log("Không thể fetch friend requests: Chưa đăng nhập");
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
