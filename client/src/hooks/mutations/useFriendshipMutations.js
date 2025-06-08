import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { FRIEND_QUERY_KEYS } from "../queries/useFriendQueries";

export const useFriendshipMutations = () => {
  const queryClient = useQueryClient();

  // Mutation để gửi lời mời kết bạn
  const sendFriendRequest = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosService.post("/friendship/send", {
        friendId,
      });
      return response.data;
    },
    onSuccess: () => {
      // Cập nhật lại danh sách bạn bè, lời mời kết bạn và đề xuất
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.requests() });
      queryClient.invalidateQueries({
        queryKey: FRIEND_QUERY_KEYS.suggestions(),
      });
    },
    onError: (error) => {
      console.error("Error sending friend request:", error.message || error);
    },
  });

  // Mutation để chấp nhận lời mời kết bạn
  const acceptFriendRequest = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosService.post("/friendship/accept", {
        friendId,
      });
      return response.data;
    },
    onSuccess: () => {
      // Cập nhật lại danh sách bạn bè và lời mời kết bạn
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.requests() });
    },
    onError: (error) => {
      console.error("Error accepting friend request:", error.message || error);
    },
  });

  // Mutation để từ chối lời mời kết bạn
  const rejectFriendRequest = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosService.post("/friendship/reject", {
        friendId,
      });
      return response.data;
    },
    onSuccess: () => {
      // Cập nhật lại danh sách lời mời kết bạn
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.requests() });
    },
    onError: (error) => {
      console.error("Error rejecting friend request:", error.message || error);
    },
  });

  // Mutation để hủy kết bạn
  const unfriend = useMutation({
    mutationFn: async (friendId) => {
      const response = await axiosService.delete(`/friendship/${friendId}`);
      return response.data;
    },
    onSuccess: () => {
      // Cập nhật lại danh sách bạn bè
      queryClient.invalidateQueries({ queryKey: FRIEND_QUERY_KEYS.lists() });
    },
    onError: (error) => {
      console.error("Error unfriending:", error.message || error);
    },
  });

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
  };
};

export default useFriendshipMutations;
