import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useLogin } from "../../hooks/mutations/useAuthMutations";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaGoogle, FaFacebook, FaEnvelope, FaLock } from "react-icons/fa";

const LoginPage = () => {
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

  const login = useLogin();
  const { isAuthenticated } = useAuth();
  const isLoading =
    login.isPending || socialLoading.google || socialLoading.facebook;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

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
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
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
    if (isLoading) return;

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      console.log("Attempting login with:", formData.email);
      const result = await login.mutateAsync(formData);
      console.log("Login result:", result);

      // Handle login result
      if (result.success) {
        // Login successful
        console.log("Login successful, navigating to home");
        // If user is admin, redirect to admin dashboard
        if (result.data?.user?.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else if (result.data?.requiresVerification) {
        // Account not verified - clear any errors before redirecting
        console.log(
          "Email verification required, redirecting to verification page"
        );
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
        // Other error scenarios
        console.log(
          "Login returned false success but no requiresVerification flag"
        );
        setError(result.message || "Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login failed:", err);
      console.error("Login error details:", err.response?.data);
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
        setError(
          err.response?.data?.error || "Login failed. Please try again."
        );
      }
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
          title="Welcome Back"
          subtitle="Sign in to your account to continue"
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
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
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
            placeholder="Enter your password"
            error={validationErrors.password}
            icon={<FaLock />}
            autoComplete="current-password"
            disabled={isLoading}
            required
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </div>

          <AuthButton
            type="submit"
            isLoading={login.isPending}
            disabled={isLoading}
            variant="primary"
            fullWidth
          >
            Sign In
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
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                Sign up now
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default LoginPage;
