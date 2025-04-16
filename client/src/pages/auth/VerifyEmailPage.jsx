import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1c23] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 bg-[#1d1f23]/90 backdrop-blur-sm rounded-xl shadow-xl border border-gray-800/50 transform transition-all">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-blue-400">
            One last step to complete your registration
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-500/30 text-blue-200 px-5 py-4 rounded-lg mb-8">
          <div className="flex items-start">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <p>
              We've sent a verification code to{" "}
              <strong className="text-white">{verificationData?.email}</strong>.
              <br />
              Please check your inbox and enter the code below.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label
              htmlFor="code-0"
              className="block text-gray-300 mb-2 font-medium"
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
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className={`w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-lg transition-all duration-200 font-medium ${
              loading || !isCodeComplete
                ? "opacity-70 cursor-not-allowed"
                : "hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
            }`}
            disabled={loading || !isCodeComplete}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              "Verify Email"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Didn't receive a code?{" "}
            <button
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-50 disabled:hover:text-blue-400"
              onClick={handleResendCode}
              disabled={resending}
            >
              {resending ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400/30 border-t-blue-400 mr-1"></div>
                  Sending...
                </span>
              ) : (
                "Resend Code"
              )}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
