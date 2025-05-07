import { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostQueries } from "../hooks/queries/usePostQueries";
import { usePostMutations } from "../hooks/mutations/usePostMutations";
import { useAuth } from "./AuthContext";

// Utility function to deduplicate posts by ID
const deduplicatePosts = (posts) => {
  if (!posts) {
    console.warn("deduplicatePosts: posts array is null or undefined");
    return [];
  }

  if (!Array.isArray(posts)) {
    console.warn("deduplicatePosts: posts is not an array:", typeof posts);
    return [];
  }

  if (posts.length === 0) {
    return [];
  }

  const uniquePosts = [];
  const seenIds = new Set();
  const invalidPosts = [];

  for (const post of posts) {
    // Skip undefined, null posts, or posts without _id
    if (!post) {
      invalidPosts.push("null or undefined post");
      continue;
    }

    if (!post._id) {
      invalidPosts.push(JSON.stringify(post).substring(0, 100) + "...");
      continue;
    }

    if (!seenIds.has(post._id)) {
      seenIds.add(post._id);
      uniquePosts.push(post);
    }
  }

  // Log if we found invalid posts
  if (invalidPosts.length > 0) {
    console.warn(
      `deduplicatePosts: Found ${invalidPosts.length} invalid posts`,
      invalidPosts.length <= 3 ? invalidPosts : invalidPosts.slice(0, 3)
    );
  }

  return uniquePosts;
};

const PostContext = createContext({
  posts: [],
  currentPost: null,
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  limit: 10,
  totalPosts: 0,
  filter: "latest",
  selectedPost: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,
  fetchGroupPosts: () => {},
  optimisticAddComment: () => {},
  optimisticToggleCommentLike: () => {},
  reactToComment: null,
});

export const PostProvider = ({ children }) => {
  const { user } = useAuth();

  // Initialize filter mặc định dựa vào trạng thái đăng nhập
  const [filter, setFilter] = useState(user ? "recommended" : "latest");
  const [page, setPage] = useState(1);

  // Đồng bộ filter mặc định khi user thay đổi
  useEffect(() => {
    if (user && filter !== "recommended") {
      setFilter("recommended");
    } else if (!user && filter === "recommended") {
      setFilter("latest");
    }
  }, [user]);

  const [limit, setLimit] = useState(10);
  const [selectedPost, setSelectedPost] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();

  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostQueries.usePosts(filter, limit);

  const {
    data: groupPostsData,
    isLoading: groupPostsLoading,
    error: groupPostsError,
    fetchNextPage: fetchNextGroupPage,
    hasNextPage: hasNextGroupPage,
    isFetchingNextPage: isFetchingNextGroupPage,
  } = usePostQueries.useGroupPosts(groupId, limit);

  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
  } = usePostQueries.useSearchPosts(searchQuery);

  // Add error logging and debugging
  useEffect(() => {
    // Debug logging function
    const logDebugInfo = () => {
      try {
        console.log("PostContext Debug Info:", {
          user: user ? { id: user._id, username: user.username } : null,
          filter,
          page,
          limit,
          groupId,
          postsDataStatus: {
            hasPages: !!postsData?.pages,
            pageCount: postsData?.pages?.length,
            firstPageData: postsData?.pages?.[0]?.data?.length,
            error: postsError ? postsError.message : null,
          },
          groupPostsDataStatus: {
            hasPages: !!groupPostsData?.pages,
            pageCount: groupPostsData?.pages?.length,
            firstPageData: groupPostsData?.pages?.[0]?.data?.length,
            error: groupPostsError ? groupPostsError.message : null,
          },
        });
      } catch (err) {
        console.error("Error in PostContext debug logging:", err);
      }
    };

    // Log when data changes
    logDebugInfo();
  }, [user, filter, postsData, groupPostsData, postsError, groupPostsError]);

  const {
    createPost,
    updatePost,
    deletePost,
    likePost,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    reactToComment,
    fetchComments,
    optimisticAddComment,
    optimisticToggleCommentLike,
    initializeCommentsArray,
  } = usePostMutations();

  // Derived state
  const posts = deduplicatePosts(
    postsData?.pages && Array.isArray(postsData.pages)
      ? postsData.pages.flatMap((page) => page?.data || [])
      : []
  );
  const totalPosts = postsData?.pages?.[0]?.pagination?.total || 0;
  const hasMore = hasNextPage;

  // Method to fetch posts for a specific group
  const fetchGroupPosts = (newGroupId) => {
    if (!newGroupId) return;
    setGroupId(newGroupId);
    queryClient.invalidateQueries({ queryKey: ["posts", "group", newGroupId] });
  };

  // Methods for changing filter or loading more
  const changeFilter = (newFilter) => {
    // Don't allow non-authenticated users to use recommended filter
    if (newFilter === "recommended" && !user) {
      console.log("User not authenticated, cannot use recommended filter");
      return;
    }

    setFilter(newFilter);
    setPage(1);
    // Invalidate query để tải lại dữ liệu
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  // Method to change the items per page
  const changeLimit = (newLimit) => {
    setLimit(newLimit);
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  // Get the appropriate posts data based on whether we're viewing group posts
  const currentPosts = groupId
    ? deduplicatePosts(
        groupPostsData?.pages && Array.isArray(groupPostsData.pages)
          ? groupPostsData.pages.flatMap((page) => page?.data || [])
          : []
      )
    : posts;

  const currentHasMore = groupId ? hasNextGroupPage : hasMore;
  const currentLoading = groupId ? groupPostsLoading : postsLoading;
  const currentError = groupId ? groupPostsError : postsError;

  const loadMorePosts = () => {
    if (groupId) {
      if (hasNextGroupPage && !isFetchingNextGroupPage) {
        fetchNextGroupPage();
        setPage((prevPage) => prevPage + 1);
      }
    } else {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
        setPage((prevPage) => prevPage + 1);
      }
    }
  };

  // Method to select and fetch a single post
  const selectPost = (postId) => {
    setSelectedPost(postId);
  };

  // Method to search posts
  const searchPosts = (query) => {
    setSearchQuery(query);
  };

  // Reset groupId method
  const resetGroupId = () => {
    if (groupId) {
      console.log("Resetting groupId from:", groupId);
      setGroupId(null);
      // Invalidate các queries để tải lại dữ liệu
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      // Đảm bảo setPage về 1 để khi gọi fetchNextPage lấy từ đầu
      setPage(1);
    }
  };

  // Clear data methods
  const clearPosts = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    setPage(1);
  };

  const clearSearchResults = () => {
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["posts", "search"] });
  };

  const value = {
    // State
    posts: currentPosts,
    loading: currentLoading,
    error: currentError,
    hasMore: currentHasMore,
    page,
    limit,
    totalPosts,
    filter,
    selectedPost,
    searchQuery,
    searchResults: searchResults?.data || [],
    searchLoading,
    searchError,
    groupId,

    // Actions
    setFilter: changeFilter,
    setLimit: changeLimit,
    setSelectedPost: selectPost,
    searchPosts,
    loadMorePosts,
    clearPosts,
    clearSearchResults,
    fetchGroupPosts,
    resetGroupId,

    // Mutations
    createPost,
    updatePost,
    deletePost,
    likePost,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    reactToComment,
    fetchComments,
    optimisticAddComment,
    optimisticToggleCommentLike,
    initializeCommentsArray,

    // Refetch
    refetchPosts,
  };

  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
};

export const usePostContext = () => useContext(PostContext);
// Add alias for backward compatibility
export const usePost = usePostContext;

export default PostContext;
