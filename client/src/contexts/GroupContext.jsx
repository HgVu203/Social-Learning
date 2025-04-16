import { createContext, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import axiosService, { uploadFile } from "../services/axiosService";
import { sortGroupsByPopularity } from "../utils/groupUtils";

// Create context
const GroupContext = createContext(null);

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

  // Query to fetch all groups - now with infinite query support
  const useAllGroups = (query = "", limit = 12) => {
    return useInfiniteQuery({
      queryKey: [...GROUP_QUERY_KEYS.allGroups(), { query }],
      queryFn: async ({ pageParam = 1 }) => {
        try {
          const params = { page: pageParam, limit };
          if (query) params.query = query;

          console.log("Fetching all groups with params:", params);
          const response = await axiosService.get("/group", { params });
          console.log("All groups response:", response.data);

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
    });
  };

  // Query to fetch user's joined groups
  const useUserGroups = () => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.userGroups(),
      queryFn: async () => {
        try {
          // Need to use query parameter rather than a different endpoint
          console.log("Fetching user groups");
          const response = await axiosService.get("/group", {
            params: { membership: "user" },
          });
          console.log("User groups response:", response.data);
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
    });
  };

  // Query to fetch popular groups
  const usePopularGroups = () => {
    return useQuery({
      queryKey: GROUP_QUERY_KEYS.popularGroups(),
      queryFn: async () => {
        try {
          // Get a larger set of groups to sort from
          console.log("Fetching popular groups");
          const response = await axiosService.get("/group", {
            params: { limit: 20, sort: "memberCount" }, // Lấy nhiều nhóm hơn và sắp xếp theo số lượng thành viên
          });
          console.log("Popular groups response:", response.data);

          // Ensure we have an array of groups
          const groups = Array.isArray(response.data.data)
            ? response.data.data
            : [];
          console.log(`Found ${groups.length} groups before sorting`);

          // Sort groups by popularity using utility function
          const popularGroups = sortGroupsByPopularity(groups, 10);
          console.log(`Sorted to ${popularGroups.length} popular groups`);

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
    });
  };

  // Mutation to create a new group
  const createGroup = useMutation({
    mutationFn: async (groupData) => {
      // Handle FormData for image uploads
      try {
        // Log the type of data we're working with
        console.log(
          "Create group data type:",
          groupData instanceof FormData ? "FormData" : typeof groupData
        );

        if (groupData instanceof FormData) {
          // Log FormData entries for debugging (excluding file content)
          const formDataEntries = [...groupData.entries()].map(
            ([key, value]) => {
              if (key === "coverImage" && value instanceof File) {
                return `${key}: [File: ${value.name}, ${value.size} bytes, ${value.type}]`;
              }
              return `${key}: ${value}`;
            }
          );
          console.log("FormData entries:", formDataEntries);

          // Make sure the URL is correct
          const url = "/group/create";
          console.log(`Sending FormData to: ${url}`);

          try {
            const response = await uploadFile(url, groupData);
            console.log("Create group response:", response.data);
            return response.data;
          } catch (uploadError) {
            console.error("Error uploading to group/create:", uploadError);

            // If there's a CORS or network error, try with the alternative URL structure
            if (
              uploadError.code === "ERR_NETWORK" ||
              uploadError.message?.includes("Network Error")
            ) {
              console.log("Attempting alternative endpoint");
              const response = await axiosService.post(url, groupData);
              console.log(
                "Create group response (alternative):",
                response.data
              );
              return response.data;
            }

            throw uploadError;
          }
        }

        // This is for JSON data (no FormData)
        console.log("Creating group with JSON data");
        const response = await axiosService.post("/group/create", groupData);
        console.log("Create group response:", response.data);
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
    onSuccess: (data) => {
      console.log("Group created successfully:", data);
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
      const response = await axiosService.get(`/group/${currentGroupId}`);
      return response.data;
    },
    enabled: !!currentGroupId,
  });

  // Method to select a group
  const selectGroup = (groupId) => {
    setCurrentGroupId(groupId);
  };

  // Context value
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
  if (!context) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
};
