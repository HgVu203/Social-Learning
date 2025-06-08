import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService, {
  uploadFile,
  updateWithFormData,
} from "../../services/axiosService";
import Toast from "../../utils/toast";
import { GROUP_QUERY_KEYS } from "../queries/useGroupQueries";

export const useGroupMutations = () => {
  const queryClient = useQueryClient();

  // Create a new group
  const createGroup = useMutation({
    mutationFn: async (groupData) => {
      try {
        // Handle FormData for image uploads
        if (groupData instanceof FormData) {
          const response = await uploadFile("/group/create", groupData);
          return response.data;
        }

        // Regular JSON post
        const response = await axiosService.post("/group/create", groupData);
        return response.data;
      } catch (error) {
        console.error("Error creating group:", error.message || error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.popular() });
      Toast.success("Group created successfully!");
    },
    onError: (error) => {
      console.error("Error creating group:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to create group. Please try again."
      );
    },
  });

  // Update an existing group
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, groupData }) => {
      try {
        // Handle FormData for image uploads
        if (groupData instanceof FormData) {
          // Check if FormData has image file
          let hasImageFile = false;
          for (let [key, value] of groupData.entries()) {
            if (value instanceof File && key === "coverImage") {
              hasImageFile = true;
            }
          }

          if (hasImageFile) {
            // Ensure we're using the proper endpoint and sending FormData correctly
            try {
              const response = await updateWithFormData(
                `/group/${groupId}`,
                groupData
              );
              return response.data;
            } catch (uploadError) {
              console.error(
                "Error in updateWithFormData:",
                uploadError.message || uploadError
              );
              throw uploadError;
            }
          } else {
            // Convert FormData to regular object if no files are present
            const objData = {};
            for (let [key, value] of groupData.entries()) {
              objData[key] = value;
            }
            const response = await axiosService.patch(
              `/group/${groupId}`,
              objData
            );
            return response.data;
          }
        }

        // Regular JSON update
        const response = await axiosService.patch(
          `/group/${groupId}`,
          groupData
        );
        return response.data;
      } catch (error) {
        console.error("Error updating group:", error.message || error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.popular() });
      Toast.success("Group updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating group:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to update group. Please try again."
      );
    },
  });

  // Delete a group
  const deleteGroup = useMutation({
    mutationFn: async (groupId) => {
      try {
        const response = await axiosService.delete(`/group/${groupId}`);
        return response.data;
      } catch (error) {
        console.error("Error deleting group:", error.message || error);
        throw error;
      }
    },
    onSuccess: (_, groupId) => {
      // Invalidate and remove relevant queries
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.myGroups() });
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.popular() });
      queryClient.removeQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      Toast.success("Group deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting group:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to delete group. Please try again."
      );
    },
  });

  // Join a group
  const joinGroup = useMutation({
    mutationFn: async (groupId) => {
      try {
        const response = await axiosService.post(`/group/${groupId}/join`);
        return response.data;
      } catch (error) {
        console.error("Error joining group:", error.message || error);
        throw error;
      }
    },
    onSuccess: (data, groupId) => {
      console.log("Joined group successfully:", data);

      // Check if the API returned success: false (treat as error)
      if (data && data.success === false) {
        console.error("API returned success: false", data);
        Toast.error(data.error || data.message || "Failed to join group");
        return;
      }

      // Force immediate refetch of user groups
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.myGroups(),
        refetchType: "all",
      });

      // Get the current group data
      const groupData = data.data;

      // Đảm bảo thiết lập isMember = true trong dữ liệu cache
      if (groupData) {
        groupData.isMember = true;
      }

      // Update the detail query data directly in cache
      queryClient.setQueryData(GROUP_QUERY_KEYS.detail(groupId), (oldData) => {
        if (!oldData) return { success: true, data: groupData };
        return { ...oldData, data: groupData };
      });

      // Also invalidate the query to ensure consistency
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });

      // Invalidate member list
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(groupId),
      });

      // Invalidate popular groups list
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.popular(),
        refetchType: "all",
      });

      // Invalidate the groups list to update any UI that shows group lists
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.lists(),
        refetchType: "all",
      });

      Toast.success(data.message || "You have joined the group!");
    },
    onError: (error) => {
      console.error("Error joining group:", error);
      Toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to join group"
      );
    },
  });

  // Leave a group
  const leaveGroup = useMutation({
    mutationFn: async (groupId) => {
      try {
        const response = await axiosService.post(`/group/${groupId}/leave`);
        return response.data;
      } catch (error) {
        console.error("Error leaving group:", error.message || error);
        throw error;
      }
    },
    onSuccess: (data, groupId) => {
      // Check if the API returned success: false (treat as error)
      if (data && data.success === false) {
        Toast.error(data.error || data.message || "Failed to leave group");
        return;
      }

      // Force immediate refetch of user groups
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.myGroups(),
        refetchType: "all",
      });

      // If group was deleted because user was last member, remove from cache
      if (data.message && data.message.includes("deleted")) {
        queryClient.removeQueries({
          queryKey: GROUP_QUERY_KEYS.detail(groupId),
        });
      } else {
        // Otherwise update the group data in cache
        const groupData = data.data;
        if (groupData) {
          // Đảm bảo thiết lập isMember = false trong dữ liệu cache
          groupData.isMember = false;

          queryClient.setQueryData(
            GROUP_QUERY_KEYS.detail(groupId),
            (oldData) => {
              if (!oldData) return null;
              return { ...oldData, data: groupData };
            }
          );
        }

        // Also invalidate the query to ensure consistency
        queryClient.invalidateQueries({
          queryKey: GROUP_QUERY_KEYS.detail(groupId),
        });
      }

      // Invalidate member list
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(groupId),
      });

      // Invalidate popular groups list
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.popular(),
        refetchType: "all",
      });

      // Invalidate the groups list to update any UI that shows group lists
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.lists(),
        refetchType: "all",
      });

      Toast.success(data.message || "You have left the group!");
    },
    onError: (error) => {
      console.error("Error leaving group:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.response?.data?.message ||
          error.message ||
          "Failed to leave group"
      );
    },
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ groupId, memberId, role }) => {
      try {
        const response = await axiosService.patch(
          `/group/${groupId}/member-role`,
          { memberId, role }
        );
        return response.data;
      } catch (error) {
        console.error("Error updating member role:", error.message || error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(variables.groupId),
      });
      Toast.success(
        data.message || `Member role updated to ${variables.role} successfully!`
      );
    },
    onError: (error) => {
      console.error("Error updating member role:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update member role"
      );
    },
  });

  // Remove member from group
  const removeMember = useMutation({
    mutationFn: async ({ groupId, memberId }) => {
      try {
        const response = await axiosService.post(
          `/group/${groupId}/remove-member`,
          { memberId }
        );
        return response.data;
      } catch (error) {
        console.error("Error removing member:", error.message || error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.member(variables.groupId),
      });
      Toast.success(data.message || "Member removed successfully!");
    },
    onError: (error) => {
      console.error("Error removing member:", error.message || error);
      Toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to remove member"
      );
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
