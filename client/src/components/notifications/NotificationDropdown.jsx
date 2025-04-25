import { useNotification } from "../../contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { IoMdCheckmarkCircleOutline, IoMdTrash } from "react-icons/io";
import { Link } from "react-router-dom";

const NotificationDropdown = ({ onClose }) => {
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotification();

  // Extract username from notification message (fallback for older notifications)
  const extractUsername = (message) => {
    const match = message.match(/^([^\s]+)/);
    return match ? match[1] : null;
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    onClose();
  };

  // Generate link based on notification type
  const getNotificationLink = (notification) => {
    // If notification has sender info, link to their profile
    if (notification.sender && notification.sender._id) {
      return `/profile/${notification.sender._id}`;
    }

    // Otherwise use default routes based on type
    switch (notification.type) {
      case "friend_request":
        return "/friends";
      case "friend_accepted":
        return "/friends";
      case "comment":
        return `/posts/${notification.relatedId}`;
      case "like":
        return `/posts/${notification.relatedId}`;
      default:
        return "/";
    }
  };

  return (
    <div className="h-full">
      {/* Filter options */}
      <div className="px-4 py-2 border-b border-[var(--color-border)] flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button className="text-sm font-medium text-[var(--color-primary)]">
            All
          </button>
          <button className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            Unread
          </button>
        </div>
        <button
          onClick={markAllAsRead}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Notifications content */}
      <div className="overflow-y-auto">
        {loading ? (
          <div className="py-4 px-4 text-center">
            <div className="animate-pulse w-full h-4 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
            <div className="animate-pulse w-3/4 h-4 bg-[var(--color-bg-tertiary)] rounded mb-2"></div>
            <div className="animate-pulse w-1/2 h-4 bg-[var(--color-bg-tertiary)] rounded"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 px-4 text-center text-[var(--color-text-secondary)]">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-[var(--color-text-primary)]">
              No notifications yet
            </p>
            <p className="text-sm mt-1">
              We'll notify you when something happens
            </p>
          </div>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <motion.li
                key={notification._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors ${
                  !notification.read ? "bg-[var(--color-bg-tertiary)]" : ""
                }`}
              >
                <Link
                  to={getNotificationLink(notification)}
                  onClick={() => handleNotificationClick(notification)}
                  className="block px-4 py-3"
                >
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg mr-3 mt-0.5 overflow-hidden">
                      {notification.sender ? (
                        <img
                          src={
                            notification.sender.avatar ||
                            `https://ui-avatars.com/api/?name=${
                              notification.sender.username || "U"
                            }&background=random`
                          }
                          alt={notification.sender.username || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={`https://ui-avatars.com/api/?name=${
                            extractUsername(notification.message) || "U"
                          }&background=random`}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {notification.message}
                      </p>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 ml-2 self-center">
                      {!notification.read ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(notification._id);
                          }}
                          className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-bg-tertiary)] rounded-full"
                          title="Mark as read"
                        >
                          <IoMdCheckmarkCircleOutline className="w-5 h-5" />
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1 text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-[var(--color-bg-tertiary)] rounded-full"
                        title="Delete notification"
                      >
                        <IoMdTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
