import { createContext, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import axiosService, { uploadFile } from "../services/axiosService";
import { sortGroupsByPopularity } from "../utils/groupUtils";
import { useAuth } from "./AuthContext";
import tokenService from "../services/tokenService";

// Create context
const GroupContext = createContext({
  useAllGroups: () => {},
  useUserGroups: () => {},
  usePopularGroups: () => {},
  createGroup: null,
  joinGroup: null,
  leaveGroup: null,
  updateMemberRole: null,
  removeMember: null,
  selectGroup: () => {},
  currentGroup: null,
  currentGroupLoading: false,
  currentGroupError: null,
});

// Constants for query keys
export const GROUP_QUERY_KEYS = {
  all: ["groups"],
  lists: () => [...GROUP_QUERY_KEYS.all, "list"],
  list: (filters) => [...GROUP_QUERY_KEYS.lists(), filters],
  allGroups: () => [...GROUP_QUERY_KEYS.all, "list"],
  userGroups: () => [...GROUP_QUERY_KEYS.all, "userGroups"],
  popularGroups: () => [...GROUP_QUERY_KEYS.all, "popular"],
  details: () => [...GROUP_QUERY_KEYS.all, "detail"],
  detail: (id) => [...GROUP_QUERY_KEYS.details(), id],
  group: (id) => [...GROUP_QUERY_KEYS.details(), id],
  members: () => [...GROUP_QUERY_KEYS.all, "members"],
  member: (groupId) => [...GROUP_QUERY_KEYS.members(), groupId],
};

// Provider component
export const GroupProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const { isAuthenticated, user } = useAuth();

  // Kiểm tra người dùng đăng nhập
  const isUserAuthenticated =
    isAuthenticated && !!user && tokenService.isTokenValid();

  // Query to fetch all groups - now with infinite query support
  const useAllGroups = (query = "", limit = 12) => {
    return useInfiniteQuery({
      queryKey: [...GROUP_QUERY_KEYS.allGroups(), { query }],
      queryFn: async ({ pageParam = 1 }) => {
        try {
          const params = { page: pageParam, limit };
          if (query) params.query = query;
          const response = await axiosService.get("/group", { params });

          // Đảm bảo trả về mảng trống nếu không có dữ liệu
          const groups = response.data.data || [];

          return {
            groups,
            nextPage: pageParam + 1,
            totalPages: response.data.pagination?.totalPages || 1,
            currentPage: response.data.pagination?.page || 1,
          };
        } catch (error) {
          console.error("Error fetching groups:", error);
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.currentPage < lastPage.totalPages) {
          return lastPage.nextPage;
        }
        return undefined;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      enabled: isUserAuthenticated, // Chỉ kích hoạt khi đăng nhập
    });
  };

  // Query to fetch user's joined groups
  const useUserGroups = () => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.userGroups(),
      queryFn: async () => {
        try {
          // Need to use query parameter rather than a different endpoint
          const response = await axiosService.get("/group", {
            params: { membership: "user" },
          });
          return {
            success: response.data.success,
            data: response.data.data || [],
          };
        } catch (error) {
          console.error("Error fetching user groups:", error);
          throw error;
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: isUserAuthenticated, // Chỉ kích hoạt khi đăng nhập
    });
  };

  // Query to fetch popular groups
  const usePopularGroups = () => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.popularGroups(),
      queryFn: async () => {
        try {
          // Get a larger set of groups to sort from
          const response = await axiosService.get("/group", {
            params: { limit: 20, sort: "memberCount" }, // Lấy nhiều nhóm hơn và sắp xếp theo số lượng thành viên
          });
          // Ensure we have an array of groups
          const groups = Array.isArray(response.data.data)
            ? response.data.data
            : [];

          // Sort groups by popularity using utility function
          const popularGroups = sortGroupsByPopularity(groups, 10);

          return {
            success: true,
            data: popularGroups, // Đảm bảo luôn trả về mảng, ngay cả khi rỗng
          };
        } catch (error) {
          console.error("Error fetching popular groups:", error);
          return {
            success: false,
            data: [], // Trả về mảng rỗng nếu có lỗi
            error: error.message,
          };
        }
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: isUserAuthenticated, // Chỉ kích hoạt khi đăng nhập
    });
  };

  // Mutation to create a new group
  const createGroup = useMutation({
    mutationFn: async (groupData) => {
      // Handle FormData for image uploads
      try {
        if (groupData instanceof FormData) {
          const url = "/group/create";
          try {
            const response = await uploadFile(url, groupData);
            return response.data;
          } catch (uploadError) {
            console.error("Error uploading to group/create:", uploadError);

            // Detailed error logging
            console.error("Upload error details:", {
              status: uploadError.response?.status,
              data: uploadError.response?.data,
              message: uploadError.message,
            });

            // Rethrow with more specific error message if available
            if (uploadError.response?.data?.error) {
              throw new Error(uploadError.response.data.error);
            }

            throw uploadError;
          }
        }

        const response = await axiosService.post("/group/create", groupData);
        return response.data;
      } catch (error) {
        console.error("Error in createGroup mutation:", error);
        console.error("Error details:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw error; // Rethrow for onError handler
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.userGroups(),
      });
    },
    onError: (error) => {
      console.error("Error details in createGroup:", error);
      // Detailed error message
      const errorMsg =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create group. Please try again.";
      console.error("Error creating group:", errorMsg);
    },
  });

  // Mutation to join a group
  const joinGroup = useMutation({
    mutationFn: async (groupId) => {
      const response = await axiosService.post(`/group/${groupId}/join`);
      return response.data;
    },
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.userGroups(),
      });
    },
    onError: (error) => {
      console.error("Error joining group:", error);
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to join group";
      console.error("Join group error details:", errorMsg);
    },
  });

  // Mutation to leave a group
  const leaveGroup = useMutation({
    mutationFn: async (groupId) => {
      const response = await axiosService.post(`/group/${groupId}/leave`);
      return response.data;
    },
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(groupId),
      });
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.userGroups(),
      });
    },
    onError: (error) => {
      console.error("Error leaving group:", error);
      const errorMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to leave group";
      console.error("Leave group error details:", errorMsg);
    },
  });

  // Mutation to update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ groupId, userId, role }) => {
      const response = await axiosService.patch(
        `/group/${groupId}/member-role`,
        { userId, role }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
    },
  });

  // Mutation to remove member from group
  const removeMember = useMutation({
    mutationFn: async ({ groupId, memberId }) => {
      const response = await axiosService.post(
        `/group/${groupId}/remove-member`,
        { memberId }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.detail(variables.groupId),
      });
    },
  });

  // Query current group
  const {
    data: currentGroupData,
    isLoading: currentGroupLoading,
    error: currentGroupError,
  } = useQuery({
    queryKey: GROUP_QUERY_KEYS.detail(currentGroupId),
    queryFn: async () => {
      if (!currentGroupId) return null;
      // Skip API call if trying to access the 'create' page
      if (currentGroupId === "create") return null;
      const response = await axiosService.get(`/group/${currentGroupId}`);
      return response.data;
    },
    enabled: !!currentGroupId && currentGroupId !== "create",
  });

  // Method to select a group
  const selectGroup = (groupId) => {
    setCurrentGroupId(groupId);
  };

  // Export context value
  const value = {
    useAllGroups,
    useUserGroups,
    usePopularGroups,
    createGroup,
    joinGroup,
    leaveGroup,
    updateMemberRole,
    removeMember,
    selectGroup,
    currentGroup: currentGroupData?.data,
    currentGroupLoading,
    currentGroupError,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
};

// Hook for using the context
export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    console.warn("useGroup must be used within a GroupProvider");
    return {}; // Return empty object instead of throwing error
  }
  return context;
};

// Export the context itself for direct importing
export default GroupContext;
