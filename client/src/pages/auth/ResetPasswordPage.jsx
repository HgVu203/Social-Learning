import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resetPassword, loading } = useAuth();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");
  const [resetInfo, setResetInfo] = useState(null);

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

    if (!validateForm()) {
      return;
    }

    setServerError("");

    try {
      const response = await resetPassword({
        code: resetInfo.code,
        email: resetInfo.email,
        password: formData.password,
      });

      if (response.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setServerError(
        err.response?.status === 429
          ? "Too many attempts, please try again later. Please wait before trying again."
          : err.response?.data?.error ||
              "Failed to reset password. The code may be invalid or expired."
      );
    }
  };

  if (!resetInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
            <div className="flex justify-center mb-6">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Reset Password
              </div>
            </div>

            <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6 animate-pulse">
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
            </div>

            <p className="text-center text-gray-300 mb-6">
              The verification information appears to be missing or invalid.
            </p>

            <div className="mt-6">
              <Link
                to="/forgot-password"
                className="block w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium text-center transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
              >
                Request a new reset code
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Reset Password
            </div>
          </div>

          {success ? (
            <div className="text-center">
              <div className="bg-green-900/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Your password has been successfully reset!</span>
                </div>
              </div>

              <p className="text-gray-300 mb-4">
                You will be redirected to the login page in a few seconds...
              </p>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="block w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium text-center transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  Login Now
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-300 mb-6 text-center">
                Create a new password for your account
              </p>

              {serverError && (
                <div className="bg-red-900/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-6">
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 7a1 1 0 01-1-1v-3a1 1 0 112 0v3a1 1 0 01-1 1z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <span>{serverError}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-gray-300 mb-1 font-medium"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-[#16181c] border ${
                      formErrors.password
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-700 focus:ring-blue-500"
                    } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                    disabled={loading}
                    autoComplete="new-password"
                  />

                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-400">
                          Password strength:
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength < 2
                              ? "text-red-400"
                              : passwordStrength < 4
                              ? "text-yellow-400"
                              : "text-green-400"
                          }`}
                        >
                          {getPasswordStrengthLabel()}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                          style={{ width: `${passwordStrength * 20}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-400">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-gray-300 mb-1 font-medium"
                  >
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 bg-[#16181c] border ${
                      formErrors.confirmPassword
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-700 focus:ring-blue-500"
                    } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  {formErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">
                      {formErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg transition-all duration-200 font-medium mt-4 ${
                    loading
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                      Resetting Password...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
