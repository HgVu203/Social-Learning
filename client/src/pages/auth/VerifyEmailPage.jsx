import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa";
import AuthForm from "../../components/auth/AuthForm";
import AuthButton from "../../components/auth/AuthButton";
import { useTranslation } from "react-i18next";
import { showSuccessToast } from "../../utils/toast";
import {
  useVerifyEmail,
  useResendVerificationCode,
} from "../../hooks/mutations/useAuthMutations";

const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { error: contextError, loading, clearError } = useAuth();
  const verifyEmail = useVerifyEmail();
  const resendVerificationCode = useResendVerificationCode();
  const [verificationData, setVerificationData] = useState(null);
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [resending, setResending] = useState(false);
  const [userInitiatedExit, setUserInitiatedExit] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);
  const isSubmittingRef = useRef(false);
  const { t } = useTranslation();

  // Sync errors from context to local state
  useEffect(() => {
    if (contextError) {
      setError(contextError);
    }
  }, [contextError]);

  useEffect(() => {
    // Check URL parameters for special flags
    const urlParams = new URLSearchParams(window.location.search);
    const fromVerificationParam = urlParams.get("fromVerification");

    // If coming from verification (via URL parameter), don't proceed with verification
    if (fromVerificationParam === "true") {
      console.log(
        "Detected fromVerification=true in URL, preventing verification flow"
      );
      setUserInitiatedExit(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // If user explicitly chose to exit verification flow, don't proceed
    if (userInitiatedExit) {
      return;
    }

    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, 6);

    // Clear any previous errors
    clearError();

    // Get verification data from location state or localStorage
    const stateData = location.state;
    const storedData = localStorage.getItem("pendingVerification");

    if (stateData && stateData.skipVerification) {
      // Skip verification check if explicitly requested
      return;
    }

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
        setUserInitiatedExit(true);
        navigate("/signup", {
          state: { skipVerification: true },
          replace: true,
        });
      }
    } else {
      // No verification data found, redirect to login
      console.warn("No verification data found, redirecting to signup");
      setUserInitiatedExit(true);
      navigate("/signup", { state: { skipVerification: true }, replace: true });
    }
  }, [location, navigate, clearError, userInitiatedExit]);

  // Add a second useEffect to ensure errors are cleared
  useEffect(() => {
    // Force clear any errors (including "Login failed") that might have been carried over
    document.title = "Email Verification"; // Update page title to reflect current purpose

    // Clear any error state in the context
    if (contextError) {
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
  }, [contextError, clearError]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loading || isSubmittingRef.current) return;

    // Validate code format
    if (!validateCode()) return;

    try {
      isSubmittingRef.current = true;
      setError("");

      const payload = { code: codeDigits.join("") };

      // Add email/userId if available
      if (verificationData) {
        payload.email = verificationData.email;
        payload.userId = verificationData.userId;
      }

      const result = await verifyEmail.mutateAsync(payload);

      if (result.success) {
        // Clear all stored verification data from localStorage/sessionStorage
        localStorage.removeItem("pendingVerification");
        sessionStorage.removeItem("pendingVerification");
        sessionStorage.removeItem("emailVerification");

        // Show success message and redirect
        showSuccessToast(t("auth.emailVerified"));

        if (result.data?.accessToken) {
          // If we got a token back, user is now logged in
          setTimeout(() => navigate("/"), 500);
        } else {
          // Otherwise, redirect to login
          setTimeout(() => navigate("/login"), 500);
        }
      } else {
        // Hiển thị lỗi từ server
        setError(
          result.error || result.message || t("auth.verificationFailed")
        );
      }
    } catch (err) {
      console.error("Verification error:", err);

      // Xử lý lỗi chi tiết từ API response
      if (err.response?.data) {
        const errorMessage =
          err.response.data.error ||
          err.response.data.message ||
          err.message ||
          t("auth.verificationFailed");

        setError(errorMessage);
      } else {
        setError(err.message || t("auth.verificationFailed"));
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleResendCode = async () => {
    if (!verificationData?.email) {
      setError(t("auth.emailNotFound"));
      return;
    }

    try {
      setResending(true);
      setError("");

      const result = await resendVerificationCode.mutateAsync(
        verificationData.email
      );

      if (result.success) {
        showSuccessToast(t("auth.codeSentSuccess"));
      } else {
        setError(result.error || result.message || t("auth.resendFailed"));
      }
    } catch (err) {
      console.error("Error resending code:", err);

      // Xử lý lỗi từ API
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t("auth.resendFailed");

      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    // Set flag that user chose to exit verification flow
    setUserInitiatedExit(true);

    // Clear any errors
    clearError();
    setError("");

    // Hủy bỏ state dữ liệu xác minh trong Auth Context
    // Chúng ta sẽ phải giải quyết việc thiếu hàm này
    // bằng cách thêm vào AuthContext hoặc giải quyết theo cách khác
    try {
      // Lần lượt thực hiện từng bước và kiểm tra nếu có lỗi

      // 1. Xóa dữ liệu từ localStorage
      console.log("Clearing pendingVerification from localStorage");
      localStorage.removeItem("pendingVerification");

      // 2. Xóa dữ liệu từ sessionStorage
      console.log("Clearing verification data from sessionStorage");
      sessionStorage.removeItem("pendingVerification");
      sessionStorage.removeItem("emailVerification");
      sessionStorage.removeItem("verificationState");

      // 3. Xóa các dữ liệu khác có thể liên quan
      console.log("Clearing other related data");
      localStorage.removeItem("signup_data");
      sessionStorage.removeItem("signup_data");

      // 4. Xóa dữ liệu trực tiếp từ Auth Context bằng cách reload trang
      console.log("All verification data cleared");
    } catch (error) {
      console.error("Error clearing verification data:", error);
    }

    // Đặt một timeout ngắn để đảm bảo state được cập nhật trước khi chuyển hướng
    setTimeout(() => {
      // Điều hướng với replace để ngăn người dùng quay lại trang này bằng nút Back
      window.location.replace("/signup?fromVerification=true");
    }, 10);
  };

  const isCodeComplete = codeDigits.every((digit) => digit !== "");

  // Validate code format
  const validateCode = () => {
    const code = codeDigits.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits of the verification code");
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative"
      >
        <button
          type="button"
          onClick={handleChangeEmail}
          className="absolute top-4 left-4 text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors p-2 z-10 cursor-pointer"
        >
          <FaArrowLeft className="h-5 w-5" />
        </button>

        <AuthForm
          title={t("auth.verifyEmail")}
          subtitle={t("auth.verifyEmailSubtitle")}
          onSubmit={handleSubmit}
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
              <span>{t("auth.verifyEmailInstructions")}</span>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-red-700 mb-4"
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
              htmlFor="code-0"
              className="block text-[var(--color-text-primary)] mb-2 font-medium"
            >
              {t("auth.verificationCode")}
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
                    disabled={loading || verifyEmail.isPending}
                    autoFocus={index === 0}
                  />
                </div>
              ))}
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] mt-2 text-center">
              {t("auth.enterVerificationCode")}
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-6">
            <AuthButton
              type="submit"
              disabled={loading || verifyEmail.isPending || !isCodeComplete}
              isLoading={loading || verifyEmail.isPending}
              variant="primary"
              fullWidth
              className="py-3 text-base font-medium cursor-pointer"
            >
              {t("auth.verifyEmailBtn")}
            </AuthButton>

            <div className="flex gap-3">
              <AuthButton
                type="button"
                onClick={handleResendCode}
                disabled={loading || verifyEmail.isPending || resending}
                isLoading={resending}
                variant="outline"
                fullWidth
                className="cursor-pointer py-2.5 hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              >
                {t("auth.resendCode")}
              </AuthButton>

              <AuthButton
                type="button"
                onClick={handleChangeEmail}
                variant="secondary"
                size="sm"
                fullWidth
                className="cursor-pointer py-2.5 hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium"
              >
                {t("auth.changeEmail")}
              </AuthButton>
            </div>
          </div>
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default VerifyEmailPage;
