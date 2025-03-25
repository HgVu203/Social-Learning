import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth';

/**
 * Higher-order component cho các route chỉ hiển thị khi chưa đăng nhập
 * @param {React.Component} Component - Component cần điều kiện
 * @returns {React.Component} - Component gốc hoặc redirect về trang chủ
 */
const PublicRoute = ({ children }) => {
  return !isAuthenticated() ? children : <Navigate to="/" />;
};

export default PublicRoute; 