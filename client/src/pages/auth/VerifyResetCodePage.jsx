import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 hover:shadow-blue-900/10">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Verify Code
            </div>
          </div>

          {message && (
            <div className="bg-blue-900/20 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg mb-6">
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
                <span>{message}</span>
              </div>
            </div>
          )}

          {error && (
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
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                className="block text-gray-300 mb-2 font-medium"
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
                      className="w-full aspect-square bg-[#16181c] border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-center text-2xl transition-all duration-200"
                      maxLength={1}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      disabled={isSubmitting}
                      autoFocus={index === 0}
                    />
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-400 mt-2 text-center">
                We've sent a 6-digit code to your email address.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isCodeComplete}
              className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg transition-all duration-200 font-medium ${
                isSubmitting || !isCodeComplete
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                "Verify & Continue"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400">
            Didn't receive a code?{" "}
            <Link
              to="/forgot-password"
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Request again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetCodePage;
