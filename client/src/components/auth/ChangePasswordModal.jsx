import { useState } from "react";
import Modal from "../common/Modal";
import { useChangePassword } from "../../hooks/mutations/useUserMutations";
import { useTranslation } from "react-i18next";

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const changePassword = useChangePassword();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear error message when user types
    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = t("auth.currentPasswordRequired");
    }

    if (!formData.newPassword) {
      errors.newPassword = t("auth.newPasswordRequired");
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = t("auth.passwordLength");
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      errors.newPassword = t("auth.passwordComplexity");
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = t("auth.confirmPasswordRequired");
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = t("auth.passwordsDoNotMatch");
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset error states
    setFieldErrors({});
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    try {
      const response = await changePassword.mutateAsync({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.success) {
        // Reset form
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        // Close modal after success
        onClose();
      } else {
        const errorMsg = response.message || t("auth.changePasswordFailed");
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error("Change password error:", err);

      // Xử lý lỗi từ server
      const errorMessage = err.response?.data?.error || t("auth.errorOccurred");

      if (errorMessage.includes("Current password is incorrect")) {
        setFieldErrors((prev) => ({
          ...prev,
          currentPassword: t("auth.currentPasswordIncorrect"),
        }));
        setErrorMessage(t("auth.currentPasswordCheckAgain"));
      } else if (errorMessage.includes("same as current password")) {
        setFieldErrors((prev) => ({
          ...prev,
          newPassword: t("auth.newPasswordSameAsCurrent"),
        }));
        setErrorMessage(t("auth.newPasswordCannotBeSame"));
      } else if (err.response?.status === 400) {
        // Validation errors
        setErrorMessage(errorMessage);
      } else if (err.code === "ERR_NETWORK") {
        setErrorMessage(t("auth.networkError"));
      } else if (errorMessage.includes("Facebook or Google account")) {
        setErrorMessage(t("auth.socialAccountPasswordChange"));
      } else {
        setErrorMessage(errorMessage);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("settings.changePassword")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-4 rounded flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-500">{errorMessage}</p>
          </div>
        )}

        {/* Current Password */}
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("auth.currentPassword")} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="currentPassword"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            className={`mt-1 block w-full border ${
              fieldErrors.currentPassword
                ? "border-red-300"
                : "border-[var(--color-border)]"
            } rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]`}
            required
          />
          {fieldErrors.currentPassword && (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.currentPassword}
            </p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("auth.newPassword")} <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className={`mt-1 block w-full border ${
              fieldErrors.newPassword
                ? "border-red-300"
                : "border-[var(--color-border)]"
            } rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]`}
            required
          />
          {fieldErrors.newPassword ? (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.newPassword}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {t("auth.passwordRequirements")}
            </p>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            {t("auth.confirmNewPassword")}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`mt-1 block w-full border ${
              fieldErrors.confirmPassword
                ? "border-red-300"
                : "border-[var(--color-border)]"
            } rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]`}
            required
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {changePassword.isPending
              ? t("common.processing")
              : t("settings.changePassword")}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
