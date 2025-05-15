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
  statsBasic: () => [...ADMIN_QUERY_KEYS.stats(), "basic"],
  statsUserGrowth: () => [...ADMIN_QUERY_KEYS.stats(), "userGrowth"],
  statsPostGrowth: () => [...ADMIN_QUERY_KEYS.stats(), "postGrowth"],
  statsRecentActivity: () => [...ADMIN_QUERY_KEYS.stats(), "recentActivity"],
};

// User Management Hooks
export const useAdminUsers = (page = 1, limit = 5, searchTerm = "") => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.usersList({ page, limit, searchTerm }),
    queryFn: async () => {
      console.log(`Fetching admin users: page ${page}, limit ${limit}`);
      const response = await adminService.getAllUsers(page, limit, searchTerm);
      return response;
    },
    keepPreviousData: true,
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// Tối ưu với lazy loading - Fetch các dữ liệu chi tiết chỉ khi cần
export const useAdminUserDetails = (userId, options = {}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.users(), userId, "details"],
    queryFn: async () => {
      const response = await adminService.getUserDetails(userId);
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
    enabled: !!userId && options?.enabled !== false,
  });
};

export const useAdminUserMutations = () => {
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await adminService.updateUser(userId, userData);
    },
    onMutate: async ({ userId, userData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.users() });

      // Snapshot the previous values
      const previousUsersData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.users()
      );

      // Tìm và cập nhật tất cả các queries liên quan đến users
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.users(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật user trong mọi danh sách đang được cache
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.map((user) =>
                user._id === userId ? { ...user, ...userData } : user
              ),
            });
          }
        });

      // Cập nhật chi tiết user nếu đang được cache
      const userDetailQueryKey = [
        ...ADMIN_QUERY_KEYS.users(),
        userId,
        "details",
      ];
      const previousUserDetail = queryClient.getQueryData(userDetailQueryKey);
      if (previousUserDetail) {
        queryClient.setQueryData(userDetailQueryKey, {
          ...previousUserDetail,
          data: { ...previousUserDetail.data, ...userData },
        });
      }

      return { previousUsersData, previousUserDetail };
    },
    onError: (err, variables, context) => {
      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousUsersData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.users(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.users().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousUsersData
              );
            }
          });
      }

      if (context?.previousUserDetail) {
        queryClient.setQueryData(
          [...ADMIN_QUERY_KEYS.users(), variables.userId, "details"],
          context.previousUserDetail
        );
      }
    },
    onSuccess: (data, variables) => {
      // Xóa cache cả danh sách và chi tiết để đảm bảo dữ liệu mới hiển thị ngay
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
      // Invalidate chi tiết user cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.users(), variables.userId, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearUsersCache()
        .catch((err) =>
          console.error("Failed to clear users cache on server:", err)
        );
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId) => {
      return await adminService.deleteUser(userId);
    },
    onMutate: async (userId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.users() });

      // Snapshot the previous values
      const previousUsersData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.users()
      );

      // Optimistically remove user from all queries
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.users(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật trạng thái user hoặc xóa khỏi danh sách
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.filter((user) => user._id !== userId),
            });
          }
        });

      return { previousUsersData };
    },
    onError: (err, userId, context) => {
      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousUsersData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.users(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.users().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousUsersData
              );
            }
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });

      // Gọi API xóa cache trên server
      adminService
        .clearUsersCache()
        .catch((err) =>
          console.error("Failed to clear users cache on server:", err)
        );
    },
  });

  const toggleUserStatus = useMutation({
    mutationFn: async ({ userId, status }) => {
      return await adminService.toggleUserStatus(userId, status);
    },
    onMutate: async ({ userId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.users() });

      // Snapshot the previous values
      const previousUsersData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.users()
      );

      // Tìm và cập nhật tất cả các queries liên quan đến users
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.users(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật trạng thái user trong mọi danh sách đang được cache
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.map((user) =>
                user._id === userId ? { ...user, status } : user
              ),
            });
          }
        });

      // Cập nhật chi tiết user nếu đang được cache
      const userDetailQueryKey = [
        ...ADMIN_QUERY_KEYS.users(),
        userId,
        "details",
      ];
      const previousUserDetail = queryClient.getQueryData(userDetailQueryKey);
      if (previousUserDetail) {
        queryClient.setQueryData(userDetailQueryKey, {
          ...previousUserDetail,
          data: { ...previousUserDetail.data, status },
        });
      }

      return { previousUsersData, previousUserDetail };
    },
    onError: (err, variables, context) => {
      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousUsersData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.users(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.users().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousUsersData
              );
            }
          });
      }

      if (context?.previousUserDetail) {
        queryClient.setQueryData(
          [...ADMIN_QUERY_KEYS.users(), variables.userId, "details"],
          context.previousUserDetail
        );
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.users() });
      // Invalidate chi tiết user cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.users(), variables.userId, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearUsersCache()
        .catch((err) =>
          console.error("Failed to clear users cache on server:", err)
        );
    },
  });

  return {
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
};

