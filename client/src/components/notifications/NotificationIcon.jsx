import { useState, useRef, useEffect } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { useNotification } from "../../contexts/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";
import { motion, AnimatePresence } from "framer-motion";

const NotificationIcon = ({ className = "" }) => {
  const { unreadCount } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
        aria-label="Notification Bell"
      >
        <IoMdNotificationsOutline className="text-2xl" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 w-80 h-full bg-[var(--color-bg-primary)] shadow-lg z-50 border-l border-[var(--color-border)]"
          >
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-secondary)]">
                <h3 className="font-semibold text-lg text-[var(--color-text-primary)]">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NotificationDropdown onClose={() => setIsOpen(false)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationIcon;
