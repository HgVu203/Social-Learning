import { useState } from "react";
import { useLocation } from "react-router-dom";
import { usePostContext } from "../../contexts/PostContext";
import PostCard from "../../components/post/PostCard";
import UserCard from "../../components/user/UserCard";
import { SkeletonCard, SkeletonList } from "../../components/skeleton";

const SearchPage = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [activeTab, setActiveTab] = useState("posts");
  const { searchResults, searchLoading, searchError } = usePostContext();

  // Filter results based on active tab
  const filteredResults =
    activeTab === "posts"
      ? searchResults.filter((item) => item.type === "post")
      : searchResults.filter((item) => item.type === "user");

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Search Results for "{query}"
        </h1>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "posts"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "users"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
        </div>

        {/* Loading State */}
        {searchLoading && (
          <div className="space-y-6">
            {activeTab === "posts" ? (
              [...Array(3)].map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <SkeletonList count={5} />
            )}
          </div>
        )}

        {/* Error State */}
        {searchError && (
          <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-4">
            {searchError}
          </div>
        )}

        {/* Empty State */}
        {!searchLoading && filteredResults.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No {activeTab} found matching "{query}"
          </div>
        )}

        {/* Results */}
        {!searchLoading && filteredResults.length > 0 && (
          <div className="space-y-4">
            {filteredResults.map((result) =>
              activeTab === "posts" ? (
                <PostCard key={result.id} post={result} />
              ) : (
                <UserCard key={result.id} user={result} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
