import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService, { uploadFile } from "../../services/axiosService";
import Toast from "../../utils/toast";
import { GROUP_QUERY_KEYS } from "../queries/useGroupQueries";

export const useGroupMutations = () => {
  const queryClient = useQueryClient();

  // Create a new group
  const createGroup = useMutation({
    mutationFn: async (groupData) => {
      console.log("Creating group with data:", groupData);

      // Handle FormData for image uploads
      if (groupData instanceof FormData) {
        console.log("Uploading group with form data");
        const response = await uploadFile("/group/create", groupData);
        console.log("Create group response:", response.data);
        return response.data;
      }

      // Regular JSON post
      const response = await axiosService.post("/group/create", groupData);
      console.log("Create group response:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Group created successfully:", data);
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      Toast.success("Group created successfully!");
    },
    onError: (error) => {
      console.error("Error creating group:", error);
      Toast.error(error.response?.data?.error || "Failed to create group");
    },
  });

  // Update an existing group
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, groupData }) => {
      console.log(`Updating group ${groupId} with data:`, groupData);

      // Handle FormData for image uploads
      if (groupData instanceof FormData) {
        console.log("Updating group with form data");
        const response = await axiosService.patch(
          `/group/${groupId}`,
          groupData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        console.log("Update group response:", response.data);
        return response.data;
      }

      // Regular JSON update
      const response = await axiosService.patch(`/group/${groupId}`, groupData);
      console.log("Update group response:", response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Group updated successfully:", data);
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      Toast.success("Group updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating group:", error);
      Toast.error(error.response?.data?.error || "Failed to update group");
    },
  });

  // Delete a group
  const deleteGroup = useMutation({
    mutationFn: async (groupId) => {
      console.log(`Deleting group ${groupId}`);
      const response = await axiosService.delete(`/group/${groupId}`);
      console.log("Delete group response:", response.data);
      return response.data;
    },
    onSuccess: (data, groupId) => {
      console.log("Group deleted successfully:", data);
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      queryClient.removeQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      Toast.success("Group deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting group:", error);
      Toast.error(error.response?.data?.error || "Failed to delete group");
    },
  });

  // Join a group
  const joinGroup = useMutation({
    mutationFn: async (groupId) => {
      console.log(`Joining group ${groupId}`);
      const response = await axiosService.post(`/group/${groupId}/join`);
      console.log("Join group response:", response.data);
      return response.data;
    },
    onSuccess: (data, groupId) => {
      console.log("Joined group successfully:", data);
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      Toast.success("You have joined the group!");
    },
    onError: (error) => {
      console.error("Error joining group:", error);
      Toast.error(error.response?.data?.error || "Failed to join group");
    },
  });

  // Leave a group
  const leaveGroup = useMutation({
    mutationFn: async (groupId) => {
      console.log(`Leaving group ${groupId}`);
      const response = await axiosService.post(`/group/${groupId}/leave`);
      console.log("Leave group response:", response.data);
      return response.data;
    },
    onSuccess: (data, groupId) => {
      console.log("Left group successfully:", data);
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      Toast.success("You have left the group!");
    },
    onError: (error) => {
      console.error("Error leaving group:", error);
      Toast.error(error.response?.data?.error || "Failed to leave group");
    },
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ groupId, userId, role }) => {
      console.log(
        `Updating role for user ${userId} in group ${groupId} to ${role}`
      );
      const response = await axiosService.patch(
        `/group/${groupId}/member-role`,
        { userId, role }
      );
      console.log("Update member role response:", response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Member role updated successfully:", data);
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(variables.groupId),
      });
      Toast.success(`Member role updated to ${variables.role} successfully!`);
    },
    onError: (error) => {
      console.error("Error updating member role:", error);
      Toast.error(
        error.response?.data?.error || "Failed to update member role"
      );
    },
  });

  // Remove member from group
  const removeMember = useMutation({
    mutationFn: async ({ groupId, memberId }) => {
      console.log(`Removing member ${memberId} from group ${groupId}`);
      const response = await axiosService.post(
        `/group/${groupId}/remove-member`,
        { memberId }
      );
      console.log("Remove member response:", response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Member removed successfully:", data);
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(variables.groupId),
      });
      Toast.success("Member removed successfully!");
    },
    onError: (error) => {
      console.error("Error removing member:", error);
      Toast.error(error.response?.data?.error || "Failed to remove member");
    },
  });

  return {
    createGroup,
    updateGroup,
    deleteGroup,
    joinGroup,
    leaveGroup,
    updateMemberRole,
    removeMember,
  };
};

export default useGroupMutations;
