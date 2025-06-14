import { useState, useEffect, Fragment, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
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
  FaBars,
  FaTimes,
  FaMoon,
  FaSun,
  FaUser,
  FaChevronRight,
  FaLanguage,
  FaPalette,
} from "react-icons/fa";

// User Profile - Di chuyển xuống dưới cùng
const UserProfile = ({ user, handleLogout, navigate }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check if dark mode is already set in localStorage
    const savedMode = localStorage.getItem("theme");
    return savedMode === "dark";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Apply theme changes
  useEffect(() => {
    // Update both dark-theme (admin specific) and dark (global app) classes
    document.documentElement.classList.toggle("dark-theme", isDarkMode);
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.classList.toggle("light", !isDarkMode);

    // Set localStorage
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    // Force CSS variable update by triggering a reflow
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Apply a recalculation of CSS variables
    document.body.style.backgroundColor = computedStyle.backgroundColor;
    setTimeout(() => {
      document.body.style.backgroundColor = "";
    }, 0);
  }, [isDarkMode]);

  const toggleTheme = (mode) => {
    const newDarkMode = mode === "dark";
    setIsDarkMode(newDarkMode);

    // Apply changes immediately without waiting for the effect
    document.documentElement.classList.toggle("dark-theme", newDarkMode);
    document.documentElement.classList.toggle("dark", newDarkMode);
    document.documentElement.classList.toggle("light", !newDarkMode);
  };

  return (
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
              {user.name || user.fullname || t("admin.administrator")}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {t("admin.administrator")}
            </p>
          </div>
        </div>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <FaCog className="text-lg" />
          </button>

          {isSettingsOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-[var(--color-bg-secondary)] shadow-lg rounded-lg overflow-hidden z-50 border border-[var(--color-border)]">
              {/* Languages Section */}
              <div className="p-3 border-b border-[var(--color-border)]">
                <div className="flex items-center mb-2 text-[var(--color-text-primary)]">
                  <FaLanguage className="mr-2 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium">
                    {t("settings.language")}
                  </span>
                </div>
                <div className="pl-7 flex gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      currentLanguage === "en"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-hover)] hover:bg-[var(--color-primary)] hover:text-white"
                    }`}
                    onClick={() => {
                      changeLanguage("en");
                      setIsSettingsOpen(false);
                    }}
                  >
                    {t("settings.english")}
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      currentLanguage === "vi"
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-hover)] hover:bg-[var(--color-primary)] hover:text-white"
                    }`}
                    onClick={() => {
                      changeLanguage("vi");
                      setIsSettingsOpen(false);
                    }}
                  >
                    {t("settings.vietnamese")}
                  </button>
                </div>
              </div>

              {/* Theme Section */}
              <div className="p-3 border-b border-[var(--color-border)]">
                <div className="flex items-center mb-2 text-[var(--color-text-primary)]">
                  <FaPalette className="mr-2 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium">
                    {t("settings.theme")}
                  </span>
                </div>
                <div className="pl-7 flex gap-2">
                  <button
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      isDarkMode
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-hover)] hover:bg-[var(--color-primary)] hover:text-white"
                    }`}
                    onClick={() => {
                      toggleTheme("dark");
                      setIsSettingsOpen(false);
                    }}
                  >
                    <FaMoon size={12} /> {t("settings.darkMode")}
                  </button>
                  <button
                    className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                      !isDarkMode
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--color-bg-hover)] hover:bg-[var(--color-primary)] hover:text-white"
                    }`}
                    onClick={() => {
                      toggleTheme("light");
                      setIsSettingsOpen(false);
                    }}
                  >
                    <FaSun size={12} /> {t("settings.lightMode")}
                  </button>
                </div>
              </div>

              {/* User Actions */}
              <div className="p-2">
                <button
                  className="w-full px-3 py-2 text-left flex items-center hover:bg-[var(--color-bg-hover)] rounded-md text-[var(--color-text-primary)]"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    navigate("/profile");
                  }}
                >
                  <FaUser className="mr-2 text-[var(--color-primary)]" />
                  <span className="text-sm">{t("profile.edit")}</span>
                  <FaChevronRight className="ml-auto text-xs opacity-50" />
                </button>
                <button
                  className="w-full px-3 py-2 text-left flex items-center hover:bg-[var(--color-bg-hover)] rounded-md text-red-500"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    handleLogout();
                  }}
                >
                  <FaSignOutAlt className="mr-2" />
                  <span className="text-sm">{t("settings.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const { t } = useTranslation();

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
    { id: "dashboard", label: t("admin.dashboard"), icon: <FaChartPie /> },
    { id: "users", label: t("admin.userManagement"), icon: <FaUsersCog /> },
    {
      id: "content",
      label: t("admin.contentManagement"),
      icon: <FaNewspaper />,
    },
    { id: "points", label: t("admin.pointsManagement"), icon: <FaAward /> },
    {
      id: "groups",
      label: t("admin.groupManagement"),
      icon: <FaUserFriends />,
    },
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
          aria-label={t("admin.toggleMenu")}
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
                    {t("admin.panel")}
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
                        {t("admin.new")}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* User Profile Component */}
              <UserProfile
                user={user}
                handleLogout={handleLogout}
                navigate={navigate}
              />
            </motion.div>
          )}
        </Fragment>

        {/* Main Content Area */}
        <div className="flex-1 p-6 pt-16 lg:pt-6 overflow-y-auto">
          {loading ? renderSkeletonContent() : renderContent()}
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
