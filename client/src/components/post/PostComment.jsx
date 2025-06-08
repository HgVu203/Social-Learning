import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePostContext } from "../../contexts/PostContext";
import Avatar from "../common/Avatar";
import { formatDistanceToNow } from "date-fns";
import { showDeleteConfirmToast, showErrorToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { usePostComments } from "../../hooks/queries/usePostQueries";
import { useTranslation } from "react-i18next";
import { uploadImage } from "../../services/uploadService";
import axiosService from "../../services/axiosService";
import i18n from "../../i18n";
import Xarrow from "react-xarrows";

// Map to store user mentions for tagging
const userMentions = new Map();

// Thêm CSS animation cơ bản
const styles = document.createElement("style");
styles.innerHTML = `
.heart-icon {
  transition: transform 0.2s ease-in-out, 
              fill 0.2s ease-in-out, 
              color 0.2s ease-in-out;
}

/* Định nghĩa biến RGB cho màu nền */
:root {
  --color-bg-secondary-rgb: 42, 42, 49;
}

.heart-icon.liked {
  color: rgb(239, 68, 68);
}

.comment-form-wrapper {
    opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.2s forwards;
  }

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Đảm bảo căn chỉnh avatar */
.main-comment-avatar {
  margin-left: 1px; /* Căn chỉnh với avatar ở phần form comment */
  z-index: 2; /* Đảm bảo avatar hiển thị trên các đường kết nối */
}

/* Form comment styling */
.main-comment-form {
  padding-left: 1px; /* Căn chỉnh với comment */
}

.reply-comment-form {
  padding-left: 0; /* Reset padding khi là reply */
}

/* Reply comments styling */
.reply-comment {
  position: relative;
  border-radius: 12px;
  margin-left: 10px;
  background-color: var(--color-bg-secondary);
}

/* Reply ở cấp 2 - giống Facebook */
.reply-comment[data-depth="1"] {
  background-color: var(--color-bg-secondary);
  border-radius: 14px;
}

/* Reply ở cấp 3 - giống Facebook */
.reply-comment[data-depth="2"] {
  background-color: var(--color-bg-secondary);
  border-radius: 16px;
}

/* Reply thread container */
.reply-thread-container {
  position: relative;
  margin-top: 8px; 
  padding-top: 2px;
  margin-left: 6px;
  opacity: 0;
  transform: translateY(-5px);
  animation: fadeInReply 0.3s forwards;
}

@keyframes fadeInReply {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Facebook-style: Adjust nested reply indentation */
.reply-comments-container {
  padding-left: 18px; /* Tăng padding để có khoảng cách phù hợp */
  margin-left: 1px;
}

/* Avatar trong reply */
.reply-avatar-container {
  position: relative;
  z-index: 5; /* Đảm bảo avatar hiển thị trên các đường kết nối */
}

/* Container chính của comment */
.comment-container {
  padding-left: 1px; /* Thêm padding nhỏ cho container chính */
  position: relative;
}

/* Reply item */
.reply-item {
  position: relative;
  margin-bottom: 12px;
  padding-left: 0;
}

/* Custom Xarrow style để giống Facebook */
.facebook-arrow {
  pointer-events: none !important;
  z-index: 1 !important;
}

.facebook-arrow path {
  stroke-width: 1.2px !important;
  stroke: #ccc !important;
}

/* Fix để đảm bảo kết nối đường thẳng giữa các comment */
div[data-xarrow-element] {
  position: absolute !important;
  pointer-events: none !important;
  z-index: 1 !important;
}

.xarrow-container {
  z-index: 1 !important;
}

/* Đảm bảo avatar có position để Xarrow nhận biết đúng vị trí */
.avatar-container {
  position: relative !important;
}
`;
document.head.appendChild(styles);

// Thêm đối tượng để theo dõi các comment tạm thời và hành động đang chờ
const pendingActions = new Map();

// Đưa các hàm xử lý ra bên ngoài component
// Xử lý like comment với ID thật
const processLikeAction = async (
  commentId,
  postId,
  isNestedComment,
  reactToCommentMutation
) => {
  try {
    if (reactToCommentMutation && reactToCommentMutation.mutateAsync) {
      await reactToCommentMutation.mutateAsync({
        postId,
        commentId,
        isNestedComment,
      });
    }
  } catch (error) {
    console.error("Error processing like:", error);
  }
};

// Cập nhật comment lạc quan thành comment thật trong DOM
const updateOptimisticCommentUI = (tempId, realId) => {
  // Tìm comment trong DOM
  const commentElement = document.querySelector(
    `[data-comment-id="${tempId}"]`
  );
  if (commentElement) {
    // Cập nhật data-comment-id
    commentElement.setAttribute("data-comment-id", realId);

    // Cập nhật trạng thái hiển thị
    const statusElement = commentElement.querySelector(".comment-status");
    if (statusElement) {
      statusElement.innerHTML = `
        <span class="text-xs text-green-500 flex items-center gap-1">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
          </svg>
          ${i18n.t("comment.saved")}
        </span>
      `;

      // Ẩn sau 3 giây
      setTimeout(() => {
        statusElement.innerHTML = "";
      }, 3000);
    }
  }
};

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
  const { t } = useTranslation();
  const [content, setContent] = useState(
    replyingToUser ? `@${replyingToUser} ${initialValue}` : initialValue
  );
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { createComment, updateComment, reactToComment } = usePostContext();
  const { user } = useAuth();

  // Lưu trữ tempCommentId để có thể sử dụng sau khi server trả về
  const tempCommentIdRef = useRef(null);
  const pendingLikeRef = useRef(false);

  // Determine if this is a reply form
  const isReplyForm = !!replyToId && !isEditing;

  // Store the mapping of username to userId when replying to someone
  useEffect(() => {
    if (replyingToUser && replyingToUserId) {
      // Very important: Make sure the full name is stored for proper tagging
      userMentions.set(replyingToUser, replyingToUserId);

      // Also store individual parts of the name for more flexible matching
      if (replyingToUser.includes(" ")) {
        const nameParts = replyingToUser.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentions.set(part.trim(), replyingToUserId);
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

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showErrorToast(t("comment.errorImageType"));
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showErrorToast(t("comment.errorImageSize"));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!content.trim() && !imagePreview) || !user || isSubmitting) return;

    setIsSubmitting(true);

    let uploadedImageUrl = null;

    try {
      // Upload image if present
      if (imagePreview && fileInputRef.current?.files?.[0]) {
        setUploadingImage(true);
        try {
          uploadedImageUrl = await uploadImage(fileInputRef.current.files[0]);
        } catch {
          showErrorToast(t("comment.errorUpload"));
          setIsSubmitting(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      // For empty text with image, we'll send an empty string as the content
      const commentText = content.trim();

      const payload = {
        comment: commentText, // Empty string is fine when only uploading image
        image: uploadedImageUrl,
      };

      if (replyToId) {
        payload.parentId = replyToId;
      }

      if (isEditing && onEditComplete) {
        await updateComment.mutateAsync({
          postId,
          commentId: replyToId, // Using replyToId to store commentId for editing
          content: commentText,
          image: uploadedImageUrl,
        });

        onEditComplete(commentText, uploadedImageUrl);
        setImagePreview(null);
      } else {
        // Optimistic update with local data for new comments
        const tempId = `temp-${Date.now()}`;
        tempCommentIdRef.current = tempId;

        // Tạo comment tạm thời với đầy đủ thông tin
        const tempComment = {
          _id: tempId,
          content: commentText,
          image: uploadedImageUrl || imagePreview, // Use uploaded URL or preview for now
          userId: {
            _id: user._id,
            username: user.username,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          author: {
            _id: user._id,
            username: user.username,
            fullname: user.fullname,
            avatar: user.avatar,
          },
          parentId: replyToId, // Gán parentId để đánh dấu là reply
          createdAt: new Date().toISOString(),
          isOptimistic: true,
          isSending: true,
          isSaved: false,
          likes: [],
          likesCount: 0,
          isLiked: false,
          replies: [],
        };

        // Lưu comment tạm vào danh sách theo dõi
        pendingActions.set(tempId, {
          comment: tempComment,
          actions: [],
          realId: null,
        });

        // Add to UI immediately
        if (onCommentAdded) {
          onCommentAdded(tempComment);
        }

        // Clear input and image
        setContent("");
        setImagePreview(null);

        // Then send to server
        const response = await createComment.mutateAsync({
          postId,
          ...payload,
        });

        // Cập nhật comment tạm thành comment thật
        if (response && response.data && response.data.comment) {
          const realComment = response.data.comment;
          const pendingData = pendingActions.get(tempId);

          // Lưu ID thật
          if (pendingData) {
            pendingData.realId = realComment._id;
            pendingData.comment = {
              ...pendingData.comment,
              ...realComment,
              isSending: false,
              isSaved: true,
              isOptimistic: false,
            };

            // Xử lý các hành động đang chờ
            processPendingActions(tempId, realComment._id);
          }

          // Cập nhật comment trong UI
          updateOptimisticCommentUI(tempId, realComment._id);
        }
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      // Remove optimistic comment if there was an error
      if (onCommentAdded && !isEditing) {
        onCommentAdded(null, tempCommentIdRef.current);
      }
      showErrorToast(t("toast.error.generic"));
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
      tempCommentIdRef.current = null;
    }

    // Cancel reply mode if applicable
    if (onCancel) onCancel();
  };

  // Hàm xử lý các hành động đang chờ
  const processPendingActions = async (tempId, realId) => {
    const pendingData = pendingActions.get(tempId);
    if (!pendingData || !pendingData.actions.length) return;

    for (const action of pendingData.actions) {
      try {
        if (action.type === "like") {
          await processLikeAction(
            realId,
            postId,
            action.data.isNestedComment,
            reactToComment
          );
        } else if (action.type === "reply") {
          // Xử lý reply sau này nếu cần
        }
      } catch (error) {
        console.error(
          `Error processing ${action.type} for comment ${realId}:`,
          error
        );
      }
    }

    // Xóa hành động đã xử lý
    pendingData.actions = [];
  };

  return (
    <div
      className={`comment-form-wrapper ${
        isReplyForm
          ? "pl-2 border-l-2 border-l-[var(--color-primary)]/20 ml-2"
          : ""
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex items-start gap-3 w-full mt-2 px-0.5 ${
          isReplyForm ? "reply-comment-form" : "main-comment-form"
        }`}
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
            className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-[var(--color-bg-primary)] shadow-sm main-comment-avatar"
          />
        )}
        <div className="flex-1 flex flex-col gap-2">
          <div
            className={`relative border border-gray-400 flex-1 rounded-2xl overflow-hidden ${
              isFocused
                ? "ring-2 border-gray-800 ring-[var(--color-primary)]"
                : ""
            } transition-all duration-200 bg-[var(--color-bg-secondary)] shadow-sm`}
          >
            {isReplyForm && replyingToUser && (
              <div className="absolute -top-6 left-2 text-xs text-[var(--color-primary)]">
                {t("comment.reply")} {t("comment.to")} {replyingToUser}
              </div>
            )}
            <div className="flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={
                  isEditing
                    ? t("comment.editYourComment")
                    : replyToId
                    ? `${t("comment.reply")}${
                        replyingToUser
                          ? " " + t("comment.to") + " " + replyingToUser
                          : ""
                      }...`
                    : t("comment.writeAComment")
                }
                className="w-full bg-transparent text-[var(--color-text-primary)] rounded-2xl px-5 py-2.5 text-[15px] focus:outline-none placeholder-[var(--color-text-tertiary)] border-none"
                disabled={isSubmitting || uploadingImage}
              />

              {/* Image upload button */}
              <button
                type="button"
                className="p-2 mr-1 text-[var(--color-text-tertiary)] text-[var(--color-primary)] rounded-full relative group"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || uploadingImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-xs py-1 px-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  {t("comment.addImage")}
                </span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isSubmitting || uploadingImage}
              />

              {(content.trim() || imagePreview) &&
                !isSubmitting &&
                !uploadingImage && (
                  <button
                    type="submit"
                    className="mr-2 text-[var(--color-primary)] p-1.5 rounded-full transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                    </svg>
                  </button>
                )}
              {(isSubmitting || uploadingImage) && (
                <div className="mr-3">
                  <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative border border-gray-700 rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] mb-2">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="max-h-40 max-w-full object-contain mx-auto"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 bg-[var(--color-bg-primary)] p-1 rounded-full text-red-500 hover:text-red-400"
                disabled={isSubmitting || uploadingImage}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
              {!content.trim() && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-[var(--color-bg-primary)]/70 px-2 py-1 rounded text-xs text-[var(--color-text-primary)]">
                  {t("comment.pressSendButton")}
                </div>
              )}
            </div>
          )}
        </div>

        {(isEditing || replyToId) && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--color-text-secondary)] text-[var(--color-text-primary)] py-2 px-3 rounded-lg transition-colors font-medium text-sm"
            disabled={isSubmitting || uploadingImage}
          >
            {t("common.cancel")}
          </button>
        )}
      </form>
    </div>
  );
};

