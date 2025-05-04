import { useEffect, lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { defaultConfig } from "./utils/toast";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";
import { connectSocket, disconnectSocket } from "./services/socket";
import tokenService from "./services/tokenService";
import { initPrefetchOnHover } from "./utils/prefetchNavigation";

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

function App() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Handle socket connection based on authentication state
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
        disconnectSocket(false); // Complete disconnect on logout
      } catch (error) {
        console.error("Socket disconnection error:", error);
      }
    }

    // Cleanup on app unmount only, not on auth state changes
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
  }, [isAuthenticated, user]);

  // Set unmounting flag
  useEffect(() => {
    return () => {
      window.isUnmounting = true;
    };
  }, []);

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
      <Routes>
        {/* Public Routes with MainLayout */}
        <Route
          path="/"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <HomePage />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/search"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <SearchPage />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/post/:postId"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <PostDetailPage />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/groups"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <GroupsListPage />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <GroupDetailPage />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/groups/:groupId/settings"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <GroupDetailPage isSettingsPage={true} />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/groups/:groupId/manage"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <GroupDetailPage isManagePage={true} />
              </Suspense>
            </MainLayout>
          }
        />
        <Route
          path="/friends"
          element={
            <MainLayout>
              <Suspense fallback={<LoadingFallback />}>
                <FriendsPage />
              </Suspense>
            </MainLayout>
          }
        />

        {/* Game Routes moved to protected section */}

        {/* Auth Routes */}
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

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <HomePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <ProfilePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/friends"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <FriendsPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/messages"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <MessagesPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/messages/:userId"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <MessagesPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/create-post"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <CreatePostPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <ProfilePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/edit-profile"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <EditProfilePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/change-password"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <ChangePasswordPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/groups/create"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <CreateGroupPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/groups/:groupId/settings"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <GroupDetailPage isSettingsPage={true} />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/groups/:groupId/manage"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <GroupDetailPage isManagePage={true} />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/post/edit/:postId"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <CreatePostPage isEditing={true} />
                </Suspense>
              </MainLayout>
            }
          />

          {/* Game Routes (Protected) */}
          <Route
            path="/game"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <GamesPage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/game/code-challenge"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <CodeChallengePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/game/math-puzzle"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <MathPuzzlePage />
                </Suspense>
              </MainLayout>
            }
          />
          <Route
            path="/game/tech-quiz"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingFallback />}>
                  <TechQuizPage />
                </Suspense>
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
        theme={theme}
        limit={defaultConfig.limit}
      />
    </>
  );
}

export default App;
