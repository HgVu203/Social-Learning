import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope } from "react-icons/fa";
import { useForgotPassword } from "../../hooks/mutations/useAuthMutations";
import { showSuccessToast } from "../../utils/toast";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const forgotPassword = useForgotPassword();
  const isSubmittingRef = useRef(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setValidationError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (forgotPassword.isPending || isSubmittingRef.current) return;

    if (!validateEmail()) return;

    try {
      isSubmittingRef.current = true;
      setError("");

      const result = await forgotPassword.mutateAsync({ email });

      if (result.success) {
        showSuccessToast(t("auth.resetLinkSent"));
        navigate("/verify-reset-code", {
          state: { email },
        });
      } else {
        setError(result.error || t("auth.resetLinkFailed"));
      }
    } catch (err) {
      console.error("Password reset request error:", err);

      // Trích xuất thông báo lỗi
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t("auth.resetLinkFailed");

      setError(errorMessage);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (validationError) setValidationError("");
    if (error) setError("");
  };

  const clearError = () => {
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthForm
          title={t("auth.forgotPassword")}
          subtitle={t("auth.forgotPasswordSubtitle")}
          onSubmit={handleSubmit}
          error={error}
          clearError={clearError}
        >
          <AuthInput
            label={t("auth.emailAddress")}
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            placeholder={t("auth.enterEmailAddress")}
            icon={<FaEnvelope />}
            error={validationError}
            autoComplete="email"
            disabled={forgotPassword.isPending}
            required
          />

          <AuthButton
            type="submit"
            isLoading={forgotPassword.isPending}
            disabled={forgotPassword.isPending}
            variant="primary"
            className="w-full mt-6"
          >
            {t("auth.sendResetLink")}
          </AuthButton>

          <div className="text-center mt-4">
            <Link
              to="/login"
              className="text-[var(--color-primary)] hover:underline text-sm"
            >
              {t("auth.backToLogin")}
            </Link>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
