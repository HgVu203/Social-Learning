import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/common/Avatar";
import { motion } from "framer-motion";
import { FiSettings, FiX } from "react-icons/fi";
import { IoGameControllerOutline } from "react-icons/io5";
import { SkeletonSidebar } from "../skeleton";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Tất cả menu items, không phân biệt private/public
  const allMenuItems = [
    {
      name: "Home",
      path: "/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 2.09L1 12h3v9h7v-6h2v6h7v-9h3L12 2.09zm0 2.82L19 12v7h-3v-6H8v6H5v-7l7-7.09z" />
        </svg>
      ),
    },
    {
      name: "Games",
      path: "/game",
      icon: <IoGameControllerOutline className="w-6 h-6" />,
    },
    {
      name: "Create Post",
      path: "/create-post",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z" />
        </svg>
      ),
    },
    {
      name: "Messages",
      path: "/messages",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
        </svg>
      ),
    },
    {
      name: "Groups",
      path: "/groups",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
    },
    {
      name: "Friends",
      path: "/friends",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 6a2 2 0 11-4 0 2 2 0 014 0zM.5 12a2 2 0 104 0 2 2 0 00-4 0zm19 0a2 2 0 104 0 2 2 0 00-4 0zm-4 5a2 2 0 11-4 0 2 2 0 014 0zm-9 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Profile",
      path: "/profile",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      ),
    },
  ];

  // Animation variants for staggered menu items
  const containerVariant = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const menuItemVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Hiển thị Skeleton khi đang loading
  if (loading) {
    return <SkeletonSidebar />;
  }

  return (
    <div className="h-screen p-4 flex flex-col">
      {/* Header with Logo and Close Button */}
      <div className="flex items-center justify-between mb-8 px-3">
        <Link
          to="/"
          className="flex items-center"
          onClick={isDesktop ? undefined : onClose}
        >
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] bg-clip-text text-transparent"
          >
            Pin Leaning
          </motion.span>
        </Link>

        {!isDesktop && (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
            aria-label="Close menu"
          >
            <FiX className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <motion.ul
          variants={containerVariant}
          initial="hidden"
          animate="show"
          className="space-y-1"
        >
          {allMenuItems.map((menuItem) => {
            const isActive = location.pathname === menuItem.path;
            return (
              <motion.li key={menuItem.path} variants={menuItemVariant}>
                <Link
                  to={menuItem.path}
                  className={`flex items-center px-4 py-3.5 text-base rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-all ${
                    isActive
                      ? "bg-[var(--color-bg-tertiary)] text-[var(--color-primary-light)] font-medium shadow-sm border-l-4 border-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                  onClick={onClose}
                >
                  <span
                    className={`mr-3 ${
                      isActive ? "text-[var(--color-primary)]" : ""
                    }`}
                  >
                    {menuItem.icon}
                  </span>
                  {menuItem.name}

                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                    />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </nav>

      {/* User Profile - Chỉ hiển thị khi đã đăng nhập */}
      {isAuthenticated && user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-auto"
        >
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--color-bg-tertiary)] transition-colors border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <Link
              to="/profile"
              className="flex items-center flex-1"
              onClick={onClose}
            >
              <Avatar
                src={user.avatar}
                alt={user.fullname || user.username}
                size="md"
                className="mr-3"
              />
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">
                  {user.fullname || user.username}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] truncate max-w-[120px]">
                  @{user.username}
                </div>
              </div>
            </Link>
            <Link
              to="/settings"
              className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
              onClick={onClose}
              title="Settings"
            >
              <FiSettings className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Sidebar;
