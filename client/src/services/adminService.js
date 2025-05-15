import axiosInstance from "./axiosService";

export const adminService = {
  // User Management
  getAllUsers: async (page = 1, limit = 10, searchTerm = "") => {
    try {
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;

      const response = await axiosInstance.get("/admin/users", {
        params,
        timeout: 15000,
      });

      // Detailed logging of user data to debug badge issues
      console.log("Admin users response:", response.data);
      if (response.data?.data?.length > 0) {
        console.log("First user data:", response.data.data[0]);
        console.log("First user badge:", response.data.data[0].badge);

        // Check if any users have badges
        const usersWithBadges = response.data.data.filter(
          (user) => user.badge && user.badge.name
        );
        console.log(
          `Found ${usersWithBadges.length} users with badges:`,
          usersWithBadges.map((u) => ({
            id: u._id,
            username: u.username,
            badge: u.badge,
          }))
        );
      }

      return response.data;
    } catch (error) {
      console.error("Error getting admin users:", error);
      throw error.response?.data || error;
    }
  },

  getUserDetails: async (userId) => {
    try {
      const response = await axiosInstance.get(
        `/admin/users/${userId}/details`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting user details:", error);
      throw error.response?.data || error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/users/${userId}`,
        userData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await axiosInstance.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  toggleUserStatus: async (userId, status) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/users/${userId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Content Management
  getAllPosts: async (page = 1, limit = 10, status = "") => {
    try {
      const params = { page, limit };
      if (status) params.status = status;

      const response = await axiosInstance.get("/admin/posts", {
        params,
        timeout: 15000,
      });

      // Debug logging to check the structure of author data
      console.log("Admin posts response:", response.data);
      if (response.data?.data?.length > 0) {
        console.log("First post author data:", response.data.data[0].author);
      }

      return response.data;
    } catch (error) {
      console.error("Error getting admin posts:", error);
      throw error.response?.data || error;
    }
  },

  updatePost: async (postId, postData) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/posts/${postId}`,
        postData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deletePost: async (postId) => {
    try {
      const response = await axiosInstance.delete(`/admin/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  restorePost: async (postId) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/posts/${postId}/restore`
      );
      console.log("Post restore response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error restoring post:", error);
      throw error.response?.data || error;
    }
  },

  getPostDetails: async (postId) => {
    try {
      const response = await axiosInstance.get(
        `/admin/posts/${postId}/details`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting post details:", error);
      throw error.response?.data || error;
    }
  },

  updatePostStatus: async (postId, status) => {
    try {
      console.log(
        `[Client] Sending updatePostStatus request: postId=${postId}, status=${status}`
      );
      const response = await axiosInstance.patch(
        `/admin/posts/${postId}/status`,
        { status }
      );
      // Log response chi tiết để debug
      console.log("Post status update response:", response.data);
      console.log("Post status from response:", response.data?.data?.status);
      return response.data;
    } catch (error) {
      console.error("Error updating post status:", error);
      throw error.response?.data || error;
    }
  },

  // Group Management
  getAllGroups: async (page = 1, limit = 10) => {
    try {
      const response = await axiosInstance.get("/admin/groups", {
        params: { page, limit },
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching all groups:", error);
      throw error.response?.data || error;
    }
  },

  getGroupDetails: async (groupId) => {
    try {
      const response = await axiosInstance.get(
        `/admin/groups/${groupId}/details`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting group details:", error);
      throw error.response?.data || error;
    }
  },

  updateGroup: async (groupId, groupData) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/groups/${groupId}`,
        groupData
      );
      return response.data;
    } catch (error) {
      console.error("Error in updateGroup:", error);
      throw error.response?.data || error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const response = await axiosInstance.delete(`/admin/groups/${groupId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Points Management
  updateUserPoints: async (userId, points, badge = null) => {
    try {
      console.log(`[Admin Service] Updating user ${userId} points:`, {
        points,
        badge,
      });

      // Tạo data với points và badge (nếu có)
      const data = {
        points: points,
      };

      // Nếu có badge, thêm vào request với đúng cấu trúc
      if (badge) {
        // Make sure we're sending a string, not an object
        if (typeof badge === "object" && badge.name) {
          data.badge = badge.name;
        } else {
          data.badge = badge;
        }
        console.log(`[Admin Service] Setting badge to:`, data.badge);
      }

      const response = await axiosInstance.patch(
        `/admin/users/${userId}/points`,
        data
      );

      console.log("[Admin Service] Update points response:", response.data);

      if (response.data?.data?.badge) {
        console.log(
          `[Admin Service] Server confirmed badge update:`,
          response.data.data.badge
        );
      }

      return response.data;
    } catch (error) {
      console.error("[Admin Service] Error updating user points:", error);
      throw error.response?.data || error;
    }
  },

  // Dashboard Statistics
  getDashboardStats: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats", {
        timeout: 30000,
      });
      console.log(
        "Admin stats API response:",
        response.data ? "data received" : "no data"
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },

  // Các API dashboard mới tách nhỏ
  getDashboardBasicStats: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats/basic");
      return response.data;
    } catch (error) {
      console.error("Error fetching basic stats:", error);
      throw error;
    }
  },

  getUserGrowthData: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats/user-growth");
      return response.data;
    } catch (error) {
      console.error("Error fetching user growth data:", error);
      throw error;
    }
  },

  getPostGrowthData: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats/post-growth");
      return response.data;
    } catch (error) {
      console.error("Error fetching post growth data:", error);
      throw error;
    }
  },

  getRecentActivity: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats/recent-activity");
      return response.data;
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw error;
    }
  },

  // Cache management
  clearAllCache: async () => {
    try {
      const response = await axiosInstance.post("/admin/cache/clear-all");
      return response.data;
    } catch (error) {
      console.error("Error clearing all cache:", error);
      throw error;
    }
  },

  clearStatsCache: async () => {
    try {
      const response = await axiosInstance.post("/admin/cache/stats/clear");
      return response.data;
    } catch (error) {
      console.error("Error clearing stats cache:", error);
      throw error;
    }
  },

  clearPostsCache: async () => {
    try {
      const response = await axiosInstance.post("/admin/cache/posts/clear");
      return response.data;
    } catch (error) {
      console.error("Error clearing posts cache:", error);
      throw error;
    }
  },

  clearUsersCache: async () => {
    try {
      const response = await axiosInstance.post("/admin/cache/users/clear");
      return response.data;
    } catch (error) {
      console.error("Error clearing users cache:", error);
      throw error;
    }
  },

  clearGroupsCache: async () => {
    try {
      const response = await axiosInstance.post("/admin/cache/groups/clear");
      return response.data;
    } catch (error) {
      console.error("Error clearing groups cache:", error);
      throw error;
    }
  },
};
