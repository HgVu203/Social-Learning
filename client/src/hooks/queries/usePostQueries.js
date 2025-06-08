import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axiosService, {
  makeRequestWithRetry,
} from "../../services/axiosService";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";

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
  initialPosts: () => [...POST_QUERY_KEYS.all, "initial"],
  initialFilterPosts: (filter) => [
    ...POST_QUERY_KEYS.all,
    "initialFilter",
    filter,
  ],
  basicInfo: (id) => [...POST_QUERY_KEYS.detail(id), "basic"],
  engagement: (id) => [...POST_QUERY_KEYS.detail(id), "engagement"],
};

// Hàm xử lý cấu trúc comments và replies
const processCommentsData = (rawComments) => {
  if (!Array.isArray(rawComments) || rawComments.length === 0) {
    return [];
  }

  console.log(`Processing ${rawComments.length} comments`);

  // Tạo map để lưu trữ tất cả comments với key là _id
  const commentsMap = new Map();
  const rootComments = [];

  // Xử lý từng comment và chuẩn hóa dữ liệu
  rawComments.forEach((comment) => {
    // Chuẩn hóa dữ liệu
    const normalizedComment = {
      ...comment,
      // Đảm bảo trường author luôn tồn tại
      author: comment.author || comment.userId,
      // Đảm bảo trường userId luôn tồn tại
      userId: comment.userId || comment.author,
      // Đảm bảo các trường khác luôn có giá trị mặc định
      likesCount: comment.likesCount || 0,
      likes: comment.likes || [],
      replies: comment.replies || [], // Giữ replies nếu đã có
    };

    // Lưu vào map để dễ truy cập
    commentsMap.set(comment._id.toString(), normalizedComment);
  });

  // Xây dựng cấu trúc cây cho comments
  rawComments.forEach((comment) => {
    const commentId = comment._id.toString();
    const currentComment = commentsMap.get(commentId);

    // Kiểm tra xem comment đã có replies từ server không
    if (Array.isArray(comment.replies) && comment.replies.length > 0) {
      console.log(
        `Comment ${commentId} already has ${comment.replies.length} replies from server`
      );
      // Chuẩn hóa các replies này
      currentComment.replies = comment.replies.map((reply) => {
        const normalizedReply = {
          ...reply,
          author: reply.author || reply.userId,
          userId: reply.userId || reply.author,
          likesCount: reply.likesCount || 0,
          likes: reply.likes || [],
          parentId: commentId, // Đảm bảo parentId đúng
        };

        // Thêm vào map
        commentsMap.set(reply._id.toString(), normalizedReply);

        return normalizedReply;
      });

      // Đã xử lý replies, thêm vào rootComments
      rootComments.push(currentComment);
    } else if (comment.parentId) {
      // Đây là reply, tìm parent comment
      const parentId = comment.parentId.toString();
      const parentComment = commentsMap.get(parentId);

      if (parentComment) {
        console.log(`Adding reply ${commentId} to parent ${parentId}`);
        // Đảm bảo parentId được thiết lập
        currentComment.parentId = parentId;
        parentComment.replies.push(currentComment);
      } else {
        // Nếu không tìm thấy parent, đưa vào rootComments
        console.log(
          `Parent ${parentId} not found for reply ${commentId}, treating as root`
        );
        rootComments.push(currentComment);
      }
    } else {
      // Đây là comment gốc, chỉ thêm nếu chưa có trong rootComments
      if (!rootComments.some((c) => c._id.toString() === commentId)) {
        rootComments.push(currentComment);
      }
    }
  });

  // Sắp xếp replies theo thời gian (cũ nhất trước)
  rootComments.forEach((comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      console.log(
        `Comment ${comment._id} has ${comment.replies.length} replies after sorting`
      );
    }
  });

  console.log(
    `Returning ${rootComments.length} root comments with hierarchical structure`
  );
  return rootComments;
};

