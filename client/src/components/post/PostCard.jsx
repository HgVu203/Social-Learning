import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "../common/Avatar";
import LazyImage from "../common/LazyImage";
import { formatDistanceToNow } from "date-fns";
import PostComments from "./PostComment";
import { showSuccessToast, showConfirmToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import { usePostComments } from "../../hooks/queries/usePostQueries";
import { useQueryClient } from "@tanstack/react-query";
import { POST_QUERY_KEYS } from "../../hooks/queries/usePostQueries";
import { useTranslation } from "react-i18next";

/**
 * Component hiển thị một bài post với các chức năng tương tác
 *
 * Quy trình xử lý like:
 * 1. Khi người dùng click vào nút like, hàm handleLike được gọi
 * 2. Cập nhật UI ngay lập tức (optimistic update) trước khi gọi API
 * 3. Gọi API like post
 * 4. Nếu API trả về kết quả khác với trạng thái optimistic, cập nhật lại UI theo server
 * 5. Nếu API gặp lỗi, khôi phục trạng thái ban đầu
 */
const PostCard = ({ post, index = 0 }) => {
  const { t } = useTranslation();
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showMenu, setShowMenu] = useState(false);
  const [commentsMismatch, setCommentsMismatch] = useState(false);
  const menuRef = useRef(null);
  const prevPostRef = useRef(post);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likePost, deletePost, optimisticTogglePostLike } = usePostContext();
  const isAuthor = user?._id === localPost.author?._id;
  const queryClient = useQueryClient();

  // Điều chỉnh eager loading dựa trên vị trí của post để tối ưu hiển thị
  const isEagerLoad = index < 15; // Tăng từ 8 lên 15 post đầu tiên

  // Pre-check if there might be a comment count mismatch
  const { data: commentsData } = usePostComments(localPost._id, {
    enabled: showComments, // Only fetch when comments are shown
    staleTime: 30000,
  });

  // Check for potential mismatch when comments data is loaded
  useEffect(() => {
    if (commentsData && commentsData.data) {
      const commentsArray = commentsData.data.comments || [];
      const commentCount = commentsData.data.commentsCount || 0;
      setCommentsMismatch(commentCount > 0 && commentsArray.length === 0);

      // Cập nhật localPost.commentsCount dựa trên dữ liệu từ commentsData
      if (commentCount !== localPost.commentsCount) {
        setLocalPost((prev) => ({
          ...prev,
          commentsCount: commentCount,
        }));
      }
    }
  }, [commentsData, localPost]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Cập nhật localPost khi post prop thay đổi
  useEffect(() => {
    if (post && JSON.stringify(post) !== JSON.stringify(prevPostRef.current)) {
      // Đảm bảo trạng thái like được đồng bộ từ server
      const serverPost = { ...post };

      // Đảm bảo likesCount là số hợp lệ
      if (typeof serverPost.likesCount !== "number") {
        serverPost.likesCount = Array.isArray(serverPost.likes)
          ? serverPost.likes.length
          : 0;
      }

      setLocalPost(serverPost);
      prevPostRef.current = serverPost;
    }
  }, [post]);

  // Tính toán trạng thái isLiked dựa trên dữ liệu post
  const isLiked = useMemo(() => {
    if (!user || !localPost) return false;

    // Ưu tiên sử dụng giá trị từ localPost.isLiked nếu đã được thiết lập rõ ràng
    if (typeof localPost.isLiked === "boolean") {
      return localPost.isLiked;
    }

    // Nếu không có isLiked, kiểm tra trong mảng likes
    if (Array.isArray(localPost.likes)) {
      return localPost.likes.some((like) => {
        if (typeof like === "string") return like === user._id;
        if (typeof like === "object" && like !== null) {
          return like._id === user._id || like.userId === user._id;
        }
        return false;
      });
    }

    return false;
  }, [localPost, user]);

  // Thêm effect để đảm bảo luôn lấy trạng thái like từ server mỗi khi component mount
  useEffect(() => {
    // Chỉ fetch lại dữ liệu nếu có user đăng nhập và có postId
    if (user && localPost && localPost._id) {
      // Tùy chọn: Có thể gọi API kiểm tra trạng thái like ở đây
      // Ví dụ: fetchPostStatus(localPost._id)
    }
  }, [user, localPost]);

  // Thêm useEffect để kiểm tra và đồng bộ trạng thái like khi component mount
  useEffect(() => {
    if (user && localPost && localPost._id) {
      // Xác định trạng thái like từ dữ liệu server
      let serverIsLiked = false;

      // Ưu tiên sử dụng giá trị isLiked từ server nếu có
      if (typeof localPost.isLiked === "boolean") {
        serverIsLiked = localPost.isLiked;
      }
      // Nếu không có isLiked, tính toán từ mảng likes
      else if (Array.isArray(localPost.likes)) {
        serverIsLiked = localPost.likes.some((like) => {
          if (typeof like === "string") return like === user._id;
          if (typeof like === "object" && like !== null) {
            return like._id === user._id || like.userId === user._id;
          }
          return false;
        });
      }

      // Đảm bảo trạng thái local và trạng thái UI đồng bộ với server
      if (serverIsLiked !== isLiked) {
        setLocalPost((prev) => ({
          ...prev,
          isLiked: serverIsLiked,
        }));
      }
    }
  }, [user, localPost, isLiked]);

  // Debug: xem trạng thái của isLiked
  useEffect(() => {
    if (localPost && localPost._id) {
      // Cập nhật likesCount dựa trên trạng thái isLiked nếu chưa đồng bộ
      const hasLikesArray =
        Array.isArray(localPost.likes) && localPost.likes.length > 0;
      const expectedLikeCount = hasLikesArray
        ? localPost.likes.length
        : isLiked
        ? 1
        : 0;

      // Kiểm tra nếu likesCount không khớp với mảng likes
      if (localPost.likesCount !== expectedLikeCount && hasLikesArray) {
        setLocalPost((prev) => ({
          ...prev,
          likesCount: expectedLikeCount,
        }));
      }
    }
  }, [isLiked, localPost]);

  // Đảm bảo commentsCount không âm và là số hợp lệ
  const commentsCount = useMemo(() => {
    if (
      localPost?.commentsCount === undefined ||
      localPost?.commentsCount === null
    ) {
      return 0;
    }

    // Convert to number if it's a string
    const count = Number(localPost.commentsCount);

    // Return 0 if not a valid number
    if (isNaN(count) || count < 0) {
      return 0;
    }

    return count;
  }, [localPost]);

  // Hiển thị nút like với UI được đưa ra từ hàm riêng
  const renderLikeButton = () => {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleLike}
        disabled={isLiking}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
          isLiked
            ? "text-[var(--color-primary)] bg-[var(--color-primary-dark)]/10"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
        }`}
      >
        {isLiking ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            className={`w-5 h-5 ${
              isLiked ? "fill-current" : "stroke-current fill-none"
            }`}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        )}
        <span className="text-sm font-medium">{localPost.likesCount || 0}</span>
      </motion.button>
    );
  };

  // Hàm để tải lại dữ liệu post từ server và đồng bộ trạng thái
  const refreshPostStatus = useCallback(async () => {
    if (!localPost || !localPost._id) return;

    try {
      // Phân biệt rõ post cá nhân và post group
      if (localPost.groupId) {
        // Chỉ invalidate post chi tiết, không invalidate danh sách post
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.detail(localPost._id),
          refetchType: "none", // Không tự động refetch, chỉ đánh dấu stale
        });
      } else {
        // Chỉ invalidate query liên quan đến post cá nhân
        queryClient.invalidateQueries({
          queryKey: POST_QUERY_KEYS.detail(localPost._id),
          refetchType: "none", // Không tự động refetch, chỉ đánh dấu stale
        });
      }
    } catch (error) {
      console.error("Failed to refresh post status:", error);
    }
  }, [localPost, queryClient]);

  // Thêm effect để refresh post status khi component mount
  useEffect(() => {
    // Refresh post status khi component mount nếu user đã đăng nhập
    if (user && localPost && localPost._id) {
      refreshPostStatus();
    }
  }, [refreshPostStatus, user, localPost]);

  // Thêm biến để theo dõi thời gian like gần nhất
  const lastLikeTimeRef = useRef(0);
  const processingLikeRef = useRef(false);

  /**
   * Xử lý khi người dùng thích/bỏ thích bài viết
   */
  const handleLike = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isLiking || processingLikeRef.current) return;

    // Thêm throttle check để tránh gọi API quá nhanh
    const now = Date.now();
    if (now - lastLikeTimeRef.current < 1000) {
      return;
    }
    lastLikeTimeRef.current = now;

    try {
      setIsLiking(true);
      processingLikeRef.current = true;

      // Optimistic update để làm UI mượt hơn
      const prevLikeState = isLiked;
      const prevLikeCount = localPost.likesCount || 0;
      const optimisticLikeCount = prevLikeState
        ? Math.max(0, prevLikeCount - 1)
        : prevLikeCount + 1;

      // Lưu trạng thái trước khi update để khôi phục nếu có lỗi
      const prevPost = { ...localPost };

      // Cập nhật UI ngay lập tức cho trải nghiệm mượt mà
      setLocalPost((prev) => ({
        ...prev,
        isLiked: !prevLikeState,
        likesCount: optimisticLikeCount,
        likes: !prevLikeState
          ? [...(prev.likes || []), user._id]
          : (prev.likes || []).filter((id) =>
              typeof id === "string" ? id !== user._id : id._id !== user._id
            ),
      }));

      // Gọi API và đợi phản hồi từ server
      const response = await likePost.mutateAsync(localPost._id);
      if (response && response.success === true) {
        // Cập nhật localPost với dữ liệu từ server
        setLocalPost((prev) => ({
          ...prev,
          isLiked: response.isLiked,
          likesCount: response.likesCount,
          likes: response.likes || [],
        }));

        // Đồng bộ cache với dữ liệu từ server
        optimisticTogglePostLike({
          postId: localPost._id,
          userId: user._id,
          serverState: response.isLiked, // Đảm bảo sử dụng giá trị từ server
          groupId: localPost.groupId, // Thêm groupId để giúp cập nhật chính xác
        });
      } else {
        console.error(
          "[PostCard] Like API returned unsuccessful response:",
          response
        );

        // Nếu có lỗi, khôi phục về trạng thái trước đó
        setLocalPost(prevPost);
      }
    } catch (error) {
      console.error("[PostCard] Failed to like post:", error);
      showSuccessToast(t("toast.error.generic"));
    } finally {
      setIsLiking(false);
      processingLikeRef.current = false;
    }
  }, [
    user,
    navigate,
    isLiking,
    localPost,
    likePost,
    optimisticTogglePostLike,
    isLiked,
    showSuccessToast,
  ]);

  const handleDelete = () => {
    showConfirmToast("toast.confirm.delete", async () => {
      try {
        setIsDeleting(true);
        await deletePost.mutateAsync(localPost._id);
        // Navigate to home page after successful deletion
        navigate("/");
      } catch (error) {
        console.error("Failed to delete post:", error);
      } finally {
        setIsDeleting(false);
        setShowMenu(false);
      }
    });
  };

  const handleViewDetails = () => {
    navigate(`/post/${localPost._id}`);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/post/${localPost._id}`;
    navigator.clipboard.writeText(url);
    showSuccessToast("toast.success.linkCopied");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card overflow-hidden hover-scale border border-[var(--color-border)] rounded-xl shadow-sm"
    >
      {/* Post Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <Link to={`/profile/${localPost.author?._id}`} className="shrink-0">
              <Avatar
                src={localPost.author?.avatar}
                alt={localPost.author?.username}
                size="md"
              />
            </Link>
            <div>
              <Link
                to={`/profile/${localPost.author?._id}`}
                className="font-medium text-[var(--color-text-primary)] hover:underline block"
              >
                {localPost.author?.fullname ||
                  localPost.author?.username ||
                  "Deleted User"}
              </Link>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {formatDistanceToNow(new Date(localPost.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="relative" ref={menuRef}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-full hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
                disabled={isDeleting}
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Post options"
              >
                <svg
                  className="w-5 h-5 text-[var(--color-text-secondary)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </motion.button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-1 w-48 bg-[var(--color-bg-primary)] rounded-xl shadow-lg border border-[var(--color-border)] py-2 z-10"
                  >
                    <motion.button
                      whileHover={{ backgroundColor: "var(--color-bg-hover)" }}
                      onClick={() => {
                        navigate(`/post/edit/${localPost._id}`);
                        setShowMenu(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-[var(--color-text-primary)] disabled:opacity-50 rounded-lg transition-colors gap-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="font-medium">Edit Post</span>
                    </motion.button>

                    <motion.button
                      whileHover={{
                        backgroundColor: "var(--color-bg-danger-hover)",
                      }}
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors gap-2 cursor-pointer"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="font-medium">
                        {isDeleting ? "Deleting..." : "Delete Post"}
                      </span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 text-[var(--color-text-primary)] truncate">
            {localPost.title}
          </h2>
          <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed line-clamp-3">
            {localPost.content}
          </p>

          {/* Post Images */}
          {localPost.images && localPost.images.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {localPost.images.map((image, index) => (
                <LazyImage
                  key={index}
                  src={image}
                  alt={`Post content ${index + 1}`}
                  className="rounded-xl max-h-96 h-64 hover:shadow-lg transition-shadow"
                  eager={isEagerLoad}
                />
              ))}
            </div>
          ) : localPost.image ? (
            <LazyImage
              src={localPost.image}
              alt="Post content"
              className="mt-4 rounded-xl max-h-96 h-64 hover:shadow-lg transition-shadow"
              eager={isEagerLoad}
            />
          ) : null}

          {/* Post Tags */}
          {localPost.tags && localPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {localPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[var(--color-primary)] text-white rounded-full text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Actions */}
        <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
          <div className="flex space-x-4">
            {renderLikeButton()}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                commentsMismatch
                  ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              }`}
            >
              {commentsMismatch ? (
                <svg
                  className="w-5 h-5 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 stroke-current"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{commentsCount}</span>
            </motion.button>
          </div>

          <div className="flex space-x-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] p-2 rounded-lg transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5 stroke-current"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleViewDetails}
              className="text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] p-2 rounded-lg transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5 stroke-current"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50"
        >
          <div className="pb-1">
            <PostComments postId={localPost._id} />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PostCard;
