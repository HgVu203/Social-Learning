import { createContext, useContext, useEffect, useState } from "react";
import { useAuthSession } from "../hooks/queries/useAuthQueries";
import useAuthMutations from "../hooks/mutations/useAuthMutations";
import tokenService from "../services/tokenService";
// import { initSocket, closeSocket } from "../socket";

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

      // Socket temporarily disabled
      // initSocket();
    } else {
      console.log("No valid user data in session response:", data);
      setUser(null);
      setLoading(false);

      // Socket temporarily disabled
      // closeSocket();
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
      }

      return result;
    } catch (error) {
      setError(error.response?.data?.message || "Login failed");
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

  const setCredentials = (userData) => {
    try {
      console.log("AuthContext.setCredentials called with:", userData);

      if (!userData) {
        console.error("userData is undefined or null");
        return { success: false, error: "Invalid user data" };
      }

      if (userData?.user) {
        // Đảm bảo token được gán cho user
        if (userData.accessToken && !userData.user.token) {
          console.log("Adding token to user data:", userData.accessToken);
          userData.user.token = userData.accessToken;
        } else if (!userData.accessToken && !userData.user.token) {
          console.error("No token found in credentials");
          return { success: false, error: "No token provided" };
        }

        // Set userstate và lưu vào localStorage
        console.log("Setting user state with:", userData.user);
        setUser(userData.user);

        // Update token trong localStorage và axios header
        const token = userData.accessToken || userData.user.token;
        if (token) {
          tokenService.setToken(token);
        }

        // Lưu user vào localStorage
        tokenService.setUser(userData.user);

        // Cập nhật các query liên quan
        const result = authMutations.setCredentials(userData);
        console.log("setCredentials result:", result);
        return result;
      }

      console.error("Invalid user data format:", userData);
      return { success: false, error: "Invalid user data format" };
    } catch (error) {
      console.error("Error in AuthContext.setCredentials:", error);
      return { success: false, error: error.message };
    }
  };

  const clearError = () => {
    setError(null);
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
