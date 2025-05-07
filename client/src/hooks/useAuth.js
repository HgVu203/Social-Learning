import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import { login, logout, setCredentials } from "../store/slices/authSlice";
import { authService } from './../services/authService';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, loading, error } = useSelector((state) => state.auth);

  const handleLogin = useCallback(
    async (credentials) => {
      const result = await dispatch(login(credentials)).unwrap();
      return result;
    },
    [dispatch]
  );

  const handleLogout = useCallback(async () => {
    await dispatch(logout()).unwrap();
  }, [dispatch]);

  const handleSocialLogin = useCallback((provider) => {
    if (provider === "google") {
      authService.googleLogin();
    } else if (provider === "facebook") {
      authService.facebookLogin();
    }
  }, []);

  const handleSocialLoginCallback = useCallback(
    (accessToken, user) => {
      dispatch(setCredentials({ accessToken, user }));
    },
    [dispatch]
  );

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token,
    login: handleLogin,
    logout: handleLogout,
    socialLogin: handleSocialLogin,
    socialLoginCallback: handleSocialLoginCallback,
  };
};
