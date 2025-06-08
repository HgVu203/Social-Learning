import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import AuthForm from "../../components/auth/AuthForm";
import AuthButton from "../../components/auth/AuthButton";
import { FaEnvelope } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const VerifyResetCodePage = () => {
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);
  const { verifyResetCode, clearError } = useAuth();
  const { t } = useTranslation();
  const isSubmittingRef = useRef(false);

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

    // Prevent multiple submissions
    if (verifyResetCode.isPending || isSubmittingRef.current) return;

    const verificationCode = codeDigits.join("");
    if (!email || !verificationCode || verificationCode.length !== 6) return;

    try {
      isSubmittingRef.current = true;
      setError("");

      const result = await verifyResetCode.mutateAsync({
        email,
        code: verificationCode,
      });

      if (result.success) {
        // Navigate to reset password page with verified code & email
        navigate("/reset-password", {
          state: {
            email,
            code: verificationCode,
            verified: true,
          },
        });
      } else {
        setError(result.error || t("auth.verificationFailed"));
      }
    } catch (err) {
      console.error("Code verification error:", err);

      // Trích xuất thông báo lỗi từ API response
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t("auth.invalidCode");

      setError(errorMessage);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleChangeEmail = () => {
    // Xóa lỗi trong AuthContext trước khi điều hướng
    clearError();

    // Xóa lỗi trong component state
    setError("");

    // Đặt một timeout ngắn để đảm bảo state được cập nhật trước khi chuyển hướng
    setTimeout(() => {
      // Điều hướng về trang forgot-password với replace để thay thế history
      navigate("/forgot-password", { replace: true });
    }, 10);
  };

  const isCodeComplete = codeDigits.every((digit) => digit !== "");

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <AuthForm
          title={t("auth.verifyResetCode")}
          subtitle={t("auth.verifyResetCodeSubtitle")}
          onSubmit={handleSubmit}
          error={error}
          clearError={clearError}
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

          <div>
            <label
              className="block text-[var(--color-text-primary)] mb-2 font-medium"
              htmlFor="code-0"
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
                    disabled={verifyResetCode.isPending}
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
              disabled={verifyResetCode.isPending || !isCodeComplete}
              isLoading={verifyResetCode.isPending}
              variant="primary"
              fullWidth
              className="py-3 text-base font-medium cursor-pointer"
            >
              {t("auth.verifyAndContinue")}
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
        </AuthForm>
      </motion.div>
    </div>
  );
};

export default VerifyResetCodePage;
