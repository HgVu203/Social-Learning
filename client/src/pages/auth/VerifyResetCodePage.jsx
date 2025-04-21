import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope } from "react-icons/fa";

const VerifyResetCodePage = () => {
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);
  const { verifyResetCode } = useAuth();

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, 6);

    // Get email from location state
    if (location.state?.email) {
      setEmail(location.state.email);
      setMessage(
        `Please enter the 6-digit code sent to ${location.state.email}`
      );
    } else {
      // If no email in state, redirect to forgot password
      navigate("/forgot-password");
    }
  }, [location, navigate]);

  const handleDigitChange = (index, value) => {
    // Only allow numbers
    if (/[^0-9]/.test(value)) return;

    const newCodeDigits = [...codeDigits];
    // Take only the last character if someone pastes multiple digits
    newCodeDigits[index] = value.slice(-1);
    setCodeDigits(newCodeDigits);

    // Auto move to next input if a digit was entered
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace when current input is empty
    if (e.key === "Backspace" && index > 0 && codeDigits[index] === "") {
      inputRefs.current[index - 1].focus();
    }

    // Handle arrow keys
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1].focus();
      e.preventDefault();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1].focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const pastedDigits = pastedData
      .replace(/[^0-9]/g, "")
      .split("")
      .slice(0, 6);

    if (pastedDigits.length > 0) {
      const newCodeDigits = [...codeDigits];

      pastedDigits.forEach((digit, index) => {
        if (index < 6) {
          newCodeDigits[index] = digit;
        }
      });

      setCodeDigits(newCodeDigits);

      // Focus the next empty input after the pasted data
      if (pastedDigits.length < 6) {
        inputRefs.current[pastedDigits.length].focus();
      } else {
        // Focus the last input if all were filled
        inputRefs.current[5].focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const code = codeDigits.join("");

    if (code.length !== 6) {
      setMessage("Please enter all 6 digits of the verification code");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Verify reset code with API
      const result = await verifyResetCode({
        email,
        code,
      });

      if (result.success) {
        // Navigate to reset password page with code and email only if verification succeeded
        navigate("/reset-password", {
          state: {
            email: email,
            code: code,
          },
        });
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCodeComplete = codeDigits.every((digit) => digit !== "");

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <AuthForm
          title="Verify Code"
          subtitle="Enter the verification code to reset your password"
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-start p-4 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-20"
            >
              <FaEnvelope className="h-5 w-5 mr-3 mt-0.5 text-[var(--color-primary)]" />
              <p className="text-[var(--color-text-primary)]">{message}</p>
            </motion.div>
          )}

          {error && (
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
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          <div>
            <label
              className="block text-[var(--color-text-primary)] mb-2 font-medium"
              htmlFor="code-0"
            >
              Verification Code
            </label>

            <div
              className="flex justify-between gap-2 mb-2"
              onPaste={handlePaste}
            >
              {codeDigits.map((digit, index) => (
                <div key={index} className="w-full relative">
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    id={`code-${index}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-full aspect-square bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] text-center text-2xl transition-all duration-200"
                    maxLength={1}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    disabled={isSubmitting}
                    autoFocus={index === 0}
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mt-2 text-center">
              We've sent a 6-digit code to your email address.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <AuthButton
              type="submit"
              disabled={isSubmitting || !isCodeComplete}
              isLoading={isSubmitting}
              variant="primary"
              fullWidth
            >
              Verify & Continue
            </AuthButton>
          </div>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              Didn't receive a code?{" "}
              <Link
                to="/forgot-password"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                Request again
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default VerifyResetCodePage;
