import axiosInstance from "./axiosService";

export const userService = {
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get("/user/profile");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await axiosInstance.patch("/user/update-profile", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateAvatar: async (formData) => {
    try {
      const response = await axiosInstance.patch("/user/update-profile", formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  changePassword: async (passwords) => {
    try {
      const response = await axiosInstance.put(
        "/user/change-password",
        passwords
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      // If userId is not provided, get current user's profile
      const url = userId ? `/user/profile/${userId}` : '/user/profile';
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getLeaderboard: async (page = 1, limit = 10) => {
    try {
      const response = await axiosInstance.get("/user/leaderboard", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getSuggestedUsers: async () => {
    try {
      const response = await axiosInstance.get("/user/suggested");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  followUser: async (userId) => {
    try {
      const response = await axiosInstance.post(`/user/${userId}/follow`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  unfollowUser: async (userId) => {
    try {
      const response = await axiosInstance.post(`/user/${userId}/unfollow`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
