import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeToggle from "../../components/ui/ThemeToggle";
import { useNavigate, Link } from "react-router-dom";
import ChangePasswordModal from "../../components/auth/ChangePasswordModal";
import EditProfileModal from "../../components/profile/EditProfileModal";

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[var(--color-text-primary)] mb-6"
      >
        Settings
      </motion.h1>

      <div className="grid gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Display
          </h2>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">
                Theme
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <ThemeToggle />
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-4">
            Account
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => setIsEditProfileModalOpen(true)}
              className="flex items-center justify-between w-full p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)] text-left">
                  Edit Profile
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] text-left">
                  Update your profile information
                </p>
              </div>
              <svg
                className="w-5 h-5 text-[var(--color-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="flex items-center justify-between w-full p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)] text-left">
                  Change Password
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] text-left">
                  Update your password
                </p>
              </div>
              <svg
                className="w-5 h-5 text-[var(--color-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {user?.role === "admin" && (
              <Link
                to="/admin"
                className="flex items-center justify-between w-full p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-primary)] cursor-pointer"
              >
                <div>
                  <h3 className="font-medium text-left">Admin Dashboard</h3>
                  <p className="text-sm opacity-80 text-left">
                    Access administration panel
                  </p>
                </div>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            )}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center justify-between w-full p-3 text-red-500 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium text-left">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </h3>
                <p className="text-sm text-red-400/80 text-left">
                  Sign out of your account
                </p>
              </div>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;
