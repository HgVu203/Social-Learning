import { useState, useEffect } from "react";
import { isUserOnline, subscribeToUserStatus } from "../../socket";

/**
 * Component hiển thị trạng thái online/offline của một người dùng
 * @param {Object} props
 * @param {string} props.userId - ID của người dùng cần hiển thị trạng thái
 * @param {string} props.className - Class CSS bổ sung
 * @param {boolean} props.showText - Có hiển thị text (Online/Offline) không
 * @param {Object} props.style - Các style bổ sung
 */
const OnlineStatus = ({
  userId,
  className = "",
  showText = false,
  style = {},
}) => {
  const [isOnline, setIsOnline] = useState(isUserOnline(userId));

  // Lắng nghe sự thay đổi trạng thái
  useEffect(() => {
    // Kiểm tra trạng thái ban đầu
    setIsOnline(isUserOnline(userId));

    // Đăng ký lắng nghe thay đổi trạng thái
    const unsubscribe = subscribeToUserStatus((data) => {
      if (data.userId === userId) {
        setIsOnline(data.isOnline);
      }
    });

    // Lắng nghe sự kiện cập nhật trạng thái từ bất kỳ nguồn nào
    const handleStatusChange = (event) => {
      if (event.detail && event.detail.userId === userId) {
        setIsOnline(event.detail.isOnline);
      }
    };

    window.addEventListener("user_status_change", handleStatusChange);
    window.addEventListener("online_users_updated", () => {
      setIsOnline(isUserOnline(userId));
    });

    return () => {
      unsubscribe();
      window.removeEventListener("user_status_change", handleStatusChange);
      window.removeEventListener("online_users_updated", () => {
        setIsOnline(isUserOnline(userId));
      });
    };
  }, [userId]);

  // Xác định styling cho dấu hiệu online
  const indicatorStyle = {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: isOnline ? "#22c55e" : "#9ca3af",
    boxShadow: isOnline ? "0 0 0 2px white" : "none",
    display: "inline-block",
    marginRight: showText ? "6px" : 0,
    ...style,
  };

  return (
    <div className={`flex items-center ${className}`}>
      <span style={indicatorStyle}></span>
      {showText && (
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
};

export default OnlineStatus;
