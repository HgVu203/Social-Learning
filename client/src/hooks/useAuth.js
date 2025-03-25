import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import { login, logout, setCredentials } from "../redux/authSlice";
import { authService } from '../services/authService';

/**
 * Hook cung cấp các chức năng xác thực người dùng
 * @returns {Object} Các phương thức và trạng thái xác thực
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, loading, error, isAuthenticated } = useSelector((state) => state.auth);

  // Đăng nhập với email và mật khẩu
  const handleLogin = useCallback(
    async (credentials) => {
      const result = await dispatch(login(credentials)).unwrap();
      return result;
    },
    [dispatch]
  );

  // Đăng xuất
  const handleLogout = useCallback(async () => {
    await dispatch(logout()).unwrap();
  }, [dispatch]);

  // Đăng nhập với social media
  const handleSocialLogin = useCallback((provider) => {
    if (provider === "google") {
      authService.loginWithGoogle();
    } else if (provider === "facebook") {
      authService.loginWithFacebook();
    }
  }, []);

  // Callback khi đăng nhập social thành công
  const handleSocialLoginCallback = useCallback(
    (accessToken, user) => {
      dispatch(setCredentials({ accessToken, user }));
    },
    [dispatch]
  );

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    socialLogin: handleSocialLogin,
    socialLoginCallback: handleSocialLoginCallback,
  };
};
