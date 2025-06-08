import { useMutation, useQueryClient } from "@tanstack/react-query";
import axiosService from "../../services/axiosService";
import { POST_QUERY_KEYS } from "../queries/usePostQueries";
import Toast from "../../utils/toast";

export const usePostMutations = () => {
  const queryClient = useQueryClient();

  // Create a new post
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // Handle FormData for image uploads
      if (postData instanceof FormData) {
        const response = await axiosService.post("/posts", postData);
        return response.data;
      }

      // Regular JSON post
      const response = await axiosService.post("/posts", postData);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate các query lists để làm mới danh sách bài viết
      queryClient.invalidateQueries({ queryKey: ["posts"] });

      // Nếu đăng bài trong group, invalidate query group posts tương ứng
      if (data?.data?.groupId) {
        queryClient.invalidateQueries({
          queryKey: ["posts", "group", data.data.groupId],
        });
      }

      // Toast được xử lý bởi component CreatePostPage
    },
    onError: (error) => {
      console.error("Error creating post:", error.message || error);
      // Sử dụng toastId để tránh thông báo trùng lặp
      // Toast sẽ được xử lý bởi component CreatePostPage
    },
  });

  // Update an existing post
  const updatePost = useMutation({
    mutationFn: async ({ postId, data }) => {
      // Handle FormData for image uploads
      if (data instanceof FormData) {
        const response = await axiosService.patch(`posts/${postId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
      }

      // Regular JSON update
      const response = await axiosService.patch(`posts/${postId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(variables.postId),
      });
      queryClient.invalidateQueries({ queryKey: POST_QUERY_KEYS.lists() });
      Toast.success("Post updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating post:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to update post");
    },
  });

  // Delete a post
  const deletePostMutation = useMutation({
    mutationFn: async (postId) => {
      const response = await axiosService.delete(`posts/${postId}`);
      return response.data;
    },
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: POST_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      Toast.success("Post deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting post:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to delete post");
    },
  });

  // Like/Unlike a post
  const likePostMutation = useMutation({
    mutationFn: async (postId) => {
      try {
        console.log(`[usePostMutations] Calling like API for post: ${postId}`);
        const response = await axiosService.post(`/posts/${postId}/like`);
        return response.data;
      } catch (error) {
        console.error(`[usePostMutations] Error liking post ${postId}:`, error);
        throw error;
      }
    },

    onMutate: async (postId) => {
      // Hủy các query đang chạy để tránh race condition
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: POST_QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: ["posts", "recommended"] });
      await queryClient.cancelQueries({ queryKey: ["posts", "search"] });

      // Hủy cả truy vấn bài đăng trong nhóm
      await queryClient.cancelQueries({
        queryKey: POST_QUERY_KEYS.all.concat("group"),
      });

      // Lưu trạng thái trước khi update
      const previousPost =
        queryClient.getQueryData(["post", postId]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.detail(postId));

      const previousPostsList =
        queryClient.getQueryData(["posts"]) ||
        queryClient.getQueryData(POST_QUERY_KEYS.lists());

      // Lấy tất cả các group posts queries có thể ảnh hưởng
      const groupPostsQueries = queryClient.getQueriesData({
        queryKey: POST_QUERY_KEYS.all.concat("group"),
      });

      // Lấy user ID từ cache để biết được trạng thái like hiện tại
      const userData = queryClient.getQueryData(["user", "current"]);
      const userId = userData?._id;

      if (userId) {
        // Function để cập nhật optimistic cho một post
        const updatePostOptimistically = (post) => {
          if (!post || post._id !== postId) return post;

          // Xác định trạng thái like hiện tại
          const currentlyLiked =
            post.isLiked === true ||
            (Array.isArray(post.likes) &&
              post.likes.some(
                (like) =>
                  (typeof like === "string" && like === userId) ||
                  like?._id === userId ||
                  like?.userId === userId
              ));

          // Tính toán giá trị mới
          const newLikes = currentlyLiked
            ? Array.isArray(post.likes)
              ? post.likes.filter((like) => {
                  if (typeof like === "string") return like !== userId;
                  if (typeof like === "object" && like !== null) {
                    return like._id !== userId && like.userId !== userId;
                  }
                  return true;
                })
              : []
            : Array.isArray(post.likes)
            ? [...post.likes, userId]
            : [userId];

          const newLikesCount = currentlyLiked
            ? Math.max(0, (post.likesCount || 1) - 1)
            : (post.likesCount || 0) + 1;

          console.log(
            `[usePostMutations] Optimistic update for post ${postId}: isLiked ${currentlyLiked} -> ${!currentlyLiked}, likesCount ${
              post.likesCount
            } -> ${newLikesCount}`
          );

          // Trả về post với trạng thái đã cập nhật
          return {
            ...post,
            isLiked: !currentlyLiked,
            likesCount: newLikesCount,
            likes: newLikes,
          };
        };

        // Thực hiện optimistic update
        // Cập nhật chi tiết post
        queryClient.setQueryData(["post", postId], (oldData) => {
          if (!oldData) return oldData;
          return updatePostOptimistically(oldData);
        });

        queryClient.setQueryData(POST_QUERY_KEYS.detail(postId), (oldData) => {
          if (!oldData) return oldData;
          if (oldData.data) {
            return {
              ...oldData,
              data: updatePostOptimistically(oldData.data),
            };
          }
          return updatePostOptimistically(oldData);
        });

        // Cập nhật trong danh sách posts
        const updatePostsListOptimistically = (oldData) => {
          if (!oldData) return oldData;

          // Xử lý mảng posts thông thường
          if (Array.isArray(oldData)) {
            return oldData.map((post) =>
              post._id === postId ? updatePostOptimistically(post) : post
            );
          }

          // Xử lý đối tượng có thuộc tính data là mảng posts
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map((post) =>
                post._id === postId ? updatePostOptimistically(post) : post
              ),
            };
          }

          // Xử lý infinite query với pages
          if (oldData.pages) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => {
                if (!page.data) return page;
                return {
                  ...page,
                  data: Array.isArray(page.data)
                    ? page.data.map((post) =>
                        post._id === postId
                          ? updatePostOptimistically(post)
                          : post
                      )
                    : page.data,
                };
              }),
            };
          }

          return oldData;
        };

        // Thực hiện cập nhật cho tất cả các query liên quan
        queryClient.setQueriesData(
          { queryKey: ["posts"] },
          updatePostsListOptimistically
        );
        queryClient.setQueriesData(
          { queryKey: POST_QUERY_KEYS.lists() },
          updatePostsListOptimistically
        );
        queryClient.setQueriesData(
          { queryKey: ["posts", "recommended"] },
          updatePostsListOptimistically
        );
        queryClient.setQueriesData(
          { queryKey: ["posts", "search"] },
          updatePostsListOptimistically
        );

        // Cập nhật cho các truy vấn nhóm
        if (groupPostsQueries.length) {
          groupPostsQueries.forEach(([queryKey, queryData]) => {
            queryClient.setQueryData(
              queryKey,
              updatePostsListOptimistically(queryData)
            );
          });
        }

        return { previousPost, previousPostsList };
      }

      return {};
    },

    onSuccess: (data, postId) => {
      if (!data || !data.success) {
        console.warn(
          `Like operation for post ${postId} was not successful`,
          data
        );
        return;
      }

      console.log(
        `[usePostMutations] Updating cache with successful like data:`,
        data
      );

      // Function để cập nhật một post dựa trên dữ liệu từ server
      const updatePostData = (old) => {
        if (!old) return old;
        if (old._id !== postId) return old;

        // Cập nhật với dữ liệu chính xác từ server
        return {
          ...old,
          isLiked: data.isLiked,
          likesCount: data.likesCount,
          likes: data.likes || old.likes || [],
        };
      };

      // Function để cập nhật tất cả các posts trong danh sách
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
      queryClient.setQueryData(["post", postId], updatePostData);
      queryClient.setQueryData(POST_QUERY_KEYS.detail(postId), (old) => {
        if (!old) return old;
        if (old.data) {
          return {
            ...old,
            data: updatePostData(old.data),
          };
        }
        return updatePostData(old);
      });
      queryClient.setQueryData(["posts", "recommended"], updatePostsData);
      queryClient.setQueryData(["posts", "search"], updatePostsData);

      // Cập nhật cho các truy vấn posts trong groups
      const groupPostsQueries = queryClient.getQueriesData({
        queryKey: POST_QUERY_KEYS.all.concat("group"),
      });

      if (groupPostsQueries.length) {
        groupPostsQueries.forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(queryKey, updatePostsData(queryData));
        });
      }

      // Thêm invalidate để đảm bảo dữ liệu được refresh khi cần
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
    },

    onError: (error, postId, context = {}) => {
      // Khôi phục cache state từ context nếu có lỗi
      if (context.previousPost) {
        queryClient.setQueryData(["post", postId], context.previousPost);
        queryClient.setQueryData(
          POST_QUERY_KEYS.detail(postId),
          context.previousPost
        );
      }
      if (context.previousPostsList) {
        queryClient.setQueryData(["posts"], context.previousPostsList);
        queryClient.setQueryData(
          POST_QUERY_KEYS.lists(),
          context.previousPostsList
        );
      }

      // Re-invalidate để đảm bảo dữ liệu được cập nhật lại sau lỗi
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: POST_QUERY_KEYS.lists() });
    },
  });

  // Create a comment
  const createComment = useMutation({
    mutationFn: async ({
      postId,
      content,
      comment,
      parentId = null,
      image = null,
    }) => {
      // Support both "content" and "comment" property names for flexibility
      const commentText = comment || content || "";

      const payload = {
        comment: commentText,
        parentId: parentId || null,
      };

      if (image) {
        payload.image = image;
      }

      console.log(
        "Creating comment with payload:",
        JSON.stringify({
          postId,
          parentId,
          hasComment: !!commentText,
          hasImage: !!image,
        })
      );

      try {
        const response = await axiosService.post(
          `/posts/${postId}/comments`,
          payload
        );

        console.log(
          "Comment API response:",
          JSON.stringify({
            success: response.data.success,
            isReply: response.data.data.isReply,
            hasParentInfo: !!response.data.data.parentInfo,
          })
        );

        return response.data;
      } catch (error) {
        console.error(
          "Comment API error:",
          error.response?.data || error.message || error
        );
        throw error;
      }
    },
    onSuccess: (data) => {
      const { postId } = data.data || {};
      if (postId) {
        // Thêm delay nhỏ để đảm bảo server đã lưu comment
        setTimeout(() => {
          queryClient.invalidateQueries({
            queryKey: POST_QUERY_KEYS.detail(postId),
          });
          queryClient.invalidateQueries({
            queryKey: POST_QUERY_KEYS.comment(postId),
          });
        }, 300);
      }
    },
    onError: (error) => {
      console.error("Error creating comment:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to add comment");
    },
  });

  // Update a comment
  const updateComment = useMutation({
    mutationFn: async ({
      postId,
      commentId,
      content,
      comment,
      image = null,
    }) => {
      // Support both "content" and "comment" property names for flexibility
      const commentText = comment || content || "";

      const payload = {
        comment: commentText,
      };

      if (image !== undefined) {
        payload.image = image;
      }

      try {
        const response = await axiosService.put(
          `posts/${postId}/comments/${commentId}`,
          payload
        );
        return {
          ...response.data,
          postId,
          commentId,
          content: commentText,
          image,
        };
      } catch (error) {
        console.error(
          "Comment update API error:",
          error.response?.data || error.message || error
        );
        throw error;
      }
    },
    onSuccess: (data) => {
      const { postId } = data;
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });
    },
    onError: (error) => {
      console.error("Error updating comment:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to update comment");
    },
  });

  // Delete a comment
  const deleteComment = useMutation({
    mutationFn: async ({ postId, commentId }) => {
      const response = await axiosService.delete(
        `posts/${postId}/comments/${commentId}`
      );
      return { ...response.data, postId, commentId };
    },
    onSuccess: (data) => {
      const { postId } = data;
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.detail(postId),
      });
      queryClient.invalidateQueries({
        queryKey: POST_QUERY_KEYS.comment(postId),
      });
    },
    onError: (error) => {
      console.error("Error deleting comment:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to delete comment");
    },
  });

  // Like a comment
  const likeComment = useMutation({
    mutationFn: async (postId) => {
      const response = await axiosService.post(`/posts/${postId}/like`);
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
      console.error("Error toggling like:", err);

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
        console.error("Invalid response from like API:", data);
        return;
      }

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
      const response = await axiosService.get(
        `/posts/${postId}/comments?page=${page}&limit=${limit}`
      );
      return { ...response.data, postId };
    },
    onSuccess: () => {
      // Comments fetched successfully
    },
    onError: (error) => {
      console.error("Error fetching comments:", error.message || error);
      Toast.error(error.response?.data?.error || "Failed to fetch comments");
    },
  });

  // Optimistic functions for UI updates
  const optimisticToggleCommentLike = ({ postId, commentId, userId }) => {
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
    // Chuẩn hóa cấu trúc comment để đảm bảo tính nhất quán
    const normalizedComment = { ...comment };

    // Đảm bảo trường author luôn tồn tại
    if (!normalizedComment.author && normalizedComment.userId) {
      normalizedComment.author = normalizedComment.userId;
    }

    // Đảm bảo trường userId luôn tồn tại
    if (!normalizedComment.userId && normalizedComment.author) {
      normalizedComment.userId = normalizedComment.author;
    }

    // Đảm bảo các trường cần thiết khác luôn tồn tại
    normalizedComment.likes = normalizedComment.likes || [];
    normalizedComment.likesCount = normalizedComment.likesCount || 0;
    normalizedComment.isLiked = normalizedComment.isLiked || false;
    normalizedComment.replies = normalizedComment.replies || [];

    // Update comment cache with the new comment
    queryClient.setQueriesData(
      { queryKey: POST_QUERY_KEYS.comment(postId) },
      (oldData) => {
        if (!oldData) {
          // Initialize if no data exists yet
          return {
            success: true,
            data: {
              comments: [normalizedComment],
              total: 1,
              page: 1,
              totalPages: 1,
            },
          };
        }

        // Deep clone to avoid mutation
        const newData = JSON.parse(JSON.stringify(oldData));

        // Handle the case where comment should be added to top-level comments
        if (!normalizedComment.parentId) {
          if (newData.data && Array.isArray(newData.data.comments)) {
            // Add new comment to the beginning of comments array
            newData.data.comments.unshift(normalizedComment);
            if (newData.data.total) {
              newData.data.total += 1;
            }
          } else if (Array.isArray(newData)) {
            // Handle case where it's just an array of comments
            newData.unshift(normalizedComment);
          }
        } else {
          // Comment is a reply - find its parent and add it
          const addReplyToParent = (comments) => {
            if (!comments || !Array.isArray(comments)) return false;

            for (let i = 0; i < comments.length; i++) {
              const parentComment = comments[i];

              // Found the parent comment
              if (parentComment._id === normalizedComment.parentId) {
                // Initialize replies array if it doesn't exist
                if (!parentComment.replies) {
                  parentComment.replies = [];
                }

                // Add new reply to the beginning
                parentComment.replies.unshift(normalizedComment);
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

    // Cập nhật comment count trong bài đăng
    queryClient.setQueriesData(
      { queryKey: POST_QUERY_KEYS.lists() },
      (oldData) => {
        if (!oldData) return oldData;

        // Cập nhật commentsCount trong tất cả các danh sách posts
        const updatePostsData = (posts) => {
          if (!Array.isArray(posts)) return posts;

          return posts.map((post) => {
            if (post._id === postId) {
              return {
                ...post,
                commentsCount: (post.commentsCount || 0) + 1,
              };
            }
            return post;
          });
        };

        // Xử lý các cấu trúc dữ liệu khác nhau
        if (Array.isArray(oldData)) {
          return updatePostsData(oldData);
        }

        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => {
              if (!page.data) return page;
              return {
                ...page,
                data: updatePostsData(page.data),
              };
            }),
          };
        }

        if (oldData.data) {
          return {
            ...oldData,
            data: Array.isArray(oldData.data)
              ? updatePostsData(oldData.data)
              : oldData.data,
          };
        }

        return oldData;
      }
    );

    // Return for consistency with mutation pattern
    return { postId, comment: normalizedComment };
  };

  const initializeCommentsArray = ({ postId }) => {
    // This function doesn't make API calls, just for local state
    return {
      postId,
    };
  };

  // Add a react to comment mutation
  const reactToComment = useMutation({
    mutationFn: async ({ postId, commentId, isNestedComment = false }) => {
      const response = await axiosService.post(
        `posts/${postId}/comments/${commentId}/like`,
        {}
      );
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
      console.error(
        `Error liking comment ${commentId}:`,
        error.message || error
      );

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
      if (!data || !data.success) {
        return;
      }

      // Extract post ID from response data
      const { postId } = data.data || {};

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
