import axiosInstance from "./axiosService";

export const adminService = {
  // User Management
  getAllUsers: async (page = 1, limit = 10, searchTerm = "") => {
    try {
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;

      const response = await axiosInstance.get("/admin/users", { params });
      console.log("Admin users response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error getting admin users:", error);
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

      const response = await axiosInstance.get("/admin/posts", { params });

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
      });
      return response.data;
    } catch (error) {
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
      const data = { points };
      if (badge) data.badge = badge;

      const response = await axiosInstance.patch(
        `/admin/users/${userId}/points`,
        data
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Dashboard Statistics
  getDashboardStats: async () => {
    try {
      const response = await axiosInstance.get("/admin/stats");
      console.log(
        "Admin stats API response:",
        JSON.stringify(response.data, null, 2)
      );
      if (!response.data.success) {
        throw new Error(
          response.data.error || "Failed to fetch dashboard stats"
        );
      }
      return response.data;
    } catch (error) {
      console.error("Error getting admin stats:", error);
      throw error.response?.data || error;
    }
  },
};