// Post Management Hooks
export const useAdminPosts = (page = 1, limit = 5, status = "") => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.postsList({ page, limit, status }),
    queryFn: async () => {
      console.log(
        `Fetching admin posts: page ${page}, limit ${limit}, status ${
          status || "all"
        }`
      );
      const response = await adminService.getAllPosts(page, limit, status);
      return response;
    },
    keepPreviousData: true,
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// Tối ưu với lazy loading - Fetch chi tiết bài post chỉ khi cần
export const useAdminPostDetails = (postId, options = {}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.posts(), postId, "details"],
    queryFn: async () => {
      const response = await adminService.getPostDetails(postId);
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
    enabled: !!postId && options?.enabled !== false,
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
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to sync with server state
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Invalidate chi tiết post cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.posts(), variables.postId, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearPostsCache()
        .catch((err) =>
          console.error("Failed to clear posts cache on server:", err)
        );
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
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Invalidate chi tiết post cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.posts(), variables, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearPostsCache()
        .catch((err) =>
          console.error("Failed to clear posts cache on server:", err)
        );
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
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Invalidate chi tiết post cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.posts(), variables, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearPostsCache()
        .catch((err) =>
          console.error("Failed to clear posts cache on server:", err)
        );
    },
  });

  const updatePostStatus = useMutation({
    mutationFn: async ({ postId, status }) => {
      return await adminService.updatePostStatus(postId, status);
    },
    onMutate: async ({ postId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Snapshot the previous values
      const previousPostsData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.posts()
      );

      // Tìm và cập nhật tất cả các queries liên quan đến posts
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.posts(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật trạng thái post trong mọi danh sách đang được cache
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.map((post) =>
                post._id === postId ? { ...post, status } : post
              ),
            });
          }
        });

      // Cập nhật chi tiết post nếu đang được cache
      const postDetailQueryKey = [
        ...ADMIN_QUERY_KEYS.posts(),
        postId,
        "details",
      ];
      const previousPostDetail = queryClient.getQueryData(postDetailQueryKey);
      if (previousPostDetail) {
        queryClient.setQueryData(postDetailQueryKey, {
          ...previousPostDetail,
          data: { ...previousPostDetail.data, status },
        });
      }

      return { previousPostsData, previousPostDetail };
    },
    onError: (err, variables, context) => {
      console.error("Error updating post status:", err);

      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousPostsData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.posts(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.posts().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousPostsData
              );
            }
          });
      }

      if (context?.previousPostDetail) {
        queryClient.setQueryData(
          [...ADMIN_QUERY_KEYS.posts(), variables.postId, "details"],
          context.previousPostDetail
        );
      }
    },
    onSuccess: (data, variables) => {
      console.log("Status update success:", data);

      // Invalidate tất cả các queries liên quan đến posts để đảm bảo dữ liệu được làm mới
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.posts() });

      // Invalidate chi tiết post cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.posts(), variables.postId, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearPostsCache()
        .catch((err) =>
          console.error("Failed to clear posts cache on server:", err)
        );
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
export const useAdminGroups = (page = 1, limit = 5) => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.groupsList({ page, limit }),
    queryFn: async () => {
      console.log(`Fetching admin groups: page ${page}, limit ${limit}`);
      const response = await adminService.getAllGroups(page, limit);
      return response;
    },
    keepPreviousData: true,
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// Tối ưu với lazy loading - Fetch chi tiết group chỉ khi cần
export const useAdminGroupDetails = (groupId, options = {}) => {
  return useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.groups(), groupId, "details"],
    queryFn: async () => {
      const response = await adminService.getGroupDetails(groupId);
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
    enabled: !!groupId && options?.enabled !== false,
  });
};

