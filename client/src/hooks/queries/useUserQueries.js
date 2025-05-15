import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

export const USER_QUERY_KEYS = {
  all: ["users"],
  me: ["users", "me"],
  profile: () => [...USER_QUERY_KEYS.all, "profile"],
  userProfile: (userId) => [...USER_QUERY_KEYS.profile(), userId],
  search: () => [...USER_QUERY_KEYS.all, "search"],
  searchResults: (query) => [...USER_QUERY_KEYS.search(), query],
};

/**
 * Lấy profile user, truyền thêm postPage, postLimit để phân trang bài viết của user.
 * @param {string} userId
 * @param {number} postPage
 * @param {number} postLimit
 * @returns react-query useQuery
 */
export const useUserProfile = (userId, postPage = 1, postLimit = 5) => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.userProfile(userId),
    queryFn: async () => {
      if (!userId) {
        return null;
      }

      const apiPath = `/users/profile/${userId}`;
      const response = await axiosService.get(apiPath, {
        params: { postPage, postLimit },
      });
      return response.data;
    },
    enabled: !!userId,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 0,
    cacheTime: 1000 * 60 * 5,
  });
};

export const useSearchUsers = (query, options = {}) => {
  const { page = 1, limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: [...USER_QUERY_KEYS.searchResults(query), { page, limit }],
    queryFn: async () => {
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
        });

        return response.data;
      } catch (error) {
        console.error("Error searching users:", error);

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
      console.log("Updating profile with data:", userData);
      const response = await axiosService.patch(
        `/users/update-profile`,
        userData
      );
      console.log("Profile update API response:", response.data);
      return response.data;
    },
    onSuccess: () => {
      console.log("Profile update successful, invalidating queries");
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.all,
      });
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (passwordData) => {
      console.log("Changing password");
      const response = await axiosService.put(`/users/password`, passwordData);
      return response.data;
    },
  });

  return {
    updateProfile,
    changePassword,
  };
};

export const useUserQueries = {
  useUserProfile,
  useSearchUsers,
};

export default useUserQueries;
