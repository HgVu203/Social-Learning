import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { usePostContext } from "../../contexts/PostContext";
import Avatar from "../common/Avatar";
import { formatDistanceToNow } from "date-fns";
import { showDeleteConfirmToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import socketService from "../../socket";
import { usePostComments } from "../../hooks/queries/usePostQueries";
import { motion, AnimatePresence } from "framer-motion";

const defaultReactions = [
  { emoji: "👍", name: "thumbs_up", count: 0 },
  { emoji: "❤️", name: "heart", count: 0 },
  { emoji: "😄", name: "smile", count: 0 },
  { emoji: "😮", name: "wow", count: 0 },
  { emoji: "😢", name: "sad", count: 0 },
];

// Add this variable after the defaultReactions array
const userMentionMap = new Map();

const CommentForm = ({
  postId,
  replyToId = null,
  onCommentAdded,
  onCancel = null,
  initialValue = "",
  isEditing = false,
  onEditComplete = null,
  replyingToUser = null,
  replyingToUserId = null,
}) => {
  const [content, setContent] = useState(
    replyingToUser ? `@${replyingToUser} ${initialValue}` : initialValue
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const { createComment, updateComment, optimisticAddComment } =
    usePostContext();
  const { user } = useAuth();

  // Highlight tag syntax in the input field
  const renderHighlightedInput = () => {
    if (!replyingToUser || !content.includes(`@${replyingToUser}`)) {
      return null;
    }

    // Split the input value at the tag
    const parts = content.split(`@${replyingToUser}`);

    if (parts.length <= 1) {
      return null;
    }

    return (
      <div className="absolute left-0 top-0 w-full h-full pointer-events-none px-4 py-3 text-sm text-transparent">
        <span>{parts[0]}</span>
        <span className="user-tag">@{replyingToUser}</span>
        <span>{parts[1]}</span>
      </div>
    );
  };

  // Store the mapping of username to userId when replying to someone
  useEffect(() => {
    if (replyingToUser && replyingToUserId) {
      // Very important: Make sure the full name is stored for proper tagging
      userMentionMap.set(replyingToUser, replyingToUserId);

      // Also store individual parts of the name for more flexible matching
      if (replyingToUser.includes(" ")) {
        const nameParts = replyingToUser.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentionMap.set(part.trim(), replyingToUserId);
          }
        });
      }
    }
  }, [replyingToUser, replyingToUserId]);

  // Focus input when mounted (useful for reply forms and editing)
  useEffect(() => {
    if ((replyToId || isEditing) && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at the end of text when editing
      if ((isEditing || replyingToUser) && inputRef.current) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [replyToId, isEditing, replyingToUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);

    if (isEditing && onEditComplete) {
      try {
        await updateComment.mutateAsync({
          postId,
          commentId: replyToId, // Using replyToId to store commentId for editing
          content: content.trim(),
        });

        onEditComplete(content.trim());
      } catch (error) {
        console.error("Error updating comment:", error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Optimistic update with local data for new comments
    const tempComment = {
      _id: `temp-${Date.now()}`,
      content: content.trim(),
      userId: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar,
      },
      parentId: replyToId,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      likes: [],
      likesCount: 0,
      isLiked: false,
    };

    // Add to UI immediately
    if (onCommentAdded) {
      onCommentAdded(tempComment);
    }

    // Also optimistic update
    optimisticAddComment({
      postId,
      comment: tempComment,
    });

    // Clear input
    setContent("");

    // Then send to server
    try {
      await createComment.mutateAsync({
        postId,
        content: content.trim(),
        parentId: replyToId,
      });
    } catch (error) {
      // You could handle the error by removing the optimistic comment here
      if (onCommentAdded && error) {
        // Remove the temp comment by filtering it out in the parent component
        onCommentAdded(null, tempComment._id);
      }
    } finally {
      setIsSubmitting(false);
    }

    // Cancel reply mode if applicable
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2 w-full">
      {!isEditing && (
        <Avatar
          src={user?.avatar}
          alt={user?.username}
          className="w-10 h-10 rounded-full border-2 border-gray-600"
        />
      )}
      <div
        className={`relative flex-1 rounded-2xl overflow-hidden ${
          isFocused ? "ring-2 ring-blue-500" : "ring-1 ring-gray-600"
        } transition-all duration-200`}
      >
        {replyingToUser && renderHighlightedInput()}
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isEditing
              ? "Edit your comment..."
              : replyToId
              ? `Reply${replyingToUser ? " to " + replyingToUser : ""}...`
              : "Write a comment..."
          }
          className="w-full bg-[#252830] text-white rounded-2xl px-4 py-3 text-sm focus:outline-none placeholder-gray-400 border-none"
          disabled={isSubmitting}
        />
        {content.trim() && !isSubmitting && (
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 p-1.5 rounded-full bg-[#32364a] hover:bg-[#3b3f56] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        )}
        {isSubmitting && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      {(isEditing || replyToId) && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-300 hover:text-white py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
      )}
    </form>
  );
};

const EmojiReactions = ({ reactions = [], onReact, selectedReaction }) => {
  // Merge existing reactions with defaults
  const mergedReactions = defaultReactions.map((defaultReaction) => {
    const existingReaction = reactions.find(
      (r) => r.name === defaultReaction.name
    );
    return existingReaction ? existingReaction : defaultReaction;
  });

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {mergedReactions.map((reaction) => (
        <motion.button
          key={reaction.name}
          onClick={() => onReact(reaction.name)}
          className={`inline-flex items-center px-2 py-1 rounded-xl text-xs transition-all duration-150 
            ${
              selectedReaction === reaction.name
                ? "bg-indigo-600/25 border border-indigo-500/30"
                : "bg-gray-700/30 hover:bg-gray-600/40 border border-gray-600/30"
            }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 0 && (
            <span className="ml-1 font-medium">{reaction.count}</span>
          )}
        </motion.button>
      ))}
    </div>
  );
};

const Comment = ({ postId, comment, onDelete, depth = 0, parentId = null }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localReplies, setLocalReplies] = useState(comment.replies || []);
  const [localComment, setLocalComment] = useState(comment);
  const [isLiking, setIsLiking] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const { deleteComment, likeComment, optimisticToggleCommentLike } =
    usePostContext();
  const { user } = useAuth();
  const isAuthor = user?._id === localComment.userId?._id;
  const commentRef = useRef(null);
  const likeButtonRef = useRef(null);

  // Define parent and reply levels - limit to 2 levels
  const isParentComment = depth === 0;
  const isReply = depth === 1;

  // Handle case when user data is missing
  const userAvatar =
    localComment.userId?.avatar || "/images/default-avatar.png";
  const userName =
    localComment.userId?.fullname ||
    localComment.userId?.username ||
    "Deleted User";
  const userId = localComment.userId?._id || "unknown";

  // Store this user's info in the mention map
  useEffect(() => {
    if (userName && userId && userId !== "unknown") {
      // Store the full name
      userMentionMap.set(userName, userId);

      // Also store individual parts of the name for more flexible matching
      if (userName.includes(" ")) {
        const nameParts = userName.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentionMap.set(part.trim(), userId);
          }
        });
      }
    }
  }, [userName, userId]);

  // Process comment content to find and format tagged users
  const processContent = (content) => {
    // Sử dụng regex mới chính xác hơn để bắt đúng phần tag
    const tagPattern = /@([\p{L}\p{M}\p{N}_]+(?:\s+[\p{L}\p{M}\p{N}_]+)*)\b/gu;

    // Nếu không có tag, hiển thị nội dung thông thường
    if (!content.includes("@")) {
      return <span className="comment-text">{content}</span>;
    }

    // Tìm tất cả tag trong nội dung
    const mentions = [...content.matchAll(tagPattern)];

    // Không có mention, trả về text thường
    if (!mentions || mentions.length === 0) {
      return <span className="comment-text">{content}</span>;
    }

    // Xây dựng kết quả từ các phần đã tách
    const result = [];
    let lastIndex = 0;

    mentions.forEach((match, idx) => {
      const [fullMatch, taggedName] = match;
      const startIndex = match.index;

      // Thêm phần text trước mention
      if (startIndex > lastIndex) {
        result.push(
          <span key={`text-${idx}`} className="comment-text">
            {content.substring(lastIndex, startIndex)}
          </span>
        );
      }

      // Xử lý tên đã tag
      const mentionedUsername = taggedName.trim();

      // Kiểm tra với userMentionMap để lấy userId
      let mentionedUserId = userMentionMap.get(mentionedUsername);

      // Thử tìm tương đối nếu không tìm thấy chính xác
      if (!mentionedUserId) {
        for (const [name, id] of userMentionMap.entries()) {
          if (
            name.toLowerCase() === mentionedUsername.toLowerCase() ||
            (mentionedUsername.includes(" ") &&
              (name.includes(mentionedUsername) ||
                mentionedUsername.includes(name)))
          ) {
            mentionedUserId = id;
            break;
          }
        }
      }

      // Nếu tìm thấy userId, tạo Link
      if (mentionedUserId) {
        result.push(
          <Link
            key={`mention-${idx}`}
            to={`/profile/${mentionedUserId}`}
            className="user-tag"
          >
            {fullMatch}
          </Link>
        );
      } else {
        // Nếu không tìm thấy, hiển thị như text thường nhưng có style của tag
        result.push(
          <span key={`mention-${idx}`} className="user-tag">
            {fullMatch}
          </span>
        );
      }

      // Cập nhật vị trí kết thúc của phần đã xử lý
      lastIndex = startIndex + fullMatch.length;
    });

    // Thêm phần text còn lại sau mention cuối cùng
    if (lastIndex < content.length) {
      result.push(
        <span key="text-end" className="comment-text">
          {content.substring(lastIndex)}
        </span>
      );
    }

    return <>{result}</>;
  };

  // Update local state when comment prop changes - FORCE update
  useEffect(() => {
    // Ensure we always update the local state with the latest
    if (JSON.stringify(localComment) !== JSON.stringify(comment)) {
      setLocalComment(comment);
      if (comment.replies?.length) {
        setLocalReplies(comment.replies);
      }
    }
  }, [comment]);

  // Add animation to new comments
  useEffect(() => {
    if (comment.isOptimistic && commentRef.current) {
      commentRef.current.classList.add("animate-pulse-once");
      const timer = setTimeout(() => {
        if (commentRef.current) {
          commentRef.current.classList.remove("animate-pulse-once");
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [comment.isOptimistic]);

  // Check if the comment has likes and if the current user has liked it
  useEffect(() => {
    if (user) {
      // Handle case where likes might be undefined or not an array
      const likes = Array.isArray(comment.likes) ? comment.likes : [];
      const isCurrentlyLiked = likes.some((like) => {
        if (typeof like === "string") return like === user._id;
        // Handle object IDs
        return like && like.toString && like.toString() === user._id.toString();
      });

      if (localComment.isLiked !== isCurrentlyLiked) {
        setLocalComment((prev) => ({
          ...prev,
          isLiked: isCurrentlyLiked,
        }));
      }
    }
  }, [user, comment.likes, localComment.isLiked, comment._id]);

  const handleDelete = async () => {
    showDeleteConfirmToast(
      "Are you sure you want to delete this comment?",
      async () => {
        try {
          await deleteComment.mutateAsync({ postId, commentId: comment._id });
          if (onDelete) onDelete(comment._id);
        } catch (error) {
          console.error("Error deleting comment:", error);
        }
      }
    );
  };

  const handleReplyAdded = (newReply, tempIdToRemove = null) => {
    if (tempIdToRemove) {
      // Remove temporary reply on error
      setLocalReplies((prev) =>
        prev.filter((reply) => reply._id !== tempIdToRemove)
      );
      return;
    }

    // Add to userMentionMap when adding a reply
    if (newReply && userName) {
      // Ensure the user being replied to is in the userMentionMap
      userMentionMap.set(userName, userId);

      // Also store individual parts of the name
      if (userName.includes(" ")) {
        const nameParts = userName.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentionMap.set(part.trim(), userId);
          }
        });
      }
    }

    // In Facebook-style, all replies go to the parent comment
    // If this is already a reply (depth === 1), we need to add the reply to the parent
    if (isReply && parentId) {
      // This is a reply to a reply - we'll handle this at the parent level
      // The reply will be tagged with the username of the person being replied to
      if (onDelete) {
        // Pass the reply up to the parent level
        onDelete(null, newReply, userName, userId);
      }
    } else {
      // This is a parent comment or directly handled reply
      // Add new reply to local state
      setLocalReplies((prev) => {
        // Avoid duplicates
        if (prev.some((reply) => reply._id === newReply._id)) {
          return prev;
        }
        return [newReply, ...prev];
      });
    }
  };

  const handleReplyDeleted = (replyId) => {
    setLocalReplies((prev) => prev.filter((reply) => reply._id !== replyId));
  };

  const createRipple = (e) => {
    const button = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    // Position the ripple
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add("comment-ripple");

    // Remove existing ripples
    const ripple = button.querySelector(".comment-ripple");
    if (ripple) {
      ripple.remove();
    }

    // Add new ripple
    button.appendChild(circle);

    // Remove after animation completes
    setTimeout(() => {
      if (circle) circle.remove();
    }, 600);
  };

  const handleLikeClick = async (event) => {
    if (!user || isLiking) return;

    const likeButton = likeButtonRef.current;
    const likeCountElement = likeButton?.querySelector(".comment-like-count");
    const likeIcon = likeButton?.querySelector("svg");

    if (likeIcon) {
      likeIcon.classList.add("like-animation");
      setTimeout(() => {
        likeIcon.classList.remove("like-animation");
      }, 300);
    }

    // Lưu trạng thái hiện tại để khôi phục nếu có lỗi
    const wasLiked = localComment.isLiked;
    const currentLikesCount = localComment.likesCount;

    setIsLiking(true);

    // Thực hiện optimistic update UI
    setLocalComment((prev) => ({
      ...prev,
      isLiked: !prev.isLiked,
      likesCount: prev.isLiked
        ? Math.max((prev.likesCount || 1) - 1, 0)
        : (prev.likesCount || 0) + 1,
    }));

    // Hiệu ứng ripple
    createRipple(event);

    try {
      // Xử lý API
      await likeComment.mutateAsync({
        postId,
        commentId: comment._id,
      });

      // Cập nhật trong context
      optimisticToggleCommentLike({
        postId,
        commentId: comment._id,
        userId: user._id,
      });
    } catch (likeError) {
      console.error("Error toggling like for comment:", likeError);

      // Khôi phục trạng thái nếu có lỗi
      setLocalComment((prev) => ({
        ...prev,
        isLiked: wasLiked,
        likesCount: currentLikesCount,
      }));

      // Khôi phục trạng thái UI trực tiếp
      if (wasLiked) {
        likeButton.classList.add("text-blue-500");
        const heartIcon = likeButton.querySelector("svg");
        if (heartIcon) {
          heartIcon.classList.add("fill-current");
        }
      } else {
        likeButton.classList.remove("text-blue-500");
        const heartIcon = likeButton.querySelector("svg");
        if (heartIcon) {
          heartIcon.classList.remove("fill-current");
        }
      }

      // Khôi phục số lượng like
      if (likeCountElement) {
        likeCountElement.textContent = `(${currentLikesCount})`;
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleEditComplete = (newContent) => {
    setIsEditing(false);
    setLocalComment((prev) => ({
      ...prev,
      content: newContent,
    }));
  };

  const handleReaction = (reactionName) => {
    // Toggle the reaction
    if (selectedReaction === reactionName) {
      setSelectedReaction(null);
    } else {
      setSelectedReaction(reactionName);
    }

    // Here you would add API call to save the reaction
    // For now let's just update UI

    // Hide reactions panel after selection
    setShowReactions(false);
  };

  const renderReplies = () => {
    if (!localReplies || localReplies.length === 0) return null;

    return (
      <div className="mt-2 ml-5 pl-6 relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-500/30"></div>
        <AnimatePresence>
          {localReplies.map((reply) => (
            <motion.div
              key={reply._id}
              className="relative"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="absolute left-[-24px] top-3 w-6 h-0.5 bg-gray-500/30"></div>
              <Comment
                postId={postId}
                comment={reply}
                onDelete={handleReplyDeleted}
                depth={1}
                parentId={comment._id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  const formattedDate = (date) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "";
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-lg">
        <CommentForm
          postId={postId}
          replyToId={comment._id}
          initialValue={localComment.content}
          isEditing={true}
          onEditComplete={handleEditComplete}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <motion.div
      className={`flex flex-col ${isReply ? "mt-2" : "mt-3"}`}
      ref={commentRef}
      initial={comment.isOptimistic ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`flex items-start gap-2 ${isReply ? "opacity-95" : ""}`}>
        <Link to={`/profile/${userId}`}>
          <img
            src={userAvatar}
            alt={`${userName}'s profile`}
            className={`${
              isParentComment ? "w-9 h-9" : "w-7 h-7"
            } rounded-full object-cover border border-gray-600`}
          />
        </Link>
        <div className="flex-1">
          <div
            className={`py-2 px-3 rounded-xl ${
              isParentComment
                ? "bg-gray-100 dark:bg-[#2a2d38]"
                : "bg-gray-50 dark:bg-[#22252e]"
            }`}
          >
            <div className="flex items-center gap-1">
              <Link
                to={`/profile/${userId}`}
                className="font-semibold text-sm hover:underline"
              >
                {userName}
              </Link>
              {isAuthor && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300 px-1 rounded">
                  Admin
                </span>
              )}
            </div>
            <p className="text-sm break-words dark:text-white text-gray-800">
              {processContent(localComment.content)}
            </p>
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <div className="relative">
              <span
                className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setShowReactions(!showReactions)}
              >
                React
              </span>

              <AnimatePresence>
                {showReactions && (
                  <motion.div
                    className="absolute left-0 bottom-full mb-2 bg-[#2a2d38] p-2 rounded-lg shadow-lg border border-[#3d4157] z-10"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EmojiReactions
                      reactions={localComment.reactions}
                      onReact={handleReaction}
                      selectedReaction={selectedReaction}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.span
              className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={handleLikeClick}
              whileTap={{ scale: 0.9 }}
            >
              {localComment.isLiked ? "Liked" : "Like"}{" "}
              {localComment.likesCount > 0 && `(${localComment.likesCount})`}
            </motion.span>

            <span
              className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              Reply
            </span>

            <span>{formattedDate(localComment.createdAt)}</span>

            {(isAuthor || isAuthor) && (
              <span
                className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                onClick={handleDelete}
              >
                Delete
              </span>
            )}
          </div>

          {selectedReaction && (
            <motion.div
              className="mt-1.5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                <span className="mr-1.5">
                  {defaultReactions.find((r) => r.name === selectedReaction)
                    ?.emoji || "👍"}
                </span>
                <span>
                  You reacted with {selectedReaction.replace("_", " ")}
                </span>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {showReplyForm && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CommentForm
                  postId={postId}
                  replyToId={isReply ? parentId : comment._id}
                  onCommentAdded={handleReplyAdded}
                  onCancel={() => setShowReplyForm(false)}
                  replyingToUser={userName}
                  replyingToUserId={userId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {renderReplies()}
    </motion.div>
  );
};

const PostComments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const [displayLimit, setDisplayLimit] = useState(3);
  const [showingAll, setShowingAll] = useState(false);

  // Use React Query for fetching comments
  const {
    data: commentsData,
    isError: isCommentsError,
    error: commentsError,
  } = usePostComments(postId);

  // Set comments from the query data
  useEffect(() => {
    if (commentsData && commentsData.data) {
      setComments(commentsData.data.comments || []);
      setLoading(false);
      const totalPages = commentsData.data.totalPages || 1;
      setHasMore(page < totalPages);
    }
  }, [commentsData, page]);

  // Set error from the query
  useEffect(() => {
    if (isCommentsError && commentsError) {
      console.error("Error fetching comments:", commentsError);
      setErrorMessage(commentsError.message || "Failed to fetch comments");
      setLoading(false);
    }
  }, [isCommentsError, commentsError]);

  // Subscribe to socket events for real-time updates
  useEffect(() => {
    const unsubscribe = socketService.subscribeToComments(postId, {
      onCommentAdded: (newComment) => {
        handleCommentAdded(newComment);
      },
      onCommentDeleted: (commentId) => {
        handleCommentDeleted(commentId);
      },
      onCommentUpdated: (updatedComment) => {
        handleCommentUpdated(updatedComment);
      },
      onCommentLiked: (likedComment) => {
        handleCommentLiked(likedComment);
      },
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [postId]);

  // Handle when a comment is liked
  const handleCommentLiked = (likedComment) => {
    setComments((prev) => {
      return prev.map((comment) => {
        if (comment._id === likedComment._id) {
          // Top-level comment that was liked
          return likedComment;
        } else if (comment.replies && comment.replies.length > 0) {
          // Check if the like was for a reply
          const updatedReplies = comment.replies.map((reply) =>
            reply._id === likedComment._id ? likedComment : reply
          );

          return {
            ...comment,
            replies: updatedReplies,
          };
        }
        return comment;
      });
    });
  };

  const handleCommentAdded = (
    newComment,
    tempIdToRemove = null,
    replyToUsername = null,
    replyToUserId = null
  ) => {
    if (tempIdToRemove) {
      // Handle error case - remove the temporary comment
      setComments((prev) =>
        prev.filter((comment) => comment._id !== tempIdToRemove)
      );
      return;
    }

    // Store username-to-userId mapping if available
    if (replyToUsername && replyToUserId) {
      // Store the full name
      userMentionMap.set(replyToUsername, replyToUserId);

      // Also store individual parts of the name for more flexible matching
      if (replyToUsername.includes(" ")) {
        const nameParts = replyToUsername.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentionMap.set(part.trim(), replyToUserId);
          }
        });
      }
    }

    // Make sure the tag is properly added at the beginning with a space after
    if (
      replyToUsername &&
      !newComment.content.includes(`@${replyToUsername} `)
    ) {
      // Check if content already starts with @
      if (newComment.content.trim().startsWith("@")) {
        // Content already has a tag, don't modify
      } else {
        // Add tag properly with space
        newComment = {
          ...newComment,
          content: `@${replyToUsername} ${newComment.content}`,
        };
      }
    }

    // Also map the newly added comment's user
    if (newComment.userId) {
      const username = newComment.userId.fullname || newComment.userId.username;
      const userId = newComment.userId._id;
      if (username && userId) {
        // Store the full name
        userMentionMap.set(username, userId);

        // Also store individual name parts
        if (username.includes(" ")) {
          const nameParts = username.split(" ");
          nameParts.forEach((part) => {
            if (part.trim().length > 0) {
              userMentionMap.set(part.trim(), userId);
            }
          });
        }
      }
    }

    if (!newComment.parentId) {
      // Top-level comment - add to the beginning of the list
      setComments((prev) => {
        // Avoid adding duplicate comments
        if (prev.some((c) => c._id === newComment._id)) {
          return prev;
        }
        return [newComment, ...prev];
      });
    } else {
      // It's a reply - add it to the parent comment
      setComments((prev) => {
        return prev.map((comment) => {
          if (comment._id === newComment.parentId) {
            // This is the parent comment - add the reply
            const replies = comment.replies || [];
            // Avoid duplicate replies
            if (replies.some((r) => r._id === newComment._id)) {
              return comment;
            }
            return {
              ...comment,
              replies: [newComment, ...replies],
            };
          }
          return comment;
        });
      });
    }
  };

  const handleCommentDeleted = (
    commentId,
    newReply = null,
    replyToUsername = null,
    replyToUserId = null
  ) => {
    if (newReply) {
      // This is handling a reply to a reply case
      handleCommentAdded(newReply, null, replyToUsername, replyToUserId);
      return;
    }

    // Otherwise, handle the standard delete case
    if (!commentId) return;

    setComments((prev) => prev.filter((c) => c._id !== commentId));
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments((prev) => {
      return prev.map((comment) => {
        if (comment._id === updatedComment._id) {
          return updatedComment;
        } else if (comment.replies) {
          // Check replies
          const updatedReplies = comment.replies.map((r) => {
            if (r._id === updatedComment._id) {
              return updatedComment;
            }
            return r;
          });
          return { ...comment, replies: updatedReplies };
        }
        return comment;
      });
    });
  };

  const loadMoreComments = async () => {
    if (!hasMore || loading) return;

    setPage((prev) => prev + 1);
    setLoading(true);

    try {
      const response = await fetch(
        `api/posts/${postId}/comments?page=${page + 1}&limit=${limit}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        const newComments = data.data.comments;
        setComments((prev) => [...prev, ...newComments]);
        setHasMore(page + 1 < data.data.totalPages);
      } else {
        console.error("Failed to load more comments:", data.error);
      }
    } catch (fetchError) {
      console.error("Error loading more comments:", fetchError);
    } finally {
      setLoading(false);
    }
  };

  // Show more locally (without API call)
  const showMoreComments = () => {
    setDisplayLimit(comments.length);
    setShowingAll(true);
  };

  // Get displayed comments based on limit
  const displayedComments = comments.slice(0, displayLimit);
  const hasMoreToShow = !showingAll && comments.length > displayLimit;

  return (
    <div className="space-y-6">
      {/* Comment input form */}
      <motion.div
        className="bg-[#242733] p-4 rounded-xl shadow-sm hover:shadow-md border border-[#2e3245]"
        whileHover={{
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-2">
          <span className="inline-block w-1 h-5 bg-blue-500 rounded-full"></span>
          Comments
        </h3>
        <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />
      </motion.div>

      {/* Error message */}
      {errorMessage && (
        <motion.div
          className="p-4 bg-red-900/20 text-red-400 rounded-lg border border-red-800/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {errorMessage}
          </div>
        </motion.div>
      )}

      {/* Comments list */}
      <div className="space-y-2 mt-2">
        {comments.length > 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {displayedComments.map((comment) => (
                <Comment
                  key={comment._id}
                  postId={postId}
                  comment={comment}
                  onDelete={(id) => handleCommentDeleted(id)}
                />
              ))}

              {/* Show more button for local comments */}
              {hasMoreToShow && (
                <motion.div
                  className="flex justify-center my-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <motion.button
                    onClick={showMoreComments}
                    className="text-blue-400 hover:text-blue-300 bg-[#242733] py-2 px-4 rounded-full hover:bg-[#2d3142] transition-colors border border-[#3d4157] flex items-center gap-2"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    Show more comments ({comments.length - displayLimit} more)
                  </motion.button>
                </motion.div>
              )}

              {/* Load more button from API (only shown if all local comments are displayed) */}
              {!hasMoreToShow && hasMore && (
                <motion.div
                  className="flex justify-center mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  <motion.button
                    onClick={loadMoreComments}
                    disabled={loading}
                    className="py-2 px-4 text-blue-400 hover:text-blue-300 bg-[#242733] rounded-full hover:bg-[#2d3142] transition-colors border border-[#3d4157] shadow-sm"
                    whileHover={{
                      scale: 1.03,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-t-blue-400 border-blue-300/30 rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      "Load more comments"
                    )}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : loading ? (
          <motion.div
            className="flex flex-col items-center justify-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-10 h-10 border-4 border-t-blue-400 border-blue-200/10 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-300">Loading comments...</p>
          </motion.div>
        ) : (
          <motion.div
            className="bg-[#242733] rounded-xl p-6 text-center border border-[#2e3245]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-gray-300 mb-2 text-6xl">💬</div>
            <p className="text-gray-300 text-lg">No comments yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Be the first to share your thoughts!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PostComments;
