import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope } from "react-icons/fa";

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    verifyEmail,
    error,
    loading,
    clearError,
    setCredentials,
    resendVerificationCode,
  } = useAuth();
  const [verificationData, setVerificationData] = useState(null);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, 6);

    // Clear any previous errors
    clearError();

    // Get verification data from location state or localStorage
    const stateData = location.state;
    const storedData = localStorage.getItem("pendingVerification");

    if (stateData) {
      console.log("Using verification data from state:", stateData);
      setVerificationData(stateData);
    } else if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("Using verification data from localStorage:", parsedData);
        setVerificationData(parsedData);
      } catch (error) {
        console.error("Invalid verification data in localStorage", error);
        navigate("/login");
      }
    } else {
      // No verification data found, redirect to login
      console.warn("No verification data found, redirecting to login");
      navigate("/login");
    }
  }, [location, navigate, clearError]);

  // Add a second useEffect to ensure errors are cleared
  useEffect(() => {
    // Force clear any errors (including "Login failed") that might have been carried over
    document.title = "Email Verification"; // Update page title to reflect current purpose

    // Clear any error state in the context
    if (error) {
      clearError();
    }

    // Find and remove the "Login failed" alert at the top of the page
    const removeLoginFailedMessage = () => {
      // Find any elements with an error icon and "Login failed" text
      const errorElements = document.querySelectorAll(".text-red-700");
      errorElements.forEach((el) => {
        if (el.textContent && el.textContent.includes("Login failed")) {
          const container = el.closest(".bg-red-50") || el.parentElement;
          if (container) {
            container.style.display = "none";
          }
        }
      });

      // Also try to find it by its appearance
      const alertElements = document.querySelectorAll(
        '[role="alert"], .bg-red-50'
      );
      alertElements.forEach((el) => {
        if (
          el.textContent &&
          el.textContent.toLowerCase().includes("login failed")
        ) {
          el.style.display = "none";
        }
      });
    };

    // Run immediately and also after a short delay to catch any dynamically added elements
    removeLoginFailedMessage();
    const timerId = setTimeout(removeLoginFailedMessage, 100);

    // Clean up the timeout
    return () => clearTimeout(timerId);
  }, [error, clearError]);

  // Add a direct DOM manipulation to hide the login failed message after component render
  useEffect(() => {
    // Run immediately
    hideLoginFailedMessages();

    // And run a few times with delays to catch any dynamically rendered messages
    const timers = [
      setTimeout(hideLoginFailedMessages, 0),
      setTimeout(hideLoginFailedMessages, 100),
      setTimeout(hideLoginFailedMessages, 500),
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));

    function hideLoginFailedMessages() {
      // Target specific DOM elements by their content or styling
      document.querySelectorAll("div").forEach((div) => {
        // Check if the element or any of its children contain "Login failed"
        if (div.textContent && div.textContent.includes("Login failed")) {
          // Attempt to hide specific elements by class/role first
          if (
            div.classList.contains("bg-red-50") ||
            div.getAttribute("role") === "alert" ||
            div.classList.contains("text-red-700")
          ) {
            div.style.display = "none";
          }

          // Also hide any direct parent with error styling
          const parent = div.parentElement;
          if (
            parent &&
            (parent.classList.contains("bg-red-50") ||
              parent.classList.contains("text-red-700"))
          ) {
            parent.style.display = "none";
          }
        }
      });

      // Try another approach - find elements that visually look like error banners
      document.querySelectorAll('.bg-red-50, [role="alert"]').forEach((el) => {
        el.style.display = "none";
      });
    }
  }, []);

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

  const handleVerify = async (e) => {
    e.preventDefault();

    const verificationCode = codeDigits.join("");
    if (!verificationData || !verificationCode || verificationCode.length !== 6)
      return;

    try {
      console.log("Sending verification with data:", {
        email: verificationData.email,
        userId: verificationData.userId,
        code: verificationCode,
      });

      const response = await verifyEmail({
        email: verificationData.email,
        userId: verificationData.userId,
        code: verificationCode,
      });

      console.log("Verification response:", response);

      // Clean up local storage on successful verification
      localStorage.removeItem("pendingVerification");

      // If the server sent back user data and tokens, set them to auto-login
      if (
        response.success &&
        response.data?.accessToken &&
        response.data?.user
      ) {
        console.log("Auto-login after successful verification");
        await setCredentials(response.data);

        // Navigate to home page as an authenticated user
        navigate("/", { replace: true });
      } else {
        // Navigate to login with success state
        navigate("/login", { state: { verified: true } });
      }
    } catch (error) {
      console.error("Verification failed:", error);
    }
  };

  const handleResendCode = async () => {
    if (!verificationData?.email) return;

    try {
      setResending(true);
      await resendVerificationCode(verificationData.email);
      setCodeDigits(["", "", "", "", "", ""]); // Reset input fields
    } catch (error) {
      console.error("Failed to resend code:", error);
    } finally {
      setResending(false);
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
          title="Verify Your Email"
          subtitle="One last step to complete your registration"
          onSubmit={handleVerify}
          className="space-y-5"
        >
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md text-blue-700 mb-4"
          >
            <div className="flex">
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Please enter the verification code sent to your email to
                complete registration
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start p-4 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary)] bg-opacity-20"
          >
            <FaEnvelope className="h-5 w-5 mr-3 mt-0.5 text-[var(--color-primary)]" />
            <p className="text-[var(--color-text-primary)]">
              We've sent a verification code to{" "}
              <strong className="font-semibold">
                {verificationData?.email}
              </strong>
              .<br />
              Please check your inbox and enter the code below.
            </p>
          </motion.div>

          <div>
            <label
              htmlFor="code-0"
              className="block text-[var(--color-text-primary)] mb-2 font-medium"
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
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mt-2 text-center">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <AuthButton
              type="submit"
              disabled={loading || !isCodeComplete}
              isLoading={loading}
              variant="primary"
              fullWidth
            >
              Verify Email
            </AuthButton>

            <AuthButton
              type="button"
              onClick={handleResendCode}
              disabled={loading || resending}
              isLoading={resending}
              variant="outline"
              fullWidth
            >
              Resend Code
            </AuthButton>
          </div>

          <div className="text-center mt-6">
            <p className="text-[var(--color-text-secondary)]">
              <Link
                to="/login"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors duration-200 font-medium"
              >
                Return to login
              </Link>
            </p>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
