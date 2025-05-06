import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FiHome, FiSearch, FiUsers, FiMail, FiPlus } from "react-icons/fi";
import { motion } from "framer-motion";

const MobileNavbar = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  // Simplified menu items - only core features
  const menuItems = [
    {
      name: "Home",
      path: "/",
      icon: <FiHome className="w-6 h-6" />,
    },
    {
      name: "Search",
      path: "/search",
      icon: <FiSearch className="w-6 h-6" />,
    },
    {
      name: "Friends",
      path: "/friends",
      icon: <FiUsers className="w-6 h-6" />,
      requiresAuth: true,
    },
    {
      name: "Messages",
      path: "/messages",
      icon: <FiMail className="w-6 h-6" />,
      requiresAuth: true,
    },
  ];

  // Filter items if user is not authenticated
  const filteredItems = menuItems.filter(
    (item) => !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  return (
    <div className="fixed bottom-0 left-0 w-full z-20">
      <div className="bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] shadow-lg">
        <div className="flex justify-around items-center h-14 px-2">
          {filteredItems.slice(0, 2).map((item) => renderNavItem(item))}

          {/* Create post button - centered */}
          {isAuthenticated && (
            <Link to="/create-post" className="relative z-10">
              <motion.div
                whileTap={{ scale: 0.94 }}
                className="flex items-center justify-center"
              >
                <div className="w-12 h-12 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white shadow-lg">
                  <FiPlus className="w-6 h-6" />
                </div>
              </motion.div>
            </Link>
          )}

          {filteredItems.slice(2).map((item) => renderNavItem(item))}
        </div>
      </div>
    </div>
  );

  function renderNavItem(item) {
    const isActive =
      location.pathname === item.path ||
      (item.path === "/messages" && location.pathname.startsWith("/messages/"));

    return (
      <Link key={item.path} to={item.path} className="relative group">
        <motion.div
          animate={{
            y: isActive ? -2 : 0,
            scale: isActive ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`flex flex-col items-center ${
            isActive
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)]"
          }`}
        >
          <div className="relative">
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -inset-1 -bottom-3 rounded-t-lg bg-[var(--color-primary)] h-0.5"
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            )}

            <div className="relative">
              {item.name === "Messages" && user?.unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] font-medium rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-sm">
                  {user.unreadMessages > 99 ? "99+" : user.unreadMessages}
                </span>
              )}
              {item.icon}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }
};

export default MobileNavbar;
