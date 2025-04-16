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

// Map to store user mentions for tagging
const userMentionMap = new Map();

// Thêm CSS animation cho hiệu ứng tim đập
const styles = document.createElement("style");
styles.innerHTML = `
@keyframes heartBeat {
  0% { transform: scale(1); }
  15% { transform: scale(1.3); }
  30% { transform: scale(1); }
  45% { transform: scale(1.2); }
  60% { transform: scale(1); }
}

.heart-beat-animation {
  animation: heartBeat 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  will-change: transform;
}

/* Comment Thread Lines Styling */
.comment-thread {
  padding-bottom: 12px;
}

.comment-root {
  position: relative;
}

.comment-reply {
  position: relative;
}

/* Apply smoothing to the thread lines */
.comment-thread [class*="bg-[#4e4f50]"] {
  opacity: 0.8;
}

/* Comment connector lines */
.ml-8 .bg-[#4e4f50] {
  opacity: 0.8;
}

.like-button {
  position: relative;
  overflow: hidden;
  transform: translateZ(0);
}

.like-button::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 100, 100, 0.6);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%, -50%);
  transform-origin: 50% 50%;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  100% {
    transform: scale(100, 100);
    opacity: 0;
  }
}

.like-button:active::after {
  animation: ripple 0.4s ease-out;
  will-change: transform, opacity;
}

.ripple {
  position: absolute;
  background: rgba(255, 100, 100, 0.25);
  border-radius: 50%;
  transform: scale(0);
  animation: ripple-effect 0.6s linear;
  will-change: transform, opacity;
  pointer-events: none;
}

@keyframes ripple-effect {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.comment-like-appear {
  opacity: 0;
  transform: scale(0);
}

.comment-like-appear-active {
  opacity: 1;
  transform: scale(1);
  transition: opacity 300ms, transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.heart-icon {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), 
              fill 0.2s ease-in-out, 
              color 0.2s ease-in-out;
  will-change: transform;
}

.heart-icon.liked {
  transform: scale(1.1);
  color: rgb(239, 68, 68);
}

.heart-count {
  transition: opacity 0.3s, transform 0.3s;
  will-change: transform, opacity;
}

.heart-count.appear {
  animation: countAppear 0.3s forwards;
}

@keyframes countAppear {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
document.head.appendChild(styles);

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

  // Lưu trữ tempCommentId để có thể sử dụng sau khi server trả về
  const tempCommentIdRef = useRef(null);
  const pendingLikeRef = useRef(false);

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
    const tempId = `temp-${Date.now()}`;
    tempCommentIdRef.current = tempId;

    const tempComment = {
      _id: tempId,
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
      const response = await createComment.mutateAsync({
        postId,
        content: content.trim(),
        parentId: replyToId,
      });

      // Xử lý like nếu có pending
      if (
        pendingLikeRef.current &&
        response &&
        response.data &&
        response.data.comment
      ) {
        pendingLikeRef.current = false;
        // Delay một chút để đảm bảo UI đã được cập nhật
        setTimeout(() => {
          const realCommentId = response.data.comment._id;
          console.log(
            "Processing pending like for new comment:",
            realCommentId
          );

          // Tìm nút like của comment này và trigger click
          const likeButton = document.querySelector(
            `[data-comment-id="${realCommentId}"] .like-button`
          );
          if (likeButton) {
            likeButton.click();
          }
        }, 500);
      }
    } catch (error) {
      // You could handle the error by removing the optimistic comment here
      if (onCommentAdded && error) {
        // Remove the temp comment by filtering it out in the parent component
        onCommentAdded(null, tempComment._id);
      }
    } finally {
      setIsSubmitting(false);
      tempCommentIdRef.current = null;
    }

    // Cancel reply mode if applicable
    if (onCancel) onCancel();
  };

  return (
    <div className="comment-form-wrapper">
      <form
        onSubmit={handleSubmit}
        className="flex items-start gap-2 w-full mt-2"
        ref={(formElement) => {
          if (formElement) {
            // Gắn pendingLikeRef vào element DOM để có thể truy cập từ bên ngoài
            formElement.__pendingLikeRef = pendingLikeRef;
          }
        }}
      >
        {!isEditing && (
          <Avatar
            src={user?.avatar}
            alt={user?.username}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        <div
          className={`relative flex-1 rounded-full overflow-hidden ${
            isFocused ? "ring-1 ring-blue-500" : ""
          } transition-all duration-200 bg-[#3a3b3c]`}
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
            className="w-full bg-transparent text-[#e4e6eb] rounded-full px-4 py-2 text-[15px] focus:outline-none placeholder-[#b0b3b8] border-none"
            disabled={isSubmitting}
          />
          {content.trim() && !isSubmitting && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 p-1.5 rounded-full hover:bg-[#4e4f50] transition-colors"
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
            className="text-[#b0b3b8] hover:text-[#e4e6eb] py-2 px-3 rounded-lg hover:bg-[#4e4f50] transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
};

const Comment = ({ postId, comment, onDelete, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState(comment.replies || []);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [viewAllReplies, setViewAllReplies] = useState(false);
  const menuRef = useRef(null);
  const commentRef = useRef(null);
  const heartIconRef = useRef(null);
  const [localComment, setLocalComment] = useState(comment);
  const [lastLikeTime, setLastLikeTime] = useState(0);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  // Refs để lưu trữ trạng thái like hiện tại trong quá trình animation
  const likeStateRef = useRef({
    isProcessing: false,
    lastRequestTime: 0,
    currentState: comment.isLiked || false,
    likesCount: comment.likesCount || 0,
  });

  const { user } = useAuth();
  const { reactToComment, deleteComment } = usePostContext();

  const isOwner = user && comment.userId && user._id === comment.userId._id;
  const hasReplies = replies && replies.length > 0;

  // Add/modify this useEffect to properly handle comment state updates
  useEffect(() => {
    // When there are changes from the original comment prop that aren't during a like operation
    // This is especially important with nested comments/replies
    if (comment && comment !== localComment) {
      // If currently processing a like operation, only update fields not related to like
      if (likeStateRef.current.isProcessing) {
        console.log(
          "Comment data changed during like processing:",
          comment._id
        );
        setLocalComment((prev) => ({
          ...comment,
          // Keep local like state during processing
          isLiked: prev.isLiked,
          likesCount: prev.likesCount,
        }));
      } else {
        // No like processing, safe to update fully from props
        console.log("Syncing comment data:", comment._id, comment.isLiked);
        setLocalComment(comment);

        // Update reference state with new values
        likeStateRef.current.currentState = comment.isLiked || false;
        likeStateRef.current.likesCount = comment.likesCount || 0;
      }
    }
  }, [comment]);

  // Thêm effect để xóa active-interaction class sau khi animation kết thúc
  useEffect(() => {
    if (!isLikeAnimating) {
      // Xóa class active-interaction từ nút like
      const likeButton = document.querySelector(
        `[data-comment-id="${localComment._id}"] .like-button`
      );
      if (likeButton) {
        likeButton.classList.remove("active-interaction");
      }
    }
  }, [isLikeAnimating, localComment._id]);

  // Format timestamps to relative time (e.g., "2 hours ago")
  const formattedTime = formatDistanceToNow(new Date(localComment.createdAt), {
    addSuffix: true,
  });

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

  // Animate heart when liked - optimized
  const heartBeat = (target) => {
    if (!target) return;

    // Prefetch transforms to prevent layout thrashing
    window.requestAnimationFrame(() => {
      target.classList.add("heart-beat-animation");

      setTimeout(() => {
        window.requestAnimationFrame(() => {
          target.classList.remove("heart-beat-animation");
        });
      }, 300);
    });
  };

  // Optimized ripple effect using requestAnimationFrame
  const createRipple = (event) => {
    const button = event.currentTarget;

    // Use requestAnimationFrame to optimize animations
    window.requestAnimationFrame(() => {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

      // Remove any existing ripple first
      const oldRipple = button.querySelector(".ripple");
      if (oldRipple) {
        oldRipple.remove();
      }

      button.appendChild(ripple);

      // Clean up after animation
      setTimeout(() => {
        if (ripple && ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    });
  };

  // Handle deleting a comment
  const handleDelete = async () => {
    if (showDeleteConfirmToast()) {
      try {
        await deleteComment.mutateAsync({
          postId,
          commentId: localComment._id,
        });

        onDelete(localComment._id);
      } catch (error) {
        console.error("Error deleting comment:", error);
      }
    }
    setShowMenu(false);
  };

  // Handle adding a reply to this comment
  const handleReplyAdded = (newReply, tempIdToRemove = null) => {
    if (tempIdToRemove) {
      setReplies((prevReplies) =>
        prevReplies.filter((reply) => reply._id !== tempIdToRemove)
      );
      return;
    }

    if (!newReply) return;

    setReplies((prevReplies) => [newReply, ...prevReplies]);
  };

  // Handle reply deletion
  const handleReplyDeleted = (replyId) => {
    setReplies((prevReplies) =>
      prevReplies.filter((reply) => reply._id !== replyId)
    );
  };

  // Optimized like/unlike with immediate UI feedback
  const handleLike = async (e) => {
    // Prevent double-clicks with improved debouncing
    const now = Date.now();
    if (now - lastLikeTime < 300) return;
    setLastLikeTime(now);

    try {
      e.preventDefault();

      // Check if this is a temp comment and store pending like
      if (localComment._id && localComment._id.startsWith("temp-")) {
        console.log("Cannot like temporary comment:", localComment._id);

        // Show tooltip
        const target = e.currentTarget;
        const tooltip = document.createElement("div");
        tooltip.className =
          "absolute bottom-full left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1";
        tooltip.textContent = "Cannot like temporary comment";
        tooltip.style.zIndex = "10";
        target.appendChild(tooltip);

        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 1500);

        return;
      }

      // Check for valid commentId (must have a valid ID at this point)
      if (!localComment._id) {
        console.log("Cannot like comment without valid ID");
        // Show tooltip
        const target = e.currentTarget;
        const tooltip = document.createElement("div");
        tooltip.className =
          "absolute bottom-full left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded mb-1";
        tooltip.textContent = "Cannot like invalid comment";
        tooltip.style.zIndex = "10";
        target.appendChild(tooltip);

        setTimeout(() => {
          if (tooltip && tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
          }
        }, 1500);

        return;
      }

      // Save current state for optimistic update and error recovery
      const wasLiked = localComment.isLiked;
      const previousCount = localComment.likesCount || 0;
      const heartIcon = heartIconRef.current;

      // Mark as processing to prevent state updates from props during this process
      likeStateRef.current.isProcessing = true;
      likeStateRef.current.lastRequestTime = now;
      likeStateRef.current.currentState = !wasLiked;
      likeStateRef.current.likesCount = wasLiked
        ? Math.max(0, previousCount - 1)
        : previousCount + 1;

      // Apply visual effects immediately
      createRipple(e);

      if (heartIcon) {
        if (!wasLiked) {
          heartIcon.classList.add("liked");
        } else {
          heartIcon.classList.remove("liked");
        }
        heartBeat(heartIcon);
      }

      // Update local state immediately (optimistic update)
      setIsLikeAnimating(true);
      setLocalComment((prev) => {
        const newLikeState = !prev.isLiked;
        const newLikeCount = newLikeState
          ? Math.max(0, (prev.likesCount || 0) + 1)
          : Math.max(0, (prev.likesCount || 1) - 1);

        return {
          ...prev,
          isLiked: newLikeState,
          likesCount: newLikeCount,
        };
      });

      // Send API request to server
      if (reactToComment && reactToComment.mutateAsync) {
        console.log(
          "Sending like/unlike request for comment:",
          localComment._id,
          "in post:",
          postId,
          "isNested:",
          !!localComment.parentId
        );

        try {
          const response = await reactToComment.mutateAsync({
            postId,
            commentId: localComment._id,
            isNestedComment: !!localComment.parentId,
          });

          // Handle successful response
          if (response && response.data) {
            console.log("Like/unlike successful:", response.data);

            // Update state from server if different from local
            const serverState = response.data.isLiked;
            const serverCount = response.data.likesCount || 0;

            // Only update if server response differs from our optimistic update
            if (
              serverState !== likeStateRef.current.currentState ||
              serverCount !== likeStateRef.current.likesCount
            ) {
              console.log(
                "Updating state based on server response:",
                serverState,
                serverCount
              );

              // Update local state with server values
              setLocalComment((prev) => ({
                ...prev,
                isLiked: serverState,
                likesCount: serverCount,
              }));

              // Update ref with server values
              likeStateRef.current.currentState = serverState;
              likeStateRef.current.likesCount = serverCount;
            }
          }
        } catch (apiError) {
          console.error("API Error during like operation:", apiError);

          // Show error tooltip
          const target = e.currentTarget;
          const tooltip = document.createElement("div");
          tooltip.className =
            "absolute bottom-full left-0 bg-red-500 text-white text-xs px-2 py-1 rounded mb-1";
          tooltip.textContent = "Error liking comment";
          tooltip.style.zIndex = "10";
          target.appendChild(tooltip);

          setTimeout(() => {
            if (tooltip && tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
          }, 1500);

          // Restore original state on error
          setLocalComment((prev) => ({
            ...prev,
            isLiked: wasLiked,
            likesCount: previousCount,
          }));

          // Update ref with original values
          likeStateRef.current.currentState = wasLiked;
          likeStateRef.current.likesCount = previousCount;

          if (heartIcon) {
            if (wasLiked) {
              heartIcon.classList.add("liked");
            } else {
              heartIcon.classList.remove("liked");
            }
          }
        } finally {
          // Ensure processing state is reset after sufficient time
          setTimeout(() => {
            likeStateRef.current.isProcessing = false;
            setIsLikeAnimating(false);
          }, 800);
        }
      }
    } catch (error) {
      console.error("Error in like handler:", error);
      likeStateRef.current.isProcessing = false;
      setIsLikeAnimating(false);
    }
  };

  // Handle editing completion
  const handleEditComplete = () => {
    setIsEditing(false);
  };

  // Parse comment content to detect @mentions and make them clickable links
  const parseContent = (content) => {
    if (!content) return "";

    // Regex to match @mentions with international characters and Vietnamese
    const mentionRegex = /@([\p{L}\p{M}\p{N}_]+(?:\s+[\p{L}\p{M}\p{N}_]+)*)/gu;

    // If no mentions in the content, return it as is
    if (!mentionRegex.test(content)) {
      return <span>{content}</span>;
    }

    // Reset regex
    mentionRegex.lastIndex = 0;

    // Split content into parts (text and mentions)
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add the text before the mention
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Get the full mentioned username (without the @ symbol)
      const fullMentionedName = match[1].trim();

      // Try to find the userId in the mention map (use the full name for lookup)
      let userId = userMentionMap.get(fullMentionedName);
      let username = null;

      // If not found directly, try to find a partial match
      if (!userId) {
        // Try partial match in userMentionMap
        for (const [name, id] of userMentionMap.entries()) {
          if (
            name.toLowerCase().includes(fullMentionedName.toLowerCase()) ||
            fullMentionedName.toLowerCase().includes(name.toLowerCase())
          ) {
            userId = id;
            break;
          }
        }

        // Fallback: Try to see if this is a mention of the current comment's author
        if (!userId && comment && comment.userId) {
          const authorName = comment.userId.fullname || comment.userId.username;
          if (
            authorName
              .toLowerCase()
              .includes(fullMentionedName.toLowerCase()) ||
            fullMentionedName.toLowerCase().includes(authorName.toLowerCase())
          ) {
            userId = comment.userId._id;
            username = comment.userId.username;
          }
        }

        // Ultimate fallback: If we still don't have a userId but have a mention,
        // we'll use the mention as the username for the URL path
        if (!userId && !username) {
          username = fullMentionedName.replace(/\s+/g, "").toLowerCase();
        }
      }

      // Display @ and first name with blue color, rest of name with normal color
      const profilePath = userId
        ? `/profile/${userId}`
        : `/profile/${username}`;

      parts.push(
        <Link key={`mention-${match.index}`} to={profilePath}>
          <span className="text-blue-500 font-semibold">
            @{fullMentionedName}
          </span>
        </Link>
      );

      // Update lastIndex
      lastIndex = match.index + match[0].length;
    }

    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>{content.substring(lastIndex)}</span>
      );
    }

    return <>{parts}</>;
  };

  // Render comment replies
  const renderReplies = () => {
    if (!hasReplies) return null;

    const visibleReplies = viewAllReplies ? replies : replies.slice(0, 2);

    return (
      <div className="ml-8 mt-1 relative">
        {/* Vertical line connecting all replies */}
        <div className="absolute left-0 top-4 bottom-0 w-[1.5px] bg-[#4e4f50]"></div>

        <div className="pl-3">
          {visibleReplies.map((reply, index) => (
            <div key={reply._id} className="relative pt-1">
              {/* Horizontal connector line from vertical line to each reply */}
              <div className="absolute left-[-3px] top-5 w-[3px] h-[1.5px] bg-[#4e4f50]"></div>

              {/* Last reply special styling */}
              {index === visibleReplies.length - 1 &&
                !viewAllReplies &&
                replies.length <= 2 && (
                  <div className="absolute left-0 top-5 bottom-0 w-[1.5px] bg-transparent"></div>
                )}

              <Comment
                postId={postId}
                comment={reply}
                onDelete={handleReplyDeleted}
                depth={depth + 1}
              />
            </div>
          ))}

          {!viewAllReplies && replies.length > 2 && (
            <div className="relative">
              {/* Horizontal connector for "View more" button */}
              <div className="absolute left-[-3px] top-3 w-[3px] h-[1.5px] bg-[#4e4f50]"></div>
              <button
                onClick={() => setViewAllReplies(true)}
                className="text-blue-400 hover:text-blue-300 text-xs mt-1 ml-3"
              >
                View {replies.length - 2} more{" "}
                {replies.length - 2 === 1 ? "reply" : "replies"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add a useEffect to store user information in the userMentionMap in the Comment component
  // Store this user's info in the mention map
  useEffect(() => {
    if (comment.userId && comment.userId._id) {
      const userName = comment.userId.fullname || comment.userId.username;
      const userId = comment.userId._id;

      // Store the full name
      userMentionMap.set(userName, userId);

      // Also store individual name parts for better matching
      if (userName.includes(" ")) {
        const nameParts = userName.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentionMap.set(part.trim(), userId);
          }
        });
      }
    }
  }, [comment.userId]);

  // Don't render if comment is deleted or missing userId
  if (!comment || !comment.userId) return null;

  return (
    <motion.div
      ref={commentRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`mb-2 text-sm ${depth > 0 ? "comment-reply" : "comment-root"}`}
      data-comment-id={localComment._id}
    >
      <div className="flex items-start gap-2">
        <Link to={`/profile/${comment.userId.username}`}>
          <Avatar
            src={comment.userId.avatar}
            alt={comment.userId.username}
            className="w-8 h-8 rounded-full"
          />
        </Link>

        <div className="flex-1">
          <div className="flex flex-col">
            <div className="bg-[#303030] rounded-2xl px-3 py-2">
              <div className="flex flex-col">
                <Link
                  to={`/profile/${comment.userId.username}`}
                  className="font-medium text-white hover:underline"
                >
                  {comment.userId.fullname || comment.userId.username}
                </Link>

                {isEditing ? (
                  <CommentForm
                    postId={postId}
                    replyToId={comment._id}
                    onCancel={() => setIsEditing(false)}
                    initialValue={comment.content}
                    isEditing={true}
                    onEditComplete={handleEditComplete}
                  />
                ) : (
                  <div className="text-[#e4e6eb] break-words whitespace-pre-wrap text-[15px]">
                    {parseContent(comment.content)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-1 pl-2 text-xs">
              <button
                className={`font-medium flex items-center gap-1 like-button ${
                  isLikeAnimating ? "active-interaction" : ""
                }`}
                onClick={handleLike}
                aria-label={localComment.isLiked ? "Unlike" : "Like"}
                data-comment-id={localComment._id}
              >
                <svg
                  ref={heartIconRef}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={localComment.isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  className={`w-4 h-4 mr-0.5 heart-icon ${
                    localComment.isLiked ? "liked" : ""
                  }`}
                  strokeWidth={localComment.isLiked ? "0" : "2"}
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                <span
                  className={`text-[13px] ${
                    localComment.isLiked
                      ? "text-red-500 font-medium"
                      : "text-[#b0b3b8]"
                  }`}
                >
                  Like
                </span>
              </button>

              <button
                className="font-medium text-[#b0b3b8] hover:text-[#e4e6eb] flex items-center gap-1"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 mr-0.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                  />
                </svg>
                <span className="text-[13px]">Reply</span>
              </button>

              <span className="text-[#b0b3b8] flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-3 h-3 mr-0.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-[12px]">{formattedTime}</span>
              </span>

              {isOwner && (
                <div className="relative ml-auto">
                  <button
                    className="text-[#b0b3b8] hover:text-[#e4e6eb]"
                    onClick={() => setShowMenu(!showMenu)}
                  >
                    •••
                  </button>

                  {showMenu && (
                    <motion.div
                      ref={menuRef}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 top-full mt-1 bg-[#242526] shadow-lg rounded-md py-1 z-10 min-w-[120px] border border-gray-700"
                    >
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white transition-colors"
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400 transition-colors"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Hiển thị số like */}
            {localComment.likesCount > 0 && (
              <div className="flex items-center text-xs text-[#b0b3b8] mt-1 pl-2">
                <span className="inline-flex items-center bg-[#3a3b3c] px-2 py-0.5 rounded-full heart-count">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3 h-3 text-red-500 mr-1"
                  >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                  <span>{localComment.likesCount}</span>
                </span>
              </div>
            )}
          </div>

          {showReplyForm && (
            <div className="relative mt-2">
              {/* Connector line for reply form */}
              <div className="absolute left-[-28px] top-0 h-full w-[1.5px] bg-[#4e4f50]"></div>
              <div className="absolute left-[-28px] top-4 w-[3px] h-[1.5px] bg-[#4e4f50]"></div>
              <CommentForm
                postId={postId}
                replyToId={comment._id}
                onCommentAdded={handleReplyAdded}
                onCancel={() => setShowReplyForm(false)}
                replyingToUser={
                  comment.userId.fullname || comment.userId.username
                }
                replyingToUserId={comment.userId._id}
              />
            </div>
          )}

          {renderReplies()}
        </div>
      </div>
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
      onCommentLiked: (likedComment, extraData = {}) => {
        handleCommentLiked(likedComment, extraData);
      },
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [postId]);

  // Handle when a comment is liked
  const handleCommentLiked = (likedComment, extraData = {}) => {
    // Skip processing if likedComment is invalid
    if (!likedComment || !likedComment._id) {
      console.warn("[Socket] Received invalid comment like data");
      return;
    }

    // Extract additional data from socket event
    const isNestedComment = extraData.isNestedComment || false;
    const parentId = extraData.parentId || null;

    console.log(
      "[Socket] Received like update for comment:",
      likedComment._id,
      "isLiked:",
      likedComment.isLiked,
      "isNestedComment:",
      isNestedComment,
      "parentId:",
      parentId
    );

    // Check if the user is currently interacting with this comment
    const isUserInteracting = document.querySelector(
      `[data-comment-id="${likedComment._id}"] .like-button.active-interaction`
    );

    if (isUserInteracting) {
      console.log(
        "[Socket] Ignoring update - user is actively interacting with comment:",
        likedComment._id
      );
      return; // Skip socket updates during user interaction
    }

    // Define a function that safely updates comments without causing infinite loops
    const safeUpdateComments = (prevComments) => {
      // Create a new copy of comments to avoid state mutation
      const updatedComments = JSON.parse(JSON.stringify(prevComments));

      // Flag to track if we found and updated the comment
      let found = false;

      // Helper function to update comments recursively
      const updateCommentRecursively = (comments) => {
        if (!Array.isArray(comments)) return comments;

        return comments.map((comment) => {
          // If this is the comment being liked
          if (comment._id === likedComment._id) {
            found = true;
            return {
              ...comment,
              isLiked: likedComment.isLiked,
              likesCount: likedComment.likesCount || 0,
              // Preserve other properties
              replies: comment.replies || [],
            };
          }

          // If this comment is the parent of a nested comment being liked
          if (isNestedComment && parentId && comment._id === parentId) {
            // Recursively update replies
            return {
              ...comment,
              replies: updateCommentRecursively(comment.replies || []),
            };
          }

          // Otherwise, check if any nested replies need updating
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentRecursively(comment.replies),
            };
          }

          // No changes needed
          return comment;
        });
      };

      const result = updateCommentRecursively(updatedComments);

      if (!found) {
        console.log(
          `[Socket] Comment ${likedComment._id} not found in state, can't update`
        );
      }

      return result;
    };

    // Update the comments state
    setComments(safeUpdateComments);

    // Force UI update for specific comment element
    setTimeout(() => {
      const commentElement = document.querySelector(
        `[data-comment-id="${likedComment._id}"]`
      );

      if (commentElement) {
        // Find and update UI elements directly
        const heartIcon = commentElement.querySelector(".heart-icon");
        const likeText = commentElement.querySelector(".like-button span");

        if (heartIcon) {
          if (likedComment.isLiked) {
            heartIcon.classList.add("liked");
            heartIcon.setAttribute("fill", "currentColor");
            heartIcon.setAttribute("stroke-width", "0");
          } else {
            heartIcon.classList.remove("liked");
            heartIcon.setAttribute("fill", "none");
            heartIcon.setAttribute("stroke-width", "2");
          }
        }

        if (likeText) {
          if (likedComment.isLiked) {
            likeText.classList.add("text-red-500", "font-medium");
            likeText.classList.remove("text-[#b0b3b8]");
          } else {
            likeText.classList.remove("text-red-500", "font-medium");
            likeText.classList.add("text-[#b0b3b8]");
          }
        }

        // Update like count display or create it if needed
        const likeCountElement =
          commentElement.querySelector(".heart-count span");
        if (likeCountElement && likedComment.likesCount !== undefined) {
          likeCountElement.textContent = likedComment.likesCount;

          // Show/hide the count container based on count value
          const countContainer =
            likeCountElement.closest(".heart-count")?.parentNode;
          if (countContainer) {
            countContainer.style.display =
              likedComment.likesCount > 0 ? "flex" : "none";
          }
        } else if (likedComment.likesCount > 0) {
          // If like count element doesn't exist but likes > 0, create one
          const existingLikesContainer = commentElement.querySelector(
            ".flex.items-center.text-xs.text-\\[\\#b0b3b8\\].mt-1.pl-2"
          );
          if (!existingLikesContainer) {
            const likesContainer = document.createElement("div");
            likesContainer.className =
              "flex items-center text-xs text-[#b0b3b8] mt-1 pl-2";
            likesContainer.innerHTML = `
              <span class="inline-flex items-center bg-[#3a3b3c] px-2 py-0.5 rounded-full heart-count">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 text-red-500 mr-1">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                <span>${likedComment.likesCount}</span>
              </span>
            `;

            // Find the correct place to insert the likes count (after the buttons)
            const buttonContainer = commentElement.querySelector(
              ".flex.items-center.gap-4"
            );
            if (buttonContainer) {
              buttonContainer.parentNode.insertBefore(
                likesContainer,
                buttonContainer.nextSibling
              );
            }
          }
        }
      }
    }, 50);
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

    // Kiểm tra xem có comment tạm thời tương ứng với nội dung này không
    // để thay thế nó bằng comment thật từ server
    const findAndReplaceTempComment = (comments) => {
      for (let i = 0; i < comments.length; i++) {
        const comment = comments[i];

        // Nếu là comment tạm thời có cùng nội dung, thay thế nó
        if (
          comment._id.startsWith("temp-") &&
          comment.content === newComment.content &&
          comment.parentId === newComment.parentId
        ) {
          console.log(
            "Replacing temporary comment with server comment:",
            comment._id,
            "->",
            newComment._id
          );

          // Thay thế comment tạm thời bằng comment từ server
          comments[i] = {
            ...newComment,
            replies: comment.replies || [], // Giữ lại replies nếu có
          };
          return true;
        }

        // Kiểm tra trong replies
        if (comment.replies && comment.replies.length > 0) {
          const found = findAndReplaceTempComment(comment.replies);
          if (found) return true;
        }
      }

      return false;
    };

    if (!newComment.parentId) {
      // Top-level comment - add to the beginning of the list
      setComments((prev) => {
        // Clone mảng hiện tại để thao tác
        const newComments = [...prev];

        // Thử thay thế comment tạm thời nếu có
        const replaced = findAndReplaceTempComment(newComments);

        // Nếu đã thay thế hoặc comment đã tồn tại, trả về mảng mới
        if (replaced || newComments.some((c) => c._id === newComment._id)) {
          return newComments;
        }

        // Nếu không, thêm comment mới vào đầu
        return [newComment, ...newComments];
      });
    } else {
      // It's a reply - add it to the parent comment
      setComments((prev) => {
        // Clone mảng để thao tác
        const newComments = [...prev];

        // Thử thay thế comment tạm thời nếu có
        const replaced = findAndReplaceTempComment(newComments);
        if (replaced) {
          return newComments;
        }

        // Nếu không thay thế được, thêm vào parent bình thường
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

  const commentCount = comments.length;

  return (
    <div className="space-y-4">
      {/* Comment header and input form */}
      <div className="border-t border-[#3e4042] pt-3 mt-3">
        {/* Comment count and most relevant filter */}
        {commentCount > 0 && (
          <div className="flex justify-between items-center mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-medium text-[#e4e6eb]">
                {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
              </span>
            </div>
            <div className="text-[13px] text-[#b0b3b8] hover:underline cursor-pointer">
              Most relevant ▾
            </div>
          </div>
        )}

        {/* Comment input */}
        <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />
      </div>

      {/* Error message */}
      {errorMessage && (
        <motion.div
          className="p-3 bg-red-900/20 text-red-400 rounded-lg border border-red-800/30 text-[13px]"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
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
      <div className="space-y-2">
        {comments.length > 0 ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {displayedComments.map((comment, index) => (
                <div key={comment._id} className="relative comment-thread">
                  {/* Vertical connection line between comments */}
                  {index < displayedComments.length - 1 && (
                    <div className="absolute left-4 top-9 bottom-0 w-[1.5px] bg-[#4e4f50] opacity-30"></div>
                  )}
                  <Comment
                    postId={postId}
                    comment={comment}
                    onDelete={(id) => handleCommentDeleted(id)}
                  />
                </div>
              ))}

              {/* Show more button for local comments */}
              {hasMoreToShow && (
                <button
                  onClick={showMoreComments}
                  className="text-[#b0b3b8] hover:text-[#e4e6eb] text-[13px] font-medium mt-2 hover:underline"
                >
                  View {comments.length - displayLimit} more comments
                </button>
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
                    className="py-1.5 px-4 text-[#b0b3b8] hover:text-[#e4e6eb] bg-[#3a3b3c] rounded-md hover:bg-[#4e4f50] transition-colors text-[13px] font-medium"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-t-blue-400 border-blue-300/30 rounded-full animate-spin"></div>
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
            className="flex flex-col items-center justify-center py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-8 h-8 border-3 border-t-blue-400 border-blue-200/10 rounded-full animate-spin mb-3"></div>
            <p className="text-[#b0b3b8] text-[13px]">Loading comments...</p>
          </motion.div>
        ) : (
          <motion.div
            className="py-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[#b0b3b8] text-[15px]">
              No comments yet. Be the first to share your thoughts!
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PostComments;
