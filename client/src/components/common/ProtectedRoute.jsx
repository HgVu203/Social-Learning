import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated } from '../../utils/auth';
import { useSelector } from 'react-redux';

/**
 * Route component yêu cầu xác thực, bảo vệ các trang private
 * Chỉ hiển thị nội dung nếu đã đăng nhập, nếu không thì chuyển hướng đến trang đăng nhập
 */
const ProtectedRoute = () => {
  const { loading } = useSelector(state => state.auth);

  // Hiển thị loading khi đang kiểm tra authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Chuyển hướng đến trang đăng nhập nếu chưa xác thực
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Nếu đã xác thực, hiển thị nội dung con
  return <Outlet />;
};

export default ProtectedRoute; 