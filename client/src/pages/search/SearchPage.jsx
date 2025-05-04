import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { usePostContext } from "../../contexts/PostContext";
import PostCard from "../../components/post/PostCard";
import UserCard from "../../components/user/UserCard";
import { SkeletonCard, SkeletonList } from "../../components/skeleton";
import { FiSearch } from "react-icons/fi";
import { useSearchUsers } from "../../hooks/queries/useUserQueries";

const SearchPage = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [activeTab, setActiveTab] = useState("posts");
  const { searchResults, searchLoading, searchError, searchPosts } =
    usePostContext();
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useSearchUsers(query);

  // Trigger search when query changes
  useEffect(() => {
    if (query && query.trim().length >= 2) {
      searchPosts(query);
    }
  }, [query, searchPosts]);

  // Xử lý hiển thị lỗi
  const formatError = (error) => {
    if (!error) return null;

    if (typeof error === "string") {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return "Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau.";
  };

  // Filter results based on active tab
  const postsResults = Array.isArray(searchResults)
    ? searchResults.filter((item) => item && item.type === "post")
    : [];
  const usersResults = usersData?.data || [];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-xl p-6 mb-6 shadow-md"
      >
        <div className="flex items-center mb-4">
          <FiSearch className="w-6 h-6 text-[var(--color-primary)] mr-2" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Kết quả tìm kiếm cho "{query}"
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-[var(--color-border)] mb-6">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "posts"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Bài viết
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "users"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setActiveTab("users")}
          >
            Người dùng
          </button>
        </div>

        {/* Loading State */}
        {(activeTab === "posts" && searchLoading) ||
        (activeTab === "users" && usersLoading) ? (
          <div className="space-y-6">
            {activeTab === "posts" ? (
              [...Array(3)].map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <SkeletonList count={5} />
            )}
          </div>
        ) : null}

        {/* Error State */}
        {(activeTab === "posts" && searchError) ||
        (activeTab === "users" && usersError) ? (
          <div className="bg-[var(--color-bg-error)] p-4 rounded-lg text-[var(--color-text-error)] mb-4">
            {activeTab === "posts"
              ? formatError(searchError)
              : formatError(usersError)}
          </div>
        ) : null}

        {/* Empty State */}
        {!searchLoading &&
          !usersLoading &&
          ((activeTab === "posts" &&
            postsResults.length === 0 &&
            !searchError) ||
            (activeTab === "users" &&
              usersResults.length === 0 &&
              !usersError)) && (
            <div className="text-center py-8 text-[var(--color-text-secondary)]">
              <div className="mb-4">
                <FiSearch className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)]" />
              </div>
              <p className="text-lg font-medium mb-1">
                Không tìm thấy{" "}
                {activeTab === "posts" ? "bài viết" : "người dùng"} nào phù hợp
                với "{query}"
              </p>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Thử tìm kiếm với từ khóa khác hoặc xem các kết quả liên quan bên
                dưới
              </p>
            </div>
          )}

        {/* Results */}
        {!searchLoading && !usersLoading && !searchError && !usersError && (
          <div className="space-y-4">
            {activeTab === "posts" && postsResults.length > 0
              ? postsResults.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))
              : activeTab === "users" && usersResults.length > 0
              ? usersResults.map((user) => (
                  <UserCard key={user._id} user={user} />
                ))
              : null}
          </div>
        )}

        {/* Related Content Suggestion (when no direct results found) */}
        {!searchLoading &&
          postsResults.length === 0 &&
          activeTab === "posts" &&
          !searchError && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Bài viết có thể bạn quan tâm
              </h2>
              <div className="space-y-4">
                {searchLoading ? (
                  [...Array(3)].map((_, index) => <SkeletonCard key={index} />)
                ) : (
                  <div className="text-center py-4 text-[var(--color-text-secondary)]">
                    Không có bài viết gợi ý nào
                  </div>
                )}
              </div>
            </div>
          )}
      </motion.div>
    </div>
  );
};

export default SearchPage;
