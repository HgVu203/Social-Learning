import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import tokenService from "../../services/tokenService";
import axios from "axios";

const SocialAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setCredentials } = useAuth();
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(
    "Starting authentication process"
  );

  useEffect(() => {
    async function processAuth() {
      try {
        setProcessingStatus("Retrieving authentication data");

        // Get the token from URL parameters
        const token = searchParams.get("token");
        const nonce = searchParams.get("nonce");

        console.log("SocialAuthCallback received params:", {
          hasToken: !!token,
          nonce,
          queryString: window.location.search,
        });

        if (!token) {
          console.error("Missing required token parameter");
          throw new Error(
            "Authentication failed: Missing authentication token"
          );
        }

        setProcessingStatus("Fetching user data");

        // Use the token to get the user data from the API
        try {
          const apiUrl = import.meta.env.VITE_API_URL;

          // First, make sure the token is properly stored
          tokenService.clearTokens(); // Clear any existing tokens first
          tokenService.setToken(token); // Set the new token

          // Now make the request with Authorization header
          const response = await axios.get(`${apiUrl}/auth/check`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            // Ensure cookies are sent with the request
            withCredentials: true,
          });

          console.log("User data fetched successfully:", response.data);

          if (!response.data.success || !response.data.data?.user) {
            throw new Error("Invalid user data received from server");
          }

          const userData = response.data.data.user;

          setProcessingStatus("Setting credentials");

          // Create a complete user object with token
          const userWithToken = {
            ...userData,
            token: token,
          };

          // Set credentials in the auth context
          const result = setCredentials({
            user: userWithToken,
            accessToken: token,
          });

          console.log("Social login setCredentials result:", result);

          if (result) {
            setProcessingStatus("Login successful, redirecting");

            // Redirect with slight delay to ensure state is updated
            setTimeout(() => {
              navigate("/", { replace: true });
            }, 500);
          } else {
            console.error("Failed to set credentials", result);
            throw new Error(
              "Authentication failed: Unable to save credentials"
            );
          }
        } catch (apiError) {
          console.error("API error:", apiError);
          throw new Error(`Failed to fetch user data: ${apiError.message}`);
        }
      } catch (error) {
        console.error("Error during social authentication:", error);
        setError(`Error processing login: ${error.message}`);

        // Delay redirect to show error
        setTimeout(() => {
          navigate(
            `/login?error=${encodeURIComponent(`Error: ${error.message}`)}`
          );
        }, 2000);
      }
    }

    processAuth();
  }, [searchParams, setCredentials, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/30 mb-6">
              <svg
                className="w-8 h-8 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Authentication Error
            </h3>
            <p className="text-red-400 mb-6">{error}</p>
            <p className="text-gray-400 text-sm mb-6">
              Please try logging in again or contact support if the problem
              persists.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium transition-all duration-200 hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-500/20"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1c22] to-[#16181c] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1d1f23] rounded-xl shadow-2xl p-8 border border-gray-800 transition-all duration-200 text-center">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 relative mb-6">
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
            <div className="absolute top-3 left-3 w-14 h-14 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1">
            Processing Login
          </h3>
          <p className="text-blue-400 mb-6">{processingStatus}...</p>

          <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"
              style={{
                width:
                  processingStatus === "Starting authentication process"
                    ? "25%"
                    : processingStatus === "Retrieving authentication data"
                    ? "50%"
                    : processingStatus === "Fetching user data"
                    ? "75%"
                    : "90%",
              }}
            ></div>
          </div>

          <p className="mt-4 text-gray-400 text-sm">
            Please wait while we complete your authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default SocialAuthCallback;
