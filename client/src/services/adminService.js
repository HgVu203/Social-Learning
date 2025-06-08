import axiosInstance from "./axiosService";

export const adminService = {
  // User Management
  getAllUsers: async (
    page = 1,
    limit = 10,
    searchTerm = "",
    searchField = "all"
  ) => {
    try {
      const params = { page, limit };
      if (searchTerm) {
        params.search = searchTerm;
        params.field = searchField;
      }

      const response = await axiosInstance.get("/admin/users", {
        params,
        timeout: 15000,
      });

      return response.data;
    } catch (error) {
      console.error("Error getting admin users:", error.message || error);
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
      console.error("Error getting user details:", error.message || error);
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
  getAllPosts: async (page = 1, limit = 10, status = "", search = null) => {
    try {
      const params = { page, limit };
      if (status) params.status = status;

      // Add search parameters if provided
      if (search) {
        if (search.term) {
          params.searchTerm = search.term;
          params.searchField = search.field || "all";
        }

        // Add spam filter parameter if provided
        if (search.isSpam !== undefined) {
          params.isSpam = search.isSpam;
        }

        // Add duplicate content detection parameter if provided
        if (search.findDuplicates !== undefined) {
          params.findDuplicates = search.findDuplicates;
        }
      }

      const response = await axiosInstance.get("/admin/posts", {
        params,
        timeout: 15000,
      });

      return response.data;
    } catch (error) {
      console.error("Error getting admin posts:", error.message || error);
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
      return response.data;
    } catch (error) {
      console.error("Error restoring post:", error.message || error);
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
      console.error("Error getting post details:", error.message || error);
      throw error.response?.data || error;
    }
  },

  updatePostStatus: async (postId, status) => {
    try {
      const response = await axiosInstance.patch(
        `/admin/posts/${postId}/status`,
        { status }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating post status:", error.message || error);
      throw error.response?.data || error;
    }
  },

  // Group Management
  getAllGroups: async (
    page = 1,
    limit = 10,
    searchTerm = "",
    searchField = "all"
  ) => {
    try {
      const params = { page, limit };
      if (searchTerm) {
        params.search = searchTerm;
        params.field = searchField;
      }

      const response = await axiosInstance.get("/admin/groups", {
        params,
        timeout: 15000,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching all groups:", error.message || error);
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
      console.error("Error getting group details:", error.message || error);
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

  // Content Moderation - Phát hiện nội dung nhạy cảm
  analyzePostContent: async (postId) => {
    try {
      const response = await axiosInstance.post(
        `/admin/posts/${postId}/analyze-content`
      );
      return response.data;
    } catch (error) {
      console.error("Error analyzing post content:", error.message || error);
      throw error.response?.data || error;
    }
  },

  analyzeAllPostsContent: async (statusFilter = "") => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      console.log(`[Admin Service] Analyzing all posts with filter:`, params);

      // Thêm empty object body để đảm bảo đây là request POST hợp lệ
      const response = await axiosInstance.post(
        "/admin/posts/analyze-all-content",
        {}, // Empty object body thay vì null
        {
          params,
          timeout: 120000, // 120s timeout
          headers: {
            "Content-Type": "application/json", // Đảm bảo header đúng
          },
        }
      );

      console.log(`[Admin Service] Analysis complete:`, response.data);

      if (!response.data) {
        throw new Error("No data returned from server");
      }

      return response.data;
    } catch (error) {
      console.error("[Admin Service] Error analyzing all posts:", error);

      if (error.response?.status === 400) {
        console.error("[Admin Service] Bad request:", error.response.data);
      } else if (error.response?.status === 500) {
        console.error("[Admin Service] Server error:", error.response.data);
      }

      // Thêm thông tin chi tiết về lỗi
      const errorMessage =
        error.response?.data?.error || error.message || "Unknown error";

      throw {
        response: {
          data: {
            success: false,
            error: `Failed to analyze posts: ${errorMessage}`,
          },
          status: error.response?.status || 500,
        },
      };
    }
  },

  analyzeDuplicateContent: async (statusFilter = "") => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      console.log(
        `[Admin Service] Analyzing duplicate content with filter:`,
        params
      );

      // Gọi API phân tích bài viết trùng lặp
      const response = await axiosInstance.post(
        "/admin/posts/analyze-duplicate-content",
        {}, // Empty object body
        {
          params,
          timeout: 120000, // 120s timeout
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        `[Admin Service] Duplicate content analysis complete:`,
        response.data
      );

      if (!response.data) {
        throw new Error("No data returned from server");
      }

      return response.data;
    } catch (error) {
      console.error(
        "[Admin Service] Error analyzing duplicate content:",
        error
      );

      // Thêm thông tin chi tiết về lỗi
      const errorMessage =
        error.response?.data?.error || error.message || "Unknown error";

      throw {
        response: {
          data: {
            success: false,
            error: `Failed to analyze duplicate content: ${errorMessage}`,
          },
          status: error.response?.status || 500,
        },
      };
    }
  },

  // Lấy danh sách các bài viết có nội dung vi phạm
  getOffensivePosts: async (page = 1, limit = 10, severity = null) => {
    try {
      const params = { page, limit };

      if (severity) {
        params.severity = severity;
      }

      console.log(
        `[Admin Service] Fetching offensive posts with params:`,
        params
      );

      const response = await axiosInstance.get(
        "/admin/posts/offensive-content",
        { params }
      );

      console.log(
        `[Admin Service] Found ${
          response.data?.data?.length || 0
        } offensive posts`
      );
      return response.data;
    } catch (error) {
      console.error("[Admin Service] Error fetching offensive posts:", error);
      throw error.response?.data || error;
    }
  },
};
