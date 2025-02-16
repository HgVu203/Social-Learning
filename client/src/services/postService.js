import axiosInstance from './axiosService';

const createPost = (postData) => {
    return axiosInstance.post('/posts', postData);
};

const getPosts = () => {
    return axiosInstance.get('/posts');
};

const getPostById = (postId) => {
    return axiosInstance.get(`/posts/${postId}`);
};

const updatePost = (postId, postData) => {
    return axiosInstance.put(`/posts/${postId}`, postData);
};

const deletePost = (postId) => {
    return axiosInstance.delete(`/posts/${postId}`);
};

export { createPost, getPosts, getPostById, updatePost, deletePost };