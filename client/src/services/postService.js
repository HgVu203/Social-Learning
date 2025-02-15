import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL.replace('/auth', '/posts');

const createPost = (postData) => {
    return axios.post(`${API_URL}/`, postData, { withCredentials: true });
};

const getPosts = () => {
    return axios.get(`${API_URL}/`, { withCredentials: true });
};

const getPostById = (postId) => {
    return axios.get(`${API_URL}/${postId}`, { withCredentials: true });
};

const updatePost = (postId, postData) => {
    return axios.put(`${API_URL}/${postId}`, postData, { withCredentials: true });
};

const deletePost = (postId) => {
    return axios.delete(`${API_URL}/${postId}`, { withCredentials: true });
};

export { createPost, getPosts, getPostById, updatePost, deletePost };