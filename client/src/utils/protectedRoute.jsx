import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Protected Route Component - Đơn giản hóa chỉ dựa vào isAuthenticated từ AuthContext
 * @returns Outlet nếu đăng nhập, Navigate về login nếu chưa đăng nhập
 */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Hiển thị loading nếu đang kiểm tra auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chỉ kiểm tra isAuthenticated từ AuthContext, không dùng thêm tokenService
  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace={true} />
  );
};

export default ProtectedRoute;
