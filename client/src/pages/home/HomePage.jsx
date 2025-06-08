import { useCallback, useEffect, lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import { toast } from "react-toastify";
import { prefetchComponents } from "../../utils/prefetch";
import useSkeletonLoader from "../../hooks/useSkeletonLoader";
import { PostListSkeleton } from "../../components/skeleton";

// Lazy load các components
const PostList = lazy(() => import("../../components/post/PostList"));
const ProfilePage = lazy(() => import("../profile/ProfilePage"));
const MessagesPage = lazy(() => import("../message/MessagesPage"));
const CreatePostPage = lazy(() => import("../post/CreatePostPage"));

const HomePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    posts,
    loading,
    error,
    hasMore,
    filter,
    setFilter,
    loadMorePosts,
    resetGroupId,
    refreshPosts,
    isRefreshing,
  } = usePostContext();

  // Sử dụng useSkeletonLoader để quản lý hiển thị skeleton
  const showSkeleton = useSkeletonLoader(loading && !posts?.length, 800, 100);

  // State để kiểm soát việc hiển thị nội dung theo thứ tự ưu tiên
  const [uiState, setUiState] = useState({
    headerReady: false,
    filtersReady: false,
    contentReady: false,
  });

  // Reset groupId khi component Home được mount và thiết lập thứ tự hiển thị UI
  useEffect(() => {
    // Đặt lại groupId để đảm bảo tải bài viết từ feed chung
    if (resetGroupId && typeof resetGroupId === "function") {
      resetGroupId();
    }

    // Hiển thị UI theo thứ tự ưu tiên
    // 1. Header trước
    setTimeout(
      () => setUiState((prev) => ({ ...prev, headerReady: true })),
      10
    );

    // 2. Filters
    setTimeout(
      () => setUiState((prev) => ({ ...prev, filtersReady: true })),
      50
    );

    // 3. Content
    setTimeout(
      () => setUiState((prev) => ({ ...prev, contentReady: true })),
      100
    );

    // Prefetch các components quan trọng sau khi UI chính đã hiển thị
    const timer = setTimeout(() => {
      prefetchComponents([ProfilePage, MessagesPage, CreatePostPage]);
    }, 1500);

    return () => clearTimeout(timer);
  }, [resetGroupId]);

  // Xử lý pull-to-refresh (cho mobile) bằng cách manually trigger refreshPosts
  useEffect(() => {
    // Trình xử lý sự kiện pull-to-refresh sử dụng refreshPosts
    if (refreshPosts && window.innerWidth < 768) {
      const handlePullToRefresh = () => {
        if (window.scrollY < -50) {
          refreshPosts();
        }
      };
      window.addEventListener("scroll", handlePullToRefresh);
      return () => window.removeEventListener("scroll", handlePullToRefresh);
    }
  }, [refreshPosts]);

  const handleFilterChange = (newFilter) => {
    if (newFilter === "recommended" && !user) {
      toast.info(t("home.loginForRecommendations"), {
        position: "top-center",
      });
      return;
    }

    if (newFilter !== filter) {
      setFilter(newFilter);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMorePosts();
    }
  }, [loading, hasMore, loadMorePosts]);

  // Hiển thị skeleton trong quá trình tải ban đầu hoặc refresh
  const shouldShowSkeleton = showSkeleton || isRefreshing;

  return (
    <div className="w-full h-full pt-2 sm:pt-6 md:pt-8 px-2 sm:px-4 md:px-6">
      {/* Welcome and Create Post Section */}
      {uiState.headerReady && (
        <div className="bg-[var(--color-bg-secondary)] shadow-sm rounded-lg mb-3 sm:mb-6 p-3 sm:p-4 md:p-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="max-w-[60%]">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] truncate">
                {user
                  ? t("home.welcomeUser", { name: user.fullname })
                  : t("home.welcome") + "!"}
              </h1>
            </div>
            <Link
              to="/create-post"
              className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition duration-150 ease-in-out cursor-pointer"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t("home.createPost")}
            </Link>
          </div>
        </div>
      )}

      {/* Filters */}
      {uiState.filtersReady && (
        <div
          className="mb-6 bg-[var(--color-bg-secondary)] shadow-sm rounded-lg animate-fadeIn"
          style={{ animationDelay: "100ms" }}
        >
          <div className="border-b border-[var(--color-border)]">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleFilterChange("recommended")}
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  filter === "recommended"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
                } ${
                  !user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                disabled={!user}
                title={!user ? t("home.loginForRecommendations") : ""}
              >
                {t("home.filters.forYou")}
                {!user && (
                  <span className="inline-block ml-1 text-xs">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                  </span>
                )}
              </button>
              <button
                onClick={() => handleFilterChange("latest")}
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm cursor-pointer ${
                  filter === "latest"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
                }`}
              >
                {t("home.filters.latest")}
              </button>
              <button
                onClick={() => handleFilterChange("popular")}
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm cursor-pointer ${
                  filter === "popular"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
                }`}
              >
                {t("home.filters.popular")}
              </button>
              <button
                onClick={() => handleFilterChange("following")}
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm cursor-pointer ${
                  filter === "following"
                    ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
                }`}
              >
                {t("home.filters.following")}
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Posts */}
      {uiState.contentReady && (
        <>
          {shouldShowSkeleton ? (
            <PostListSkeleton count={3} />
          ) : (
            <Suspense fallback={<PostListSkeleton count={2} />}>
              <PostList
                posts={posts}
                loading={loading}
                error={error}
                hasMore={hasMore}
                loadMore={handleLoadMore}
              />
            </Suspense>
          )}
        </>
      )}

      {/* Create Post Fab Button (mobile only) */}
      <div className="fixed bottom-4 right-4 sm:hidden">
        <Link
          to="/create-post"
          className="inline-flex items-center justify-center p-3 rounded-full shadow-lg text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] cursor-pointer"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
