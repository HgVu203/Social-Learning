import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likePost, deletePost } = usePostContext();
  const isAuthor = user?._id === localPost.author?._id;

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
    showConfirmToast("Bạn có chắc chắn muốn xóa bài viết này?", async () => {
      try {
        setIsDeleting(true);
        await deletePost.mutateAsync(localPost._id);
      } catch (error) {
        console.error("Failed to delete post:", error);
      } finally {
        setIsDeleting(false);
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
    <div className="bg-[#16181c] rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
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
                className="font-medium text-white hover:underline block"
              >
                {localPost.author?.fullname ||
                  localPost.author?.username ||
                  "Deleted User"}
              </Link>
              <p className="text-sm text-gray-400">
                {formatDistanceToNow(new Date(localPost.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>

          {isAuthor && (
            <div className="relative group">
              <button
                className="p-1 rounded-full hover:bg-gray-800"
                disabled={isDeleting}
              >
                <svg
                  className="w-6 h-6 text-gray-400"
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
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-[#1d1f23] rounded-md shadow-lg py-1 hidden group-hover:block">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="block w-full text-left px-4 py-2 text-red-500 hover:bg-gray-800 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete Post"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 text-white">
            {localPost.title}
          </h2>
          <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
            {localPost.content}
          </p>
          {localPost.images && localPost.images.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-2">
              {localPost.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Post content ${index + 1}`}
                  className="rounded-lg max-h-96 w-full object-cover"
                />
              ))}
            </div>
          ) : localPost.image ? (
            <img
              src={localPost.image}
              alt="Post content"
              className="mt-4 rounded-lg max-h-96 w-full object-cover"
            />
          ) : null}
          {localPost.tags && localPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {localPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Post Stats */}
        <div className="flex items-center justify-between text-sm text-gray-400 border-t border-gray-800 pt-4">
          <div className="flex space-x-4">
            <span>
              {localPost.likesCount || localPost.likes?.length || 0} likes
            </span>
            <button
              onClick={() => setShowComments(!showComments)}
              className="hover:underline"
            >
              {localPost.commentsCount || 0} comments
            </button>
          </div>
        </div>

        {/* Post Actions */}
        <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-800">
          <motion.button
            onClick={handleLike}
            disabled={isLiking}
            whileTap={{ scale: 0.97 }}
            className={`relative overflow-hidden min-w-[80px] flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-150 ${
              isLiked ? "text-red-500 font-medium" : "text-gray-400"
            }`}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <motion.svg
                className={`w-5 h-5 ${
                  isLiked ? "fill-current text-red-500" : "fill-none"
                }`}
                stroke="currentColor"
                viewBox="0 0 24 24"
                initial={false}
                animate={isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </motion.svg>
            </motion.div>
            <span className="flex items-center">
              <motion.span
                className="inline-block min-w-[50px] text-center"
                initial={false}
                animate={{ color: isLiked ? "#ef4444" : "#9ca3af" }}
                transition={{ duration: 0.2 }}
              >
                {isLiked ? "Liked" : "Like"}
              </motion.span>
            </span>
          </motion.button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400"
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
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Comment</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 text-gray-400"
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
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span>Share</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="text-gray-400 border-gray-700 hover:bg-gray-800"
          >
            View Details
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>
            <PostComments postId={localPost._id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
