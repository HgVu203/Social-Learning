import { createContext, useContext, useEffect, useState } from "react";
import { useAuthSession } from "../hooks/queries/useAuthQueries";
import useAuthMutations from "../hooks/mutations/useAuthMutations";
import tokenService from "../services/tokenService";
import { disconnect } from "../services/socket";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { data, isLoading } = useAuthSession();
  const authMutations = useAuthMutations();

  // Kiểm tra trạng thái xác thực ban đầu từ localStorage
  useEffect(() => {
    const hasToken = tokenService.isTokenValid();
    if (hasToken) {
      // Khởi tạo trạng thái auth từ localStorage để giao diện không flickering
      setIsAuthenticated(true);
      const cachedUser = tokenService.getUser();
      if (cachedUser) {
        setUser(cachedUser);
      }

      // Đánh dấu timestamp kiểm tra xác thực thành công
      if (!localStorage.getItem("auth_timestamp")) {
        localStorage.setItem("auth_timestamp", Date.now().toString());
      }
    }

    // Đánh dấu đã tải xong để các component khác có thể render
    if (!isLoading) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Update user state when session data changes
    if (data?.success && data?.data?.user) {
      const userData = data.data.user;

      // Đảm bảo token được gán cho user
      if (data.data.token) {
        userData.token = data.data.token;
        // Lưu token vào tokenService
        tokenService.setToken(data.data.token);
      }

      // Lưu user vào state và localStorage
      setUser(userData);
      setIsAuthenticated(true);
      tokenService.setUser(userData);

      setLoading(false);
    } else if (data !== undefined) {
      // Chỉ reset khi có data thực sự trả về là không thành công
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
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

      // Thêm token vào user object nếu đăng nhập thành công và xử lý ngay lập tức
      if (result.success && result.data?.user && result.data?.accessToken) {
        const userData = result.data.user;
        userData.token = result.data.accessToken;

        // Đặt state user và isAuthenticated ngay lập tức không đợi useEffect
        setUser(userData);
        setIsAuthenticated(true);

        // Đảm bảo token được lưu đúng cách
        tokenService.setToken(result.data.accessToken);
        tokenService.setUser(userData);

        // Đặt timestamp để đánh dấu thời điểm xác thực thành công
        localStorage.setItem("auth_timestamp", Date.now().toString());

        // Xóa cờ redirecting nếu có để cho phép điều hướng mới
        localStorage.removeItem("auth_redirecting");

        // Đặt loading là false ngay lập tức để unblock UI
        setLoading(false);

        // Trả về kết quả để LoginPage có thể xử lý chuyển hướng ngay lập tức
        return result;
      } else if (result.data?.requiresVerification) {
        // Don't set error for verification redirects
        setLoading(false);
        return result;
      }

      setLoading(false);
      return result;
    } catch (error) {
      // Only set error if it's not a verification required error
      if (!error.response?.data?.data?.requiresVerification) {
        setError(error.response?.data?.message || "Login failed");
      }
      setLoading(false);
      throw error;
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
          setIsAuthenticated(true);
        }
      }

      return result;
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Invalid verification code. Please try again."
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoading(true);

    // Close socket before clearing user data
    disconnect();

    // Đặt user về null trước khi gửi request để ngăn người dùng tiếp tục sử dụng app
    setUser(null);
    setIsAuthenticated(false);
    setVerificationData(null);
    setError(null);

    // Xóa token trước khi gọi API logout để đảm bảo không dùng lại
    tokenService.clearTokens();

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

  const setCredentials = (userData) => {
    if (userData && userData.user && userData.accessToken) {
      const user = userData.user;
      user.token = userData.accessToken;

      // Đảm bảo token được lưu đúng cách
      tokenService.setToken(userData.accessToken);
      tokenService.setUser(user);

      setUser(user);
      setIsAuthenticated(true);
      setLoading(false);
      return { success: true };
    }
    return { success: false, error: "Invalid credentials data" };
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        error,
        verificationData,
        login,
        logout,
        signup,
        verifyEmail,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        setCredentials,
        clearError,
        resendVerificationCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