const Comment = ({
  postId,
  comment,
  onDelete,
  depth = 0,
  inReplySection = false,
}) => {
  const { t } = useTranslation();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localComment, setLocalComment] = useState(comment);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [visibleReplies, setVisibleReplies] = useState(3);
  const [renderedReplies, setRenderedReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const menuRef = useRef(null);
  const heartIconRef = useRef(null);

  const { user } = useAuth();
  const { deleteComment, reactToComment } = usePostContext();

  // Chuẩn hóa dữ liệu người dùng để xử lý cả trường hợp author và userId
  const commentUser = localComment.author || localComment.userId;
  const isOwner = user && commentUser && user._id === commentUser._id;

  // Use ref for previous comment value to prevent infinite update loop
  const prevCommentRef = useRef(comment);

  // Helper function to check if two comments are different
  const isCommentDifferent = (prev, next) => {
    if (!prev || !next) return true;

    // Check critical fields only instead of stringifying the entire object
    return (
      prev._id !== next._id ||
      prev.content !== next.content ||
      prev.isLiked !== next.isLiked ||
      prev.likesCount !== next.likesCount ||
      prev.createdAt !== next.createdAt ||
      prev.image?.url !== next.image?.url
    );
  };

  // Mỗi khi prop comment thay đổi, cập nhật state localComment và chuẩn hóa dữ liệu
  useEffect(() => {
    // Only update if the comment is actually different from previous
    if (isCommentDifferent(prevCommentRef.current, comment)) {
      // Đảm bảo tính nhất quán dữ liệu
      const normalizedComment = { ...comment };

      // Đảm bảo trường author luôn tồn tại
      if (!normalizedComment.author && normalizedComment.userId) {
        normalizedComment.author = normalizedComment.userId;
      }

      // Đảm bảo trường userId luôn tồn tại
      if (!normalizedComment.userId && normalizedComment.author) {
        normalizedComment.userId = normalizedComment.author;
      }

      setLocalComment(normalizedComment);
      prevCommentRef.current = comment;
    }
  }, [comment]);

  // Effect để cập nhật danh sách reply đã render
  useEffect(() => {
    if (localComment.replies && localComment.replies.length > 0) {
      // Lấy replies hiển thị dựa trên trạng thái showAllReplies
      const displayedReplies = showAllReplies
        ? localComment.replies
        : localComment.replies.slice(0, visibleReplies);

      // Đợi một chút để DOM cập nhật
      const timer = setTimeout(() => {
        setRenderedReplies(displayedReplies.map((reply) => reply._id));
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [localComment.replies, showAllReplies, visibleReplies]);

  // Theo dõi các trạng thái like và likesCount để phòng ngừa race condition
  const likeStateRef = useRef({
    currentState: localComment.isLiked,
    likesCount: localComment.likesCount || 0,
  });

  useEffect(() => {
    // Cập nhật ref mỗi khi localComment thay đổi
    likeStateRef.current = {
      currentState: localComment.isLiked,
      likesCount: localComment.likesCount || 0,
    };
  }, [localComment]);

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

  // Handle deleting a comment
  const handleDelete = async () => {
    showDeleteConfirmToast(t("toast.confirm.delete"), async () => {
      try {
        // Lưu trữ trạng thái trước khi xóa để có thể khôi phục nếu có lỗi
        const commentId = localComment._id;
        const isReply = !!localComment.parentId;

        // Optimistic update - xóa comment ngay trên UI
        onDelete(commentId);

        // Thực hiện xóa comment trên server
        await deleteComment.mutateAsync({
          postId,
          commentId: commentId,
          isNestedComment: isReply,
        });
      } catch (error) {
        console.error("Error deleting comment:", error);
        // Nếu lỗi, có thể hiển thị thông báo
        showErrorToast(t("toast.error.tryAgain"));
      }
    });
    setShowMenu(false);
  };

  // Handle adding a reply to this comment - updated for new structure
  const handleReplyAdded = (newReply, tempIdToRemove = null) => {
    if (tempIdToRemove) {
      // Remove from replies if it exists there
      setLocalComment((prev) => ({
        ...prev,
        replies:
          prev.replies?.filter((reply) => reply._id !== tempIdToRemove) || [],
      }));
      return;
    }

    if (!newReply) return;

    // Ensure replies array exists and process the new reply
    setLocalComment((prev) => {
      // Make sure we have a replies array
      const currentReplies = prev.replies || [];

      // Check if this reply already exists to prevent duplicates
      const replyExists = currentReplies.some(
        (reply) => reply._id === newReply._id
      );

      if (replyExists) {
        return prev;
      }

      // Ensure parent ID is set correctly on the new reply
      const updatedReply = {
        ...newReply,
        parentId: prev._id,
        userId: newReply.userId || newReply.author,
        author: newReply.author || newReply.userId,
      };

      // Add to local comment's replies
      return {
        ...prev,
        replies: [updatedReply, ...currentReplies],
      };
    });
  };

  // Handle reply deletion - updated for new structure
  const handleReplyDeleted = (replyId) => {
    setLocalComment((prev) => ({
      ...prev,
      replies: (prev.replies || []).filter((reply) => reply._id !== replyId),
    }));
  };

  // Thêm state để hiển thị trạng thái comment
  const [status, setStatus] = useState({
    isSending: comment.isSending || false,
    isSaved: comment.isSaved || false,
  });

  // Cập nhật trạng thái khi comment thay đổi
  useEffect(() => {
    if (comment) {
      setStatus({
        isSending: comment.isSending || false,
        isSaved: comment.isSaved || false,
      });
    }
  }, [comment]);

  // Chỉnh sửa hàm handleLike để xử lý cả comment tạm
  const handleLike = async (e) => {
    if (!user) {
      // Redirect to login
      window.location.href = "/login";
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (reactToComment.isLoading) return;

    try {
      // Lưu lại trạng thái hiện tại để có thể khôi phục nếu lỗi
      const currentLiked = localComment.isLiked;
      const currentLikesCount = localComment.likesCount || 0;

      // Update local state immediately (optimistic update)
      setLocalComment((prev) => {
        const newLikeState = !prev.isLiked;
        const newLikeCount = newLikeState
          ? Math.max(0, (prev.likesCount || 0) + 1)
          : Math.max(0, (prev.likesCount || 1) - 1);

        // Cập nhật ref để phản ánh trạng thái mới nhất
        likeStateRef.current = {
          currentState: newLikeState,
          likesCount: newLikeCount,
        };

        return {
          ...prev,
          isLiked: newLikeState,
          likesCount: newLikeCount,
        };
      });

      // Kiểm tra nếu là comment tạm
      if (localComment.isOptimistic) {
        const pendingData = pendingActions.get(localComment._id);

        if (pendingData) {
          // Thêm hành động like vào hàng đợi
          pendingData.actions.push({
            type: "like",
            timestamp: Date.now(),
            data: {
              isNestedComment: !!localComment.parentId,
            },
          });

          // Nếu đã có ID thật, xử lý ngay
          if (pendingData.realId) {
            processLikeAction(
              pendingData.realId,
              postId,
              !!localComment.parentId,
              reactToComment
            );
          }

          return; // Không cần gọi API, sẽ xử lý sau
        }
      }

      // Send API request to server for real comments
      if (reactToComment && reactToComment.mutateAsync) {
        try {
          const response = await reactToComment.mutateAsync({
            postId,
            commentId: localComment._id,
            isNestedComment: !!localComment.parentId,
          });

          // Handle successful response
          if (response && response.data) {
            // Update state from server if different from local
            const serverState = response.data.isLiked;
            const serverCount = response.data.likesCount || 0;

            // Chỉ cập nhật nếu phản hồi từ server khác với cập nhật lạc quan của chúng ta
            if (
              serverState !== likeStateRef.current.currentState ||
              serverCount !== likeStateRef.current.likesCount
            ) {
              // Update local state with server values
              setLocalComment((prev) => ({
                ...prev,
                isLiked: serverState,
                likesCount: serverCount,
              }));

              // Đồng thời cập nhật ref
              likeStateRef.current = {
                currentState: serverState,
                likesCount: serverCount,
              };
            }
          }
        } catch (error) {
          console.error("[Comment] Error reacting to comment:", error);

          // Revert to previous state on error
          setLocalComment((prev) => ({
            ...prev,
            isLiked: currentLiked,
            likesCount: currentLikesCount,
          }));

          // Cập nhật lại ref
          likeStateRef.current = {
            currentState: currentLiked,
            likesCount: currentLikesCount,
          };
        }
      }
    } catch (error) {
      console.error("[Comment] Error in like handler:", error);
    }
  };

  // Handle editing completion
  const handleEditComplete = (updatedContent, updatedImage) => {
    setIsEditing(false);

    // Update local comment with new content and/or image
    if (updatedContent !== undefined || updatedImage !== undefined) {
      setLocalComment((prev) => ({
        ...prev,
        content: updatedContent !== undefined ? updatedContent : prev.content,
        image: updatedImage !== undefined ? updatedImage : prev.image,
      }));
    }
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
      let userId = userMentions.get(fullMentionedName);
      let username = null;

      // If not found directly, try to find a partial match
      if (!userId) {
        // Try partial match in userMentionMap
        for (const [name, id] of userMentions.entries()) {
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

      // Display mentions without special formatting - Just a regular link
      const profilePath = userId
        ? `/profile/${userId}`
        : `/profile/${username}`;

      parts.push(
        <Link key={`mention-${match.index}`} to={profilePath}>
          @{fullMentionedName}
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

  // Show more replies
  const showMoreReplies = () => {
    if (
      localComment.replies &&
      localComment.replies.length <= visibleReplies + 3
    ) {
      setShowAllReplies(true);
    }
    setVisibleReplies((prev) => prev + 3);
  };

  // Render replies with correct structure
  const renderReplies = () => {
    if (!localComment.replies || localComment.replies.length === 0) return null;

    // Get displayed replies based on visibility settings
    const displayedReplies = showAllReplies
      ? localComment.replies
      : localComment.replies.slice(0, visibleReplies);

    const hasMoreReplies =
      !showAllReplies && localComment.replies.length > visibleReplies;

    return (
      <>
        {/* Nút xem/ẩn replies */}
        <div className="ml-0 mt-1 mb-2">
          <button
            onClick={() => {
              // Tạo một khoảng thời gian nhỏ trước khi ẩn hiện để đảm bảo render đúng
              if (showReplies) {
                // Nếu đang hiển thị và chuẩn bị ẩn, thì ẩn ngay
                setShowReplies(false);
              } else {
                // Nếu đang ẩn và chuẩn bị hiển thị, đợi một chút để chuẩn bị DOM
                setTimeout(() => {
                  setShowReplies(true);
                  // Sau khi hiển thị, đợi một chút để các elements được render
                  // rồi kích hoạt lại renderedReplies để vẽ arrows
                  setTimeout(() => {
                    const newRenderedReplies = [...renderedReplies];
                    displayedReplies.forEach((reply) => {
                      if (!newRenderedReplies.includes(reply._id)) {
                        newRenderedReplies.push(reply._id);
                      }
                    });
                    setRenderedReplies(newRenderedReplies);
                  }, 50);
                }, 50);
              }
            }}
            className="text-[var(--color-primary)] text-sm font-medium flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${
                showReplies ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {showReplies
                ? t("comment.hideReplies", {
                    count: localComment.replies.length,
                    postProcess: "interval",
                    count_one: t("comment.replyCount.one", "reply"),
                    count_other: t("comment.replyCount.other", "replies"),
                    defaultValue: `Hide ${
                      localComment.replies.length > 1
                        ? localComment.replies.length
                        : ""
                    } ${
                      localComment.replies.length === 1 ? "reply" : "replies"
                    }`,
                  })
                : t("comment.showReplies", {
                    count: localComment.replies.length,
                    postProcess: "interval",
                    count_one: t("comment.replyCount.one", "reply"),
                    count_other: t("comment.replyCount.other", "replies"),
                    defaultValue: `View ${
                      localComment.replies.length > 1
                        ? localComment.replies.length
                        : ""
                    } ${
                      localComment.replies.length === 1 ? "reply" : "replies"
                    }`,
                  })}
            </span>
          </button>
        </div>

        {/* Reply thread container - Facebook style - chỉ hiển thị khi showReplies là true */}
        {showReplies && (
          <div className="reply-thread-container">
            {/* Replies container */}
            <div className="reply-comments-container">
              {displayedReplies.map((reply, index) => {
                // Force update rendered replies
                if (!renderedReplies.includes(reply._id)) {
                  setTimeout(() => {
                    setRenderedReplies((prev) => [...prev, reply._id]);
                  }, 30);
                }

                return (
                  <div
                    key={reply._id}
                    className="relative reply-item"
                    data-reply-index={index}
                    data-reply-id={reply._id}
                    data-parent-id={localComment._id}
                    data-depth={depth}
                  >
                    {/* Xarrow kết nối giữa avatar cha và avatar con - chỉ hiển thị khi cả hai đầu đã render */}
                    {renderedReplies.includes(reply._id) && (
                      <Xarrow
                        start={`avatar-${localComment._id}`}
                        end={`avatar-${reply._id}`}
                        color="#ccc"
                        strokeWidth={1.2}
                        curveness={depth === 0 ? 0.8 : 0.6}
                        startAnchor="bottom"
                        endAnchor="left"
                        path="smooth"
                        showHead={false}
                        className="facebook-arrow"
                        zIndex={1}
                      />
                    )}

                    <Comment
                      postId={postId}
                      comment={reply}
                      onDelete={handleReplyDeleted}
                      depth={depth + 1}
                      inReplySection={true}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Show more replies button - chỉ hiển thị khi đã mở replies và cần hiển thị thêm */}
        {showReplies && hasMoreReplies && (
          <div className="ml-0 mt-1 mb-2">
            <button
              onClick={() => {
                showMoreReplies();
                // Đợi một khoảng thời gian để cập nhật hiển thị
                setTimeout(() => {
                  const remaining = localComment.replies.slice(
                    visibleReplies,
                    visibleReplies + 3
                  );
                  const newRenderedReplies = [...renderedReplies];
                  remaining.forEach((reply) => {
                    if (!newRenderedReplies.includes(reply._id)) {
                      newRenderedReplies.push(reply._id);
                    }
                  });
                  setRenderedReplies(newRenderedReplies);
                }, 50);
              }}
              className="text-[var(--color-primary)] text-sm font-medium flex items-center gap-1"
              data-testid="show-more-replies"
              aria-label={`Show ${
                localComment.replies.length - visibleReplies
              } more replies`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {t("comment.seeMoreReplies", {
                count: localComment.replies.length - visibleReplies,
                postProcess: "interval",
                count_one: t("comment.replyCount.one", "reply"),
                count_other: t("comment.replyCount.other", "replies"),
              })}
            </button>
          </div>
        )}
      </>
    );
  };

  // Add a useEffect to store user information in the userMentionMap in the Comment component
  // Store this user's info in the mention map
  useEffect(() => {
    if (commentUser && commentUser._id) {
      const userName = commentUser.fullname || commentUser.username;
      const userId = commentUser._id;

      // Store the full name
      userMentions.set(userName, userId);

      // Also store individual name parts for better matching
      if (userName.includes(" ")) {
        const nameParts = userName.split(" ");
        nameParts.forEach((part) => {
          if (part.trim().length > 0) {
            userMentions.set(part.trim(), userId);
          }
        });
      }
    }
  }, [commentUser]);

  // Don't render if comment is deleted or missing userId
  if (!comment || !commentUser) return null;

  return (
    <div
      className={`mb-3 relative ${
        inReplySection ? "reply-comment" : "comment-container"
      }`}
      data-comment-id={localComment._id}
      data-reply={inReplySection ? "true" : "false"}
      data-parent-id={localComment.parentId || ""}
      data-depth={depth}
      data-has-replies={
        localComment.replies && localComment.replies.length > 0
          ? "true"
          : "false"
      }
      id={`comment-${localComment._id}`}
    >
      {/* Principal comment structure */}
      <div className="flex gap-3">
        {/* Avatar với ID riêng để kết nối Xarrow */}
        <div
          className={`avatar-container ${
            inReplySection ? "reply-avatar-container" : "main-comment-avatar"
          }`}
        >
          <Link
            to={`/profile/${commentUser._id}`}
            id={`avatar-${localComment._id}`}
            style={{ position: "relative", zIndex: 10 }}
            className="shrink-0 block"
          >
            <Avatar
              src={commentUser.avatar}
              alt={commentUser.username}
              size={inReplySection ? "sm" : "md"}
              className="border-2 border-[var(--color-bg-primary)]"
            />
          </Link>
        </div>

        {/* Content and buttons */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex justify-between items-center">
              <Link
                to={`/profile/${commentUser?.username || commentUser?._id}`}
                className="font-medium text-[var(--color-text-primary)] hover:underline"
              >
                {commentUser?.fullname || commentUser?.username || "Người dùng"}
              </Link>

              {/* Hiển thị trạng thái comment */}
              <div className="comment-status">
                {status.isSending && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg
                      className="animate-spin w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                      ></circle>
                      <path
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("comment.sending")}
                  </span>
                )}

                {status.isSaved && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    {i18n.t("comment.saved")}
                  </span>
                )}
              </div>
            </div>

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
              <div className="flex flex-col gap-2 mt-1">
                <div className="text-[var(--color-text-secondary)] break-words whitespace-pre-wrap text-[15px]">
                  {parseContent(comment.content)}
                </div>
                {comment.image && (
                  <div className="mt-1 rounded-lg overflow-hidden">
                    <img
                      src={comment.image}
                      alt="Comment attachment"
                      className="max-h-60 max-w-full object-contain bg-[var(--color-bg-tertiary)]"
                      loading="lazy"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(comment.image, "_blank");
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions (like, reply, etc.) */}
          <div className="flex items-center gap-4 mt-1.5 pl-2 text-xs">
            <button
              className="font-medium flex items-center gap-1"
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
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                {t("comment.like")}
              </span>
            </button>

            <button
              className="font-medium text-[var(--color-text-tertiary)] transition-colors flex items-center gap-1"
              onClick={() => {
                setShowReplyForm(!showReplyForm);
                if (!showReplies && !showReplyForm) {
                  setShowReplies(true);
                }
              }}
              style={{ display: depth >= 2 ? "none" : "flex" }}
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
              <span className="text-[13px]">{t("comment.reply")}</span>
            </button>

            <span className="text-[var(--color-text-tertiary)] flex items-center gap-1">
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

            {/* Số lượng likes */}
            {localComment.likesCount > 0 && (
              <span className="inline-flex items-center bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full shadow-sm text-[var(--color-text-tertiary)]">
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
            )}

            {isOwner && (
              <div className="relative ml-auto">
                <button
                  className="p-1.5 rounded-full hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowMenu(!showMenu);
                  }}
                  aria-label="Comment options"
                >
                  <svg
                    className="w-4 h-4 text-[var(--color-text-tertiary)]"
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

                {showMenu && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 bg-[var(--color-bg-primary)] shadow-lg rounded-xl py-1.5 z-10 min-w-[130px] border border-[var(--color-border)]"
                  >
                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] transition-colors gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
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
                          strokeWidth={1.5}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="text-sm font-medium">
                        {t("common.edit")}
                      </span>
                    </button>

                    <button
                      className="flex items-center w-full text-left px-4 py-2 text-red-500 bg-[var(--color-bg-danger)] transition-colors gap-2"
                      onClick={handleDelete}
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
                          strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span className="text-sm font-medium">
                        {t("common.delete")}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form trả lời comment */}
          {showReplyForm && depth < 2 && (
            <div className="mt-2">
              <CommentForm
                postId={postId}
                replyToId={comment._id}
                onCommentAdded={handleReplyAdded}
                onCancel={() => setShowReplyForm(false)}
                replyingToUser={commentUser?.fullname || commentUser?.username}
                replyingToUserId={commentUser?._id}
              />
            </div>
          )}

          {/* Hiển thị replies */}
          {renderReplies()}
        </div>
      </div>
    </div>
  );
};

const PostComments = ({ postId }) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 5;
  const [displayLimit, setDisplayLimit] = useState(3);
  const [showingAll, setShowingAll] = useState(false);
  const [commentCountMismatch, setCommentCountMismatch] = useState(false);
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Lấy hàm updateCommentCount từ context
  const { updateCommentCount } = usePostContext();

  const {
    data: commentsData,
    isError: isCommentsError,
    error: commentsError,
    refetch,
    isLoading: isCommentsLoading,
    isFetching,
  } = usePostComments(postId, {
    refetchInterval: 120000, // Tăng lên 2 phút để giảm tải
    staleTime: 90000, // Tăng lên 1.5 phút
    cacheTime: 5 * 60 * 1000,
    retry: 1,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    queryKey: [`post-comments-${postId}-${forceRefreshKey}`],
  });

  // Hiển thị skeleton trong quá trình loading ban đầu hoặc refresh
  const CommentSkeleton = () => (
    <div className="animate-pulse flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gray-300/50"></div>
      <div className="flex-1">
        <div className="h-5 w-40 bg-gray-300/50 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-300/50 rounded mb-2"></div>
        <div className="h-4 w-3/4 bg-gray-300/50 rounded"></div>
      </div>
    </div>
  );

  // Hàm để làm mới comments
  const handleRefresh = () => {
    setLoading(true);
    refetch()
      .then(() => {
        // Không cần set loading = false ở đây vì đã xử lý trong useEffect
      })
      .catch(() => {
        // Đảm bảo tắt loading nếu có lỗi
        setLoading(false);
      });
  };

  // Force refresh from server by changing the query key
  const handleForceRefresh = () => {
    setLoading(true);
    setForceRefreshKey((prev) => prev + 1);
    // Clear any existing comments to prevent flashing
    setComments([]);
    // Không cần set loading = false ở đây vì đã xử lý trong useEffect khi query hoàn tất
  };

  // Render a comments header with refresh button
  const renderCommentsHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-base font-medium text-[var(--color-text-primary)]">
        {t("comment.comments")}
      </h3>
      <button
        onClick={handleRefresh}
        className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
        {t("common.refresh")}
      </button>
    </div>
  );

  // Sửa lại handleDirectFetch để dùng đường dẫn API thay thế
  const handleDirectFetch = async () => {
    setLoading(true);

    try {
      // Generate a unique timestamp to bypass all caching layers
      const timestamp = Date.now();
      const cacheBuster = Math.random().toString(36).substring(2, 15);

      // Request comments directly from the server with aggressive cache bypass
      const response = await axiosService.get(`/posts/${postId}/comments`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        params: {
          timestamp: timestamp,
          _: cacheBuster, // Add random string to ensure URL is always unique
        },
      });

      if (response?.data?.data?.comments) {
        // Process comments
        const commentData = response.data.data.comments;
        const processedComments = processComments(commentData);

        // Update state
        setComments(processedComments);
        setCommentCountMismatch(false);
        setError(""); // Clear any previous errors
      } else {
        console.warn(
          "[PostComments] Direct API call returned invalid data structure"
        );
        // Không hiển thị thông báo lỗi - chỉ ghi log
        setError("");
      }
    } catch (err) {
      console.error("[PostComments] Direct fetch error:", err);
      // Không hiển thị thông báo lỗi - chỉ ghi log
      setError("");
    } finally {
      // Đảm bảo luôn tắt loading state sau khi xử lý xong
      setLoading(false);
    }
  };

  // Set comments từ dữ liệu query - sử dụng memo để chỉ cập nhật khi thực sự có thay đổi
  useEffect(() => {
    if (commentsData && commentsData.data) {
      const commentsArray = commentsData.data.comments || [];
      const commentsCount = commentsData.data.commentsCount || 0;

      // Kiểm tra sự không nhất quán
      const hasMismatch = commentsCount > 0 && commentsArray.length === 0;

      if (hasMismatch !== commentCountMismatch) {
        setCommentCountMismatch(hasMismatch);
      }

      // If comment count shows comments exist but none were loaded, automatically try direct fetch
      if (hasMismatch) {
        if (!loading) {
          handleDirectFetch();
        }
      }

      // Set comments from API
      if (commentsArray && commentsArray.length > 0) {
        // Process comments to ensure correct structure
        const processedComments = processComments(commentsArray);
        setComments(processedComments);
      }

      // Set pagination information
      setHasMore(page < (commentsData.data.totalPages || 1));

      // Kết thúc trạng thái loading khi nhận được dữ liệu
      setLoading(false);
    }
  }, [commentsData, commentCountMismatch]);

  // Set error from the query
  useEffect(() => {
    if (isCommentsError && commentsError) {
      console.error("Error fetching comments:", commentsError);
      // Không hiển thị lỗi cho người dùng, chỉ ghi log
      setError("");
      setLoading(false);
    }
  }, [isCommentsError, commentsError]);

  // Thêm useEffect mới để kết thúc trạng thái loading khi isCommentsLoading = false
  useEffect(() => {
    if (!isCommentsLoading && !isFetching) {
      setLoading(false);
    }
  }, [isCommentsLoading, isFetching]);

  // Cập nhật hàm handleCommentAdded để đảm bảo cấu trúc phân cấp
  const handleCommentAdded = (newComment, tempIdToRemove = null) => {
    if (tempIdToRemove) {
      setComments((prevComments) => {
        // Tạo bản sao mới của tất cả comments
        const updatedComments = [...prevComments];

        // Tìm và xóa comment tạm thời từ root comments
        const rootCommentIndex = updatedComments.findIndex(
          (comment) => comment._id === tempIdToRemove
        );

        if (rootCommentIndex !== -1) {
          updatedComments.splice(rootCommentIndex, 1);
          return updatedComments;
        }

        // Nếu không tìm thấy ở root, tìm kiếm trong replies của mỗi comment
        return updatedComments.map((comment) => {
          if (comment.replies.some((reply) => reply._id === tempIdToRemove)) {
            return {
              ...comment,
              replies: comment.replies.filter(
                (reply) => reply._id !== tempIdToRemove
              ),
            };
          }
          return comment;
        });
      });
      return;
    }

    if (!newComment) return;

    // Thêm comment mới vào đúng vị trí
    setComments((prevComments) => {
      // Kiểm tra xem comment đã tồn tại chưa để tránh trùng lặp
      const commentExists = prevComments.some(
        (comment) => comment._id === newComment._id
      );
      if (commentExists) {
        return prevComments;
      }

      // Nếu là comment gốc (không có parentId)
      if (!newComment.parentId) {
        return [newComment, ...prevComments];
      }

      // Nếu là reply cho một comment khác
      return prevComments.map((comment) => {
        if (comment._id === newComment.parentId) {
          // Kiểm tra xem reply đã tồn tại trong parent comment chưa
          const replyExists = comment.replies.some(
            (reply) => reply._id === newComment._id
          );
          if (replyExists) {
            return comment;
          }

          // Thêm vào replies của comment cha
          return {
            ...comment,
            replies: [newComment, ...comment.replies],
          };
        }
        return comment;
      });
    });

    // Cập nhật số lượng comment trong commentsData
    if (commentsData && commentsData.data) {
      const newCount = (commentsData.data.commentsCount || 0) + 1;
      commentsData.data.commentsCount = newCount;
    }

    // Cập nhật số lượng comment trong cache toàn cục
    if (updateCommentCount) {
      updateCommentCount(postId, 1); // Tăng số lượng comment lên 1
    }

    // Only update mismatch flag if we need to
    if (commentCountMismatch) {
      setCommentCountMismatch(false);
    }
  };

  // Cập nhật hàm handleCommentDeleted để xử lý phân cấp
  const handleCommentDeleted = (commentId) => {
    setComments((prevComments) => {
      // Tìm và xóa ở root comments
      const commentIndex = prevComments.findIndex((c) => c._id === commentId);
      if (commentIndex !== -1) {
        const newComments = [...prevComments];
        newComments.splice(commentIndex, 1);
        return newComments;
      }

      // Tìm và xóa trong replies
      return prevComments.map((comment) => {
        const replyIndex = comment.replies.findIndex(
          (r) => r._id === commentId
        );
        if (replyIndex !== -1) {
          return {
            ...comment,
            replies: comment.replies.filter((r) => r._id !== commentId),
          };
        }
        return comment;
      });
    });

    // Giảm số lượng comment trong commentsData khi xóa
    if (
      commentsData &&
      commentsData.data &&
      commentsData.data.commentsCount > 0
    ) {
      const newCount = commentsData.data.commentsCount - 1;
      commentsData.data.commentsCount = newCount;
    }

    // Cập nhật số lượng comment trong cache toàn cục
    if (updateCommentCount) {
      updateCommentCount(postId, -1); // Giảm số lượng comment đi 1
    }
  };

  // Load more comments from API
  const loadMoreComments = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setPage((prevPage) => prevPage + 1);

    try {
      // Sửa lại thành posts (số nhiều) để khớp với cấu hình server
      const response = await axiosService.get(`/posts/${postId}/comments`, {
        params: {
          page: page + 1,
          limit: limit,
        },
      });

      if (response.data.success) {
        const newComments = response.data.data.comments;
        // Xử lý comments mới
        const processedNewComments = processComments(newComments);
        setComments((prev) => [...prev, ...processedNewComments]);
        setHasMore(page + 1 < response.data.data.totalPages);
      } else {
        console.error("Failed to load more comments:", response.data.error);
      }
    } catch (fetchError) {
      console.error("Error loading more comments:", fetchError);
    } finally {
      setLoading(false);
    }
  };

  // Show more locally (without API call) - chỉnh sửa để hiển thị thêm 3 comment mỗi lần
  const showMoreComments = () => {
    setDisplayLimit((prevLimit) => prevLimit + 3); // Tăng thêm 3 comment mỗi lần

    // Nếu đã hiển thị hết thì đánh dấu là đã hiển thị tất cả
    if (displayLimit + 3 >= comments.length) {
      setShowingAll(true);
    }
  };

  // Get displayed comments based on limit
  const displayedComments = comments.slice(0, displayLimit);
  const hasMoreToShow = !showingAll && comments.length > displayLimit;

  // Hiển thị skeleton trong quá trình loading ban đầu hoặc refresh
  const renderSkeletons = () => {
    return Array(3)
      .fill(0)
      .map((_, index) => <CommentSkeleton key={`skeleton-${index}`} />);
  };

  // Xử lý cấu trúc dữ liệu comments
  const processComments = (rawComments) => {
    if (!Array.isArray(rawComments) || rawComments.length === 0) {
      return [];
    }

    // Khởi tạo Map với kích thước dựa trên số lượng comments để tối ưu bộ nhớ
    const commentsMap = new Map();
    const rootComments = [];

    // Pass đầu tiên: Tạo đối tượng cơ bản cho mỗi comment và lưu vào Map
    for (let i = 0; i < rawComments.length; i++) {
      const comment = rawComments[i];

      // Chuẩn hóa dữ liệu author/userId để đảm bảo tính nhất quán
      const normalizedComment = {
        ...comment,
        replies: comment.replies || [],
        // Đảm bảo trường author luôn tồn tại
        author: comment.author || comment.userId,
        // Đảm bảo trường userId luôn tồn tại
        userId: comment.userId || comment.author,
        // Đảm bảo các trường khác luôn có giá trị mặc định
        likesCount: comment.likesCount || 0,
        likes: comment.likes || [],
      };

      commentsMap.set(comment._id.toString(), normalizedComment);
    }

    // Pass thứ hai: Xây dựng cấu trúc cây comments
    for (const comment of commentsMap.values()) {
      const commentId = comment._id.toString();

      // Kiểm tra xem comment đã có mảng replies chứa dữ liệu
      if (Array.isArray(comment.replies) && comment.replies.length > 0) {
        // Chuẩn hóa các replies này
        comment.replies = comment.replies.map((reply) => {
          // Nếu reply chỉ là ID, lấy từ map
          if (
            typeof reply === "string" ||
            (reply && !reply.content && !reply.author)
          ) {
            const replyId =
              typeof reply === "string" ? reply : reply._id.toString();
            const fullReply = commentsMap.get(replyId);
            if (fullReply) {
              return {
                ...fullReply,
                parentId: commentId,
              };
            }
          }

          // Nếu là đối tượng đầy đủ
          const normalizedReply = {
            ...reply,
            author: reply.author || reply.userId,
            userId: reply.userId || reply.author,
            likesCount: reply.likesCount || 0,
            likes: reply.likes || [],
            parentId: commentId,
          };

          // Cập nhật hoặc thêm vào map
          commentsMap.set(reply._id.toString(), normalizedReply);

          return normalizedReply;
        });

        // Đảm bảo không có trùng lặp trong rootComments
        if (!rootComments.some((c) => c._id.toString() === commentId)) {
          rootComments.push(comment);
        }
      } else if (comment.parentId) {
        // Đây là reply, tìm parent comment
        const parentId = comment.parentId.toString();
        const parentComment = commentsMap.get(parentId);

        if (parentComment) {
          // Kiểm tra trùng lặp trong replies của parent
          const alreadyInReplies = parentComment.replies.some(
            (reply) => reply._id.toString() === commentId
          );

          if (!alreadyInReplies) {
            parentComment.replies.push(comment);
          }
        } else {
          // Tránh trùng lặp trong rootComments
          if (!rootComments.some((c) => c._id.toString() === commentId)) {
            rootComments.push(comment);
          }
        }
      } else {
        // Comment gốc không có replies trong dữ liệu ban đầu
        if (!rootComments.some((c) => c._id.toString() === commentId)) {
          rootComments.push(comment);
        }
      }
    }

    // Sắp xếp replies theo thời gian (cũ đến mới)
    for (const comment of rootComments) {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
    }

    return rootComments;
  };

  // Thêm useEffect để khởi tạo và reset state khi component mount
  useEffect(() => {
    // Khi component mount, cập nhật trạng thái loading dựa vào isCommentsLoading
    setLoading(isCommentsLoading);

    // Reset các state quan trọng
    setError("");
    setCommentCountMismatch(false);

    return () => {
      // Cleanup khi component unmount
    };
  }, [postId, forceRefreshKey]); // Chạy lại khi postId hoặc forceRefreshKey thay đổi

  return (
    <div className="space-y-5 px-2">
      {/* Comment header and input form */}
      <div className="border-t border-[var(--color-border)] pt-4 mt-4 mb-5 px-2.5">
        {/* Comment count and most relevant filter */}
        {(comments.length > 0 || commentCountMismatch) &&
          renderCommentsHeader()}

        {/* Comment input */}
        <CommentForm postId={postId} onCommentAdded={handleCommentAdded} />
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 text-[13px]">
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
            {error}
          </div>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length > 0 ? (
          <div className="rounded-lg">
            {/* Hiển thị các comments đã tải */}
            {displayedComments.map((comment) => (
              <Comment
                key={comment._id}
                postId={postId}
                comment={comment}
                onDelete={(id) => handleCommentDeleted(id)}
              />
            ))}

            {/* Hiển thị skeleton nếu đang tải thêm */}
            {isFetching && !isCommentsLoading && renderSkeletons()}

            {/* Show more button for local comments */}
            {hasMoreToShow && (
              <div className="flex justify-center my-4">
                <button
                  onClick={showMoreComments}
                  className="py-2 px-4 text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] rounded-full transition-colors flex items-center gap-2 shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[var(--color-primary)]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-medium text-sm">
                    {t("comment.seeMoreComments", {
                      count: Math.min(3, comments.length - displayLimit),
                      postProcess: "interval",
                      count_one: t("comment.commentCount.one"),
                      count_other: t("comment.commentCount.other"),
                    })}
                  </span>
                </button>
              </div>
            )}

            {/* Load more button from API (only shown if all local comments are displayed) */}
            {!hasMoreToShow && hasMore && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={loadMoreComments}
                  disabled={loading || isFetching}
                  className="py-2 px-5 text-[var(--color-text-secondary)] text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] rounded-full transition-colors text-[13px] font-medium shadow-sm"
                >
                  {loading || isFetching ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-t-[var(--color-primary)] border-[var(--color-primary)]/30 rounded-full animate-spin"></div>
                      <span>{t("common.loading")}</span>
                    </div>
                  ) : (
                    t("comment.loadMoreComments")
                  )}
                </button>
              </div>
            )}
          </div>
        ) : loading || isCommentsLoading ? (
          <div className="flex flex-col gap-4 py-4">{renderSkeletons()}</div>
        ) : commentCountMismatch ? (
          <div className="py-6 text-center bg-[var(--color-bg-secondary)]/40 rounded-lg">
            <p className="text-[var(--color-text-secondary)] text-[15px] mb-3">
              {t("comment.loadingError")}
            </p>
            <div className="flex flex-col md:flex-row gap-2 justify-center">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                {t("comment.refreshComments")}
              </button>
              <button
                onClick={handleDirectFetch}
                className="px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg text-sm transition-colors"
              >
                {t("comment.bypassCache")}
              </button>
              <button
                onClick={handleForceRefresh}
                className="px-4 py-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg text-sm transition-colors"
              >
                {t("comment.forceReload")}
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-[var(--color-bg-secondary)]/40 rounded-lg">
            <p className="text-[var(--color-text-secondary)] text-[15px]">
              {t("comment.noCommentsYet")}
            </p>
            <button
              onClick={handleDirectFetch}
              className="mt-3 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              {t("comment.tryLoadComments")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostComments;
