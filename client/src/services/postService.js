import axiosInstance from "./axiosService";

export const postService = {
  createPost: async (postData) => {
    const response = await axiosInstance.post("/posts", postData);
    return response.data;
  },

  getAllPosts: async (page = 1, limit = 10) => {
    const response = await axiosInstance.get("/posts", {
      params: { page, limit },
    });
    return response.data;
  },

  getPostById: async (postId) => {
    const response = await axiosInstance.get(`/posts/${postId}`);
    return response.data;
  },

  updatePost: async (postId, postData) => {
    const response = await axiosInstance.put(`/posts/${postId}`, postData);
    return response.data;
  },

  deletePost: async (postId) => {
    const response = await axiosInstance.delete(`/posts/${postId}`);
    return response.data;
  },

  likePost: async (postId) => {
    const response = await axiosInstance.post(`/posts/${postId}/like`);
    return response.data;
  },

  unlikePost: async (id) => {
    const response = await axiosInstance.delete(`/posts/${id}/like`);
    return response.data;
  },

  addComment: async (postId, comment, parentId, image) => {
    const commentData = {
      comment,
      parentId,
    };

    if (image) {
      commentData.image = image;
    }

    const response = await axiosInstance.post(
      `/posts/${postId}/comments`,
      commentData
    );
    return response.data;
  },

  deleteComment: async (postId, commentId) => {
    const response = await axiosInstance.delete(
      `/posts/${postId}/comments/${commentId}`
    );
    return response.data;
  },

  getComments: async (postId) => {
    const response = await axiosInstance.get(`/posts/${postId}/comments`);
    return response.data;
  },

  getRecommendedPosts: async (limit = 10) => {
    const response = await axiosInstance.get("/posts/recommended", {
      params: { limit },
    });
    return response.data;
  },

  searchPosts: async ({ query, page = 1, limit = 10 }) => {
    const response = await axiosInstance.get("/posts/search", {
      params: { query, page, limit },
    });
    return response.data;
  },
};
