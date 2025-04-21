import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";

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
          const response = await axiosService.get(
            `/posts?filter=${filter}&page=${pageParam}&limit=${limit}`
          );
        
          // Ensure each post has isLiked property
          // if (response.data && response.data.data) {
          //   // Log information about isLiked status for each post
          //   response.data.data.forEach((post) => {
          //     console.log(`Post ${post._id} isLiked:`, post.isLiked);
          //   });
          // }

          return response.data;
        } catch (error) {
          console.error("Error fetching posts:", error);
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
  usePostComments: (postId) => {
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
          throw error;
        }
      },
      enabled: !!query && query.trim().length >= 2,
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
export const usePostComments = (postId) =>
  usePostQueries.usePostComments(postId);
export const useSearchPosts = (query) => usePostQueries.useSearchPosts(query);
export const useGroupPosts = (groupId, limit) =>
  usePostQueries.useGroupPosts(groupId, limit);

export default usePostQueries;
