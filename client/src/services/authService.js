import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL

const signup = (userData) => {
    return axios.post(`${API_URL}/signup`, userData);
};

const login = (userData) => {
    return axios.post(`${API_URL}/login`, userData);
};

const logout = () => {
    return axios.post(`${API_URL}/logout`);
};

const setPassword = (userData) => {
    return axios.post(`${API_URL}/set-password`, userData);
}

export { signup, login, logout, setPassword };