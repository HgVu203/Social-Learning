import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthInput from "../../components/auth/AuthInput";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope } from "react-icons/fa";

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
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AuthForm
          title="Reset Password"
          subtitle="Enter your email to receive a password reset code"
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
            value={email}
            onChange={handleEmailChange}
            placeholder="Enter your email"
            error={emailError}
            icon={<FaEnvelope />}
            autoComplete="email"
            disabled={loading}
            required
          />

          <AuthButton
            type="submit"
            isLoading={loading}
            disabled={loading}
            variant="primary"
            fullWidth
          >
            Send Reset Code
          </AuthButton>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              Remembered your password?{" "}
              <Link
                to="/login"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
