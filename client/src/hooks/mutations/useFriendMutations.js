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
      const response = await axiosService.post("/friendship/send", { userId });
      return { ...response.data, userId };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(FRIEND_QUERY_KEYS.status(variables.userId), {
        status: "PENDING_SENT",
      });

      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.requests() });
    },
    onError: (error) => {
      console.error("Error sending friend request:", error.message || error);
    },
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (params) => {
      const { requestId } = params;
      const response = await axiosService.post("/friendship/accept", {
        requestId,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error accepting friend request:", error.message || error);
    },
  });

  // Reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (params) => {
      const { requestId } = params;
      const response = await axiosService.post("/friendship/reject", {
        requestId,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error rejecting friend request:", error.message || error);
    },
  });

  // Remove friend
  const removeFriend = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosService.delete(`/friendship/${friendId}`);
      return response.data;
    },
    onSuccess: () => {
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error removing friend:", error.message || error);
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
