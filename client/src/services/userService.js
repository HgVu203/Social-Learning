import axiosInstance from "./axiosService";

// Thêm cache nhẹ trên client để giảm lượng request
const userProfileCache = new Map();
const cacheTimeout = 60000; // 1 phút

const clearCacheByKey = (keyPattern) => {
  for (const key of userProfileCache.keys()) {
    if (key.includes(keyPattern)) {
      userProfileCache.delete(key);
    }
  }
};

// Thêm hàm mới để xóa cache cho một userId cụ thể
const clearUserCache = (userId) => {
  if (!userId) return;

  console.log(`[userService] Clearing cache for user: ${userId}`);
  clearCacheByKey(`profile_${userId}`);

  // Xóa cache liên quan đến API follow/unfollow
  localStorage.removeItem(`user_profile_${userId}`);

  // Log số lượng cache entries đã xóa
  console.log(
    `[userService] Cache entries after clearing: ${userProfileCache.size}`
  );
};

export const userService = {
  getCurrentUser: async () => {
    try {
      const cacheKey = "current_user";
      const cachedData = userProfileCache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
        return cachedData.data;
      }

      const response = await axiosInstance.get("/users/profile", {
        timeout: 10000, // Giảm timeout xuống 10s
      });

      // Lưu vào cache
      userProfileCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateProfile: async (userData) => {
    try {
      console.log("userService - Updating profile with data:", userData);

      const response = await axiosInstance.patch(
        "/users/update-profile",
        userData,
        { timeout: 15000 } // Tăng timeout để xử lý upload ảnh
      );

      console.log("userService - Update profile response:", response.data);

      // Xóa tất cả cache liên quan đến user profile
      console.log("userService - Clearing cache");
      userProfileCache.clear(); // Xóa toàn bộ cache để đảm bảo dữ liệu mới nhất

      return response.data;
    } catch (error) {
      console.error("userService - Update profile error:", error);
      throw error.response?.data || error;
    }
  },

  updateAvatar: async (formData) => {
    try {
      const response = await axiosInstance.patch(
        "/users/update-profile",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 15000,
        }
      );

      // Xóa cache liên quan đến user profile
      clearCacheByKey("current_user");
      clearCacheByKey("profile_");

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await axiosInstance.post(
        "/users/change-password",
        passwordData,
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserProfile: async (userId, options = {}) => {
    try {
      const { page = 1, limit = 5, includePosts = true } = options;
      const cacheKey = `profile_${userId}_p${page}_l${limit}_posts${includePosts}`;
      const cachedData = userProfileCache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
        return cachedData.data;
      }

      const response = await axiosInstance.get(`/users/profile/${userId}`, {
        params: { page, limit, includePosts },
        timeout: 10000,
      });

      // Lưu vào cache
      userProfileCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getLeaderboard: async (page = 1, limit = 10) => {
    try {
      const cacheKey = `leaderboard_${page}_${limit}`;
      const cachedData = userProfileCache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
        return cachedData.data;
      }

      const response = await axiosInstance.get("/users/leaderboard", {
        params: { page, limit },
        timeout: 10000,
      });

      // Lưu vào cache
      userProfileCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getSuggestedUsers: async () => {
    try {
      const cacheKey = "suggested_users";
      const cachedData = userProfileCache.get(cacheKey);

      if (cachedData && Date.now() - cachedData.timestamp < cacheTimeout) {
        return cachedData.data;
      }

      const response = await axiosInstance.get("/users/suggested", {
        timeout: 10000,
      });

      // Lưu vào cache
      userProfileCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  toggleFollow: async (userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Xóa các cache liên quan
    clearCacheByKey("suggested_users");
    clearCacheByKey(`profile_${userId}`);
    userProfileCache.clear(); // Xóa toàn bộ cache

    const response = await axiosInstance.post(
      `/users/${userId}/follow`,
      {},
      {
        timeout: 10000,
      }
    );
    return response.data;
  },

  followUser: async (userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      // Xóa cache trước khi gọi API để tránh sử dụng cached data cũ
      clearUserCache(userId);
      clearCacheByKey("suggested_users");

      const response = await axiosInstance.post(
        `/users/${userId}/follow/add`,
        {},
        {
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[userService] Error following user ${userId}:`, error);
      throw error.response?.data || error;
    }
  },

  unfollowUser: async (userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    try {
      // Xóa cache trước khi gọi API để tránh sử dụng cached data cũ
      clearUserCache(userId);
      clearCacheByKey("suggested_users");

      const response = await axiosInstance.post(
        `/users/${userId}/follow/remove`,
        {},
        {
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error) {
      console.error(`[userService] Error unfollowing user ${userId}:`, error);
      throw error.response?.data || error;
    }
  },

  updatePoints: async (data) => {
    try {
      const response = await axiosInstance.post("/users/update-points", data, {
        timeout: 10000,
      });

      // Xóa cache liên quan đến user profile
      clearCacheByKey("current_user");

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Thêm hàm mới để xóa cache
  clearUserCache,
};