export const useAdminGroupMutations = () => {
  const queryClient = useQueryClient();

  const updateGroup = useMutation({
    mutationFn: async ({ groupId, groupData }) => {
      return await adminService.updateGroup(groupId, groupData);
    },
    onMutate: async ({ groupId, groupData }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });

      // Snapshot the previous values
      const previousGroupsData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.groups()
      );

      // Tìm và cập nhật tất cả các queries liên quan đến groups
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.groups(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật nhóm trong mọi danh sách đang được cache
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.map((group) =>
                group._id === groupId ? { ...group, ...groupData } : group
              ),
            });
          }
        });

      // Cập nhật chi tiết group nếu đang được cache
      const groupDetailQueryKey = [
        ...ADMIN_QUERY_KEYS.groups(),
        groupId,
        "details",
      ];
      const previousGroupDetail = queryClient.getQueryData(groupDetailQueryKey);
      if (previousGroupDetail) {
        queryClient.setQueryData(groupDetailQueryKey, {
          ...previousGroupDetail,
          data: { ...previousGroupDetail.data, ...groupData },
        });
      }

      return { previousGroupsData, previousGroupDetail };
    },
    onError: (err, variables, context) => {
      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousGroupsData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.groups(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.groups().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousGroupsData
              );
            }
          });
      }

      if (context?.previousGroupDetail) {
        queryClient.setQueryData(
          [...ADMIN_QUERY_KEYS.groups(), variables.groupId, "details"],
          context.previousGroupDetail
        );
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });

      // Invalidate chi tiết group cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.groups(), variables.groupId, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearGroupsCache()
        .catch((err) =>
          console.error("Failed to clear groups cache on server:", err)
        );
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId) => {
      return await adminService.deleteGroup(groupId);
    },
    onMutate: async (groupId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });

      // Snapshot the previous values
      const previousGroupsData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.groups()
      );

      // Optimistically remove group from all queries
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.groups(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Xóa nhóm khỏi danh sách
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.filter((group) => group._id !== groupId),
            });
          }
        });

      return { previousGroupsData };
    },
    onError: (err, groupId, context) => {
      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousGroupsData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.groups(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.groups().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousGroupsData
              );
            }
          });
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.groups() });

      // Invalidate chi tiết group cụ thể
      queryClient.invalidateQueries({
        queryKey: [...ADMIN_QUERY_KEYS.groups(), variables, "details"],
      });

      // Gọi API xóa cache trên server
      adminService
        .clearGroupsCache()
        .catch((err) =>
          console.error("Failed to clear groups cache on server:", err)
        );
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
    onMutate: async ({ userId, points, badge }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ADMIN_QUERY_KEYS.users() });

      // Snapshot the previous values
      const previousUsersData = queryClient.getQueryData(
        ADMIN_QUERY_KEYS.users()
      );

      // Tìm và cập nhật tất cả các queries liên quan đến users
      queryClient
        .getQueryCache()
        .findAll({
          queryKey: ADMIN_QUERY_KEYS.users(),
        })
        .forEach((query) => {
          const data = query.state.data;
          if (data && data.data) {
            // Cập nhật điểm và huy hiệu của user trong mọi danh sách đang được cache
            queryClient.setQueryData(query.queryKey, {
              ...data,
              data: data.data.map((user) => {
                if (user._id === userId) {
                  // Tính toán điểm mới
                  const newPoints =
                    user.points !== undefined
                      ? points < 0
                        ? user.points + points
                        : points
                      : points > 0
                      ? points
                      : 0;

                  const updatedUser = {
                    ...user,
                    points: newPoints,
                  };

                  // Chỉ cập nhật badge nếu có badge mới
                  if (badge) {
                    updatedUser.badge = {
                      name: badge,
                      earnedAt: new Date().toISOString(),
                    };
                    console.log(
                      `[Optimistic Update] Setting badge for user ${userId} to:`,
                      updatedUser.badge
                    );
                  }

                  return updatedUser;
                }
                return user;
              }),
            });
          }
        });

      // Cập nhật chi tiết user nếu đang được cache
      const userDetailQueryKey = [
        ...ADMIN_QUERY_KEYS.users(),
        userId,
        "details",
      ];
      const previousUserDetail = queryClient.getQueryData(userDetailQueryKey);
      if (previousUserDetail) {
        const userData = previousUserDetail.data || {};

        // Tính toán điểm mới
        const newPoints =
          userData.points !== undefined
            ? points < 0
              ? userData.points + points
              : points
            : points > 0
            ? points
            : 0;

        const updatedData = {
          ...userData,
          points: newPoints,
        };

        // Chỉ cập nhật badge nếu có badge mới
        if (badge) {
          updatedData.badge = {
            name: badge,
            earnedAt: new Date().toISOString(),
          };
        }

        queryClient.setQueryData(userDetailQueryKey, {
          ...previousUserDetail,
          data: updatedData,
        });
      }

      return { previousUsersData, previousUserDetail };
    },
    onError: (err, variables, context) => {
      console.error("Error in updateUserPoints:", err);

      // Revert lại dữ liệu trước đó nếu có lỗi
      if (context?.previousUsersData) {
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.users(),
          })
          .forEach((query) => {
            if (
              query.queryKey.toString() === ADMIN_QUERY_KEYS.users().toString()
            ) {
              queryClient.setQueryData(
                query.queryKey,
                context.previousUsersData
              );
            }
          });
      }

      if (context?.previousUserDetail) {
        queryClient.setQueryData(
          [...ADMIN_QUERY_KEYS.users(), variables.userId, "details"],
          context.previousUserDetail
        );
      }
    },
    onSuccess: (data, variables) => {
      const { userId, badge } = variables;
      console.log("Update Points Success:", data);

      if (badge) {
        console.log(`Successfully updated badge to: ${badge}`);
      }

      // Directly update all cache entries with data from the server response
      // instead of just invalidating queries
      const serverData = data.data;

      if (serverData) {
        console.log("Updating cache with server data:", serverData);

        // Update all user lists in cache
        queryClient
          .getQueryCache()
          .findAll({
            queryKey: ADMIN_QUERY_KEYS.users(),
          })
          .forEach((query) => {
            const queryData = query.state.data;
            if (queryData && queryData.data) {
              queryClient.setQueryData(query.queryKey, {
                ...queryData,
                data: queryData.data.map((user) => {
                  if (user._id === userId) {
                    return {
                      ...user,
                      points: serverData.points,
                      rank: serverData.rank,
                      badge: serverData.badge,
                    };
                  }
                  return user;
                }),
              });
            }
          });

        // Update user details if being cached
        const userDetailQueryKey = [
          ...ADMIN_QUERY_KEYS.users(),
          userId,
          "details",
        ];

        const detailData = queryClient.getQueryData(userDetailQueryKey);
        if (detailData) {
          queryClient.setQueryData(userDetailQueryKey, {
            ...detailData,
            data: {
              ...detailData.data,
              points: serverData.points,
              rank: serverData.rank,
              badge: serverData.badge,
            },
          });
        }
      }

      // Now also invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.users(),
        refetchActive: true,
      });

      // Gọi API xóa cache trên server
      adminService
        .clearUsersCache()
        .catch((err) =>
          console.error("Failed to clear users cache on server:", err)
        );
    },
  });
};

