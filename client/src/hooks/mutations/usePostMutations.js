import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { POST_QUERY_KEYS } from "../queries/usePostQueries";
import Toast from "../../utils/toast";

export const usePostMutations = () => {
  const queryClient = useQueryClient();

  // Create a new post
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      console.log("Creating post with data:", postData);

      // Handle FormData for image uploads
      if (postData instanceof FormData) {
        console.log("Uploading post with form data");
        const response = await axiosService.post("/posts", postData);
        console.log("Create post response:", response.data);
        return response.data;
      }

      // Regular JSON post
      const response = await axiosService.post("/posts", postData);
      console.log("Create post response:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Post created successfully:", data);

      // Invalidate các query lists để làm mới danh sách bài viết
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      // Nếu đăng bài trong group, invalidate query group posts tương ứng
      if (data?.data?.groupId) {
        console.log("Invalidating group posts for groupId:", data.data.groupId);
        queryClient.invalidateQueries({
          queryKey: ["posts", "group", data.data.groupId],
        });
      }

      // Toast được xử lý bởi component CreatePostPage
    },
    onError: (error) => {
      console.error("Error creating post:", error);
      // Sử dụng toastId để tránh thông báo trùng lặp
      // Toast sẽ được xử lý bởi component CreatePostPage
      // Không hiển thị thông báo ở đây, tránh trùng lặp
    },
  });

  // Update an existing post
  const updatePost = useMutation({
    mutationFn: async ({ postId, data }) => {
      console.log(`Updating post ${postId} with data:`, data);

      // Handle FormData for image uploads
      if (data instanceof FormData) {
        console.log("Updating post with form data");
        const response = await axiosService.patch(`posts/${postId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        console.log("Update post response:", response.data);
        return response.data;
      }

      // Regular JSON update
      const response = await axiosService.patch(`posts/${postId}`, data);
      console.log("Update post response:", response.data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Post updated successfully:", data);
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(variables.postId),
      });
      queryClient.invalidateQueries({ queryKey: POST_QUERY_KEYS.lists() });
      Toast.success("Post updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating post:", error);
      Toast.error(error.response?.data?.error || "Failed to update post");
    },
  });

  // Delete a post
  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      console.log(`Deleting post ${postId}`);
      const response = await axiosService.delete(`posts/${postId}`);
      console.log("Delete post response:", response.data);
      return response.data;
    },
    onSuccess: (data, postId) => {
      console.log("Post deleted successfully:", data);
      queryClient.invalidateQueries({ queryKey: POST_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      Toast.success("Post deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting post:", error);
      Toast.error(error.response?.data?.error || "Failed to delete post");
    },
  });

  // Like/Unlike a post
  const likePostMutation = useMutation({
    mutationFn: async (postId) => {
      console.log(`[Mutation] Toggling like for post ${postId}`);
      const response = await axiosService.post(`/posts/${postId}/like`);
      console.log("[Mutation] Like response:", response.data);
      return response.data;
    },

    onMutate: async (postId) => {
      // Hủy các query đang chạy để tránh race condition
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: POST_QUERY_KEYS.lists() });

      // Lưu trạng thái trước khi update
      const previousPost =
        queryClient.getQueryData(["post", postId]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.detail(postId));

      const previousPostsList =
        queryClient.getQueryData(["posts"]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.lists());

      // Không cần phải thực hiện optimistic update trong onMutate
      // Vì đã làm việc đó trong component UI rồi

      return { previousPost, previousPostsList };
    },

    onError: (err, postId, context) => {
      console.error("[Mutation] Error toggling like:", err);

      // Khôi phục cache nếu có lỗi
      if (context?.previousPost) {
        queryClient.setQueryData(["post", postId], context.previousPost);
        queryClient.setQueryData(
          POST_QUERY_KEYS.detail(postId),
          context.previousPost
        );
      }

      if (context?.previousPostsList) {
        queryClient.setQueryData(["posts"], context.previousPostsList);
        queryClient.setQueryData(
          POST_QUERY_KEYS.lists(),
          context.previousPostsList
        );
      }
    },

    onSuccess: (data, postId) => {
      if (!data || !data.success) {
        console.error("[Mutation] Invalid response from like API:", data);
        return;
      }

      console.log("[Mutation] Successful like toggle:", data);

      // Cập nhật cache với dữ liệu từ server
      const updatePostData = (old) => {
        if (!old) return old;

        // Đảm bảo rằng trạng thái isLiked và likesCount được cập nhật đúng
        const updatedPost = {
          ...old,
          isLiked: data.isLiked,
          likesCount: data.likesCount,
          likes: data.likes || old.likes || [],
        };
        console.log("[Mutation] Updated post cache:", updatedPost);
        return updatedPost;
      };

      // Cập nhật trong cache chi tiết bài post
      queryClient.setQueryData(["post", postId], updatePostData);
      queryClient.setQueryData(POST_QUERY_KEYS.detail(postId), updatePostData);

      // Cập nhật trong danh sách bài post
      const updatePostsData = (old) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.map((post) => {
            if (post._id === postId) {
              const updatedPost = {
                ...post,
                isLiked: data.isLiked,
                likesCount: data.likesCount,
                likes: data.likes || post.likes || [],
              };
              console.log("[Mutation] Updated post in list:", updatedPost);
              return updatedPost;
            }
            return post;
          });
        } else if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((post) => {
              if (post._id === postId) {
                const updatedPost = {
                  ...post,
                  isLiked: data.isLiked,
                  likesCount: data.likesCount,
                  likes: data.likes || post.likes || [],
                };
                console.log(
                  "[Mutation] Updated post in data list:",
                  updatedPost
                );
                return updatedPost;
              }
              return post;
            }),
          };
        } else if (old.pages) {
          // Handle infinite query case
          return {
            ...old,
            pages: old.pages.map((page) => {
              if (!page.data) return page;

              return {
                ...page,
                data: page.data.map((post) => {
                  if (post._id === postId) {
                    const updatedPost = {
                      ...post,
                      isLiked: data.isLiked,
                      likesCount: data.likesCount,
                      likes: data.likes || post.likes || [],
                    };
                    console.log(
                      "[Mutation] Updated post in infinite query:",
                      updatedPost
                    );
                    return updatedPost;
                  }
                  return post;
                }),
              };
            }),
          };
        }

        return old;
      };

      // Update all relevant queries that might contain this post
      queryClient.setQueryData(["posts"], updatePostsData);
      queryClient.setQueryData(POST_QUERY_KEYS.lists(), updatePostsData);
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "latest" }),
        updatePostsData
      );
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "popular" }),
        updatePostsData
      );
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "following" }),
        updatePostsData
      );
    },

    onSettled: (data, error, postId) => {
      // Chỉ invalidate khi cần thiết để tránh fetch lại quá nhiều
      if (error) {
        console.log("[Mutation] Invalidating queries after error");
        queryClient.invalidateQueries({ queryKey: ["post", postId] });
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.detail(postId),
        });
      }
    },
  });

  // Create a comment
  const createComment = useMutation({
    mutationFn: async ({ postId, content, parentId = null }) => {
      console.log(`Creating comment on post ${postId} with content:`, content);
      console.log(`Parent comment ID (if reply):`, parentId);

      const payload = {
        comment: content,
      };

      if (parentId) {
        payload.parentId = parentId;
      }

      const response = await axiosService.post(
        `/posts/${postId}/comment`,
        payload
      );
      console.log("Create comment response:", response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Comment created successfully:", data);
      const { postId } = data.data || {};
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.detail(postId),
        });
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.comment(postId),
        });
      }
    },
    onError: (error) => {
      console.error("Error creating comment:", error);
      Toast.error(error.response?.data?.error || "Failed to add comment");
    },
  });

  // Update a comment
  const updateComment = useMutation({
    mutationFn: async ({ postId, commentId, content }) => {
      console.log(
        `Updating comment ${commentId} on post ${postId} with content:`,
        content
      );
      const response = await axiosService.put(
        `posts/${postId}/comment/${commentId}`,
        {
          comment: content,
        }
      );
      console.log("Update comment response:", response.data);
      return { ...response.data, postId, commentId, content };
    },
    onSuccess: (data) => {
      console.log("Comment updated successfully:", data);
      const { postId } = data;
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });
    },
    onError: (error) => {
      console.error("Error updating comment:", error);
      Toast.error(error.response?.data?.error || "Failed to update comment");
    },
  });

  // Delete a comment
  const deleteComment = useMutation({
    mutationFn: async ({ postId, commentId }) => {
      console.log(`Deleting comment ${commentId} from post ${postId}`);
      const response = await axiosService.delete(
        `posts/${postId}/comment/${commentId}`
      );
      console.log("Delete comment response:", response.data);
      return { ...response.data, postId, commentId };
    },
    onSuccess: (data) => {
      console.log("Comment deleted successfully:", data);
      const { postId } = data;
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });
    },
    onError: (error) => {
      console.error("Error deleting comment:", error);
      Toast.error(error.response?.data?.error || "Failed to delete comment");
    },
  });

  // Like a comment
  const likeComment = useMutation({
    mutationFn: async (postId) => {
      console.log(`[Mutation] Toggling like for post ${postId}`);
      const response = await axiosService.post(`/posts/${postId}/like`);
      console.log("[Mutation] Like response:", response.data);
      return response.data;
    },

    onMutate: async (postId) => {
      // Hủy các query đang chạy để tránh race condition
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: POST_QUERY_KEYS.lists() });

      // Lưu trạng thái trước khi update
      const previousPost =
        queryClient.getQueryData(["post", postId]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.detail(postId));

      const previousPostsList =
        queryClient.getQueryData(["posts"]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.lists());

      // Không cần phải thực hiện optimistic update trong onMutate
      // Vì đã làm việc đó trong component UI rồi

      return { previousPost, previousPostsList };
    },

    onError: (err, postId, context) => {
      console.error("[Mutation] Error toggling like:", err);

      // Khôi phục cache nếu có lỗi
      if (context?.previousPost) {
        queryClient.setQueryData(["post", postId], context.previousPost);
        queryClient.setQueryData(
          POST_QUERY_KEYS.detail(postId),
          context.previousPost
        );
      }

      if (context?.previousPostsList) {
        queryClient.setQueryData(["posts"], context.previousPostsList);
        queryClient.setQueryData(
          POST_QUERY_KEYS.lists(),
          context.previousPostsList
        );
      }
    },

    onSuccess: (data, postId) => {
      if (!data || !data.success) {
        console.error("[Mutation] Invalid response from like API:", data);
        return;
      }

      console.log("[Mutation] Successful like toggle:", data);

      // Cập nhật cache với dữ liệu từ server
      const updatePostData = (old) => {
        if (!old) return old;

        // Đảm bảo rằng trạng thái isLiked và likesCount được cập nhật đúng
        const updatedPost = {
          ...old,
          isLiked: data.isLiked,
          likesCount: data.likesCount,
          likes: data.likes || old.likes || [],
        };
        console.log("[Mutation] Updated post cache:", updatedPost);
        return updatedPost;
      };

      // Cập nhật trong cache chi tiết bài post
      queryClient.setQueryData(["post", postId], updatePostData);
      queryClient.setQueryData(POST_QUERY_KEYS.detail(postId), updatePostData);

      // Cập nhật trong danh sách bài post
      const updatePostsData = (old) => {
        if (!old) return old;

        if (Array.isArray(old)) {
          return old.map((post) => {
            if (post._id === postId) {
              const updatedPost = {
                ...post,
                isLiked: data.isLiked,
                likesCount: data.likesCount,
                likes: data.likes || post.likes || [],
              };
              console.log("[Mutation] Updated post in list:", updatedPost);
              return updatedPost;
            }
            return post;
          });
        } else if (old.data && Array.isArray(old.data)) {
          return {
            ...old,
            data: old.data.map((post) => {
              if (post._id === postId) {
                const updatedPost = {
                  ...post,
                  isLiked: data.isLiked,
                  likesCount: data.likesCount,
                  likes: data.likes || post.likes || [],
                };
                console.log(
                  "[Mutation] Updated post in data list:",
                  updatedPost
                );
                return updatedPost;
              }
              return post;
            }),
          };
        } else if (old.pages) {
          // Handle infinite query case
          return {
            ...old,
            pages: old.pages.map((page) => {
              if (!page.data) return page;

              return {
                ...page,
                data: page.data.map((post) => {
                  if (post._id === postId) {
                    const updatedPost = {
                      ...post,
                      isLiked: data.isLiked,
                      likesCount: data.likesCount,
                      likes: data.likes || post.likes || [],
                    };
                    console.log(
                      "[Mutation] Updated post in infinite query:",
                      updatedPost
                    );
                    return updatedPost;
                  }
                  return post;
                }),
              };
            }),
          };
        }

        return old;
      };

      // Update all relevant queries that might contain this post
      queryClient.setQueryData(["posts"], updatePostsData);
      queryClient.setQueryData(POST_QUERY_KEYS.lists(), updatePostsData);
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "latest" }),
        updatePostsData
      );
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "popular" }),
        updatePostsData
      );
      queryClient.setQueryData(
        POST_QUERY_KEYS.list({ filter: "following" }),
        updatePostsData
      );
    },

    onSettled: (data, error, postId) => {
      // Chỉ invalidate khi cần thiết để tránh fetch lại quá nhiều
      if (error) {
        console.log("[Mutation] Invalidating queries after error");
        queryClient.invalidateQueries({ queryKey: ["post", postId] });
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.detail(postId),
        });
      }
    },
  });

  // Fetch comments
  const fetchComments = useMutation({
    mutationFn: async ({ postId, page = 1, limit = 10 }) => {
      console.log(`Fetching comments for post ${postId}, page ${page}`);
      const response = await axiosService.get(
        `/posts/${postId}/comments?page=${page}&limit=${limit}`
      );
      console.log("Fetch comments response:", response.data);
      return { ...response.data, postId };
    },
    onSuccess: (data) => {
      console.log("Comments fetched successfully:", data);
    },
    onError: (error) => {
      console.error("Error fetching comments:", error);
      Toast.error(error.response?.data?.error || "Failed to fetch comments");
    },
  });

  // Optimistic functions for UI updates
  const optimisticToggleCommentLike = ({ postId, commentId, userId }) => {
    console.log(
      `Optimistic toggle like for comment ${commentId} by user ${userId}`
    );

    if (!postId || !commentId || !userId) {
      console.error(
        "Missing required parameters for optimistic comment like toggle"
      );
      return;
    }

    // Update comment likes in the cache
    queryClient.setQueriesData(
      { queryKey: POST_QUERY_KEYS.comment(postId) },
      (oldData) => {
        if (!oldData) return oldData;

        // Deep clone to avoid mutation
        const newData = JSON.parse(JSON.stringify(oldData));

        // Function to find and update a comment recursively
        const updateCommentLike = (comments) => {
          if (!comments || !Array.isArray(comments)) return false;

          let updated = false;

          // Check top level comments
          for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];

            // Found the comment to update
            if (comment._id === commentId) {
              // Initialize likes array if undefined
              if (!comment.likes) comment.likes = [];

              // Check if already liked
              const likeIndex = comment.likes.findIndex(
                (like) =>
                  like === userId ||
                  (like && like.toString && like.toString() === userId)
              );

              if (likeIndex >= 0) {
                // Unlike: Remove from likes array
                comment.likes.splice(likeIndex, 1);
                comment.likesCount = Math.max((comment.likesCount || 1) - 1, 0);
                comment.isLiked = false;
              } else {
                // Like: Add to likes array
                comment.likes.push(userId);
                comment.likesCount = (comment.likesCount || 0) + 1;
                comment.isLiked = true;
              }

              console.log(
                `Updated comment ${comment._id} like state to isLiked=${comment.isLiked}, count=${comment.likesCount}`
              );
              updated = true;
              return true;
            }

            // Check in replies if they exist
            if (comment.replies && comment.replies.length > 0) {
              const updatedInReplies = updateCommentLike(comment.replies);
              if (updatedInReplies) {
                updated = true;
                return true;
              }
            }
          }
          return updated;
        };

        // Update in comments data
        if (newData.data && newData.data.comments) {
          updateCommentLike(newData.data.comments);
        } else if (Array.isArray(newData)) {
          // Handle case where it's just an array of comments
          updateCommentLike(newData);
        }

        return newData;
      }
    );

    // Also update post details if needed
    queryClient.setQueriesData(
      { queryKey: POST_QUERY_KEYS.detail(postId) },
      (oldData) => {
        if (!oldData || !oldData.data) return oldData;
        // Update the post data if necessary
        return oldData;
      }
    );
  };

  const optimisticAddComment = ({ postId, comment }) => {
    console.log(`Optimistic add comment to post ${postId}:`, comment);

    // Update comment cache with the new comment
    queryClient.setQueriesData(
      { queryKey: POST_QUERY_KEYS.comment(postId) },
      (oldData) => {
        if (!oldData) {
          // Initialize if no data exists yet
          return {
            success: true,
            data: {
              comments: [comment],
              total: 1,
              page: 1,
              totalPages: 1,
            },
          };
        }

        // Deep clone to avoid mutation
        const newData = JSON.parse(JSON.stringify(oldData));

        // Handle the case where comment should be added to top-level comments
        if (!comment.parentId) {
          if (newData.data && Array.isArray(newData.data.comments)) {
            // Add new comment to the beginning of comments array
            newData.data.comments.unshift(comment);
            if (newData.data.total) {
              newData.data.total += 1;
            }
          } else if (Array.isArray(newData)) {
            // Handle case where it's just an array of comments
            newData.unshift(comment);
          }
        } else {
          // Comment is a reply - find its parent and add it
          const addReplyToParent = (comments) => {
            if (!comments || !Array.isArray(comments)) return false;

            for (let i = 0; i < comments.length; i++) {
              const parentComment = comments[i];

              // Found the parent comment
              if (parentComment._id === comment.parentId) {
                // Initialize replies array if it doesn't exist
                if (!parentComment.replies) {
                  parentComment.replies = [];
                }

                // Add new reply to the beginning
                parentComment.replies.unshift(comment);
                return true;
              }

              // Check nested replies
              if (
                parentComment.replies &&
                addReplyToParent(parentComment.replies)
              ) {
                return true;
              }
            }
            return false;
          };

          // Add reply to appropriate parent comment
          if (newData.data && Array.isArray(newData.data.comments)) {
            addReplyToParent(newData.data.comments);
          } else if (Array.isArray(newData)) {
            addReplyToParent(newData);
          }
        }
        return newData;
      }
    );

    // Return for consistency with mutation pattern
    return { postId, comment };
  };

  const initializeCommentsArray = ({ postId }) => {
    console.log(`Initializing comments array for post ${postId}`);
    // This function doesn't make API calls, just for local state
    return {
      postId,
    };
  };

  // Add a react to comment mutation
  const reactToComment = useMutation({
    mutationFn: async ({ postId, commentId, isNestedComment = false }) => {
      console.log(
        `Liking comment ${commentId} in post ${postId}, isNested: ${isNestedComment}`
      );

      // If this is a nested comment, make sure to include that information in logs
      if (isNestedComment) {
        console.log("Processing a nested comment like operation");
      }

      const response = await axiosService.post(
        `posts/${postId}/comment/${commentId}/like`,
        {}
      );
      console.log("React to comment response:", response.data);
      return { ...response.data, postId, commentId, isNestedComment };
    },

    onMutate: async ({ postId, commentId, isNestedComment = false }) => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(
        POST_QUERY_KEYS.comment(postId)
      );

      // Log that we're processing a nested comment if applicable
      if (isNestedComment) {
        console.log(
          `Optimistic update for nested comment ${commentId} with parent`
        );
      }

      // Apply optimistic update immediately
      queryClient.setQueriesData(
        { queryKey: POST_QUERY_KEYS.comment(postId) },
        (oldData) => {
          if (!oldData) return oldData;

          // Deep clone to avoid mutation
          const newData = JSON.parse(JSON.stringify(oldData));

          // Function to find and update a comment recursively
          const updateCommentLike = (comments) => {
            if (!comments || !Array.isArray(comments)) return false;

            for (let i = 0; i < comments.length; i++) {
              const comment = comments[i];

              // Found the comment to update
              if (comment._id === commentId) {
                // Initialize likes array if undefined
                if (!comment.likes) comment.likes = [];

                // Check if already liked
                const isLiked = comment.isLiked || false;
                const newIsLiked = !isLiked;

                comment.isLiked = newIsLiked;
                comment.likesCount = Math.max(
                  0,
                  (comment.likesCount || 0) + (newIsLiked ? 1 : -1)
                );

                console.log(
                  `Optimistic update for comment ${commentId}: isLiked=${comment.isLiked}, count=${comment.likesCount}`
                );
                return true;
              }

              // Check in replies if they exist
              if (comment.replies && comment.replies.length > 0) {
                if (updateCommentLike(comment.replies)) {
                  return true;
                }
              }
            }
            return false;
          };

          // Update in comments data
          if (newData.data && newData.data.comments) {
            updateCommentLike(newData.data.comments);
          } else if (Array.isArray(newData)) {
            // Handle case where it's just an array of comments
            updateCommentLike(newData);
          }

          return newData;
        }
      );

      return { previousData, isNestedComment };
    },

    onError: (error, { postId, commentId }, context) => {
      console.error(`Error liking comment ${commentId}:`, error);

      // Roll back to previous state
      if (context?.previousData) {
        queryClient.setQueryData(
          POST_QUERY_KEYS.comment(postId),
          context.previousData
        );
      }

      // Display error message
      Toast.error(
        error.response?.data?.error || "Failed to update comment like"
      );
    },

    onSuccess: (data) => {
      console.log("Comment reaction updated successfully:", data);

      if (!data || !data.success) {
        console.warn("Like comment response indicates failure:", data);
        return;
      }

      // Extract all relevant data including nested comment info
      const { postId, commentId } = data.data || {};
      const isNestedComment = data.isNestedComment;
      const parentId = data.data?.parentId;

      console.log(
        `Successfully liked comment ${commentId}, nested: ${isNestedComment}, parent: ${
          parentId || "none"
        }`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });

      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });
    },
  });

  return {
    createPost: createPostMutation,
    updatePost,
    deletePost: deletePostMutation,
    likePost: likePostMutation,
    createComment,
    updateComment,
    deleteComment,
    likeComment,
    reactToComment,
    fetchComments,
    optimisticToggleCommentLike,
    optimisticAddComment,
    initializeCommentsArray,
  };
};

export default usePostMutations;
