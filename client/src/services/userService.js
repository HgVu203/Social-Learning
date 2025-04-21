import axiosInstance from "./axiosService";

export const userService = {
  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get("/users/profile");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await axiosInstance.patch(
        "/users/update-profile",
        userData
      );
      return response.data;
    } catch (error) {
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
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await axiosInstance.post(
        "/users/change-password",
        passwordData
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUserProfile: async (userId) => {
    try {
      const response = await axiosInstance.get(`/users/profile/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getLeaderboard: async (page = 1, limit = 10) => {
    try {
      const response = await axiosInstance.get("/users/leaderboard", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getSuggestedUsers: async () => {
    try {
      const response = await axiosInstance.get("/users/suggested");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  toggleFollow: async (userId) => {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const response = await axiosInstance.post(`/users/${userId}/follow`);
    return response.data;
  },
};
