import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { FRIEND_QUERY_KEYS } from "../queries/useFriendQueries";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

export const useFriendMutations = () => {
  const queryClient = useQueryClient();

  // Base invalidation for friend data
  const invalidateFriendQueries = () => {
    queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.all });
  };

  // Send friend request
  const sendFriendRequest = useMutation({
    mutationFn: async (userId) => {
      console.log(`Sending friend request to user: ${userId}`);
      const response = await axiosService.post("/friendship/send", { userId });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request sent successfully:", data);
      showSuccessToast("Friend request sent successfully");
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error sending friend request:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to send friend request"
      );
    },
  });

  // Accept friend request
  const acceptFriendRequest = useMutation({
    mutationFn: async (requestId) => {
      console.log(`Accepting friend request: ${requestId}`);
      const response = await axiosService.post("/friendship/accept", {
        requestId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request accepted:", data);
      showSuccessToast("Friend request accepted");
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error accepting friend request:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to accept friend request"
      );
    },
  });

  // Reject friend request
  const rejectFriendRequest = useMutation({
    mutationFn: async (requestId) => {
      console.log(`Rejecting friend request: ${requestId}`);
      const response = await axiosService.post("/friendship/reject", {
        requestId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Friend request rejected:", data);
      showSuccessToast("Friend request rejected");
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error rejecting friend request:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to reject friend request"
      );
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
      showSuccessToast("Friend removed successfully");
      invalidateFriendQueries();
    },
    onError: (error) => {
      console.error("Error removing friend:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to remove friend"
      );
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
