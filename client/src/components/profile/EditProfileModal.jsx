import { useState, useEffect, useCallback } from "react";
import Modal from "../common/Modal";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile } from "../../hooks/mutations/useUserMutations";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { USER_QUERY_KEYS } from "../../hooks/queries/useUserQueries";

const EditProfileModal = ({ profile, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  // Theo dõi thông tin nhận được qua props và user từ context
  console.log("EditProfileModal - profile prop:", profile);
  console.log("EditProfileModal - user from auth:", user);

  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    address: "",
    bio: "",
    avatar: "",
  });
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data from profile
  useEffect(() => {
    // Sử dụng dữ liệu từ prop profile hoặc từ user context nếu profile không tồn tại
    const profileData = profile || user;

    if (profileData) {
      console.log("Setting form data from:", profileData);
      const initialData = {
        fullname: profileData.fullname || "",
        phone: profileData.phone || "",
        address: profileData.address || "",
        bio: profileData.bio || "",
        avatar: profileData.avatar || "",
      };
      setFormData(initialData);
      setPreviewAvatar(profileData.avatar || "");

      // Reset hasChanges flag when initializing
      setHasChanges(false);
    } else {
      console.error("No profile data available from props or auth context");
    }
  }, [profile, user]);

  // Track form changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: value,
      };
      // Check if any field has changed from initial values
      setHasChanges(true);
      return newFormData;
    });
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setSubmitError(t("profile.errorFileType"));
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError(t("profile.errorFileSize"));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result);
      setFormData((prev) => {
        const updatedData = {
          ...prev,
          avatar: reader.result,
        };
        setHasChanges(true);
        return updatedData;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      setSubmitError("");

      // Kiểm tra xem user có tồn tại không (từ prop profile hoặc từ context)
      if (!user && !profile) {
        console.error("User not found in context or props");
        setSubmitError(t("profile.errorAuth"));
        setIsLoading(false);
        return;
      }

      // Validate phone field if provided
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        setSubmitError(t("profile.errorPhone"));
        setIsLoading(false);
        return;
      }

      console.log("Submitting profile update with data:", formData);

      // Don't include userId in the payload - server gets it from the auth token
      const response = await updateProfile.mutateAsync(formData);
      console.log("Profile update response:", response);

      if (response.success) {
        // Update cache directly for immediate UI update
        const userId = profile?._id || user?._id;
        if (userId) {
          queryClient.setQueryData(
            USER_QUERY_KEYS.userProfile(userId),
            (oldData) => ({
              ...(oldData || {}),
              success: true,
              data: {
                ...(oldData?.data || {}),
                ...response.data,
              },
            })
          );
        }

        // Gọi callback onSuccess để refresh UI
        if (typeof onSuccess === "function") {
          onSuccess(response.data);
        }

        // Đợi một chút để đảm bảo cache được cập nhật trước khi đóng modal
        setTimeout(() => {
          onClose();
        }, 300);
      } else {
        setSubmitError(response.message || t("profile.errorUpdate"));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        t("profile.errorUpdate");
      setSubmitError(errorMessage);
      setIsLoading(false);
    }
  };

  // Display error ONLY if no user found in BOTH context and props
  if (!user && !profile) {
    console.error("No user data available from any source");
    return (
      <Modal isOpen={true} onClose={onClose} title={t("profile.edit")}>
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-4 rounded">
          <p className="text-sm text-red-500">
            {t("profile.errorUserNotFound")}
          </p>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)]"
            onClick={onClose}
          >
            {t("common.close")}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={t("profile.edit")}>
      {submitError && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-4 rounded">
          <p className="text-sm text-red-500">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt={t("profile.previewAlt")}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={defaultAvatar}
                  alt={t("profile.defaultAlt")}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className={`absolute bottom-0 right-0 bg-[var(--color-primary)] text-white rounded-full p-1.5 shadow-md hover:bg-[var(--color-primary-hover)] ${
                isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isLoading}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t("profile.uploadHelp")}
            </p>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label
            htmlFor="fullname"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("profile.fullName")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            className={`mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
              isLoading ? "opacity-75 cursor-not-allowed" : ""
            }`}
            required
            disabled={isLoading}
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("profile.phone")}
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder={t("profile.phonePlaceholder")}
            className={`mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
              isLoading ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {t("profile.phoneFormat")}
          </p>
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("profile.address")}
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder={t("profile.addressPlaceholder")}
            className={`mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
              isLoading ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          />
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("profile.bio")}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows="3"
            value={formData.bio}
            onChange={handleChange}
            placeholder={t("profile.bioPlaceholder")}
            className={`mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] ${
              isLoading ? "opacity-75 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          ></textarea>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                {t("common.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProfileModal;
