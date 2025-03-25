import { Navigate } from 'react-router-dom';
import { isAuthenticated } from './auth';

/**
 * Higher-order component để bảo vệ route, yêu cầu người dùng đăng nhập
 * @param {React.Component} Component - Component cần bảo vệ
 * @returns {React.Component} - Component được bảo vệ hoặc redirect tới trang đăng nhập
 */
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;