import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Higher-order component cho các route chỉ hiển thị khi chưa đăng nhập
 * @param {React.Component} Component - Component cần điều kiện
 * @returns {React.Component} - Component gốc hoặc redirect về trang chủ
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Hoặc component Loading
  }

  return !isAuthenticated ? children : <Navigate to="/" />;
};

export default PublicRoute;
