import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { defaultConfig } from "./utils/toast";
import { useAuth } from "./contexts/AuthContext";
import { connectSocket, disconnectSocket } from "./services/socket";
import tokenService from "./services/tokenService";

// Layout
import ProtectedRoute from "./utils/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

// Pages
import HomePage from "./pages/home/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import VerifyResetCodePage from "./pages/auth/VerifyResetCodePage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ProfilePage from "./pages/profile/ProfilePage";
import EditProfilePage from "./pages/profile/EditProfilePage";
import ChangePasswordPage from "./pages/profile/ChangePasswordPage";
import PostDetailPage from "./pages/post/PostDetailPage";
import CreatePostPage from "./pages/post/CreatePostPage";
import NotFoundPage from "./pages/notfound/NotFoundPage";
import GroupsListPage from "./pages/group/GroupsListPage";
import GroupDetailPage from "./pages/group/GroupDetailPage";
import FriendsPage from "./pages/friend/FriendsPage";
import CreateGroupPage from "./pages/group/CreateGroupPage";
import MessagesPage from "./pages/message/MessagesPage";
import SocialAuthCallback from "./pages/auth/SocialAuthCallback";

function App() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect socket when user logs in
      try {
        const userToken =
          user.token || user.accessToken || tokenService.getToken();
        if (userToken) {
          console.log("Connecting socket with token:", userToken);
          connectSocket(userToken);
        } else {
          console.error(
            "User is authenticated but token is missing - user object:",
            user
          );
          connectSocket();
        }
      } catch (error) {
        console.error("Socket connection error:", error);
      }
    } else {
      // Disconnect socket when user logs out
      try {
        console.log("Disconnecting socket due to user logout");
        disconnectSocket();
      } catch (error) {
        console.error("Socket disconnection error:", error);
      }
    }

    // Chỉ ngắt kết nối khi component unmount
    // không làm điều này khi effect chạy lại do user/isAuthenticated thay đổi
    return () => {
      // Chỉ thực hiện khi component thực sự unmount, không phải khi re-render
      if (window.isUnmounting) {
        try {
          console.log("Disconnecting socket due to component unmount");
          disconnectSocket();
        } catch (error) {
          console.error("Socket cleanup error:", error);
        }
      }
    };
  }, [isAuthenticated, user]);

  // Đặt cờ khi component unmount
  useEffect(() => {
    return () => {
      window.isUnmounting = true;
    };
  }, []);

  return (
    <>
      <Routes>
        {/* Public Routes with MainLayout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <HomePage />
            </MainLayout>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <MainLayout>
              <PostDetailPage />
            </MainLayout>
          }
        />
        <Route
          path="/groups"
          element={
            <MainLayout>
              <GroupsListPage />
            </MainLayout>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <MainLayout>
              <GroupDetailPage />
            </MainLayout>
          }
        />
        <Route
          path="/friends"
          element={
            <MainLayout>
              <FriendsPage />
            </MainLayout>
          }
        />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-reset-code" element={<VerifyResetCodePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/social-callback" element={<SocialAuthCallback />} />

        {/* Protected Routes - MainLayout được áp dụng trong từng Route */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <MainLayout>
                <HomePage />
              </MainLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            }
          />
          <Route
            path="/friends"
            element={
              <MainLayout>
                <FriendsPage />
              </MainLayout>
            }
          />
          <Route
            path="/messages"
            element={
              <MainLayout>
                <MessagesPage />
              </MainLayout>
            }
          />
          <Route
            path="/create-post"
            element={
              <MainLayout>
                <CreatePostPage />
              </MainLayout>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <MainLayout>
                <EditProfilePage />
              </MainLayout>
            }
          />
          <Route
            path="/change-password"
            element={
              <MainLayout>
                <ChangePasswordPage />
              </MainLayout>
            }
          />
          <Route
            path="/create-group"
            element={
              <MainLayout>
                <CreateGroupPage />
              </MainLayout>
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Cấu hình Toast Container */}
      <ToastContainer
        position={defaultConfig.position}
        autoClose={defaultConfig.autoClose}
        hideProgressBar={defaultConfig.hideProgressBar}
        closeOnClick={defaultConfig.closeOnClick}
        pauseOnHover={defaultConfig.pauseOnHover}
        draggable={defaultConfig.draggable}
        pauseOnFocusLoss={defaultConfig.pauseOnFocusLoss}
        theme={defaultConfig.theme}
        limit={defaultConfig.limit}
      />
    </>
  );
}

export default App;