// Dashboard Stats Hooks - Phân tách thành nhiều hooks nhỏ
export const useAdminDashboardBasicStats = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.statsBasic(),
    queryFn: async () => {
      try {
        console.log("Fetching dashboard basic stats data...");
        const response = await adminService.getDashboardBasicStats();
        console.log("Dashboard basic stats fetched successfully");
        return response;
      } catch (error) {
        console.error("Error fetching admin basic stats:", error);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 giờ
    cacheTime: 120 * 60 * 1000, // 2 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

export const useAdminUserGrowthData = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.statsUserGrowth(),
    queryFn: async () => {
      try {
        const response = await adminService.getUserGrowthData();
        return response;
      } catch (error) {
        console.error("Error fetching user growth data:", error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

export const useAdminPostGrowthData = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.statsPostGrowth(),
    queryFn: async () => {
      try {
        const response = await adminService.getPostGrowthData();
        return response;
      } catch (error) {
        console.error("Error fetching post growth data:", error);
        throw error;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 phút
    cacheTime: 60 * 60 * 1000, // 1 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

export const useAdminRecentActivity = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.statsRecentActivity(),
    queryFn: async () => {
      try {
        const response = await adminService.getRecentActivity();
        return response;
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    cacheTime: 15 * 60 * 1000, // 15 phút
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
};

// Original dashboard stats hook for backward compatibility
export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: ADMIN_QUERY_KEYS.stats(),
    queryFn: async () => {
      try {
        console.log("Fetching dashboard stats data...");
        const response = await adminService.getDashboardStats();
        console.log("Dashboard stats fetched successfully");
        return response;
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        throw error;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 giờ
    cacheTime: 120 * 60 * 1000, // 2 giờ
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
  useAdminDashboardBasicStats,
  useAdminUserGrowthData,
  useAdminPostGrowthData,
  useAdminRecentActivity,
  useAdminUserDetails,
  useAdminPostDetails,
  useAdminGroupDetails,
};
