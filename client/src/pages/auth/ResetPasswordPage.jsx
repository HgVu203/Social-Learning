import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaLock } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { showSuccessToast } from "../../utils/toast";

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [resetInfo, setResetInfo] = useState(null);
  const [error, setError] = useState("");
  const isSubmittingRef = React.useRef(false);

  useEffect(() => {
    // Validate code and email exists in location state
    if (location.state?.code && location.state?.email) {
      setResetInfo({
        code: location.state.code,
        email: location.state.email,
      });
    } else {
      setServerError(
        "Missing verification information. Please try the reset process again."
      );
    }
  }, [location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field error when typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password =
        "Password must contain uppercase, lowercase and numbers";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;

    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 1;

    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    return Math.min(5, strength);
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const getPasswordStrengthLabel = () => {
    if (!formData.password) return "";

    const labels = [
      "Very Weak",
      "Weak",
      "Fair",
      "Good",
      "Strong",
      "Very Strong",
    ];
    return labels[passwordStrength];
  };

  const getPasswordStrengthColor = () => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-green-600",
    ];
    return colors[passwordStrength];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (resetPassword.isPending || isSubmittingRef.current) return;

    // Validate form before submission
    if (!validateForm()) return;

    try {
      isSubmittingRef.current = true;
      setError("");

      const result = await resetPassword.mutateAsync({
        email: resetInfo.email,
        code: resetInfo.code,
        newPassword: formData.password,
      });

      if (result.success) {
        showSuccessToast(t("auth.passwordResetSuccess"));
        setSuccess(true);

        // Redirect to login page after successful reset
        setTimeout(() => navigate("/login"), 1000);
      } else {
        setError(result.error || t("auth.passwordResetFailed"));
      }
    } catch (err) {
      console.error("Password reset error:", err);

      // Trích xuất thông báo lỗi từ API response
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t("auth.passwordResetFailed");

      setError(errorMessage);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const clearError = () => {
    setError("");
  };

  const renderFormContent = () => (
    <>
      <div className="space-y-4">
        <AuthInput
          label={t("auth.newPassword")}
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          icon={<FaLock />}
          error={formErrors.password}
          autoComplete="new-password"
          disabled={resetPassword.isPending}
          required
        />

        {formData.password && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {t("auth.passwordStrength")}:
              </span>
              <span
                className={`text-xs font-medium ${
                  passwordStrength <= 1
                    ? "text-red-500"
                    : passwordStrength <= 3
                    ? "text-yellow-500"
                    : "text-green-500"
                }`}
              >
                {getPasswordStrengthLabel()}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                style={{ width: `${(passwordStrength / 5) * 100}%` }}
              ></div>
            </div>
          </motion.div>
        )}

        <AuthInput
          label={t("auth.confirmPassword")}
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          icon={<FaLock />}
          error={formErrors.confirmPassword}
          autoComplete="new-password"
          disabled={resetPassword.isPending}
          required
        />
      </div>

      <AuthButton
        type="submit"
        isLoading={resetPassword.isPending}
        disabled={resetPassword.isPending}
        variant="primary"
        fullWidth
        className="mt-6"
      >
        {t("auth.resetPassword")}
      </AuthButton>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {!resetInfo ? (
          <AuthForm
            title="Reset Password"
            subtitle="Verification information required"
          >
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 mb-6"
            >
              <div className="flex">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{serverError}</span>
              </div>
            </motion.div>

            <p className="text-center text-[var(--color-text-secondary)] mb-6">
              The verification information appears to be missing or invalid.
            </p>

            <AuthButton
              as={Link}
              to="/forgot-password"
              variant="primary"
              fullWidth
            >
              Request a new reset code
            </AuthButton>
          </AuthForm>
        ) : success ? (
          <AuthForm
            title="Password Reset Successful"
            subtitle="Your password has been updated"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-6"
            >
              <div className="mb-4 text-green-500">
                <svg
                  className="h-16 w-16 text-green-500 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <p className="text-[var(--color-text-secondary)] mb-6 text-center">
                You will be redirected to the login page in a few seconds...
              </p>

              <AuthButton as={Link} to="/login" variant="primary" fullWidth>
                Sign In Now
              </AuthButton>
            </motion.div>
          </AuthForm>
        ) : (
          <AuthForm
            title={t("auth.resetPassword")}
            subtitle={t("auth.resetPasswordSubtitle")}
            onSubmit={handleSubmit}
            className="space-y-5"
            error={error}
            clearError={clearError}
          >
            {renderFormContent()}
          </AuthForm>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
