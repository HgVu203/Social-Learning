import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useLogin } from "../../hooks/mutations/useAuthMutations";
import { useAuth } from "../../contexts/AuthContext";

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
    // Kiểm tra lỗi từ OAuth redirect
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      // Reset social loading state when there's an error
      setSocialLoading({
        google: false,
        facebook: false,
      });

      // Xóa tham số lỗi khỏi URL sau khi đã đọc
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
    // Xóa thông báo lỗi khi người dùng bắt đầu gõ
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
      const result = await login.mutateAsync(formData);

      // Handle login result
      if (result.success) {
        // Login successful
        navigate("/");
      } else if (result.data?.requiresVerification) {
        // Account not verified
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
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.error || "Login failed. Please try again.");
    }
  };

  const handleSocialLogin = async (provider) => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Xóa thông báo lỗi khi người dùng thử đăng nhập lại
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

      // Log API URL for debugging
      console.log(
        `Social login ${provider} - API URL:`,
        import.meta.env.VITE_API_URL
      );

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

      console.log(`Redirecting to ${provider} OAuth:`, oauthUrl);
      window.location.href = oauthUrl;
    } catch (err) {
      console.error(`${provider} login failed:`, err);
      setError(`Đăng nhập với ${provider} thất bại. Vui lòng thử lại.`);
      setSocialLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Welcome Back
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 animate-pulse">
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
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="email"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="email"
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.email}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-gray-300 mb-1 font-medium"
                htmlFor="password"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  validationErrors.password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {validationErrors.password}
                </p>
              )}
              <div className="mt-2 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg transition-all duration-200 font-medium ${
                isLoading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
              }`}
              disabled={isLoading}
            >
              {login.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                  Logging in...
                </div>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#1d1f23] text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSocialLogin("google")}
                className={`flex items-center justify-center px-4 py-2.5 border border-gray-700 rounded-lg transition-all duration-200 text-white ${
                  isLoading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-gray-800 hover:shadow-md"
                }`}
                disabled={isLoading}
                type="button"
              >
                {socialLoading.google ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  <>
                    <img
                      className="h-5 w-5 mr-2"
                      src="https://www.svgrepo.com/show/475656/google-color.svg"
                      alt="Google"
                    />
                    <span>Google</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleSocialLogin("facebook")}
                className={`flex items-center justify-center px-4 py-2.5 border border-gray-700 rounded-lg transition-all duration-200 text-white ${
                  isLoading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-gray-800 hover:shadow-md"
                }`}
                disabled={isLoading}
                type="button"
              >
                {socialLoading.facebook ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  <>
                    <img
                      className="h-5 w-5 mr-2"
                      src="https://www.svgrepo.com/show/475647/facebook-color.svg"
                      alt="Facebook"
                    />
                    <span>Facebook</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-gray-400">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign up now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
