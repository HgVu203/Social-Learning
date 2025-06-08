import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import AuthForm from "../../components/auth/AuthForm";
import axiosService from "../../services/axiosService";

const SocialAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setCredentials } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (error) {
          setError(decodeURIComponent(error));
          setLoading(false);
          return;
        }

        if (!token) {
          setError(t("auth.invalidAuthData"));
          setLoading(false);
          return;
        }

        try {
          // Set token to be used for fetching user data
          axiosService.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${token}`;

          // Fetch user data using the token
          const userResponse = await axiosService.get("/auth/check");

          if (!userResponse.data.success || !userResponse.data.data?.user) {
            throw new Error("Failed to fetch user data");
          }

          const userData = userResponse.data.data.user;

          // Use both the token and fetched user data for authentication
          const result = await setCredentials({
            accessToken: token,
            user: userData,
          });

          if (result.success) {
            navigate("/", { replace: true });
          } else {
            setError(result.error || t("auth.authFailed"));
            setLoading(false);
          }
        } catch (e) {
          console.error("Error during authentication process:", e);
          setError(t("auth.invalidAuthData"));
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err.message || t("auth.authFailed"));
        setLoading(false);
      }
    };

    processCallback();
  }, [searchParams, navigate, setCredentials, t]);

  const clearError = () => {
    setError("");
  };

  // Redirect to login on error
  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthForm
          title={
            loading
              ? t("auth.processingAuth")
              : error
              ? t("auth.authFailed")
              : t("auth.authSuccess")
          }
          subtitle={
            loading
              ? t("auth.pleaseWait")
              : error
              ? t("auth.tryAgain")
              : t("auth.redirecting")
          }
          error={error}
          clearError={clearError}
        >
          <div className="flex flex-col items-center justify-center py-6">
            {loading ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-t-2 border-b-2 border-[var(--color-primary)] rounded-full animate-spin"></div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  {t("auth.verifyingCredentials")}
                </p>
              </div>
            ) : error ? (
              <button
                onClick={handleBackToLogin}
                className="mt-4 px-6 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)] transition-colors duration-200"
              >
                {t("auth.backToLogin")}
              </button>
            ) : (
              <div className="text-center space-y-2">
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
                <p className="text-[var(--color-text-primary)]">
                  {t("auth.loginSuccess")}
                </p>
              </div>
            )}
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default SocialAuthCallback;
