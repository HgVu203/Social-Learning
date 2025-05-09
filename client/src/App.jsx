import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { defaultConfig } from "./utils/toast";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { disconnectSocket } from "./services/socket";
import tokenService from "./services/tokenService";
import { initPrefetchOnHover } from "./utils/prefetchNavigation";
import ScrollToTop from "./components/common/ScrollToTop";
import RedirectWrapper from "./utils/RedirectWrapper";

// Layout
import ProtectedRoute from "./utils/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

// Lazy load components
const HomePage = lazy(() => import("./pages/home/HomePage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage"));
const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage")
);
const VerifyResetCodePage = lazy(() =>
  import("./pages/auth/VerifyResetCodePage")
);
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const EditProfilePage = lazy(() => import("./pages/profile/EditProfilePage"));
const ChangePasswordPage = lazy(() =>
  import("./pages/profile/ChangePasswordPage")
);
const PostDetailPage = lazy(() => import("./pages/post/PostDetailPage"));
const CreatePostPage = lazy(() => import("./pages/post/CreatePostPage"));
const NotFoundPage = lazy(() => import("./pages/notfound/NotFoundPage"));
const GroupsListPage = lazy(() => import("./pages/group/GroupsListPage"));
const GroupDetailPage = lazy(() => import("./pages/group/GroupDetailPage"));
const FriendsPage = lazy(() => import("./pages/friend/FriendsPage"));
const CreateGroupPage = lazy(() => import("./pages/group/CreateGroupPage"));
const MessagesPage = lazy(() => import("./pages/message/MessagesPage"));
const SocialAuthCallback = lazy(() =>
  import("./pages/auth/SocialAuthCallback")
);
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const SearchPage = lazy(() => import("./pages/search/SearchPage"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

// Game Pages
const GamesPage = lazy(() => import("./pages/game/GamesPage"));
const CodeChallengePage = lazy(() => import("./pages/game/CodeChallengePage"));
const MathPuzzlePage = lazy(() => import("./pages/game/MathPuzzlePage"));
const TechQuizPage = lazy(() => import("./pages/game/TechQuizPage"));

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Protected Admin Route Component
const AdminRoute = () => {
  const { user, loading } = useAuth();

  // Sử dụng useEffect để kiểm tra cả user từ context và từ localStorage
  useEffect(() => {
    if (!loading) {
      // Có thể thêm logic kiểm tra từ localStorage nếu cần
      const storedUser = tokenService.getUser();
      console.log("Admin route check - Context user:", user);
      console.log("Admin route check - Stored user:", storedUser);
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingFallback />;
  }

  // Kiểm tra quyền admin từ user trong context hoặc localStorage
  const storedUser = tokenService.getUser();
  const isAdmin =
    (user && user.role === "admin") ||
    (storedUser && storedUser.role === "admin");

  // Sử dụng Navigate component thay vì hook
  return isAdmin ? <Outlet /> : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Handle socket disconnection when logging out
  useEffect(() => {
    console.log("Auth state changed", isAuthenticated);

    if (!isAuthenticated) {
      // Disconnect socket on logout
      disconnectSocket(false); // Complete disconnect on logout
    }

    // Cleanup on app unmount only
    return () => {
      if (window.isUnmounting) {
        try {
          console.log("Disconnecting socket due to app unmount");
          disconnectSocket(false); // Complete disconnect on app unmount
        } catch (error) {
          console.error("Socket cleanup error:", error);
        }
      }
    };
  }, [isAuthenticated]);

  // Track navigation to handle socket pausing between pages (except messages pages)
  useEffect(() => {
    const isMessagesPage = location.pathname.startsWith("/messages");
    const isInitialLoad = window.initialPageLoad;

    // Skip initial page load
    if (isInitialLoad) {
      window.initialPageLoad = false;
      return;
    }

    // If navigating away from messages to another page, temporarily disconnect socket
    if (!isMessagesPage && isAuthenticated) {
      console.log("Navigated away from messages page, pausing socket");
      disconnectSocket(true); // Disconnect with navigation flag to enable reconnection
    }
  }, [location.pathname, isAuthenticated]);

  // Track navigation to explicitly handle socket connections only on message pages
  useEffect(() => {
    const isMessagesPage =
      location.pathname.startsWith("/messages") ||
      location.pathname.includes("/chat");
    const isInitialLoad = window.initialPageLoad;

    // Skip initial page load
    if (isInitialLoad) {
      window.initialPageLoad = false;
      return;
    }

    // Chỉ xử lý socket khi người dùng đã đăng nhập
    if (isAuthenticated) {
      if (isMessagesPage) {
        // Nếu đang ở trang message, kết nối socket
        console.log("Navigated to messages page, connecting socket");
        import("./services/socket").then(({ connectSocket }) => {
          connectSocket();
        });
      } else {
        // Nếu đang rời khỏi trang message, đóng socket
        console.log("Navigated away from messages page, disconnecting socket");
        disconnectSocket(true); // Ngắt kết nối với flag thông báo do chuyển trang
      }
    }
  }, [location.pathname, isAuthenticated]);

  // Set initial page load flag
  useEffect(() => {
    window.initialPageLoad = true;
  }, []);

  // Khởi tạo prefetching cho các routes phổ biến
  useEffect(() => {
    // Định nghĩa routes và components cho prefetch khi hover
    const routeMapping = {
      "/": HomePage,
      "/profile*": ProfilePage,
      "/messages*": MessagesPage,
      "/groups*": [GroupsListPage, GroupDetailPage],
      "/friends*": FriendsPage,
      "/post*": [PostDetailPage, CreatePostPage],
      "/create-post": CreatePostPage,
      "/game*": [GamesPage, CodeChallengePage, MathPuzzlePage, TechQuizPage],
    };

    // Định nghĩa common assets cho các routes
    const assetMapping = {
      "/profile*": [
        // Common avatar images nếu có
        "/assets/images/default-avatar.svg",
      ],
      "/groups*": [
        // Group images nếu có
        "/assets/images/default-group.svg",
      ],
      "/game*": [
        // Game images
        "/assets/games/code-challenge.jpg",
        "/assets/games/math-puzzle.jpg",
        "/assets/games/tech-quiz.jpg",
      ],
    };

    // Khởi tạo prefetch system
    initPrefetchOnHover({
      routes: routeMapping,
      assets: assetMapping,
      delay: 150, // Đợi 150ms trước khi bắt đầu prefetch
    });
  }, []);

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Auth Routes - Outside MainLayout */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/signup"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SignupPage />
            </Suspense>
          }
        />
        <Route
          path="/verify-email"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <VerifyEmailPage />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/verify-reset-code"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <VerifyResetCodePage />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ResetPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/auth/social-callback"
          element={
            <Suspense fallback={<LoadingFallback />}>
              <SocialAuthCallback />
            </Suspense>
          }
        />

        {/* Admin Routes - Outside MainLayout */}
        <Route element={<AdminRoute />}>
          <Route
            path="/admin"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            }
          />
        </Route>

        {/* Main Layout - all page content will be rendered inside the shared layout */}
        <Route element={<MainLayout />}>
          {/* Public Routes */}
          <Route
            path="/"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <HomePage />
              </Suspense>
            }
          />
          <Route
            path="/search"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <SearchPage />
              </Suspense>
            }
          />
          <Route
            path="/post/:postId"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <PostDetailPage />
              </Suspense>
            }
          />

          {/* Redirect Routes for URL fixes */}
          <Route
            path="/profile"
            element={
              <RedirectWrapper targetPath="/profile" appendUserId={true} />
            }
          />
          <Route
            path="/games"
            element={<RedirectWrapper targetPath="/game" />}
          />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/profile"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="/friends"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <FriendsPage />
                </Suspense>
              }
            />
            <Route
              path="/messages"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MessagesPage />
                </Suspense>
              }
            />
            <Route
              path="/messages/:userId"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MessagesPage />
                </Suspense>
              }
            />
            <Route
              path="/create-post"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CreatePostPage />
                </Suspense>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ProfilePage />
                </Suspense>
              }
            />
            <Route
              path="/edit-profile"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <EditProfilePage />
                </Suspense>
              }
            />
            <Route
              path="/change-password"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ChangePasswordPage />
                </Suspense>
              }
            />
            <Route
              path="/create-group"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CreateGroupPage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/groups"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GroupsListPage />
                </Suspense>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GroupDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/groups/:groupId/settings"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GroupDetailPage isSettingsPage={true} />
                </Suspense>
              }
            />
            <Route
              path="/groups/:groupId/manage"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GroupDetailPage isManagePage={true} />
                </Suspense>
              }
            />

            {/* Game Routes */}
            <Route
              path="/game"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <GamesPage />
                </Suspense>
              }
            />
            <Route
              path="/game/code-challenge"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <CodeChallengePage />
                </Suspense>
              }
            />
            <Route
              path="/game/math-puzzle"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <MathPuzzlePage />
                </Suspense>
              }
            />
            <Route
              path="/game/tech-quiz"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <TechQuizPage />
                </Suspense>
              }
            />
          </Route>

          {/* 404 Page */}
          <Route
            path="*"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>

      <ToastContainer {...defaultConfig} theme={theme} />
    </>
  );
}

export default App;
