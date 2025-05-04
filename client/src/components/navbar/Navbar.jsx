import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/linkRoutes";
import Avatar from "../common/Avatar";
import { MdMessage } from "react-icons/md";
import { useAuth } from "../../contexts/AuthContext";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FiMenu, FiSearch, FiBell, FiX } from "react-icons/fi";
import { IoGameControllerOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    if (isAuthenticated) {
      setUnreadCount(Math.floor(Math.random() * 5));
    }
  }, [isAuthenticated]);

  // Focus search input when opened on mobile
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isSearchOpen]);

  const handleLogout = async () => {
    try {
      logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchQuery)}`);
      if (!isDesktop) {
        setIsSearchOpen(false);
        setSearchQuery("");
      }
    }
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  return (
    <nav className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex justify-between h-14 md:h-16 items-center">
          {/* Left section */}
          <div className="flex items-center">
            {!isDesktop && (
              <button
                onClick={onMenuClick}
                className="p-2 rounded-md text-[var(--color-text-primary)] mr-2 hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-tertiary)] cursor-pointer"
                aria-label="Open menu"
              >
                <FiMenu className="w-6 h-6" />
              </button>
            )}
            <Link
              to={ROUTES.HOME}
              className="text-xl md:text-2xl font-bold text-[var(--color-primary)]"
            >
              DevConnect
            </Link>
          </div>

          {/* Search - Desktop */}
          {isTablet && !isSearchOpen && (
            <form
              onSubmit={handleSearch}
              className="hidden md:flex items-center flex-1 max-w-lg mx-4"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search posts, users, or topics..."
                  className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder-[var(--color-text-tertiary)]"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                >
                  <FiSearch className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                </button>
              </div>
            </form>
          )}

          {/* Search - Mobile */}
          <AnimatePresence>
            {!isTablet && isSearchOpen && (
              <motion.form
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSearch}
                className="flex absolute left-0 right-0 top-0 h-14 px-2 items-center bg-[var(--color-bg-primary)] z-50"
              >
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="p-2 mr-1 cursor-pointer"
                  aria-label="Close search"
                >
                  <FiX className="w-5 h-5 text-[var(--color-text-primary)]" />
                </button>
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-full text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder-[var(--color-text-tertiary)]"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-10 top-1/2 transform -translate-y-1/2 cursor-pointer"
                    >
                      <FiX className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer"
                  >
                    <FiSearch className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Right section */}
          <div className="flex items-center space-x-1 md:space-x-3">
            {/* Search icon for mobile */}
            {!isSearchOpen && !isTablet && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 rounded-full text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-tertiary)] cursor-pointer"
                aria-label="Open search"
              >
                <FiSearch className="w-6 h-6" />
              </button>
            )}

            {/* Games link */}
            <Link
              to="/game"
              className="p-2 rounded-full text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] active:bg-[var(--color-bg-tertiary)] cursor-pointer"
              aria-label="Games"
            >
              <IoGameControllerOutline className="w-6 h-6" />
            </Link>

            {isAuthenticated && user ? (
              <>
                {/* Notifications on tablet and up */}
                {isTablet && (
                  <div className="relative">
                    <Link
                      to="/notifications"
                      className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      aria-label="Notifications"
                    >
                      <FiBell className="text-2xl text-[var(--color-text-primary)]" />
                      {user?.unreadNotifications > 0 && (
                        <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium">
                          {user.unreadNotifications > 9
                            ? "9+"
                            : user.unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {/* Messages on tablet and up */}
                {isTablet && (
                  <Link
                    to="/messages"
                    className="relative p-2 rounded-full hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    aria-label="Messages"
                  >
                    <MdMessage className="text-2xl text-[var(--color-text-primary)]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* User profile */}
                <div className="relative group">
                  <button
                    className="flex items-center rounded-full cursor-pointer hover:bg-[var(--color-bg-hover)] p-1"
                    aria-label="User menu"
                  >
                    <Avatar
                      src={user?.avatar}
                      alt={user?.username}
                      size="sm"
                      className="ring-2 ring-[var(--color-bg-tertiary)]"
                    />
                    {isTablet && (
                      <span className="font-medium ml-2 hidden md:block text-[var(--color-text-primary)]">
                        {user?.fullname || user?.username}
                      </span>
                    )}
                  </button>
                  <div className="absolute right-0 mt-1 w-48 bg-[var(--color-bg-secondary)] rounded-md shadow-lg py-1 hidden group-hover:block border border-[var(--color-border)]">
                    <Link
                      to={`${ROUTES.PROFILE}/${user?._id}`}
                      className="block px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-500 hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] text-sm md:text-base cursor-pointer"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] text-sm md:text-base cursor-pointer"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
