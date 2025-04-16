import { useState } from "react";
import { FiUserPlus, FiUserCheck, FiClock } from "react-icons/fi";
import { showConfirmToast } from "../../utils/toast";
import { useFriend } from "../../contexts/FriendContext";

// Các trạng thái có thể:
// - NOT_FRIEND: Chưa là bạn bè
// - FRIEND: Đã là bạn bè
// - PENDING_SENT: Đã gửi lời mời kết bạn, đang chờ chấp nhận
// - PENDING_RECEIVED: Đã nhận lời mời kết bạn, chưa xử lý

const FriendRequestButton = ({
  userId,
  initialStatus = "NOT_FRIEND",
  requestId = null,
  onStatusChange,
}) => {
  const { sendFriendRequest, rejectFriendRequest, removeFriend } = useFriend();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleSendRequest = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await sendFriendRequest.mutateAsync(userId);
      setStatus("PENDING_SENT");
      if (onStatusChange) onStatusChange("PENDING_SENT");
    } catch (error) {
      console.error("Failed to send friend request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (loading || !requestId) return;

    showConfirmToast("Bạn có chắc muốn hủy lời mời kết bạn?", async () => {
      setLoading(true);
      try {
        await rejectFriendRequest.mutateAsync(requestId);
        setStatus("NOT_FRIEND");
        if (onStatusChange) onStatusChange("NOT_FRIEND");
      } catch (error) {
        console.error("Failed to cancel friend request:", error);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleUnfriend = async () => {
    if (loading) return;

    showConfirmToast("Bạn có chắc muốn hủy kết bạn?", async () => {
      setLoading(true);
      try {
        await removeFriend.mutateAsync(userId);
        setStatus("NOT_FRIEND");
        if (onStatusChange) onStatusChange("NOT_FRIEND");
      } catch (error) {
        console.error("Failed to unfriend:", error);
      } finally {
        setLoading(false);
      }
    });
  };

  // Render nút phù hợp với trạng thái hiện tại
  const renderButton = () => {
    switch (status) {
      case "NOT_FRIEND":
        return (
          <button
            onClick={handleSendRequest}
            disabled={loading}
            className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <FiUserPlus className="mr-1" />
            <span>{loading ? "Đang xử lý..." : "Kết bạn"}</span>
          </button>
        );

      case "FRIEND":
        return (
          <button
            onClick={handleUnfriend}
            disabled={loading}
            className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <FiUserCheck className="mr-1" />
            <span>{loading ? "Đang xử lý..." : "Bạn bè"}</span>
          </button>
        );

      case "PENDING_SENT":
        return (
          <button
            onClick={handleCancelRequest}
            disabled={loading}
            className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <FiClock className="mr-1" />
            <span>{loading ? "Đang xử lý..." : "Đã gửi lời mời"}</span>
          </button>
        );

      case "PENDING_RECEIVED":
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onStatusChange) onStatusChange("HANDLE_ACCEPT", requestId);
              }}
              disabled={loading}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <span>Chấp nhận</span>
            </button>
            <button
              onClick={() => {
                if (onStatusChange) onStatusChange("HANDLE_REJECT", requestId);
              }}
              disabled={loading}
              className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              <span>Từ chối</span>
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return renderButton();
};

export default FriendRequestButton;
