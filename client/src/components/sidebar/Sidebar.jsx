import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../../components/common/Avatar";
import { useEffect, useState } from "react";

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const [isMenuLoaded, setIsMenuLoaded] = useState(false);

  useEffect(() => {
    // Set menu loaded state once authentication check is complete
    if (!loading) {
      setIsMenuLoaded(true);
    }
  }, [loading]);

  const handleLogout = async () => {
    try {
      logout();
      onClose?.();
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  // Danh sách menu công khai - hiển thị cho tất cả người dùng
  const publicMenuItems = [
    {
      name: "Home",
      path: "/",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12 2.09L1 12h3v9h7v-6h2v6h7v-9h3L12 2.09zm0 2.82L19 12v7h-3v-6H8v6H5v-7l7-7.09z" />
        </svg>
      ),
    },
  ];

  // Danh sách menu dành riêng cho người dùng đã đăng nhập
  const privateMenuItems = [
    {
      name: "Create Post",
      path: "/create-post",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M23 3c-6.62-.1-10.38 2.421-13.05 6.03C7.29 12.61 6 17.331 6 22h2c0-1.007.07-2.012.19-3H12c4.1 0 7.48-3.082 7.94-7.054C22.79 10.147 23.17 6.359 23 3zm-7 8h-1.5v2H16c.63-.016 1.2-.08 1.72-.188C16.95 15.24 14.68 17 12 17H8.55c.57-2.512 1.57-4.851 3-6.78 2.16-2.912 5.29-4.911 9.45-5.187C20.95 8.079 19.9 11 16 11zM4 9V6H1V4h3V1h2v3h3v2H6v3H4z" />
        </svg>
      ),
    },
    {
      name: "Messages",
      path: "/messages",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
        </svg>
      ),
    },
    {
      name: "Groups",
      path: "/groups",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      ),
    },
    {
      name: "Friends",
      path: "/friends",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12 6a2 2 0 11-4 0 2 2 0 014 0zM.5 12a2 2 0 104 0 2 2 0 00-4 0zm19 0a2 2 0 104 0 2 2 0 00-4 0zm-4 5a2 2 0 11-4 0 2 2 0 014 0zm-9 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Profile",
      path: "/profile",
      icon: (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      ),
    },
  ];

  // Hiển thị các menu dựa trên trạng thái xác thực và đảm bảo chỉ hiển thị khi đã load xong
  const menuItems = isMenuLoaded
    ? isAuthenticated
      ? [...publicMenuItems, ...privateMenuItems]
      : publicMenuItems
    : publicMenuItems;

  if (loading) {
    return (
      <div className="h-screen p-4 flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center mb-6 px-3">
          <span className="text-2xl font-bold text-blue-500">DevConnect</span>
        </Link>

        {/* Loading indicator */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-pulse flex space-x-3">
            <div className="h-6 w-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-4 flex flex-col">
      {/* Logo */}
      <Link to="/" className="flex items-center mb-6 px-3">
        <span className="text-2xl font-bold text-blue-500">DevConnect</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-3 py-3 text-lg rounded-full hover:bg-gray-800 transition-colors text-white ${
                  location.pathname === item.path ? "font-bold" : ""
                }`}
                onClick={onClose}
              >
                <span className="mr-4">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      {isAuthenticated && user && (
        <div className="mt-auto">
          <Link
            to="/profile"
            className="flex items-center p-3 rounded-full hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <Avatar
              src={user.avatar}
              alt={user.fullname || user.username}
              size="md"
              className="mr-3"
            />
            <div>
              <div className="font-bold text-white">
                {user.fullname || user.username}
              </div>
              <div className="text-sm text-gray-400">@{user.username}</div>
            </div>
          </Link>

          {/* Logout Button */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center p-3 rounded-full hover:bg-gray-800 text-red-500 transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-7 h-7 mr-4"
                fill="currentColor"
              >
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              <span className="text-lg">Logout</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
