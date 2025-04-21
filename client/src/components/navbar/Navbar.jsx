import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/linkRoutes";
import Avatar from "../common/Avatar";
import { MdMessage } from "react-icons/md";
import { useAuth } from "../../contexts/AuthContext";

const Navbar = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isAuthenticated, logout } = useAuth();
  // Placeholder until we implement a message context
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Todo: Replace with Context-based message notifications
    // For now, just simulate some unread messages for UI testing
    if (isAuthenticated) {
      setUnreadCount(Math.floor(Math.random() * 5));
    }
  }, [isAuthenticated]);

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
    }
  };

  return (
    <nav className="bg-[var(--color-bg-primary)] border-b border-[var(--color-border)] fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          {/* Left */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md hover:bg-[var(--color-bg-hover)] lg:hidden text-[var(--color-text-primary)]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <Link
              to={ROUTES.HOME}
              className="text-2xl font-bold text-[var(--color-primary)]"
            >
              DevConnect
            </Link>
          </div>

          {/* Search */}
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <svg
                  className="w-5 h-5 text-[var(--color-text-tertiary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </form>

          {/* Right */}
          <div className="flex items-center">
            {isAuthenticated && user ? (
              <>
                {/* Message Icon with Badge */}
                <Link
                  to="/messages"
                  className="relative p-2 rounded-full hover:bg-[var(--color-bg-hover)]"
                >
                  <MdMessage className="text-2xl text-[var(--color-text-primary)]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="relative group">
                  <button className="flex items-center rounded-full cursor-pointer space-x-3">
                    <Avatar src={user?.avatar} alt={user?.username} size="sm" />
                    <span className="font-medium hidden md:block text-[var(--color-text-primary)]">
                      {user?.fullname || user?.username}
                    </span>
                  </button>
                  <div className="absolute right-0 pt-4 w-48 bg-[var(--color-bg-secondary)] rounded-md shadow-lg py-1 hidden group-hover:block">
                    <Link
                      to={`${ROUTES.PROFILE}/${user?._id}`}
                      className="block px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-2 text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-red-500 hover:bg-[var(--color-bg-hover)]"
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
                  className="px-4 py-2 rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)]"
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
