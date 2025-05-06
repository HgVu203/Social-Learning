import { useState, useEffect, Fragment } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { motion } from "framer-motion";
import tokenService from "../../services/tokenService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  FaChartPie,
  FaUsersCog,
  FaNewspaper,
  FaAward,
  FaUserFriends,
  FaCog,
  FaSignOutAlt,
  FaSun,
  FaMoon,
  FaBars,
  FaTimes,
  FaEnvelope,
} from "react-icons/fa";

// User Profile - Di chuyển xuống dưới cùng
const UserProfile = ({ user, handleLogout }) => (
  <div className="mt-auto p-5 bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-3 shrink-0 cursor-pointer">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt="Admin"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : user.name ? (
            user.name.charAt(0).toUpperCase()
          ) : (
            "A"
          )}
        </div>
        <div>
          <p className="font-medium text-[var(--color-text-primary)] text-base">
            {user.name || user.fullname || "Administrator"}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Administrator
          </p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
        aria-label="Logout"
      >
        <FaSignOutAlt className="text-lg" />
      </button>
    </div>
  </div>
);

// Admin Dashboard Components
import UserManagement from "../../components/admin/UserManagement";
import ContentManagement from "../../components/admin/ContentManagement";
import PointsManagement from "../../components/admin/PointsManagement";
import GroupManagement from "../../components/admin/GroupManagement";
import DashboardOverview from "../../components/admin/DashboardOverview";

// Import skeleton components
import {
  SkeletonDashboard,
  SkeletonUserManagement,
  SkeletonContentManagement,
  SkeletonPointsManagement,
  SkeletonGroupManagement,
} from "../../components/skeleton";

// Tạo React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Tự động đóng sidebar trên màn hình nhỏ
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Kiểm tra kích thước ban đầu
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // Lấy thông tin người dùng từ cả AuthContext và localStorage
    const checkAdminPermission = () => {
      const authUser = user;
      const storedUser = tokenService.getUser();

      console.log("Admin Dashboard - Context user:", authUser);
      console.log("Admin Dashboard - Stored user:", storedUser);

      // Nếu đang loading, đợi
      if (loading) return;

      // Nếu không có user trong context hoặc localStorage, điều hướng về trang đăng nhập
      if (!authUser && !storedUser) {
        console.log("No user found, redirecting to login");
        navigate("/login");
        return;
      }

      // Kiểm tra quyền admin từ user trong context hoặc localStorage
      const isAdmin =
        (authUser && authUser.role === "admin") ||
        (storedUser && storedUser.role === "admin");

      if (!isAdmin) {
        console.log("User is not an admin, redirecting to home");
        navigate("/");
      }
    };

    checkAdminPermission();
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "users":
        return <UserManagement />;
      case "content":
        return <ContentManagement />;
      case "points":
        return <PointsManagement />;
      case "groups":
        return <GroupManagement />;
      default:
        return <DashboardOverview />;
    }
  };

  const renderSkeletonContent = () => {
    switch (activeTab) {
      case "users":
        return <SkeletonUserManagement />;
      case "content":
        return <SkeletonContentManagement />;
      case "points":
        return <SkeletonPointsManagement />;
      case "groups":
        return <SkeletonGroupManagement />;
      default:
        return <SkeletonDashboard />;
    }
  };

  // Navigation items with icons and labels
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <FaChartPie /> },
    { id: "users", label: "User Management", icon: <FaUsersCog /> },
    { id: "content", label: "Content Management", icon: <FaNewspaper /> },
    { id: "points", label: "Points Management", icon: <FaAward /> },
    { id: "groups", label: "Group Management", icon: <FaUserFriends /> },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[var(--color-bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col lg:flex-row h-screen bg-[var(--color-bg-primary)] relative overflow-hidden">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:bg-[var(--color-primary-dark)] transition-all cursor-pointer"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <FaTimes className="text-lg" />
          ) : (
            <FaBars className="text-lg" />
          )}
        </button>

        {/* Sidebar - Responsive & Modern */}
        <Fragment>
          {(sidebarOpen || window.innerWidth >= 1024) && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`fixed lg:relative z-40 h-full w-72 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-xl overflow-y-auto flex flex-col`}
            >
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-3 cursor-pointer">
                    <FaCog className="text-xl animate-pulse" />
                  </div>
                  <h1 className="text-2xl font-bold text-[var(--color-primary)]">
                    Admin Panel
                  </h1>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="lg:hidden text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              <div className="flex-1 px-2 mt-4">
                {navItems.map((item) => (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    whileHover={{ x: 5 }}
                    className={`flex items-center w-full px-4 py-3 my-1 rounded-xl text-left transition-all cursor-pointer ${
                      activeTab === item.id
                        ? "bg-[var(--color-primary)] text-white shadow-md"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                    }`}
                  >
                    <span className="text-xl mr-3">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                    {item.id === "users" && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        New
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* User Profile Component */}
              <UserProfile user={user} handleLogout={handleLogout} />
            </motion.div>
          )}
        </Fragment>

        {/* Main Content - Responsive & Modern */}
        <div className="flex-1 w-full overflow-hidden transition-all duration-300">
          {/* Header - Responsive & Modern */}
          <div className="bg-[var(--color-bg-secondary)] shadow-sm border-b border-[var(--color-border)]">
            <div className="w-full h-16 flex justify-between items-center px-4">
              <div className="flex items-center">
                <button
                  onClick={toggleSidebar}
                  className="hidden lg:flex mr-4 p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] cursor-pointer"
                >
                  <FaBars className="text-lg" />
                </button>
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  {navItems.find((item) => item.id === activeTab)?.label ||
                    "Dashboard"}
                </h2>
              </div>

              <div className="flex items-center">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] mr-3 cursor-pointer"
                  aria-label="Toggle theme"
                >
                  {isDark ? (
                    <FaSun className="text-lg text-yellow-400" />
                  ) : (
                    <FaMoon className="text-lg" />
                  )}
                </button>

                {/* Nút chuyển sang giao diện user */}
                <Link
                  to="/"
                  className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer mr-3"
                  title="Go to User Interface"
                >
                  <FaUserFriends className="text-lg" />
                </Link>

                {/* Hiển thị email và avatar ở header */}
                <div className="hidden md:flex items-center">
                  <div className="flex items-center text-[var(--color-text-secondary)] mr-2">
                    <FaEnvelope className="mr-1 text-sm" />
                    <span className="text-sm max-w-[150px] truncate">
                      {user.email}
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white cursor-pointer hover:shadow-md transition-shadow">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Admin"
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : user.name ? (
                      user.name.charAt(0).toUpperCase()
                    ) : (
                      "A"
                    )}
                  </div>
                </div>

                {/* Logout button in header */}
                <button
                  onClick={handleLogout}
                  className="ml-3 p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                  aria-label="Logout"
                >
                  <FaSignOutAlt className="text-lg" />
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Content Area */}
          <div className="p-6 overflow-y-auto h-[calc(100vh-64px)]">
            {loading ? renderSkeletonContent() : renderContent()}
          </div>
        </div>

        {/* Overlay for mobile */}
        <Fragment>
          {sidebarOpen && window.innerWidth < 1024 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30 cursor-pointer"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </Fragment>
      </div>
    </QueryClientProvider>
  );
};

export default AdminDashboard;
