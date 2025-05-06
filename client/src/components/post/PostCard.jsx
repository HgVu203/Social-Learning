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

const PostCard = ({ post }) => {
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likePost, deletePost } = usePostContext();
  const isAuthor = user?._id === localPost.author?._id;

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

  // Update local state when post prop changes
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  // More robust isLiked calculation
  const isLiked = useMemo(() => {
    if (!user || !localPost) return false;

    // Ưu tiên dùng thuộc tính isLiked từ server
    if (typeof localPost.isLiked === "boolean") {
      return localPost.isLiked;
    }

    // Nếu không có isLiked, kiểm tra mảng likes
    if (Array.isArray(localPost.likes) && localPost.likes.length > 0) {
      return localPost.likes.some((like) => {
        // Xử lý trường hợp like là string (userId)
        if (typeof like === "string") {
          return like === user._id;
        }

        // Xử lý trường hợp like là object có userId
        if (typeof like === "object" && like !== null) {
          if (like.userId) {
            return like.userId.toString() === user._id.toString();
          }
          // Xử lý trường hợp là ObjectId trực tiếp
          return like.toString && like.toString() === user._id.toString();
        }

        return false;
      });
    }

    return false;
  }, [user, localPost]);

  // Khi có thay đổi trong isLiked, cập nhật localPost để đảm bảo UI hiển thị đúng
  useEffect(() => {
    if (localPost) {
      setLocalPost((prev) => ({
        ...prev,
        isLiked: isLiked,
      }));
    }
  }, [isLiked]);

  // Đảm bảo đồng bộ khi prop post thay đổi
  useEffect(() => {
    if (post && JSON.stringify(post) !== JSON.stringify(localPost)) {
      setLocalPost(post);
    }
  }, [post]);

  const handleLike = useCallback(async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (isLiking) return; // Prevent multiple clicks

    setIsLiking(true);

    // Optimistic update
    const currentLiked = isLiked;
    const currentLikesCount = localPost.likesCount || 0;
    const newLikesCount = currentLiked
      ? Math.max(currentLikesCount - 1, 0)
      : currentLikesCount + 1;

    // Update local state first for immediate feedback
    setLocalPost((prev) => ({
      ...prev,
      isLiked: !currentLiked,
      likesCount: newLikesCount,
    }));

    try {
      // Call API
      const response = await likePost.mutateAsync(localPost._id);

      // Update with actual API response
      if (response && response.success) {
        setLocalPost((prev) => ({
          ...prev,
          isLiked: response.isLiked,
          likesCount: response.likesCount,
          likes: response.likes || prev.likes,
        }));
      }
    } catch (error) {
      console.error("Like action failed:", error);
      // Revert on error
      setLocalPost((prev) => ({
        ...prev,
        isLiked: currentLiked,
        likesCount: currentLikesCount,
      }));
    } finally {
      setIsLiking(false);
    }
  }, [isLiked, isLiking, likePost, localPost._id, navigate, user]);

  const handleDelete = () => {
    showConfirmToast("Are you sure you want to delete this post?", async () => {
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
    showSuccessToast("Link copied to clipboard!");
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
          {localPost.images && localPost.images.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {localPost.images.map((image, index) => (
                <LazyImage
                  key={index}
                  src={image}
                  alt={`Post content ${index + 1}`}
                  className="rounded-xl max-h-96 h-64 hover:shadow-lg transition-shadow"
                  eager={index === 0}
                />
              ))}
            </div>
          ) : localPost.image ? (
            <LazyImage
              src={localPost.image}
              alt="Post content"
              className="mt-4 rounded-xl max-h-96 h-64 hover:shadow-lg transition-shadow"
              eager={true}
            />
          ) : null}
          {localPost.tags && localPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {localPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] rounded-full text-sm hover:bg-[var(--color-bg-light)] transition-colors"
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
              <span className="text-sm font-medium">
                {localPost.likesCount || 0}
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
              <span className="text-sm font-medium">
                {localPost.commentsCount || 0}
              </span>
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
