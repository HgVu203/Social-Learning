import { useCallback } from "react";
import PostList from "../../components/post/PostList";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";

const HomePage = () => {
  const { user } = useAuth();
  const { posts, loading, error, hasMore, filter, setFilter, loadMorePosts } =
    usePostContext();

  const handleFilterChange = (newFilter) => {
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
    <div className="max-w-2xl mx-auto pt-10 px-4 sm:px-6 lg:px-8">
      {/* Welcome and Create Post Section */}
      <div className="bg-[#16181c] shadow-sm rounded-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome{user ? `, ${user.fullname}` : ""}!
            </h1>
          </div>
          <Link
            to="/create-post"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
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
      <div className="mb-6 bg-[#16181c] shadow-sm rounded-lg">
        <div className="border-b border-gray-800">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleFilterChange("latest")}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === "latest"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              Latest
            </button>
            <button
              onClick={() => handleFilterChange("popular")}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === "popular"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
              }`}
            >
              Popular
            </button>
            <button
              onClick={() => handleFilterChange("following")}
              className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                filter === "following"
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700"
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
          className="inline-flex items-center justify-center p-3 rounded-full shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
