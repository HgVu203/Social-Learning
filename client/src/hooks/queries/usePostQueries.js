import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { toast } from "react-toastify";

export const POST_QUERY_KEYS = {
  all: ["posts"],
  lists: () => [...POST_QUERY_KEYS.all, "list"],
  list: (filters) => [...POST_QUERY_KEYS.lists(), filters],
  details: () => [...POST_QUERY_KEYS.all, "detail"],
  detail: (id) => [...POST_QUERY_KEYS.details(), id],
  comments: () => [...POST_QUERY_KEYS.all, "comments"],
  comment: (postId) => [...POST_QUERY_KEYS.comments(), postId],
  search: (query) => [...POST_QUERY_KEYS.all, "search", query],
  groupPosts: (groupId) => [...POST_QUERY_KEYS.all, "group", groupId],
};

export const usePostQueries = {
  // Fetch posts with pagination
  usePosts: (filter = "latest", limit = 10) => {
    return useInfiniteQuery({
      queryKey: POST_QUERY_KEYS.list({ filter }),
      queryFn: async ({ pageParam = 1 }) => {
        try {
          // Use different endpoint for recommended posts
          let endpoint = `/posts?filter=${filter}&page=${pageParam}&limit=${limit}`;
          if (filter === "recommended") {
            endpoint = `/posts/recommended?limit=${limit}`;
            console.log("Fetching recommendations from endpoint:", endpoint);
          }

          const response = await axiosService.get(endpoint);
          console.log(`Response from ${endpoint}:`, response.data);

          // If it's recommended posts, adjust the response format to match regular posts
          if (filter === "recommended") {
            const recommendedPosts = response.data.data || [];
            console.log(
              `Received ${recommendedPosts.length} recommended posts`
            );

            // If no recommendations, show message and fallback to popular posts
            if (recommendedPosts.length === 0) {
              console.log(
                "No recommendations available, falling back to popular posts"
              );
              toast.info(
                "We don't have enough data to make personal recommendations yet. Showing popular posts instead.",
                {
                  position: "top-center",
                }
              );

              // Fetch popular posts as fallback
              const popularResponse = await axiosService.get(
                `/posts?filter=popular&page=1&limit=${limit}`
              );
              return popularResponse.data;
            }

            // Return formatted recommendations
            return {
              data: recommendedPosts,
              pagination: {
                total: response.data.meta?.count || 0,
                page: pageParam,
                totalPages: 1, // Recommendation doesn't use pagination the same way
              },
            };
          }

          return response.data;
        } catch (error) {
          console.error("Error fetching posts:", error);
          if (filter === "recommended") {
            // Kiểm tra lỗi 401 Unauthorized
            if (error.response?.status === 401) {
              console.log("Authentication required for recommendations");
              toast.error("Please log in to see personalized content", {
                position: "top-center",
              });
            } else {
              toast.error(
                "Could not load personalized content. Showing latest posts instead.",
                {
                  position: "top-center",
                }
              );
            }

            // On error, fallback to latest posts
            const fallbackResponse = await axiosService.get(
              `/posts?filter=latest&page=1&limit=${limit}`
            );
            return fallbackResponse.data;
          }
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        // Don't paginate recommended posts - they're returned all at once
        if (filter === "recommended") {
          return undefined;
        }

        if (lastPage.pagination) {
          const { page, totalPages } = lastPage.pagination;
          return page < totalPages ? page + 1 : undefined;
        }
        return undefined;
      },
      keepPreviousData: true,
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false, // Prevent automatic refetching on window focus to preserve like state
    });
  },

  // Fetch a single post by ID
  usePost: (postId) => {
    return useQuery({
      queryKey: POST_QUERY_KEYS.detail(postId),
      queryFn: async () => {
        if (!postId) return null;
        try {
          const response = await axiosService.get(`/posts/${postId}`);
          return response.data;
        } catch (error) {
          console.error("Error fetching post detail:", error);
          throw error;
        }
      },
      enabled: !!postId,
    });
  },

  // Fetch comments for a post
  usePostComments: (postId, queryOptions = {}) => {
    return useQuery({
      queryKey: POST_QUERY_KEYS.comment(postId),
      queryFn: async () => {
        if (!postId) return { data: { comments: [] } };
        try {
          const response = await axiosService.get(`/posts/${postId}/comments`);
          // Ensure comments are properly formatted
          if (response.data && response.data.data) {
            // Fixed data structure handling
            if (Array.isArray(response.data.data)) {
              // Old format: direct array of comments
              response.data.data = {
                comments: response.data.data,
                commentsCount: response.data.data.length,
              };
            } else if (
              !response.data.data.comments &&
              response.data.data.topLevelComments
            ) {
              // Alternative format: comments under topLevelComments
              response.data.data.comments = response.data.data.topLevelComments;
              response.data.data.commentsCount =
                response.data.data.total ||
                response.data.data.topLevelComments.length;
            }

            // If comments are missing, initialize with empty array
            if (!response.data.data.comments) {
              response.data.data.comments = [];
            }

            // Ensure commentsCount is set
            if (response.data.data.commentsCount === undefined) {
              response.data.data.commentsCount =
                response.data.data.comments.length;
            }

            // Ensure each comment has proper structure
            response.data.data.comments.forEach((comment) => {
              if (!comment.replies) comment.replies = [];
              if (!comment.likes) comment.likes = [];
              if (comment.likesCount === undefined) {
                comment.likesCount = comment.likes.length;
              }
            });
          }
          return response.data;
        } catch (error) {
          console.error("Error fetching post comments:", error);
          // Provide a more specific error message
          if (error.response?.status === 404) {
            throw new Error("Comments not found for this post.");
          } else if (error.response?.status === 401) {
            throw new Error("You need to be logged in to view comments.");
          } else if (error.message.includes("Network Error")) {
            throw new Error("Network error. Please check your connection.");
          }
          throw error;
        }
      },
      enabled: !!postId,
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds
      refetchInterval: queryOptions.refetchInterval || null, // Add refetchInterval option for polling
      ...queryOptions, // Merge other options
    });
  },

  // Search posts
  useSearchPosts: (query) => {
    return useQuery({
      queryKey: POST_QUERY_KEYS.search(query),
      queryFn: async () => {
        if (!query || query.trim().length < 2) return { data: [] };
        try {
          const response = await axiosService.get(
            `/posts/search?q=${encodeURIComponent(query)}`
          );
          return response.data;
        } catch (error) {
          console.error("Error searching posts:", error);

          // Trả về một đối tượng lỗi có cấu trúc phù hợp
          return {
            success: false,
            data: [],
            error:
              error.response?.data?.error ||
              error.message ||
              "Lỗi tìm kiếm. Vui lòng thử lại sau.",
          };
        }
      },
      enabled: !!query && query.trim().length >= 2,
      retry: 1,
      refetchOnWindowFocus: false,
    });
  },

  // Fetch posts for a specific group
  useGroupPosts: (groupId, limit = 10) => {
    return useInfiniteQuery({
      queryKey: POST_QUERY_KEYS.groupPosts(groupId),
      queryFn: async ({ pageParam = 1 }) => {
        if (!groupId)
          return { data: [], pagination: { page: 1, totalPages: 1 } };
        try {
          const response = await axiosService.get(
            `/posts?groupId=${groupId}&page=${pageParam}&limit=${limit}`
          );
          return response.data;
        } catch (error) {
          console.error(`Error fetching posts for group ${groupId}:`, error);
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.pagination) {
          const { page, totalPages } = lastPage.pagination;
          return page < totalPages ? page + 1 : undefined;
        }
        return undefined;
      },
      enabled: !!groupId,
      keepPreviousData: true,
      staleTime: 1000 * 60, // 1 minute
    });
  },
};

// Add individual exports for backward compatibility
export const usePosts = (filter, limit) =>
  usePostQueries.usePosts(filter, limit);
export const usePost = (postId) => usePostQueries.usePost(postId);
export const usePostComments = (postId, queryOptions) =>
  usePostQueries.usePostComments(postId, queryOptions);
export const useSearchPosts = (query) => usePostQueries.useSearchPosts(query);
export const useGroupPosts = (groupId, limit) =>
  usePostQueries.useGroupPosts(groupId, limit);

export default usePostQueries;
