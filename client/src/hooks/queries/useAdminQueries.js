import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../../services/adminService";

export const ADMIN_QUERY_KEYS = {
  all: ["admin"],
  users: () => [...ADMIN_QUERY_KEYS.all, "users"],
  usersList: (params) => [...ADMIN_QUERY_KEYS.users(), "list", params],
  posts: () => [...ADMIN_QUERY_KEYS.all, "posts"],
  postsList: (params) => [...ADMIN_QUERY_KEYS.posts(), "list", params],
  groups: () => [...ADMIN_QUERY_KEYS.all, "groups"],
  groupsList: (params) => [...ADMIN_QUERY_KEYS.groups(), "list", params],
  stats: () => [...ADMIN_QUERY_KEYS.all, "stats"],
};

// User Management Hooks
export const useAdminUsers = (page = 1, limit = 10, searchTerm = "") => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.usersList({ page, limit, searchTerm }),
    queryFn: async () => {
      const response = await adminService.getAllUsers(page, limit, searchTerm);
      return response;
    },
    keepPreviousData: true,
  });
};

export const useAdminUserMutations = () => {
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await adminService.updateUser(userId, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      return await adminService.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, status }) => {
      return await adminService.toggleUserStatus(userId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
    },
  });

  return {
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
};

// Post Management Hooks
export const useAdminPosts = (page = 1, limit = 10, status = "") => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.postsList({ page, limit, status }),
    queryFn: async () => {
      const response = await adminService.getAllPosts(page, limit, status);
      return response;
    },
    keepPreviousData: true,
  });
};

export const useAdminPostMutations = () => {
  const queryClient = useQueryClient();

  const updatePost = useMutation({
    mutationFn: async ({ postId, postData }) => {
      return await adminService.updatePost(postId, postData);
    },
    onMutate: async ({ postId, postData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(ADMIN_QUERY_KEYS.posts());

      // Optimistically update to the new value
      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((post) =>
            post._id === postId ? { ...post, ...postData } : post
          ),
        };
      });

      return { previousPosts };
    },
    onError: (err, newPost, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), context.previousPosts);
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server state
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId) => {
      return await adminService.deletePost(postId);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      const previousPosts = queryClient.getQueryData(ADMIN_QUERY_KEYS.posts());

      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((post) =>
            post._id === postId ? { ...post, status: "deleted" } : post
          ),
        };
      });

      return { previousPosts };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), context.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });
    },
  });

  const restorePost = useMutation({
    mutationFn: async (postId) => {
      return await adminService.restorePost(postId);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      const previousPosts = queryClient.getQueryData(ADMIN_QUERY_KEYS.posts());

      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((post) =>
            post._id === postId ? { ...post, status: "approved" } : post
          ),
        };
      });

      return { previousPosts };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(ADMIN_QUERY_KEYS.posts(), context.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });
    },
  });

  const updatePostStatus = useMutation({
    mutationFn: async ({ postId, status }) => {
      return await adminService.updatePostStatus(postId, status);
    },
    onMutate: async ({ postId, status }) => {
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      const postQueries = queryClient.getQueriesData({
        queryKey: ADMIN_QUERY_KEYS.posts(),
      });

      console.log("Post queries found:", postQueries.length);

      const previousData = {};

      // Thực hiện optimistic update cho các queries
      postQueries.forEach(([queryKey, data]) => {
        if (data && data.data) {
          const queryKeyString = JSON.stringify(queryKey);
          previousData[queryKeyString] = data;

          console.log(`Updating cache for query: ${queryKeyString}`);

          // Cập nhật cache cho query này
          queryClient.setQueryData(queryKey, {
            ...data,
            data: data.data.map((post) =>
              post._id === postId ? { ...post, status } : post
            ),
          });
        }
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      console.error("Error updating post status:", error);

      // Khôi phục state trước đó nếu có lỗi
      if (context && context.previousData) {
        Object.entries(context.previousData).forEach(
          ([queryKeyString, data]) => {
            console.log(`Rolling back cache for query: ${queryKeyString}`);
            const queryKey = JSON.parse(queryKeyString);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }
    },
    onSuccess: (data) => {
      console.log("Status update success:", data);
      // Force refetch để đồng bộ với server
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });
    },
  });

  return {
    updatePost,
    deletePost,
    restorePost,
    updatePostStatus,
  };
};

// Group Management Hooks
export const useAdminGroups = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.groupsList({ page, limit }),
    queryFn: async () => {
      const response = await adminService.getAllGroups(page, limit);
      return response;
    },
    keepPreviousData: true,
  });
};

export const useAdminGroupMutations = () => {
  const queryClient = useQueryClient();

  const updateGroup = useMutation({
    mutationFn: async ({ groupId, groupData }) => {
      return await adminService.updateGroup(groupId, groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId) => {
      return await adminService.deleteGroup(groupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });
    },
  });

  return {
    updateGroup,
    deleteGroup,
  };
};

// Points Management Hook
export const useUpdateUserPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, points, badge }) => {
      return await adminService.updateUserPoints(userId, points, badge);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
    },
  });
};

// Dashboard Stats Hook
export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.stats(),
    queryFn: async () => {
      try {
        const response = await adminService.getDashboardStats();
        console.log("Dashboard stats raw response:", response);

        // Return the response directly without modification
        return response;
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export default {
  useAdminUsers,
  useAdminUserMutations,
  useAdminPosts,
  useAdminPostMutations,
  useAdminGroups,
  useAdminGroupMutations,
  useUpdateUserPoints,
  useAdminDashboardStats,
};
