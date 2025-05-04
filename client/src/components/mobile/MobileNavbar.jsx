import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  FiHome,
  FiSearch,
  FiUsers,
  FiMessageSquare,
  FiMenu,
  FiBell,
} from "react-icons/fi";

const MobileNavbar = ({ onMenuClick }) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

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
      icon: <FiMessageSquare className="w-6 h-6" />,
      requiresAuth: true,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <FiBell className="w-6 h-6" />,
      requiresAuth: true,
    },
  ];

  // Filter items if user is not authenticated
  const filteredItems = menuItems.filter(
    (item) => !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[var(--color-bg-primary)] border-t border-[var(--color-border)] shadow-lg z-20">
      <div className="flex justify-around items-center h-16">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full ${
                isActive
                  ? "text-[var(--color-primary)] relative"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <div
                  className={`${
                    isActive ? "scale-110 transition-transform" : ""
                  }`}
                >
                  {item.icon}
                </div>
                {isActive && (
                  <span className="absolute -bottom-2 w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full"></span>
                )}
                {item.name === "Messages" && user?.unreadMessages > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {user.unreadMessages > 9 ? "9+" : user.unreadMessages}
                  </span>
                )}
                {item.name === "Notifications" &&
                  user?.unreadNotifications > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {user.unreadNotifications > 9
                        ? "9+"
                        : user.unreadNotifications}
                    </span>
                  )}
              </div>
              <span
                className={`text-xs mt-0.5 ${isActive ? "font-medium" : ""}`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full text-[var(--color-text-secondary)] active:bg-[var(--color-bg-hover)] touch-manipulation"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <FiMenu className="w-6 h-6" />
          </div>
          <span className="text-xs mt-0.5">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNavbar;
