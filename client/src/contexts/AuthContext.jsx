import { createContext, useContext, useEffect, useState } from "react";
import { useAuthSession } from "../hooks/queries/useAuthQueries";
import useAuthMutations from "../hooks/mutations/useAuthMutations";
import tokenService from "../services/tokenService";
import { initSocket, closeSocket } from "../socket";

const AuthContext = createContext({
  isAuthenticated: false,
  user: null,
  loading: true,
  verificationData: null,
  error: null,
  login: () => {},
  signup: () => {},
  logout: () => {},
  verifyEmail: () => {},
  forgotPassword: () => {},
  verifyResetCode: () => {},
  resetPassword: () => {},
  setCredentials: () => {},
  clearError: () => {},
  resendVerificationCode: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { data, isLoading } = useAuthSession();
  const authMutations = useAuthMutations();

  console.log("Auth Session Data:", data);
  console.log("Auth Session Loading:", isLoading);

  useEffect(() => {
    // Update user state when session data changes
    if (data?.success && data?.data?.user) {
      const userData = data.data.user;
      console.log("Setting user data:", userData);

      // Kiểm tra ID người dùng để đảm bảo định dạng đúng
      if (userData._id) {
        console.log(`User ID: ${userData._id}, type: ${typeof userData._id}`);

        // Nếu _id là object thì chuyển đổi thành string
        if (typeof userData._id === "object" && userData._id.toString) {
          console.log("Converting user _id from object to string");
          userData._id = userData._id.toString();
        }
      } else {
        console.warn("User data is missing _id field:", userData);
      }

      // Đảm bảo token được gán cho user
      if (data.data.token && !userData.token) {
        console.log("Adding token to user data");
        userData.token = data.data.token;
      } else if (!userData.token) {
        console.warn("No token found in session data or user object");
      }

      setUser(userData);
      setLoading(false);

      // Initialize socket connection when user is authenticated
      console.log("Initializing socket connection after authentication");
      initSocket();
    } else {
      console.log("No valid user data in session response:", data);
      setUser(null);
      setLoading(false);

      // Close socket if no valid user
      console.log("Closing socket due to missing authentication");
      closeSocket();
    }
  }, [data]);

  // Also update loading state based on useAuthSession loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Wrap auth mutations to handle common state updates
  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authMutations.login.mutateAsync(credentials);

      // Thêm token vào user object nếu đăng nhập thành công
      if (result.success && result.data?.user && result.data?.accessToken) {
        const userData = result.data.user;
        userData.token = result.data.accessToken;
        setUser(userData);
      } else if (result.data?.requiresVerification) {
        // Don't set error for verification redirects
        console.log("Login requires verification, skipping error message");
      }

      return result;
    } catch (error) {
      // Only set error if it's not a verification required error
      if (!error.response?.data?.data?.requiresVerification) {
        setError(error.response?.data?.message || "Login failed");
      } else {
        console.log(
          "Verification required error, not displaying general error"
        );
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authMutations.signup.mutateAsync(userData);
      if (result.success && result.data?.verificationData) {
        setVerificationData(result.data.verificationData);
      }
      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (verificationData) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authMutations.verifyEmail.mutateAsync(
        verificationData
      );

      if (result.success) {
        // Clear verification data since the verification is complete
        setVerificationData(null);

        // If server sent back user data with token, set the user
        if (result.data?.user && result.data?.accessToken) {
          const userData = result.data.user;
          userData.token = result.data.accessToken;
          setUser(userData);
        }
      }

      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Verification failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log("Logging out user");
    setLoading(true);

    // Close socket before clearing user data
    console.log("Closing socket connection on logout");
    closeSocket();

    // Đặt user về null trước khi gửi request để ngăn người dùng tiếp tục sử dụng app
    setUser(null);
    setVerificationData(null);
    setError(null);

    authMutations.logout.mutate(null, {
      onSettled: () => {
        setLoading(false);
        // Đảm bảo chuyển hướng về trang đăng nhập
        window.location.href = "/login";
      },
    });
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      setLoading(true);
      return await authMutations.forgotPassword.mutateAsync(email);
    } catch (error) {
      setError(
        error.response?.data?.message || "Password reset request failed"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async (email) => {
    try {
      setError(null);
      setLoading(true);
      return await authMutations.resendVerificationCode.mutateAsync(email);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to resend verification code"
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async (data) => {
    try {
      setError(null);
      setLoading(true);
      return await authMutations.verifyResetCode.mutateAsync(data);
    } catch (error) {
      setError(error.response?.data?.message || "Code verification failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (data) => {
    try {
      setError(null);
      setLoading(true);
      return await authMutations.resetPassword.mutateAsync(data);
    } catch (error) {
      const errorMessage =
        error.response?.status === 429
          ? "Too many attempts, please try again later"
          : error.response?.data?.error || "Password reset failed";

      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Enhance this function to be more robust
  const setCredentials = (userData) => {
    try {
      if (!userData) {
        console.error("Attempted to set empty user credentials");
        return false;
      }

      console.log(
        "Setting credentials with userData:",
        JSON.stringify(userData, null, 2)
      );

      if (userData.accessToken && userData.user) {
        try {
          // Create user object with token included
          const user = { ...userData.user, token: userData.accessToken };
          console.log("Setting user with accessToken:", user);

          // Set user in state first
          setUser(user);

          // Then try to save to localStorage
          tokenService.setToken(userData.accessToken);
          tokenService.setUser(user);

          return true;
        } catch (storageError) {
          console.error("Error saving credentials to storage:", storageError);
          // Even if localStorage fails, we can still set the user in memory
          // This allows the session to work for this session only
          setUser({ ...userData.user, token: userData.accessToken });
          return true;
        }
      } else if (userData.token && userData.user) {
        try {
          console.log("Setting user with token property:", userData.user);

          // Set user in state first
          setUser(userData.user);

          // Then try to save to localStorage
          tokenService.setToken(userData.token);
          tokenService.setUser(userData.user);

          return true;
        } catch (storageError) {
          console.error("Error saving credentials to storage:", storageError);
          // Even if localStorage fails, we can still set the user in memory
          setUser(userData.user);
          return true;
        }
      } else {
        console.error("Invalid user credentials format", userData);
        return false;
      }
    } catch (error) {
      console.error("Error setting credentials:", error);
      return false;
    }
  };

  const value = {
    isAuthenticated: !!user,
    user,
    loading,
    verificationData,
    error,
    login,
    signup,
    logout,
    verifyEmail,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    setCredentials,
    clearError,
    resendVerificationCode,
  };

  console.log("Auth Context Value:", value);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
