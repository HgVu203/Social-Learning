import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { AUTH_QUERY_KEYS } from "../queries/useAuthQueries";
import tokenService from "../../services/tokenService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { useTranslation } from "react-i18next";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  // Đăng nhập
  const login = useMutation({
    mutationFn: async (credentials) => {
      try {
        const startTime = performance.now();
        const response = await axiosService.post("/auth/login", credentials);
        console.log(`Login API call took ${performance.now() - startTime}ms`);

        // Xử lý token ngay lập tức nếu có để giảm độ trễ
        if (response.data?.success && response.data?.data?.accessToken) {
          const token = response.data.data.accessToken;
          // Đặt token vào headers ngay lập tức
          axiosService.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${token}`;

          // Đặt token lên storage đồng bộ
          tokenService.setToken(token);

          if (response.data.data.user) {
            const userData = { ...response.data.data.user, token };
            tokenService.setUser(userData);

            // Đặt một cờ để giúp xác định đã xác thực thành công
            localStorage.setItem("auth_timestamp", Date.now().toString());
          }
        }

        return response.data;
      } catch (error) {
        console.error("Login API error:", error.message || error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data?.success && data?.data?.accessToken) {
        // Thêm timestamp để đánh dấu thời điểm đăng nhập thành công
        localStorage.setItem("auth_timestamp", Date.now().toString());

        // Tránh invalidate không cần thiết để giảm số lượng API calls
        queryClient.invalidateQueries({
          queryKey: AUTH_QUERY_KEYS.session(),
          refetchType: "none", // Không refetch ngay lập tức để giảm API calls
        });
      }
    },
    onError: (error) => {
      console.error("Login error in mutation:", error.message || error);
      // Xóa timestamp nếu có lỗi
      localStorage.removeItem("auth_timestamp");
    },
  });

  // Đăng ký
  const signup = useMutation({
    mutationFn: async (userData) => {
      const response = await axiosService.post("/auth/signup", userData);
      return response.data;
    },
    onSuccess: () => {
      // Don't show success toast here - we want to redirect to verification page instead
    },
    onError: (error) => {
      console.error("Signup error:", error.message || error);
    },
  });

  // Xác thực email
  const verifyEmail = useMutation({
    mutationFn: async (verificationData) => {
      const response = await axiosService.post(
        "/auth/verify-email",
        verificationData
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data?.accessToken) {
        tokenService.setToken(data.data.accessToken);

        if (data.data.user) {
          const userWithToken = {
            ...data.data.user,
            token: data.data.accessToken,
          };
          tokenService.setUser(userWithToken);

          // Update auth queries
          queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.all });
        }
      }
    },
    onError: (error) => {
      console.error("Email verification error:", error.message || error);
    },
  });

  // Đăng xuất
  const logout = useMutation({
    mutationFn: async () => {
      const response = await axiosService.post("/auth/logout");
      return response.data;
    },
    onSuccess: () => {
      tokenService.clearTokens();
      queryClient.clear(); // Clear all queries
      showSuccessToast(t("auth.logoutSuccess"));

      // Chuyển hướng về trang đăng nhập
      window.location.href = "/login";
    },
    onError: (error) => {
      console.error("Logout error:", error.message || error);
      // Still clear tokens on error
      tokenService.clearTokens();
      queryClient.clear();

      // Vẫn chuyển hướng về login ngay cả khi có lỗi
      window.location.href = "/login";
    },
  });

  // Quên mật khẩu
  const forgotPassword = useMutation({
    mutationFn: async (email) => {
      const response = await axiosService.post("/auth/forgot-password", {
        email,
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Forgot password error:", error.message || error);
      showErrorToast(
        error.response?.data?.message || "Forgot password request failed"
      );
    },
  });

  // Xác minh mã đặt lại mật khẩu
  const verifyResetCode = useMutation({
    mutationFn: async (data) => {
      const response = await axiosService.post("/auth/verify-reset-code", data);
      return response.data;
    },
    onError: (error) => {
      console.error("Verify reset code error:", error.message || error);
    },
  });

  // Đặt lại mật khẩu
  const resetPassword = useMutation({
    mutationFn: async (data) => {
      const response = await axiosService.post("/auth/reset-password", data);
      return response.data;
    },
    onSuccess: () => {
      showSuccessToast(t("auth.passwordResetSuccess"));
    },
    onError: (error) => {
      console.error("Reset password error:", error.message || error);

      // Xử lý các loại lỗi khác nhau
      let errorMessage = "Password reset failed";

      if (error.response) {
        if (error.response.status === 429) {
          errorMessage = "Too many attempts, please try again later.";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      }

      showErrorToast(errorMessage);
    },
  });

  // Đăng nhập với Google
  const loginWithGoogle = useMutation({
    mutationFn: async () => {
      const response = await axiosService.get("/auth/google");
      return response.data;
    },
  });

  // Đăng nhập với Facebook
  const loginWithFacebook = useMutation({
    mutationFn: async () => {
      const response = await axiosService.get("/auth/facebook");
      return response.data;
    },
  });

  // Set user credentials directly (for social login callback)
  const setCredentials = (userData) => {
    try {
      if (userData?.accessToken) {
        tokenService.setToken(userData.accessToken);

        if (userData.user) {
          // Ensure user has token property
          const userWithToken = {
            ...userData.user,
            token: userData.accessToken,
          };

          tokenService.setUser(userWithToken);

          // Force update Authorization header
          axiosService.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${userData.accessToken}`;
        } else {
          console.error("User data missing in credentials");
          return { success: false, error: "User data missing" };
        }

        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.all });
        return { success: true };
      } else {
        console.error("Access token missing in credentials");
        return { success: false, error: "Access token missing" };
      }
    } catch (error) {
      console.error("Error in setCredentials:", error.message || error);
      return { success: false, error: error.message };
    }
  };

  // Gửi lại mã xác thực email
  const resendVerificationCode = useMutation({
    mutationFn: async (email) => {
      const response = await axiosService.post("/auth/resend-verification", {
        email,
      });
      return response.data;
    },
    onError: (error) => {
      console.error("Resend verification error:", error.message || error);
    },
  });

  return {
    login,
    signup,
    verifyEmail,
    logout,
    forgotPassword,
    verifyResetCode,
    resetPassword,
    loginWithGoogle,
    loginWithFacebook,
    setCredentials,
    resendVerificationCode,
  };
};

// Sửa: Các hàm trả về kết quả của useMutation() thay vì trực tiếp mutation object
export const useLogin = () => useAuthMutations().login;
export const useSignup = () => useAuthMutations().signup;
export const useVerifyEmail = () => useAuthMutations().verifyEmail;
export const useLogout = () => useAuthMutations().logout;
export const useForgotPassword = () => useAuthMutations().forgotPassword;
export const useVerifyResetCode = () => useAuthMutations().verifyResetCode;
export const useResetPassword = () => useAuthMutations().resetPassword;
export const useResendVerificationCode = () =>
  useAuthMutations().resendVerificationCode;

export default useAuthMutations;
