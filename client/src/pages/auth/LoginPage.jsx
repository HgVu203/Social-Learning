import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  Link,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useLogin } from "../../hooks/mutations/useAuthMutations";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaGoogle, FaFacebook, FaEnvelope, FaLock } from "react-icons/fa";
import tokenService from "../../services/tokenService";

const LoginPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [socialLoading, setSocialLoading] = useState({
    google: false,
    facebook: false,
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isSubmittingRef = useRef(false);

  const login = useLogin();
  const { isAuthenticated } = useAuth();
  const isLoading =
    login.isPending || socialLoading.google || socialLoading.facebook;

  // Redirect if already authenticated
  useEffect(() => {
    // Kiểm tra token hợp lệ trước khi đợi isAuthenticated từ context
    const hasValidToken = tokenService.isTokenValid();

    if (hasValidToken || isAuthenticated) {
      // Đánh dấu đang chuyển hướng để tránh các lần render tiếp theo
      // cũng cố gắng chuyển hướng
      const redirecting = localStorage.getItem("auth_redirecting");
      if (redirecting === "true") {
        return; // Đang chuyển hướng, không làm gì thêm
      }

      localStorage.setItem("auth_redirecting", "true");

      // Sử dụng setTimeout với delay 0 để mở ra event loop và cho phép
      // các cập nhật khác hoàn thành trước khi chuyển trang
      setTimeout(() => {
        // Lấy đường dẫn trước đó từ location state hoặc chuyển hướng về trang chủ
        const from = location?.state?.from || "/";
        navigate(from, { replace: true });

        // Xóa cờ chuyển hướng sau khi hoàn thành
        setTimeout(() => {
          localStorage.removeItem("auth_redirecting");
        }, 1000);
      }, 100);
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    // Check for OAuth redirect errors
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Reset social loading state when there's an error
      setSocialLoading({
        google: false,
        facebook: false,
      });

      // Remove error parameter from URL after reading
      const cleanParams = new URLSearchParams();
      for (const [key, value] of searchParams.entries()) {
        if (key !== "error") {
          cleanParams.append(key, value);
        }
      }
      setSearchParams(cleanParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!formData.email) {
      errors.email = t("auth.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = t("auth.validEmail");
    }

    // Password validation
    if (!formData.password) {
      errors.password = t("auth.passwordRequired");
    } else if (formData.password.length < 8) {
      errors.password = t("auth.passwordLength");
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    // Clear error message when user starts typing
    if (error) {
      setError(null);
    }

    // Clear validation error for this field
    if (validationErrors[e.target.name]) {
      setValidationErrors({
        ...validationErrors,
        [e.target.name]: null,
      });
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading || isSubmittingRef.current) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      isSubmittingRef.current = true;
      const result = await login.mutateAsync(formData);

      // Handle login result
      if (result.success) {
        // Đánh dấu đang chuyển hướng để tránh các component khác can thiệp
        localStorage.setItem("auth_redirecting", "true");

        // Đảm bảo token được lưu đúng cách
        if (result.data?.accessToken) {
          tokenService.setToken(result.data.accessToken);

          if (result.data?.user) {
            // Lưu thông tin người dùng vào localStorage
            tokenService.setUser({
              ...result.data.user,
              token: result.data.accessToken,
            });
          }
        }

        // Buộc chuyển hướng bằng window.location thay vì navigate để refresh trang
        if (result.data?.user?.role === "admin") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/";
        }

        return; // Ngăn code thực thi tiếp sau khi chuyển hướng
      } else if (result.data?.requiresVerification) {
        // Account not verified - clear any errors before redirecting
        clearError();

        localStorage.setItem(
          "pendingVerification",
          JSON.stringify({
            email: result.data.email,
            userId: result.data.userId,
          })
        );

        navigate("/verify-email", {
          state: {
            email: result.data.email,
            userId: result.data.userId,
          },
        });
      } else {
        // Other error scenarios - hiển thị lỗi rõ ràng
        setError(result.error || result.message || t("auth.loginFailed"));
      }
    } catch (err) {
      console.error("Login failed:", err);

      // Check if the error is due to email verification required
      if (err.response?.data?.data?.requiresVerification) {
        // Clear any error messages before redirecting to verification
        clearError();

        localStorage.setItem(
          "pendingVerification",
          JSON.stringify({
            email: err.response.data.data.email,
            userId: err.response.data.data.userId,
          })
        );

        navigate("/verify-email", {
          state: {
            email: err.response.data.data.email,
            userId: err.response.data.data.userId,
          },
        });
      } else {
        // Đảm bảo phân tích đúng cấu trúc lỗi từ response API
        if (err.response?.data) {
          // Trích xuất error message từ cấu trúc API response
          const errorMessage =
            err.response.data.error || // Thường là định dạng { success: false, error: "message" }
            err.response.data.message ||
            err.message ||
            t("auth.loginFailed");

          console.log("Setting error:", errorMessage);
          setError(errorMessage);
        } else {
          setError(err.message || t("auth.loginFailed"));
        }
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleSocialLogin = async (provider) => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Clear error message when user tries to login again
    if (error) {
      setError(null);
    }

    try {
      setSocialLoading((prev) => ({ ...prev, [provider]: true }));

      // Generate a unique state parameter to prevent CSRF attacks
      const state = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("oauth_state", state);

      // Add timestamp and state to prevent caching and enhance security
      const timestamp = Date.now();

      // Build the OAuth URL
      let oauthUrl;
      if (provider === "google") {
        oauthUrl = `${
          import.meta.env.VITE_API_URL
        }/auth/google?state=${state}&t=${timestamp}`;
      } else if (provider === "facebook") {
        oauthUrl = `${
          import.meta.env.VITE_API_URL
        }/auth/facebook?state=${state}&t=${timestamp}`;
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      window.location.href = oauthUrl;
    } catch (err) {
      console.error(`${provider} login failed:`, err);
      setError(`Login with ${provider} failed. Please try again.`);
      setSocialLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const clearError = () => {
    setError(null);
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
          title={t("auth.login")}
          subtitle="Sign in to your account to continue"
          onSubmit={handleSubmit}
          className="space-y-5"
          error={error}
          clearError={clearError}
        >
          <AuthInput
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t("auth.email")}
            error={validationErrors.email}
            icon={<FaEnvelope />}
            autoComplete="email"
            disabled={isLoading}
            required
          />

          <AuthInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={t("auth.password")}
            error={validationErrors.password}
            icon={<FaLock />}
            autoComplete="current-password"
            disabled={isLoading}
            required
          />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-[var(--color-text-secondary)]"
              >
                {t("auth.rememberMe")}
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-[var(--color-primary)] hover:opacity-80"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </div>

          <AuthButton
            type="submit"
            isLoading={login.isPending}
            disabled={isLoading}
            variant="primary"
            fullWidth
          >
            {t("auth.login")}
          </AuthButton>

          <div className="relative flex items-center justify-center mt-6">
            <div className="absolute border-t border-[var(--color-border)] w-full"></div>
            <div className="relative bg-[var(--color-bg-secondary)] px-4 text-sm text-[var(--color-text-secondary)]">
              Or continue with
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <AuthButton
              onClick={() => handleSocialLogin("google")}
              isLoading={socialLoading.google}
              disabled={isLoading}
              variant="secondary"
              icon={<FaGoogle />}
            >
              Google
            </AuthButton>

            <AuthButton
              onClick={() => handleSocialLogin("facebook")}
              isLoading={socialLoading.facebook}
              disabled={isLoading}
              variant="secondary"
              icon={<FaFacebook />}
              className="text-blue-600"
            >
              Facebook
            </AuthButton>
          </div>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              {t("auth.dontHaveAccount")}{" "}
              <Link
                to="/signup"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                {t("auth.signup")}
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default LoginPage;
