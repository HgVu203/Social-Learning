import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { forgotPassword, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      const response = await forgotPassword(email);
      if (response.success) {
        // Navigate to the reset code verification page
        navigate("/verify-reset-code", {
          state: { email: email },
        });
      }
    } catch (err) {
      console.error("Forgot password error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Forgot Password
            </div>
          </div>

          <p className="text-gray-300 mb-6 text-center">
            Enter your email address and we'll send you a verification code to
            reset your password.
          </p>

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
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-gray-300 mb-1 font-medium"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your@email.com"
                className={`w-full px-4 py-2 bg-[#16181c] border ${
                  emailError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:ring-blue-500"
                } rounded-lg focus:outline-none focus:ring-2 text-white transition-all duration-200`}
                disabled={loading}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-400">{emailError}</p>
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
                  Sending...
                </div>
              ) : (
                "Send Reset Code"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Remembered your password?{" "}
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Login now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
