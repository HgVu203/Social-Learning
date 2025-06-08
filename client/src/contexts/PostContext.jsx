import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePostQueries,
  useInitialPosts,
  POST_QUERY_KEYS,
} from "../hooks/queries/usePostQueries";
import { usePostMutations } from "../hooks/mutations/usePostMutations";
import { useAuth } from "./AuthContext";
import axiosService from "../services/axiosService";
import tokenService from "../services/tokenService";
import { useLocation } from "react-router-dom";

// Danh sách các route không cần tải posts
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/verify-reset-code",
  "/reset-password",
  "/auth/social-callback",
];

// Utility function to deduplicate posts by ID
const deduplicatePosts = (posts) => {
  if (!posts) {
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

  for (const post of posts) {
    // Skip undefined, null posts, or posts without _id
    if (!post || !post._id) {
      continue;
    }

    if (!seenIds.has(post._id)) {
      seenIds.add(post._id);
      uniquePosts.push(post);
    }
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
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Kiểm tra có đang ở trang auth không
  const isAuthPage = AUTH_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

  // Biến để theo dõi các thao tác like gần đây, giảm API calls liên tiếp
  const [recentLikeActions, setRecentLikeActions] = useState({});

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
  const initialLimit = 5; // Số lượng bài viết ban đầu - không cần state
  const [selectedPost, setSelectedPost] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();

  // Kiểm tra token trước khi gọi API
  const isTokenValid = useCallback(() => {
    return isAuthenticated && tokenService.isTokenValid();
  }, [isAuthenticated]);

  // Lấy mutation hooks từ usePostMutations
  const {
    createPost,
    updatePost,
    deletePost,
    likePost: originalLikePost,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    reactToComment,
    fetchComments,
    optimisticAddComment,
    initializeCommentsArray,
  } = usePostMutations();

  // Hàm likePost mới với kiểm soát tần suất
  const handleLikePost = useCallback(
    async (postId) => {
      const now = Date.now();
      const lastAction = recentLikeActions[postId] || 0;

      // Ngăn các action liên tiếp trong khoảng 1 giây
      if (now - lastAction < 1000) {
        console.log(
          `[PostContext] Ignoring duplicate like action on ${postId} (throttled)`
        );
        return null;
      }

      // Ghi nhận thời gian của action hiện tại
      setRecentLikeActions((prev) => ({
        ...prev,
        [postId]: now,
      }));

      // Thực hiện like post bằng mutation gốc
      return originalLikePost.mutateAsync(postId);
    },
    [recentLikeActions, originalLikePost]
  );

  // Tạo một đối tượng giả lập mutation hook để giữ cấu trúc API
  const enhancedLikePost = useMemo(
    () => ({
      ...originalLikePost,
      mutateAsync: handleLikePost,
    }),
    [originalLikePost, handleLikePost]
  );

  // Tạo hàm prefetch dữ liệu quan trọng
  const prefetchInitialData = useCallback(async () => {
    if (!isTokenValid()) return;

    try {
      // Prefetch các query quan trọng
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ["posts", "initialFilter", filter],
          queryFn: async () => {
            try {
              const response = await axiosService.get(
                `/posts?filter=${filter}&page=1&limit=5`
              );
              return response.data;
            } catch (error) {
              console.error("Error prefetching initial posts:", error);
              return { data: [] };
            }
          },
          staleTime: 1000 * 60, // 1 minute
        }),
      ]);
    } catch (error) {
      console.error("Error prefetching initial data:", error);
    }
  }, [filter, isTokenValid, queryClient]);

  // Khi mới mount component và filter thay đổi, prefetch dữ liệu
  useEffect(() => {
    prefetchInitialData();
  }, [prefetchInitialData]);

  // Gọi API lấy dữ liệu ban đầu
  const {
    data: initialPostsData,
    isLoading: initialLoading,
    error: initialError,
    refetch: refetchInitialPosts,
  } = useInitialPosts(filter, initialLimit, !isAuthPage);

  // Đánh dấu khi dữ liệu ban đầu đã được tải xong
  useEffect(() => {
    if (initialPostsData && !initialDataLoaded) {
      setInitialDataLoaded(true);
    }
  }, [initialPostsData, initialDataLoaded]);

  // Gọi API phân trang khi cần thêm dữ liệu
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostQueries.usePosts(filter, limit, !isAuthPage);

  const {
    data: groupPostsData,
    isLoading: groupPostsLoading,
    error: groupPostsError,
    fetchNextPage: fetchNextGroupPage,
    hasNextPage: hasNextGroupPage,
    isFetchingNextPage: isFetchingNextGroupPage,
  } = usePostQueries.useGroupPosts(groupId, limit, !isAuthPage && !!groupId);

  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError,
  } = usePostQueries.useSearchPosts(searchQuery, !isAuthPage && !!searchQuery);

  // Kết hợp dữ liệu ban đầu và dữ liệu phân trang
  const allPostsData = (() => {
    if (groupId) {
      return groupPostsData?.pages
        ? groupPostsData.pages.flatMap((page) => page?.data || [])
        : [];
    }

    if (!initialDataLoaded) {
      return initialPostsData?.data || [];
    }

    // Kết hợp dữ liệu ban đầu với dữ liệu phân trang
    const initialPosts = initialPostsData?.data || [];
    const paginatedPosts = postsData?.pages
      ? postsData.pages.flatMap((page) => page?.data || [])
      : [];

    // Nếu không có dữ liệu phân trang, trả về dữ liệu ban đầu
    if (paginatedPosts.length === 0) {
      return initialPosts;
    }

    // Kết hợp và loại bỏ trùng lặp
    const combinedPosts = [...initialPosts];
    const existingIds = new Set(initialPosts.map((post) => post._id));

    paginatedPosts.forEach((post) => {
      if (!existingIds.has(post._id)) {
        combinedPosts.push(post);
        existingIds.add(post._id);
      }
    });

    return combinedPosts;
  })();

  // Derived state
  const posts = deduplicatePosts(allPostsData);
  const totalPosts =
    initialPostsData?.pagination?.total ||
    postsData?.pages?.[0]?.pagination?.total ||
    0;

  // Xử lý trạng thái loading tổng hợp
  const loading =
    (initialLoading && !initialDataLoaded) ||
    (postsLoading && !posts.length) ||
    isFetchingNextPage ||
    isRefreshing;

  const error = initialError || postsError;
  const hasMore = hasNextPage;

  // Method to fetch posts for a specific group
  const fetchGroupPosts = (newGroupId) => {
    if (!newGroupId) return;

    // Nếu đang fetch cùng một group, không fetch lại
    if (newGroupId === groupId) {
      console.log(
        `[PostContext] Already fetching group ${newGroupId}, skipping redundant fetch`
      );
      return;
    }

    console.log(`[PostContext] Fetching posts for group: ${newGroupId}`);
    setGroupId(newGroupId);

    // Chỉ invalidate nếu query không tồn tại hoặc đã stale
    const queryData = queryClient.getQueryData(
      POST_QUERY_KEYS.groupPosts(newGroupId)
    );
    if (!queryData) {
      console.log(
        `[PostContext] No existing data for group ${newGroupId}, invalidating query`
      );
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.groupPosts(newGroupId),
        refetchType: "active",
      });
    } else {
      console.log(`[PostContext] Using existing data for group ${newGroupId}`);
    }
  };

  // Method để refresh lại dữ liệu
  const refreshPosts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (groupId) {
        // Nếu đang ở trong group, chỉ refresh dữ liệu của group đó
        console.log(`[PostContext] Refreshing posts for group: ${groupId}`);
        await queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.groupPosts(groupId),
          exact: true,
          refetchType: "active", // Chỉ refetch những query đang active
        });
      } else {
        // Nếu đang ở trang chính, chỉ refresh dữ liệu post cá nhân
        console.log(
          `[PostContext] Refreshing personal posts with filter: ${filter}`
        );
        await refetchInitialPosts();

        // Invalidate các queries liên quan nhưng không refetch tự động
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.lists(),
          refetchType: "none", // Chỉ đánh dấu stale, không tự động refetch
        });
      }
    } catch (error) {
      console.error("Error refreshing posts:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchInitialPosts, queryClient, groupId, filter]);

  // Methods for changing filter or loading more
  const changeFilter = (newFilter) => {
    // Don't allow non-authenticated users to use recommended filter
    if (newFilter === "recommended" && !user) {
      console.log("User not authenticated, cannot use recommended filter");
      return;
    }

    setFilter(newFilter);
    setPage(1);
    setInitialDataLoaded(false);
    setIsRefreshing(true);

    // Invalidate query để tải lại dữ liệu
    queryClient.invalidateQueries({ queryKey: ["posts"] }).then(() => {
      setIsRefreshing(false);
    });
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
  const currentLoading = groupId ? groupPostsLoading : loading;
  const currentError = groupId ? groupPostsError : error;

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
    }
  };

  // Method to clear all posts data
  const clearPosts = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    setPage(1);
  };

  // Method to clear search results
  const clearSearchResults = () => {
    setSearchQuery("");
    queryClient.invalidateQueries({ queryKey: ["posts", "search"] });
  };

  // Method to optimize comment like handling
  const optimisticToggleCommentLike = ({ postId, commentId, userId }) => {
    if (!postId || !commentId || !userId) return;

    // Log the operation
    console.log(
      `[PostContext] Optimistic toggling like for comment ${commentId} in post ${postId}`
    );

    // Find post in cache and update the comment like state
    const updatePostsWithCommentLike = (posts) => {
      if (!posts || !Array.isArray(posts)) return posts;

      return posts.map((post) => {
        if (post._id !== postId) return post;

        // Deep clone to avoid mutating cache directly
        const updatedPost = { ...post };

        // Update comments array if it exists
        if (updatedPost.comments && Array.isArray(updatedPost.comments)) {
          updatedPost.comments = updateCommentLike(updatedPost.comments);
        }

        return updatedPost;
      });
    };

    // Recursive function to update comment and nested replies
    const updateCommentLike = (comments) => {
      if (!comments || !Array.isArray(comments)) return comments;

      return comments.map((comment) => {
        // If this is the target comment, toggle its like state
        if (comment._id === commentId) {
          const wasLiked =
            comment.isLiked ||
            (Array.isArray(comment.likes) && comment.likes.includes(userId));

          // Create new object to ensure state update is triggered
          return {
            ...comment,
            isLiked: !wasLiked,
            likesCount: wasLiked
              ? Math.max(0, (comment.likesCount || 1) - 1)
              : (comment.likesCount || 0) + 1,
            likes: wasLiked
              ? Array.isArray(comment.likes)
                ? comment.likes.filter((id) => id !== userId)
                : []
              : Array.isArray(comment.likes)
              ? [...comment.likes, userId]
              : [userId],
          };
        }

        // If this comment has replies, recursively check them
        if (comment.replies && Array.isArray(comment.replies)) {
          return {
            ...comment,
            replies: updateCommentLike(comment.replies),
          };
        }

        return comment;
      });
    };

    // Update data in all relevant caches
    try {
      // Logs for debugging
      console.log(
        `[PostContext] Starting optimistic update for comment ${commentId}`
      );

      // Update in infiniteQueries and other post lists
      queryClient.setQueriesData({ queryKey: ["posts"] }, (oldData) => {
        // Handle different cache structures
        if (!oldData) return oldData;

        // Handle array of posts
        if (Array.isArray(oldData)) {
          return updatePostsWithCommentLike(oldData);
        }

        // Handle data with pages (infinite queries)
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => {
              if (!page.data) return page;
              return {
                ...page,
                data: updatePostsWithCommentLike(page.data),
              };
            }),
          };
        }

        // Handle data with direct data property
        if (oldData.data) {
          return {
            ...oldData,
            data: Array.isArray(oldData.data)
              ? updatePostsWithCommentLike(oldData.data)
              : oldData.data,
          };
        }

        return oldData;
      });

      // Update specific post query if it exists
      queryClient.setQueriesData({ queryKey: ["post", postId] }, (oldData) => {
        if (!oldData) return oldData;

        // Handle direct post object
        if (oldData._id === postId) {
          const updatedPost = { ...oldData };
          if (updatedPost.comments && Array.isArray(updatedPost.comments)) {
            updatedPost.comments = updateCommentLike(updatedPost.comments);
          }
          return updatedPost;
        }

        // Handle post in data property
        if (oldData.data && oldData.data._id === postId) {
          return {
            ...oldData,
            data: {
              ...oldData.data,
              comments: updateCommentLike(oldData.data.comments || []),
            },
          };
        }

        return oldData;
      });

      console.log(
        `[PostContext] Completed optimistic update for comment ${commentId}`
      );
    } catch (error) {
      console.error(
        "[PostContext] Error during optimistic comment like update:",
        error
      );
    }
  };

  /**
   * Optimistically toggle post like in cache and UI
   */
  const optimisticTogglePostLike = ({
    postId,
    userId,
    serverState,
    groupId,
  }) => {
    // Don't proceed if we don't have needed data
    if (!postId || !userId) return;

    // Thêm throttling để tránh cập nhật cache quá nhiều lần
    const now = Date.now();
    const cacheKey = `${postId}-${userId}`;
    const lastUpdate = recentLikeActions[cacheKey] || 0;

    if (now - lastUpdate < 1000) {
      console.log(`[PostContext] Throttling cache update for ${postId}`);
      return;
    }

    // Ghi nhận thời gian cập nhật cache
    setRecentLikeActions((prev) => ({
      ...prev,
      [cacheKey]: now,
    }));

    // Cập nhật queryClient cho cả post cá nhân và post trong group
    try {
      console.log(
        `[PostContext] Optimistic like toggle: postId=${postId}, groupId=${
          groupId || "personal"
        }`
      );

      // 1. Update single post query cache if exists - áp dụng cho cả post cá nhân và group
      queryClient.setQueryData(POST_QUERY_KEYS.detail(postId), (old) => {
        if (!old || !old.data) return old;

        // Check if current state matches serverState (if provided)
        if (
          typeof serverState === "boolean" &&
          old.data.isLiked === serverState
        ) {
          // Already in sync with server, no need to update
          return old;
        }

        // Create new like state and likes array
        const newIsLiked =
          typeof serverState === "boolean" ? serverState : !old.data.isLiked;
        let newLikes = [...(old.data.likes || [])];

        if (newIsLiked) {
          // Add user to likes if not present
          if (
            !newLikes.some((like) => like === userId || like?._id === userId)
          ) {
            newLikes.push(userId);
          }
        } else {
          // Remove user from likes
          newLikes = newLikes.filter(
            (like) => like !== userId && like?._id !== userId
          );
        }

        console.log(
          "[PostContext] Updated single post like status:",
          postId,
          newIsLiked,
          newLikes.length
        );

        // Return updated post data
        return {
          ...old,
          data: {
            ...old.data,
            isLiked: newIsLiked,
            likes: newLikes,
            likesCount: newLikes.length,
          },
        };
      });

      // 2. Phân biệt giữa cập nhật cho post cá nhân và post trong group
      if (groupId) {
        // Chỉ cập nhật cho post group cụ thể thông qua POST_QUERY_KEYS.detail thay vì groupPosts
        // Tránh cập nhật toàn bộ danh sách
        console.log(
          `[PostContext] Optimistic update for group post: ${postId}`
        );
      } else {
        // Chỉ cập nhật cho post cá nhân nếu không có groupId
        console.log(`[PostContext] Updating personal post cache: ${postId}`);

        // Không cần phải thực hiện các thao tác cập nhật danh sách
        // Chỉ cập nhật cache cho post chi tiết đã được thực hiện ở bước trên
      }

      // Log success
      console.log(
        `[PostContext] Optimistic like update complete for post ${postId}`
      );
    } catch (error) {
      console.error("[PostContext] Error in optimistic like update:", error);
    }
  };

  // Thêm hàm mới để cập nhật số lượng comment trong bài post
  const updateCommentCount = (postId, changeAmount) => {
    if (!postId || !changeAmount) return;

    console.log(
      `[PostContext] Updating comment count for post ${postId}, change: ${changeAmount}`
    );

    // Hàm helper để cập nhật bài viết
    const updatePostInData = (oldData) => {
      if (!oldData) return oldData;

      // Trường hợp là array of posts
      if (Array.isArray(oldData)) {
        return oldData.map((post) => {
          if (post._id === postId) {
            console.log(
              `[PostContext] Updating comments count from ${
                post.commentsCount
              } to ${Math.max(0, (post.commentsCount || 0) + changeAmount)}`
            );
            return {
              ...post,
              commentsCount: Math.max(
                0,
                (post.commentsCount || 0) + changeAmount
              ),
            };
          }
          return post;
        });
      }

      // Trường hợp có pages (infinite query)
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            if (!page || !page.data) return page;
            return {
              ...page,
              data: Array.isArray(page.data)
                ? page.data.map((post) => {
                    if (post._id === postId) {
                      return {
                        ...post,
                        commentsCount: Math.max(
                          0,
                          (post.commentsCount || 0) + changeAmount
                        ),
                      };
                    }
                    return post;
                  })
                : page.data,
            };
          }),
        };
      }

      // Trường hợp có data property
      if (oldData.data) {
        if (Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((post) => {
              if (post._id === postId) {
                return {
                  ...post,
                  commentsCount: Math.max(
                    0,
                    (post.commentsCount || 0) + changeAmount
                  ),
                };
              }
              return post;
            }),
          };
        } else if (oldData.data._id === postId) {
          return {
            ...oldData,
            data: {
              ...oldData.data,
              commentsCount: Math.max(
                0,
                (oldData.data.commentsCount || 0) + changeAmount
              ),
            },
          };
        }
      }

      // Trường hợp đây là single post
      if (oldData._id === postId) {
        return {
          ...oldData,
          commentsCount: Math.max(
            0,
            (oldData.commentsCount || 0) + changeAmount
          ),
        };
      }

      return oldData;
    };

    try {
      // Cập nhật trong tất cả các queries có thể chứa post này
      queryClient.setQueriesData({ queryKey: ["posts"] }, updatePostInData);
      queryClient.setQueriesData(
        { queryKey: ["post", postId] },
        updatePostInData
      );

      // Đặc biệt cập nhật cho group posts
      queryClient.setQueriesData(
        { queryKey: POST_QUERY_KEYS.all.concat("group") },
        updatePostInData
      );
    } catch (error) {
      console.error("[PostContext] Error updating comment count:", error);
    }
  };

  return (
    <PostContext.Provider
      value={{
        posts: currentPosts,
        loading: currentLoading,
        error: currentError,
        hasMore: currentHasMore,
        filter,
        setFilter: changeFilter,
        page,
        limit,
        changeLimit,
        loadMorePosts,
        totalPosts,
        searchResults: searchResults?.data || [],
        searchLoading,
        searchError,
        searchPosts,
        clearSearchResults,
        createPost,
        updatePost,
        deletePost,
        likePost: enhancedLikePost, // Thay thế likePost bằng phiên bản mới có kiểm soát tần suất
        groupId,
        fetchGroupPosts,
        resetGroupId,
        selectedPost,
        selectPost,
        createComment,
        updateComment,
        deleteComment,
        likeComment,
        reactToComment,
        fetchComments,
        clearPosts,
        optimisticAddComment,
        optimisticToggleCommentLike,
        optimisticTogglePostLike,
        initializeCommentsArray,
        initialLoading,
        initialDataLoaded,
        refreshPosts,
        isRefreshing,
        updateCommentCount,
      }}
    >
      {children}
    </PostContext.Provider>
  );
};

export const usePostContext = () => useContext(PostContext);
// Add alias for backward compatibility
export const usePost = usePostContext;

export default PostContext;
