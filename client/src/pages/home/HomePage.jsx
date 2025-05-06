import { useCallback, useEffect, lazy } from "react";
import PostList from "../../components/post/PostList";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import { toast } from "react-toastify";
import { prefetchComponents } from "../../utils/prefetch";

// Prefetch components thường được sử dụng từ trang Home
const ProfilePage = lazy(() => import("../profile/ProfilePage"));
const MessagesPage = lazy(() => import("../message/MessagesPage"));
const CreatePostPage = lazy(() => import("../post/CreatePostPage"));

const HomePage = () => {
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
  } = usePostContext();

  // Reset groupId khi component Home được mount
  useEffect(() => {
    // Khi người dùng vào trang chủ, reset groupId để hiển thị tất cả bài viết
    resetGroupId();
  }, [resetGroupId]);

  useEffect(() => {
    // Prefetch các components quan trọng khi trang Home được tải
    prefetchComponents([ProfilePage, MessagesPage, CreatePostPage]);
  }, []);

  const handleFilterChange = (newFilter) => {
    // Check if user is authenticated for the recommended filter
    if (newFilter === "recommended" && !user) {
      toast.info("Please log in to see personalized recommendations", {
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

  return (
    <div className="max-w-2xl mx-auto pt-2 sm:pt-6 md:pt-10 px-2 sm:px-4 md:px-6 lg:px-8">
      {/* Welcome and Create Post Section */}
      <div className="bg-[var(--color-bg-secondary)] shadow-sm rounded-lg mb-3 sm:mb-6 p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="max-w-[60%]">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] truncate">
              Welcome{user ? `, ${user.fullname}` : ""}!
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
            Create Post
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-[var(--color-bg-secondary)] shadow-sm rounded-lg">
        <div className="border-b border-[var(--color-border)]">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleFilterChange("recommended")}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === "recommended"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
              } ${!user ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              disabled={!user}
              title={
                !user ? "Please log in to see personalized recommendations" : ""
              }
            >
              For You
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
              Latest
            </button>
            <button
              onClick={() => handleFilterChange("popular")}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm cursor-pointer ${
                filter === "popular"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => handleFilterChange("following")}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm cursor-pointer ${
                filter === "following"
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]"
              }`}
            >
              Following
            </button>
          </nav>
        </div>
      </div>

      {/* Posts */}
      <PostList
        posts={posts}
        loading={loading}
        error={error}
        hasMore={hasMore}
        loadMore={handleLoadMore}
      />

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
