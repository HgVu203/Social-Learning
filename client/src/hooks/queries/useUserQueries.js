import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

export const USER_QUERY_KEYS = {
  all: ["users"],
  me: ["users", "me"],
  profile: () => [...USER_QUERY_KEYS.all, "profile"],
  userProfile: (userId) => [...USER_QUERY_KEYS.profile(), userId],
  search: () => [...USER_QUERY_KEYS.all, "search"],
  searchResults: (query) => [...USER_QUERY_KEYS.search(), query],
  detail: (userId) => [...USER_QUERY_KEYS.all, "detail", userId],
  followers: (userId) => [...USER_QUERY_KEYS.detail(userId), "followers"],
  following: (userId) => [...USER_QUERY_KEYS.detail(userId), "following"],
};

/**
 * Lấy profile user, truyền thêm page, limit để phân trang bài viết của user.
 * Support cho lazy loading và placeholders với options
 * @param {string} userId
 * @param {Object} options Các tùy chọn cho query
 * @returns react-query useQuery
 */
export const useUserProfile = (userId, options = {}) => {
  const {
    page = 1,
    limit = 5,
    includePosts = true,
    placeholderData,
    select,
    onSuccess,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: [
      ...USER_QUERY_KEYS.userProfile(userId),
      { page, limit, includePosts },
    ],
    queryFn: async ({ signal }) => {
      if (!userId) {
        return null;
      }

      let apiPath = `/users/profile/${userId}`;
      // Nếu là current user (không có userId cụ thể) thì dùng endpoint myProfile
      if (userId === "me") {
        apiPath = "/users/profile";
      }

      const response = await axiosService.get(apiPath, {
        params: {
          page,
          limit,
          includePosts,
        },
        signal,
      });

      return response.data;
    },
    enabled: enabled && !!userId,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 phút
    cacheTime: 1000 * 60 * 5, // 5 phút
    placeholderData,
    select,
    onSuccess,
  });
};

export const useSearchUsers = (query, options = {}) => {
  const { page = 1, limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: [...USER_QUERY_KEYS.searchResults(query), { page, limit }],
    queryFn: async ({ signal }) => {
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            totalPages: 0,
          },
        };
      }

      try {
        const response = await axiosService.get(`/users/search`, {
          params: { query, page, limit },
          signal,
        });

        return response.data;
      } catch (error) {
        console.error("Error searching users:", error.message || error);

        return {
          success: false,
          data: [],
          error:
            error.response?.data?.error ||
            error.message ||
            "Error searching users. Please try again later.",
          pagination: {
            total: 0,
            page: page,
            totalPages: 0,
          },
        };
      }
    },
    enabled: enabled && !!query && query.trim().length >= 2,
    staleTime: 1000 * 60,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (userData) => {
      const response = await axiosService.patch(
        `/users/update-profile`,
        userData
      );
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate cache theo trình tự ưu tiên
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.all,
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });

      // Nếu có user ID, invalidate cụ thể profile của user đó
      if (data?.data?._id) {
        queryClient.invalidateQueries({
          queryKey: USER_QUERY_KEYS.userProfile(data.data._id),
        });
      }
    },
  });

  const changePassword = useMutation({
    mutationFn: async (passwordData) => {
      const response = await axiosService.put(`/users/password`, passwordData);
      return response.data;
    },
  });

  return {
    updateProfile,
    changePassword,
  };
};

export const useUserFollowers = (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;

  return useQuery({
    queryKey: [...USER_QUERY_KEYS.followers(userId), { page, limit }],
    queryFn: async () => {
      if (!userId)
        return {
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        };

      const response = await axiosService.get(`/users/${userId}/followers`, {
        params: { page, limit },
      });

      return response.data;
    },
    ...options,
    enabled: !!userId && options.enabled !== false,
  });
};

export const useUserFollowing = (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;

  return useQuery({
    queryKey: [...USER_QUERY_KEYS.following(userId), { page, limit }],
    queryFn: async () => {
      if (!userId)
        return {
          data: [],
          pagination: { total: 0, page, limit, totalPages: 0 },
        };

      const response = await axiosService.get(`/users/${userId}/following`, {
        params: { page, limit },
      });

      return response.data;
    },
    ...options,
    enabled: !!userId && options.enabled !== false,
  });
};

export const useUserQueries = {
  useUserProfile,
  useSearchUsers,
  useUserFollowers,
  useUserFollowing,
};

export default useUserQueries;
