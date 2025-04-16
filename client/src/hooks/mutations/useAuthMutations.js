import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { AUTH_QUERY_KEYS } from "../queries/useAuthQueries";
import tokenService from "../../services/tokenService";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();

  // Đăng nhập
  const login = useMutation({
    mutationFn: async (credentials) => {
      const response = await axiosService.post("/auth/login", credentials);
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success && data?.data?.accessToken) {
        console.log("Setting token from login success:", data.data.accessToken);
        tokenService.setToken(data.data.accessToken);

        if (data.data.user) {
          const userData = { ...data.data.user, token: data.data.accessToken };
          tokenService.setUser(userData);
        }

        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.all });
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
      showErrorToast(error.response?.data?.message || "Login failed");
    },
  });

  // Đăng ký
  const signup = useMutation({
    mutationFn: async (userData) => {
      const response = await axiosService.post("/auth/signup", userData);
      return response.data;
    },
    onSuccess: (data) => {
      // Don't show success toast here - we want to redirect to verification page instead
      console.log(
        "Registration completed, verification required",
        data.success
      );
    },
    onError: (error) => {
      console.error("Signup error:", error);
      showErrorToast(error.response?.data?.message || "Registration failed");
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
      if (data.success) {
        showSuccessToast("Email verified successfully!");

        // If we received user data and token in the response, set them
        if (data.data?.accessToken) {
          console.log(
            "Setting token from email verification:",
            data.data.accessToken
          );
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
      }
    },
    onError: (error) => {
      console.error("Email verification error:", error);
      showErrorToast(
        error.response?.data?.message || "Email verification failed"
      );
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
      showSuccessToast("Logged out successfully");

      // Chuyển hướng về trang đăng nhập
      window.location.href = "/login";
    },
    onError: (error) => {
      console.error("Logout error:", error);
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
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast(
          "Reset code sent to your email! Please check your inbox."
        );
      }
    },
    onError: (error) => {
      console.error("Forgot password error:", error);
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
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast("Reset code verified successfully!");
      }
    },
    onError: (error) => {
      console.error("Verify reset code error:", error);
      showErrorToast(
        error.response?.data?.message || "Verification code is invalid"
      );
    },
  });

  // Đặt lại mật khẩu
  const resetPassword = useMutation({
    mutationFn: async (data) => {
      const response = await axiosService.post("/auth/reset-password", data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast("Password reset successfully! You can now login.");
      }
    },
    onError: (error) => {
      console.error("Reset password error:", error);

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
      console.log("Setting credentials:", JSON.stringify(userData, null, 2));

      if (userData?.accessToken) {
        console.log("Setting token:", userData.accessToken);
        tokenService.setToken(userData.accessToken);

        if (userData.user) {
          // Ensure user has token property
          const userWithToken = {
            ...userData.user,
            token: userData.accessToken,
          };

          console.log("Saving user data with token:", userWithToken);
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
      console.error("Error in setCredentials:", error);
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
    onSuccess: (data) => {
      if (data.success) {
        showSuccessToast("A new verification code has been sent to your email");
      }
    },
    onError: (error) => {
      console.error("Resend verification error:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to resend verification code"
      );
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

// Add alias exports for backward compatibility
export const useLogin = () => useAuthMutations().login;
export const useSignup = () => useAuthMutations().signup;
export const useVerifyEmail = () => useAuthMutations().verifyEmail;
export const useLogout = () => useAuthMutations().logout;
export const useForgotPassword = () => useAuthMutations().forgotPassword;
export const useVerifyResetCode = () => useAuthMutations().verifyResetCode;
export const useResetPassword = () => useAuthMutations().resetPassword;

export default useAuthMutations;
