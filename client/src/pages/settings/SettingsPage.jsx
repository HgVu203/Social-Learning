import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../../components/ui/ThemeToggle";
import LanguageToggle from "../../components/ui/LanguageToggle";
import { useNavigate, Link } from "react-router-dom";
import ChangePasswordModal from "../../components/auth/ChangePasswordModal";
import EditProfileModal from "../../components/profile/EditProfileModal";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEYS } from "../../hooks/queries/useUserQueries";
import axiosService from "../../services/axiosService";

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const queryClient = useQueryClient();

  // Gọi API lấy thông tin profile đầy đủ
  const fetchFullProfile = async () => {
    if (!user?._id) return;

    try {
      setIsLoadingProfile(true);

      // Kiểm tra xem đã có dữ liệu trong cache chưa
      const cachedProfile = queryClient.getQueryData(
        USER_QUERY_KEYS.userProfile(user._id)
      );

      if (cachedProfile?.data) {
        console.log("Using cached profile data", cachedProfile.data);
        setProfileData(cachedProfile.data);
      } else {
        // Nếu chưa có trong cache, gọi API để lấy
        console.log("Fetching profile data from API");
        const response = await queryClient.fetchQuery({
          queryKey: USER_QUERY_KEYS.userProfile(user._id),
          queryFn: async () => {
            const apiResponse = await axiosService.get(
              `/users/profile/${user._id}`
            );
            return apiResponse.data;
          },
        });

        setProfileData(response.data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Nếu có lỗi, sử dụng dữ liệu từ Auth Context
      setProfileData(user);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Mở modal chỉnh sửa profile
  const handleOpenEditProfileModal = async () => {
    // Trước khi mở modal, lấy dữ liệu đầy đủ
    await fetchFullProfile();
    setIsEditProfileModalOpen(true);
  };

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

  // Xử lý khi cập nhật profile thành công
  const handleProfileUpdateSuccess = (updatedData) => {
    console.log("Profile updated successfully:", updatedData);
    setIsEditProfileModalOpen(false);

    // Cập nhật dữ liệu profile trong state
    setProfileData((prev) => ({
      ...prev,
      ...updatedData,
    }));

    // Force refetch để đảm bảo dữ liệu mới nhất
    queryClient.invalidateQueries({
      queryKey: USER_QUERY_KEYS.userProfile(user._id),
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[var(--color-text-primary)] mb-6"
      >
        {t("settings.title")}
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
            {t("settings.display")}
          </h2>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors mb-3">
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">
                {t("settings.theme")}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {theme === "dark"
                  ? t("settings.darkMode")
                  : t("settings.lightMode")}
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Language Toggle */}
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">
                {t("settings.language")}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {language === "en"
                  ? t("settings.english")
                  : t("settings.vietnamese")}
              </p>
            </div>
            <LanguageToggle />
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
            {t("settings.account")}
          </h2>
          <div className="space-y-4">
            <button
              onClick={handleOpenEditProfileModal}
              disabled={isLoadingProfile}
              className="flex items-center justify-between w-full p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)] text-left">
                  {isLoadingProfile
                    ? t("common.loading")
                    : t("settings.editProfile")}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] text-left">
                  {t("settings.updateProfileInfo")}
                </p>
              </div>
              {isLoadingProfile ? (
                <svg
                  className="animate-spin w-5 h-5 text-[var(--color-text-secondary)]"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
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
              )}
            </button>

            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="flex items-center justify-between w-full p-3 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)] text-left">
                  {t("settings.changePassword")}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] text-left">
                  {t("settings.updatePassword")}
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
                  <h3 className="font-medium text-left">
                    {t("settings.adminDashboard")}
                  </h3>
                  <p className="text-sm opacity-80 text-left">
                    {t("settings.accessAdmin")}
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
                  {isLoggingOut
                    ? t("settings.loggingOut")
                    : t("settings.logout")}
                </h3>
                <p className="text-sm text-red-400/80 text-left">
                  {t("settings.signOut")}
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

      {/* Edit Profile Modal - sử dụng điều kiện render để phù hợp với ProfilePage */}
      {isEditProfileModalOpen && (
        <EditProfileModal
          profile={profileData || user}
          onClose={() => setIsEditProfileModalOpen(false)}
          onSuccess={handleProfileUpdateSuccess}
        />
      )}
    </div>
  );
};

export default SettingsPage;
