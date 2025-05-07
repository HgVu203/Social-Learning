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
  const { user } = useAuth();

  useEffect(() => {
    let finalPath = targetPath;

    // Nếu cần thêm userId vào đường dẫn
    if (appendUserId && user?._id) {
      finalPath = `${targetPath}/${user._id}`;
    }

    // Thực hiện điều hướng
    console.log(`Redirecting from ${window.location.pathname} to ${finalPath}`);
    navigate(finalPath, { replace: true });
  }, [navigate, targetPath, appendUserId, user]);

  return null;
};

export default RedirectWrapper;
