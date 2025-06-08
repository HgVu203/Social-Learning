import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { FiMoreHorizontal, FiCheck, FiX } from "react-icons/fi";
import { useNotification } from "../../contexts/NotificationContext";
import Avatar from "../common/Avatar";

const NotificationDropdown = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { notifications, markAsRead, markAllAsRead, loading } =
    useNotification();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLocale = i18n.language === "vi" ? vi : enUS;

  const formatTimeDistance = (date) => {
    const distance = formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: currentLocale,
    });
    return distance;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.classList.contains("notification-more-button")
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleReadNotification = async (notificationId) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div
      className="bg-[var(--color-bg-primary)] rounded-lg shadow-lg border border-[var(--color-border)] overflow-hidden"
      style={{ width: "360px" }}
    >
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center sticky top-0 bg-[var(--color-bg-primary)] z-10">
        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t("notifications.title")}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
            title={t("common.close")}
          >
            <FiX className="w-5 h-5" />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="p-1.5 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] notification-more-button"
            >
              <FiMoreHorizontal className="w-5 h-5" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-[var(--color-bg-primary)] rounded-md shadow-lg border border-[var(--color-border)] z-10">
                <div className="py-1">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                  >
                    {t("notifications.markAllRead")}
                  </button>
                  <Link
                    to="/settings/notifications"
                    className="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    onClick={onClose}
                  >
                    {t("notifications.settings")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
        {loading ? (
          <div className="p-4 flex justify-center">
            <div className="animate-spin h-5 w-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--color-text-secondary)]">
              {t("notifications.noNotifications")}
            </p>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-4 hover:bg-[var(--color-bg-hover)] transition-colors ${
                  !notification.read ? "bg-[var(--color-bg-unread)]" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar
                    url={notification.sender?.avatar}
                    size="md"
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <Link
                        to={notification.link || "#"}
                        className="block flex-1"
                        onClick={() => {
                          if (!notification.read) {
                            handleReadNotification(notification._id);
                          }
                          onClose();
                        }}
                      >
                        <div className="text-[var(--color-text-primary)]">
                          {notification.sender?.username ? (
                            <>
                              <span className="font-semibold">
                                {notification.sender.username}
                              </span>{" "}
                              <span>{notification.message}</span>
                            </>
                          ) : (
                            <span>{notification.message}</span>
                          )}
                        </div>
                      </Link>
                      {!notification.read && (
                        <button
                          onClick={() =>
                            handleReadNotification(notification._id)
                          }
                          className="ml-2 p-1 rounded-full hover:bg-[var(--color-bg-tertiary)] text-[var(--color-primary)]"
                          title={t("notifications.markAsRead")}
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                      {formatTimeDistance(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
