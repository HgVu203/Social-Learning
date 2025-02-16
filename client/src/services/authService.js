import axiosInstance from './axiosService';

const signup = (userData) => {
    return axiosInstance.post('/auth/signup', userData);
};

const login = async (userData) => {
    const response = await axiosInstance.post('/auth/login', userData);
    if (response.data.success) {
        localStorage.setItem('accessToken', response.data.data.accessToken);
    }
    return response;
};

const logout = () => {
    localStorage.removeItem('accessToken');
    return axiosInstance.post('/auth/logout');
};

const setPassword = (userData) => {
    return axiosInstance.post('/auth/set-password', userData);
};

export { signup, login, logout, setPassword };