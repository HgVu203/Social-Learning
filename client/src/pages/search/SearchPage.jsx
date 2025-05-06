import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { usePostContext } from "../../contexts/PostContext";
import PostCard from "../../components/post/PostCard";
import UserCard from "../../components/user/UserCard";
import GroupCardSearch from "../../components/group/GroupCardSearch";
import { SkeletonCard, SkeletonList } from "../../components/skeleton";
import { FiSearch, FiInfo } from "react-icons/fi";
import { useSearchUsers } from "../../hooks/queries/useUserQueries";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";

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
  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
    hasNextPage: hasMoreGroups,
    fetchNextPage: fetchMoreGroups,
  } = useGroupQueries.useSearchGroups(query);

  // Trigger search when query changes
  useEffect(() => {
    if (query && query.trim().length >= 2) {
      searchPosts(query);
    }
  }, [query, searchPosts]);

  // Handle error display
  const formatError = (error) => {
    if (!error) return null;

    if (typeof error === "string") {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    return "An error occurred while searching. Please try again later.";
  };

  // Filter and categorize results based on active tab
  const postsResults = Array.isArray(searchResults)
    ? searchResults.filter((item) => item && item.type === "post")
    : [];
  const usersResults = usersData?.data || [];

  // Separate exact matches from related/similar results
  const exactPostResults = postsResults.filter((post) => !post.isRelated);
  const relatedPostResults = postsResults.filter((post) => post.isRelated);

  const exactUserResults = usersResults.filter((user) => !user.isSimilarMatch);
  const similarUserResults = usersResults.filter((user) => user.isSimilarMatch);

  // Group results handling
  const allGroupResults = groupsData?.pages?.flatMap((page) => page.data) || [];
  const exactGroupResults = allGroupResults.filter(
    (group) => !group.isSimilarMatch
  );
  const similarGroupResults = allGroupResults.filter(
    (group) => group.isSimilarMatch
  );

  // Debug logging for group results
  useEffect(() => {
    if (activeTab === "groups" && groupsData) {
      console.log("Group search data:", groupsData);
      console.log("All group results:", allGroupResults);
      console.log("Exact group results:", exactGroupResults);
      console.log("Similar group results:", similarGroupResults);
    }
  }, [
    activeTab,
    groupsData,
    allGroupResults,
    exactGroupResults,
    similarGroupResults,
  ]);

  return (
    <div className="max-w-4xl mx-auto px-3 py-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-md"
      >
        <div className="flex items-center mb-3 sm:mb-4">
          <FiSearch className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--color-primary)] mr-2" />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-[var(--color-text-primary)] truncate">
            Search results for "{query}"
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 sm:space-x-4 border-b border-[var(--color-border)] mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          <button
            className={`py-1.5 sm:py-2 px-3 sm:px-4 font-medium cursor-pointer whitespace-nowrap ${
              activeTab === "posts"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`py-1.5 sm:py-2 px-3 sm:px-4 font-medium cursor-pointer whitespace-nowrap ${
              activeTab === "users"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>
          <button
            className={`py-1.5 sm:py-2 px-3 sm:px-4 font-medium cursor-pointer whitespace-nowrap ${
              activeTab === "groups"
                ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
            onClick={() => setActiveTab("groups")}
          >
            Groups
          </button>
        </div>

        {/* Loading State */}
        {(activeTab === "posts" && searchLoading) ||
        (activeTab === "users" && usersLoading) ||
        (activeTab === "groups" && groupsLoading) ? (
          <div className="space-y-4 sm:space-y-6">
            {activeTab === "posts" ? (
              [...Array(3)].map((_, index) => <SkeletonCard key={index} />)
            ) : (
              <SkeletonList count={5} />
            )}
          </div>
        ) : null}

        {/* Error State */}
        {(activeTab === "posts" && searchError) ||
        (activeTab === "users" && usersError) ||
        (activeTab === "groups" && groupsError) ? (
          <div className="bg-[var(--color-bg-error)] p-3 sm:p-4 rounded-lg text-[var(--color-text-error)] mb-3 sm:mb-4 text-sm sm:text-base">
            {activeTab === "posts"
              ? formatError(searchError)
              : activeTab === "users"
              ? formatError(usersError)
              : formatError(groupsError)}
          </div>
        ) : null}

        {/* Empty State - No Results */}
        {!searchLoading &&
          !usersLoading &&
          !groupsLoading &&
          ((activeTab === "posts" &&
            postsResults.length === 0 &&
            !searchError) ||
            (activeTab === "users" &&
              usersResults.length === 0 &&
              !usersError) ||
            (activeTab === "groups" &&
              allGroupResults.length === 0 &&
              !groupsError)) && (
            <div className="text-center py-6 sm:py-8 text-[var(--color-text-secondary)]">
              <div className="mb-3 sm:mb-4">
                <FiSearch className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-text-tertiary)]" />
              </div>
              <p className="text-base sm:text-lg font-medium mb-1">
                No{" "}
                {activeTab === "posts"
                  ? "posts"
                  : activeTab === "users"
                  ? "users"
                  : "groups"}{" "}
                found matching "{query}"
              </p>
              <p className="text-xs sm:text-sm text-[var(--color-text-tertiary)]">
                Try searching with different keywords or spellings
              </p>
            </div>
          )}

        {/* Results */}
        {!searchLoading &&
          !usersLoading &&
          !groupsLoading &&
          activeTab === "posts" &&
          postsResults.length > 0 && (
            <>
              {exactPostResults.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-semibold text-[var(--color-text-primary)] mb-4">
                    Exact Matches
                  </h2>
                  <div className="space-y-4">
                    {exactPostResults.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {relatedPostResults.length > 0 && (
                <div>
                  <div className="flex items-center mb-4">
                    <h2 className="font-semibold text-[var(--color-text-primary)]">
                      Similar Posts
                    </h2>
                    <div className="ml-2 group relative">
                      <FiInfo className="text-[var(--color-text-tertiary)] w-4 h-4" />
                      <div className="absolute left-0 bottom-full mb-2 w-60 bg-[var(--color-bg-secondary)] shadow-lg rounded-md p-2 text-xs hidden group-hover:block z-10">
                        These posts are similar to your search but might not
                        contain the exact keywords
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {relatedPostResults.map((post) => (
                      <PostCard key={post._id} post={post} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        {/* Users Results */}
        {!searchLoading &&
          !usersLoading &&
          activeTab === "users" &&
          usersResults.length > 0 && (
            <>
              {exactUserResults.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-semibold text-[var(--color-text-primary)] mb-3 sm:mb-4 text-sm sm:text-base">
                    Exact Matches
                  </h2>
                  <div className="space-y-3">
                    {exactUserResults.map((user) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}

              {similarUserResults.length > 0 && (
                <div>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <h2 className="font-semibold text-[var(--color-text-primary)] text-sm sm:text-base">
                      Similar Users
                    </h2>
                    <div className="ml-2 group relative">
                      <FiInfo className="text-[var(--color-text-tertiary)] w-4 h-4" />
                      <div className="absolute left-0 bottom-full mb-2 w-60 bg-[var(--color-bg-secondary)] shadow-lg rounded-md p-2 text-xs hidden group-hover:block z-10">
                        These users are similar to your search but might not
                        match the exact keywords
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {similarUserResults.map((user) => (
                      <UserCard key={user._id} user={user} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

        {/* Groups Results */}
        {!searchLoading &&
          !groupsLoading &&
          activeTab === "groups" &&
          allGroupResults.length > 0 && (
            <>
              {exactGroupResults.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-semibold text-[var(--color-text-primary)] mb-3 sm:mb-4 text-sm sm:text-base">
                    Exact Matches
                  </h2>
                  <div className="space-y-3">
                    {exactGroupResults.map((group) => (
                      <GroupCardSearch key={group._id} group={group} />
                    ))}
                  </div>
                </div>
              )}

              {similarGroupResults.length > 0 && (
                <div>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <h2 className="font-semibold text-[var(--color-text-primary)] text-sm sm:text-base">
                      Similar Groups
                    </h2>
                    <div className="ml-2 group relative">
                      <FiInfo className="text-[var(--color-text-tertiary)] w-4 h-4" />
                      <div className="absolute left-0 bottom-full mb-2 w-60 bg-[var(--color-bg-secondary)] shadow-lg rounded-md p-2 text-xs hidden group-hover:block z-10">
                        These groups are similar to your search but might not
                        match the exact keywords
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {similarGroupResults.map((group) => (
                      <GroupCardSearch key={group._id} group={group} />
                    ))}
                  </div>
                </div>
              )}

              {hasMoreGroups && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => fetchMoreGroups()}
                    className="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Load More Groups
                  </button>
                </div>
              )}
            </>
          )}
      </motion.div>
    </div>
  );
};

export default SearchPage;
