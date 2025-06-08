import { useState, useEffect, useRef } from "react";
import { FiBell } from "react-icons/fi";
import NotificationDropdown from "./NotificationDropdown";
import { useNotification } from "../../contexts/NotificationContext";
import { createPortal } from "react-dom";

const NotificationIcon = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { unreadCount } = useNotification();
  const iconRef = useRef(null);
  const [iconPosition, setIconPosition] = useState({ top: 0, right: 0 });

  // Cập nhật vị trí icon khi cần
  useEffect(() => {
    if (showDropdown && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setIconPosition({
        top: rect.bottom,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showDropdown]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        iconRef.current &&
        !iconRef.current.contains(event.target) &&
        !event.target.closest(".notification-dropdown")
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <>
      {/* Notification Bell Icon */}
      <div ref={iconRef} className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-tertiary)] cursor-pointer notification-bell"
          aria-label="Notifications"
        >
          <div className="relative">
            <FiBell className="w-6 h-6 text-[var(--color-text-primary)]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Notification Dropdown hiển thị thông qua Portal ở top-level của DOM */}
      {showDropdown &&
        createPortal(
          <div
            className="notification-dropdown fixed"
            style={{
              top: `${iconPosition.top}px`,
              right: `${iconPosition.right}px`,
              zIndex: 9999,
            }}
          >
            <NotificationDropdown onClose={() => setShowDropdown(false)} />
          </div>,
          document.body
        )}
    </>
  );
};

export default NotificationIcon;
