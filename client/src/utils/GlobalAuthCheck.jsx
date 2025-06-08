import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Danh sách các đường dẫn công khai không yêu cầu đăng nhập
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/auth/social-callback",
  "/search",
  "/post",
];

// Kiểm tra xem đường dẫn hiện tại có phải là đường dẫn công khai không
const isPublicRoute = (pathname) => {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
};

/**
 * Component kiểm tra xác thực người dùng toàn cục
 * Chỉ điều hướng khi không đăng nhập và truy cập trang được bảo vệ
 */
const GlobalAuthCheck = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Bỏ qua nếu đang tải dữ liệu auth
    if (loading) return;

    // Bỏ qua nếu đã đăng nhập hoặc đang ở đường dẫn công khai
    if (isAuthenticated || isPublicRoute(location.pathname)) return;

    // Điều hướng về trang đăng nhập nếu chưa đăng nhập và không phải đường dẫn công khai
    navigate("/login", {
      state: { from: location.pathname },
      replace: true,
    });
  }, [isAuthenticated, loading, navigate, location.pathname]);

  // Component này không render gì cả
  return null;
};

export default GlobalAuthCheck;
