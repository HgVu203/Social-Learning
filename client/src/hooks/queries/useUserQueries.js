import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

export const USER_QUERY_KEYS = {
  all: ["users"],
  profile: () => [...USER_QUERY_KEYS.all, "profile"],
  userProfile: (userId) => [...USER_QUERY_KEYS.profile(), userId],
  search: () => [...USER_QUERY_KEYS.all, "search"],
  searchResults: (query) => [...USER_QUERY_KEYS.search(), query],
};

export const useUserProfile = (userId) => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.userProfile(userId),
    queryFn: async () => {
      if (!userId) {
        console.log("No userId provided to useUserProfile, returning null");
        return null;
      }

      // Cố gắng xử lý ID để đảm bảo đúng định dạng
      let formattedUserId = userId;

      // Nếu ID có định dạng MongoDB ObjectId (24 ký tự hex)
      if (typeof userId === "string" && /^[0-9a-fA-F]{24}$/.test(userId)) {
        console.log(`userId appears to be a valid MongoDB ObjectId: ${userId}`);
      }
      // Nếu ID có thể ở định dạng khác (có thể bỏ qua đoạn này nếu không cần)
      else if (typeof userId === "string") {
        console.log(`userId may have unusual format: ${userId}`);
        // Có thể thực hiện xử lý đặc biệt nếu cần
      }

      try {
        console.log(`Fetching user profile for userId: ${formattedUserId}`);

        // Log đường dẫn API để debug
        const apiPath = `/user/profile/${formattedUserId}`;
        console.log(`Requesting API: ${apiPath}`);

        const response = await axiosService.get(apiPath);
        console.log(`User profile API response status: ${response.status}`);
        console.log(`User profile API response data:`, response.data);

        // Kiểm tra dữ liệu trả về và đảm bảo nó có định dạng đúng
        if (response.data && !response.data.data) {
          // Nếu API trả về dữ liệu nhưng không có thuộc tính data, tạo cấu trúc đúng
          const result = {
            success: true,
            data: response.data,
          };
          console.log("Transformed user profile data:", result);
          return result;
        }

        console.log("Original user profile data fetched:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching user profile:", error);
        console.error("Error details:", error.response?.data || error.message);
        console.error("Error status:", error.response?.status);
        console.error("Error request URL:", error.config?.url);

        if (error.response?.status === 404) {
          console.log("User not found (404 error). Returning empty profile.");
          return { success: false, data: null, error: "User not found" };
        }

        throw error;
      }
    },
    enabled: !!userId,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

export const useSearchUsers = (query) => {
  return useQuery({
    queryKey: USER_QUERY_KEYS.searchResults(query),
    queryFn: async () => {
      if (!query || query.trim().length < 2) return { results: [] };
      console.log(`Searching users with query: ${query}`);
      const response = await axiosService.get(`/users/search`, {
        params: { query },
      });
      console.log("Search users response:", response.data);
      return response.data;
    },
    enabled: !!query && query.trim().length >= 2,
  });
};

export const useUserMutations = () => {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (userData) => {
      console.log("Updating user profile with data:", userData);
      const response = await axiosService.put(`/users/profile`, userData);
      console.log("Update profile response:", response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Profile update success, invalidating queries");
      // Invalidate the user's profile
      queryClient.invalidateQueries({
        queryKey: USER_QUERY_KEYS.userProfile(variables.userId),
      });
      // Also invalidate auth session as user data might have changed
      queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });

  const changePassword = useMutation({
    mutationFn: async (passwordData) => {
      console.log("Changing password");
      const response = await axiosService.put(`/users/password`, passwordData);
      console.log("Change password response:", response.data);
      return response.data;
    },
  });

  return {
    updateProfile,
    changePassword,
  };
};

// Add a useUserQueries object that combines all the query hooks
export const useUserQueries = {
  useUserProfile,
  useSearchUsers,
};

export default useUserQueries;