export const usePostQueries = {
  // Tối ưu: Tách lấy bài viết ban đầu và phân trang
  useInitialPosts: (filter = "latest", limit = 5, enabled = true) => {
    return useQuery({
      queryKey: POST_QUERY_KEYS.initialFilterPosts(filter),
      queryFn: async () => {
        try {
          // Chỉ lấy số lượng nhỏ bài đăng ban đầu để tải nhanh
          let endpoint = `/posts?filter=${filter}&page=1&limit=${limit}`;

          if (filter === "recommended") {
            endpoint = `/posts/recommended?page=1&limit=${limit}`;
          }

          // Sử dụng hàm makeRequestWithRetry với 2 lần thử lại
          const response = await makeRequestWithRetry(
            endpoint,
            { method: "GET" },
            2
          );

          if (
            filter === "recommended" &&
            (!response.data.data || response.data.data.length === 0)
          ) {
            // Cũng sử dụng makeRequestWithRetry cho fallback
            const popularResponse = await makeRequestWithRetry(
              `/posts?filter=popular&page=1&limit=${limit}`,
              { method: "GET" },
              1
            );

            // Đảm bảo cấu trúc phản hồi giống với API recommendations
            return {
              success: true,
              data: popularResponse.data.data || [],
              pagination: popularResponse.data.pagination || {
                page: 1,
                totalPages: 1,
                total: 0,
              },
              meta: {
                message: "Fallback to popular posts",
              },
            };
          }

          return response.data;
        } catch (error) {
          console.error("Error fetching initial posts:", error);
          // Nếu lỗi, trả về một đối tượng với mảng rỗng
          return { data: [], pagination: { page: 1, totalPages: 1, total: 0 } };
        }
      },
      staleTime: 1000 * 60, // 1 phút
      refetchOnWindowFocus: false,
      retry: 2, // Tăng số lần thử lại
      retryDelay: 2000, // Tăng thời gian giữa các lần thử lại
      cacheTime: 1000 * 60 * 5, // 5 phút
      // Đặt mức ưu tiên cao nhất cho request này
      networkMode: "always", // Luôn ưu tiên tìm nạp dữ liệu mới
      priority: "high",
      enabled: enabled, // Thêm tham số enabled để kiểm soát khi nào query được thực thi
    });
  },

  // Fetch posts with pagination
  usePosts: (filter = "latest", limit = 10, enabled = true) => {
    return useInfiniteQuery({
      queryKey: POST_QUERY_KEYS.list({ filter }),
      queryFn: async ({ pageParam = 1 }) => {
        try {
          // Bỏ qua trang 1 nếu đã được tải bởi useInitialPosts
          if (pageParam === 1) {
            const existingData = await makeRequestWithRetry(
              `/posts?filter=${filter}&page=1&limit=${limit}`,
              { method: "GET" },
              1
            );
            return existingData.data;
          }

          // Use different endpoint for recommended posts
          let endpoint = `/posts?filter=${filter}&page=${pageParam}&limit=${limit}`;
          if (filter === "recommended") {
            endpoint = `/posts/recommended?page=${pageParam}&limit=${limit}`;
          }

          // Sử dụng makeRequestWithRetry thay vì trực tiếp gọi axiosService
          const response = await makeRequestWithRetry(
            endpoint,
            { method: "GET" },
            2
          );

          // If it's recommended posts, adjust the response format to match regular posts
          if (filter === "recommended") {
            const recommendedPosts = response.data.data || [];

            // If no recommendations, show message and fallback to popular posts
            if (recommendedPosts.length === 0 && pageParam === 1) {
              toast.info(
                "We don't have enough data to make personal recommendations yet. Showing popular posts instead.",
                {
                  position: "top-center",
                }
              );

              // Fetch popular posts as fallback using makeRequestWithRetry
              const popularResponse = await makeRequestWithRetry(
                `/posts?filter=popular&page=1&limit=${limit}`,
                { method: "GET" },
                1
              );

              // Đảm bảo cấu trúc dữ liệu đồng nhất
              return {
                success: true,
                data: popularResponse.data.data || [],
                pagination: popularResponse.data.pagination || {
                  page: 1,
                  totalPages: 1,
                  total: 0,
                },
              };
            }

            // Return formatted recommendations
            return {
              success: true,
              data: recommendedPosts,
              pagination: {
                total:
                  response.data.pagination?.total ||
                  response.data.meta?.count ||
                  0,
                page: pageParam,
                totalPages:
                  response.data.pagination?.totalPages ||
                  Math.ceil((response.data.meta?.count || 0) / limit) ||
                  1,
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
              // Xóa toast này để tránh hiển thị lỗi cho người dùng
              // toast.error("Please log in to see personalized content", {
              //   position: "top-center",
              // });
            }
            // Xóa toast này để tránh hiển thị lỗi "Could not load personalized content"
            // else {
            //   toast.error(
            //     "Could not load personalized content. Showing latest posts instead.",
            //     {
            //       position: "top-center",
            //     }
            //   );
            // }

            // On error, fallback to latest posts silently without showing error
            const fallbackResponse = await axiosService.get(
              `/posts?filter=latest&page=1&limit=${limit}`
            );
            return fallbackResponse.data;
          }
          throw error;
        }
      },
      getNextPageParam: (lastPage) => {
        // Enable pagination for recommended posts too
        if (lastPage.pagination) {
          const { page, totalPages } = lastPage.pagination;
          return page < totalPages ? page + 1 : undefined;
        }
        return undefined;
      },
      keepPreviousData: true,
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: false, // Prevent automatic refetching on window focus to preserve like state
      retry: 2,
      retryDelay: 2000,
      refetchOnReconnect: true,
      cacheTime: 1000 * 60 * 10,
      enabled: enabled, // Thêm tham số enabled để kiểm soát khi nào query được thực thi
    });
  },

  // Fetch a single post by ID
  usePost: (postId) => {
    const { user } = useAuth();
    const userId = user?._id;

    return useQuery({
      queryKey: POST_QUERY_KEYS.detail(postId),
      queryFn: async () => {
        if (!postId) return null;
        try {
          console.log(`[usePost] Fetching unified post data for: ${postId}`);

          // Loại bỏ timestamp để tận dụng cache, chỉ giữ userId để đảm bảo trạng thái like đúng
          const userParam = userId ? `?userId=${userId}` : "";

          const response = await makeRequestWithRetry(
            `/posts/${postId}${userParam}`,
            { method: "GET" },
            2
          );

          console.log(`[usePost] Received response for post ${postId}:`, {
            isLiked: response?.data?.data?.isLiked,
            likesCount: response?.data?.data?.likesCount,
            likesArray: response?.data?.data?.likes?.length || 0,
          });

          // Đảm bảo trạng thái isLiked luôn nhất quán
          if (response?.data?.data && userId) {
            const post = response.data.data;

            // Tính toán isLiked từ mảng likes nếu cần
            if (
              typeof post.isLiked !== "boolean" &&
              Array.isArray(post.likes)
            ) {
              const calculatedIsLiked = post.likes.some((like) => {
                if (typeof like === "string") return like === userId;
                if (typeof like === "object" && like !== null) {
                  return like._id === userId || like.userId === userId;
                }
                return false;
              });

              console.log(
                `[usePost] Calculated isLiked for post ${postId}: ${calculatedIsLiked}`
              );
              post.isLiked = calculatedIsLiked;
            }

            // Đảm bảo likesCount đồng bộ với mảng likes
            if (
              Array.isArray(post.likes) &&
              (typeof post.likesCount !== "number" ||
                post.likesCount !== post.likes.length)
            ) {
              post.likesCount = post.likes.length;
              console.log(
                `[usePost] Updated likesCount to match likes array: ${post.likesCount}`
              );
            }

            // Debug thông tin like để kiểm tra
            if (Array.isArray(post.likes) && post.likes.length > 0) {
              console.log(`[usePost] Post has ${post.likes.length} likes`);

              // Kiểm tra xem user hiện tại có trong danh sách like không
              const userLikedPost = post.likes.some((like) => {
                const likeId =
                  typeof like === "object" ? like._id || like.userId : like;
                return likeId === userId;
              });

              console.log(
                `[usePost] Current user ${userId} has liked this post: ${userLikedPost}`
              );

              // Đảm bảo trạng thái isLiked khớp với kết quả kiểm tra
              if (post.isLiked !== userLikedPost) {
                console.log(
                  `[usePost] Correcting isLiked state from ${post.isLiked} to ${userLikedPost}`
                );
                post.isLiked = userLikedPost;
              }
            }
          }

          return response.data;
        } catch (error) {
          console.error("[usePost] Error fetching post detail:", error);
          throw error;
        }
      },
      enabled: !!postId,
      staleTime: 120000, // 2 phút
      cacheTime: 10 * 60 * 1000, // 10 phút
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    });
  },

  // Fetch comments for a post
  usePostComments: (postId, queryOptions = {}) => {
    return useQuery({
      queryKey: POST_QUERY_KEYS.comment(postId),
      queryFn: async () => {
        if (!postId) return { data: { comments: [], commentsCount: 0 } };
        try {
          // Loại bỏ timestamp để tận dụng cache
          const response = await makeRequestWithRetry(
            `/posts/${postId}/comments`,
            { method: "GET" },
            1
          );

          // Normalize comment data to ensure consistency
          if (response?.data?.data?.comments) {
            // Xử lý cấu trúc comments và replies
            const processedComments = processCommentsData(
              response.data.data.comments
            );
            response.data.data.comments = processedComments;
          }

          return response.data;
        } catch (error) {
          console.error("Error fetching comments:", error.message || error);
          // Return empty data with proper structure to avoid errors
          return {
            success: false,
            data: {
              comments: [],
              commentsCount: 0,
            },
            error: error.message,
          };
        }
      },
      enabled: !!postId,
      staleTime: 30000, // Reduce stale time to 30 seconds to refresh more frequently
      cacheTime: 2 * 60 * 1000, // Cache for 2 minutes
      retry: 1, // Only retry once
      ...queryOptions,
    });
  },

  // Search posts
  useSearchPosts: (query, enabled = true) => {
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
          console.error("Error searching posts:", error.message || error);

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
      enabled: enabled && !!query && query.trim().length >= 2,
      retry: 1,
      refetchOnWindowFocus: false,
    });
  },

  // Fetch posts for a specific group
  useGroupPosts: (groupId, limit = 20, enabled = true) => {
    const { user } = useAuth();
    const userId = user?._id;

    return useInfiniteQuery({
      queryKey: POST_QUERY_KEYS.groupPosts(groupId),
      queryFn: async ({ pageParam = 1 }) => {
        if (!groupId)
          return { data: [], pagination: { page: 1, totalPages: 1 } };
        try {
          // Đảm bảo API gọi với groupId
          console.log(
            `[useGroupPosts] Fetching group posts for group: ${groupId}, page: ${pageParam}`
          );

          // Loại bỏ timestamp để tận dụng cache, chỉ giữ userId để đảm bảo trạng thái like đúng
          const userParam = userId ? `&userId=${userId}` : "";

          const response = await makeRequestWithRetry(
            `/posts?groupId=${groupId}&page=${pageParam}&limit=${limit}${userParam}`,
            { method: "GET" },
            2
          );

          // Kiểm tra và đảm bảo dữ liệu trả về có định dạng đúng
          if (!response.data || !Array.isArray(response.data.data)) {
            console.warn("[useGroupPosts] Invalid response data structure");
            return {
              success: false,
              data: [],
              pagination: { page: 1, totalPages: 1, total: 0 },
              error: "Dữ liệu không hợp lệ",
            };
          }

          // Chuẩn hóa trường isLiked cho từng post nếu có user đăng nhập
          if (userId) {
            console.log(
              `[useGroupPosts] Normalizing isLiked for user: ${userId}`
            );
            response.data.data = response.data.data.map((post) => {
              // Ưu tiên sử dụng giá trị isLiked từ server nếu có
              if (typeof post.isLiked === "boolean") {
                return post;
              }

              // Nếu không có isLiked hoặc không phải boolean, tính toán dựa trên mảng likes
              let calculatedIsLiked = false;
              if (Array.isArray(post.likes)) {
                calculatedIsLiked = post.likes.some((like) => {
                  if (typeof like === "string") return like === userId;
                  if (typeof like === "object" && like !== null) {
                    return like._id === userId || like.userId === userId;
                  }
                  return false;
                });
              }

              // Đảm bảo likesCount đồng bộ với mảng likes
              let likesCount = post.likesCount;
              if (
                Array.isArray(post.likes) &&
                (typeof post.likesCount !== "number" ||
                  post.likesCount !== post.likes.length)
              ) {
                likesCount = post.likes.length;
              }

              console.log(
                `[useGroupPosts] Post ${post._id} isLiked calculated: ${calculatedIsLiked}, likesCount: ${likesCount}`
              );

              return {
                ...post,
                isLiked: calculatedIsLiked,
                likesCount: likesCount,
              };
            });
          }

          return response.data;
        } catch (error) {
          console.error("Error fetching group posts:", error);
          return {
            success: false,
            data: [],
            pagination: { page: 1, totalPages: 1, total: 0 },
            error: error.message || "Failed to fetch group posts",
          };
        }
      },
      getNextPageParam: (lastPage) => {
        if (!lastPage || !lastPage.pagination) return undefined;
        const { page, totalPages } = lastPage.pagination;
        return page < totalPages ? page + 1 : undefined;
      },
      enabled: enabled && !!groupId,
      staleTime: 60000 * 2, // 2 phút
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      cacheTime: 5 * 60 * 1000, // 5 phút
    });
  },

  // Fetch only basic post information - optimized endpoint
  usePostBasicInfo: (postId, options = {}) => {
    console.log(
      `[usePostBasicInfo] Using unified endpoint for postId: ${postId}`
    );

    return useQuery({
      queryKey: POST_QUERY_KEYS.basicInfo(postId),
      queryFn: async () => {
        if (!postId) return null;

        try {
          const response = await makeRequestWithRetry(
            `/posts/${postId}`,
            { method: "GET" },
            2
          );

          // Trả về data theo cùng cấu trúc
          return response.data;
        } catch (error) {
          console.error(
            `Error fetching post basic info: ${error.message || error}`
          );
          // Trả về dữ liệu trống nhưng có cấu trúc phù hợp
          return {
            success: false,
            data: null,
            error: error.message || "Không thể tải thông tin bài viết",
          };
        }
      },
      enabled: !!postId,
      ...options,
    });
  },

  // Fetch only post engagement data - optimized endpoint
  usePostEngagement: (postId, options = {}) => {
    console.log(
      `[usePostEngagement] Using unified endpoint for postId: ${postId}`
    );

    return useQuery({
      queryKey: POST_QUERY_KEYS.engagement(postId),
      queryFn: async () => {
        if (!postId) return null;

        try {
          const response = await makeRequestWithRetry(
            `/posts/${postId}`,
            { method: "GET" },
            2
          );

          // Trích xuất data tương tác từ API thống nhất
          const postData = response.data.data;

          // Trả về data theo cùng cấu trúc để tương thích với code hiện tại
          return {
            success: true,
            data: {
              likesCount: postData.likesCount || 0,
              commentsCount: postData.commentsCount || 0,
              sharesCount: postData.sharesCount || 0,
              viewsCount: postData.views || 0,
              isLiked: !!postData.isLiked,
              likes: postData.likes || [],
              topLikers: postData.topLikers || [],
            },
            error: null,
          };
        } catch (error) {
          console.error(
            `Error fetching post engagement data: ${error.message || error}`
          );
          // Trả về dữ liệu trống nhưng có cấu trúc phù hợp
          return {
            success: false,
            data: {
              likesCount: 0,
              commentsCount: 0,
              sharesCount: 0,
              viewsCount: 0,
              isLiked: false,
              isSaved: false,
            },
            error: error.message || "Không thể tải dữ liệu tương tác",
          };
        }
      },
      enabled: !!postId,
      staleTime: 30000, // 30 seconds - engagement data changes frequently
      ...options,
    });
  },

  // Fetch posts for a specific user
  useUserPosts: (userId, options = {}) => {
    const { page = 1, limit = 10, enabled = true } = options;
    const { user } = useAuth();
    const currentUserId = user?._id;

    return useQuery({
      queryKey: [...POST_QUERY_KEYS.all, "user", userId, { page, limit }],
      queryFn: async () => {
        if (!userId)
          return { data: [], pagination: { page: 1, totalPages: 1, total: 0 } };

        try {
          console.log(
            `[useUserPosts] Fetching posts for user: ${userId}, page: ${page}, limit: ${limit}`
          );

          // Add current user ID to ensure like status is correctly returned
          const userParam = currentUserId
            ? `&currentUserId=${currentUserId}`
            : "";

          const response = await makeRequestWithRetry(
            `/posts?author=${userId}&page=${page}&limit=${limit}${userParam}`,
            { method: "GET" },
            2
          );

          return response.data;
        } catch (error) {
          console.error("[useUserPosts] Error fetching user posts:", error);
          return {
            success: false,
            data: [],
            pagination: { page: 1, totalPages: 1, total: 0 },
            error: error.message || "Failed to load user posts",
          };
        }
      },
      enabled,
      keepPreviousData: true,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    });
  },
};

// Exports for simplicity and readability
export const usePosts = (filter, limit, enabled) =>
  usePostQueries.usePosts(filter, limit, enabled);

export const useInitialPosts = (filter, limit, enabled) =>
  usePostQueries.useInitialPosts(filter, limit, enabled);

export const usePost = (postId) => usePostQueries.usePost(postId);

export const usePostComments = (postId, queryOptions) =>
  usePostQueries.usePostComments(postId, queryOptions);

export const useSearchPosts = (query, enabled) =>
  usePostQueries.useSearchPosts(query, enabled);

export const useGroupPosts = (groupId, limit, enabled) =>
  usePostQueries.useGroupPosts(groupId, limit, enabled);

export const usePostBasicInfo = (postId, options) =>
  usePostQueries.usePostBasicInfo(postId, options);

export const usePostEngagement = (postId, options) =>
  usePostQueries.usePostEngagement(postId, options);

export const useUserPosts = (userId, options) =>
  usePostQueries.useUserPosts(userId, options);

export default usePostQueries;
