import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope, FaUser, FaLock, FaUserAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { showSuccessToast } from "../../utils/toast";
import { useSignup } from "../../hooks/mutations/useAuthMutations";

const SignupPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullname: "",
    password: "",
    confirmPassword: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [error, setError] = useState("");
  const isSubmittingRef = useRef(false);

  const navigate = useNavigate();
  const { isAuthenticated, verificationData, loading } = useAuth();
  const signup = useSignup();
  const { t } = useTranslation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Redirect if verification data is available
  useEffect(() => {
    if (verificationData) {
      navigate("/verify-email");
    }
  }, [verificationData, navigate]);

  const validateForm = () => {
    const errors = {};
    let isValid = true;

    // Check if fields are empty
    Object.entries(formData).forEach(([key, value]) => {
      if (!value.trim() && touched[key]) {
        errors[key] = `${
          key.charAt(0).toUpperCase() + key.slice(1)
        } is required`;
        isValid = false;
      }
    });

    // Validate email format
    if (formData.email && touched.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = "Invalid email format";
        isValid = false;
      }
    }

    // Username validation - at least 3 characters, alphanumeric + underscore only
    if (formData.username && touched.username) {
      const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
      if (!usernameRegex.test(formData.username)) {
        errors.username =
          "Username must be at least 3 characters long and contain only alphanumeric characters and underscores";
        isValid = false;
      }
    }

    // Password validation - at least 8 characters
    if (formData.password && touched.password) {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters long";
        isValid = false;
      }
    }

    // Confirm password validation
    if (
      formData.confirmPassword &&
      formData.password &&
      touched.confirmPassword
    ) {
      if (formData.confirmPassword !== formData.password) {
        errors.confirmPassword = "Passwords do not match";
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Mark field as touched
    if (!touched[name]) {
      setTouched({
        ...touched,
        [name]: true,
      });
    }

    // Clear error when typing
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null,
      });
    }

    // Clear global error
    if (error) {
      setError("");
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    if (!touched[name]) {
      setTouched({
        ...touched,
        [name]: true,
      });
    }
    validateForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading || isSubmittingRef.current) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      isSubmittingRef.current = true;

      // Create signup data without confirmPassword field
      const signupData = {
        username: formData.username,
        email: formData.email,
        fullname: formData.fullname,
        password: formData.password,
      };

      // Call the API
      const result = await signup.mutateAsync(signupData);

      if (result.success && result.data?.verificationData) {
        // Store verification data in localStorage
        localStorage.setItem(
          "pendingVerification",
          JSON.stringify(result.data.verificationData)
        );

        // Redirect to email verification page
        navigate("/verify-email", {
          state: result.data.verificationData,
        });
      } else if (result.success) {
        showSuccessToast(t("auth.signupSuccess"));
        navigate("/login");
      } else {
        // Hiển thị lỗi cụ thể từ server
        setError(result.error || result.message || t("auth.signupFailed"));
      }
    } catch (err) {
      console.error("Signup error:", err);

      // Xử lý các loại lỗi khác nhau từ API
      if (err.response?.data) {
        // Trích xuất error message từ cấu trúc response
        const errorMessage =
          err.response.data.error ||
          err.response.data.message ||
          err.message ||
          t("auth.signupFailed");

        setError(errorMessage);
      } else {
        setError(err.message || t("auth.signupFailed"));
      }
    } finally {
      isSubmittingRef.current = false;
    }
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AuthForm
          title={t("auth.createAccount")}
          subtitle={t("auth.signupSubtitle")}
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700"
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
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          <AuthInput
            label={t("auth.emailAddress")}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t("auth.emailAddress")}
            error={validationErrors.email}
            icon={<FaEnvelope />}
            autoComplete="email"
            disabled={loading || signup.isPending}
            required
          />

          <AuthInput
            label={t("auth.fullName")}
            type="text"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t("auth.fullName")}
            error={validationErrors.fullname}
            icon={<FaUserAlt />}
            autoComplete="name"
            disabled={loading || signup.isPending}
            required
          />

          <AuthInput
            label={t("auth.username")}
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder={t("auth.username")}
            error={validationErrors.username}
            icon={<FaUser />}
            autoComplete="username"
            disabled={loading || signup.isPending}
            required
          />

          <div className="space-y-1">
            <AuthInput
              label={t("auth.password")}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={t("auth.passwordRequirements")}
              error={validationErrors.password}
              icon={<FaLock />}
              autoComplete="new-password"
              disabled={loading || signup.isPending}
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
          </div>

          <AuthButton
            type="submit"
            isLoading={loading || signup.isPending}
            disabled={loading || signup.isPending}
            variant="primary"
            fullWidth
          >
            {t("auth.createAccount")}
          </AuthButton>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                to="/login"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default SignupPage;
