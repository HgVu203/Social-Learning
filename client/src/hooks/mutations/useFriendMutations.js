import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { FRIEND_QUERY_KEYS } from "../queries/useFriendQueries";

export const useFriendMutations = () => {
  const queryClient = useQueryClient();

  // Base invalidation for friend data
  const invalidateFriendQueries = () => {
    queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.all });
  };

  // Send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (params) => {
      const { userId } = params;
      console.log(`Sending friend request to user: ${userId}`);
      const response = await axiosService.post("/friendship/send", { userId });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request sent successfully:", data);
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error sending friend request:", error);
    },
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (params) => {
      const { requestId } = params;
      console.log(`Accepting friend request: ${requestId}`);
      const response = await axiosService.post("/friendship/accept", {
        requestId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request accepted:", data);
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error accepting friend request:", error);
    },
  });

  // Reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (params) => {
      const { requestId } = params;
      console.log(`Rejecting friend request: ${requestId}`);
      const response = await axiosService.post("/friendship/reject", {
        requestId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request rejected:", data);
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error rejecting friend request:", error);
    },
  });

  // Remove friend
  const removeFriend = useMutation({
    mutationFn: async (friendId) => {
      console.log(`Removing friend: ${friendId}`);
      const response = await axiosService.delete(`/friendship/${friendId}`);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend removed:", data);
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error removing friend:", error);
    },
  });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  };
};

export default useFriendMutations;
