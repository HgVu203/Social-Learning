import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Component để điều hướng từ các route không phù hợp sang đúng route
 * @param {Object} props - Component props
 * @param {string} props.targetPath - Đường dẫn điều hướng đến
 * @param {boolean} props.appendUserId - Có thêm userId của user hiện tại vào đường dẫn không
 * @returns {null} - Component không render gì
 */
const RedirectWrapper = ({ targetPath, appendUserId = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      console.log("RedirectWrapper: Auth is still loading...");
      return;
    }

    // Nếu yêu cầu thêm userId mà user chưa đăng nhập, điều hướng đến trang đăng nhập
    if (appendUserId && !isAuthenticated) {
      console.log(
        "RedirectWrapper: User not authenticated, redirecting to login"
      );
      navigate("/login", { replace: true });
      return;
    }

    let finalPath = targetPath;

    // Nếu cần thêm userId vào đường dẫn
    if (appendUserId && user?._id) {
      finalPath = `${targetPath}/${user._id}`;
      console.log(`RedirectWrapper: Appending user ID to path: ${user._id}`);
    } else if (appendUserId) {
      console.log(
        "RedirectWrapper: User has no ID but authentication is true. This should not happen."
      );
    }

    // Thực hiện điều hướng
    console.log(
      `RedirectWrapper: Redirecting from ${window.location.pathname} to ${finalPath}`
    );
    navigate(finalPath, { replace: true });
  }, [navigate, targetPath, appendUserId, user, isAuthenticated, loading]);

  return null;
};

export default RedirectWrapper;
