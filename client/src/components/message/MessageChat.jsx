import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  BsPersonCircle,
  BsArrowLeft,
  BsThreeDotsVertical,
  BsCheckAll,
  BsCheck,
  BsEmojiSmile,
} from "react-icons/bs";
import { FiImage, FiSend, FiUserPlus, FiRefreshCw } from "react-icons/fi";
import { HiOutlineTrash } from "react-icons/hi";
import Avatar from "./../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useMessageContext } from "../../contexts/MessageContext";
import {
  useMessages,
  useMessageMutations,
} from "../../hooks/queries/useMessageQueries.js";
import ImagePicker from "../common/ImagePicker";
import { uploadImage } from "../../services/uploadService";
import LoadingSpinner from "../common/LoadingSpinner";
import { Link } from "react-router-dom";
import { useSocket } from "../../contexts/SocketContext";
import axiosService from "../../services/axiosService";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import OnlineStatus from "../common/OnlineStatus";

// Animation variants outside component
const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// Function for empty message state
const EmptyMessageState = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-[var(--color-text-secondary)] mb-2">
        {t("message.noMessages")}
      </p>
      <p className="text-sm text-[var(--color-text-tertiary)]">
        {t("message.startConversation")}
      </p>
    </div>
  );
};

// Function for conversation not selected state
const NoConversationSelected = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex justify-center items-center h-full bg-[var(--color-card-bg)] text-[var(--color-text-secondary)]"
    >
      <div className="text-center max-w-xs p-6">
        <div className="mb-6 flex justify-center">
          <FiSend
            size={46}
            className="opacity-30 text-[var(--color-primary)]"
          />
        </div>
        <h3 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">
          {t("message.noConversation")}
        </h3>
        <p className="text-sm mb-6">{t("message.selectFriend")}</p>
        <div className="flex justify-center">
          <Link
            to="/friends"
            className="px-4 py-2 bg-[var(--color-primary)] rounded-md text-white text-sm font-medium hover:bg-opacity-90 transition-all flex items-center gap-2"
          >
            <FiUserPlus size={16} />
            {t("message.findFriends")}
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// Prevent infinite render loops by memoizing the MessageChat component
const MessageChat = React.memo(function MessageChat({ onBackToList }) {
  const { t } = useTranslation();

  // Refs
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const processedMessageIds = useRef(new Set());
  const isComponentMounted = useRef(true);
  const markAsReadTimeoutRef = useRef(null);
  const lastConversationIdRef = useRef(null);
  const countedMessageIds = useRef(new Set());
  const prevConversationIdRef = useRef(null);

  // State
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(1);
  const [imageUploading, setImageUploading] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isShowScrollButton, setIsShowScrollButton] = useState(false);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  // Tin nhắn cục bộ (chưa xác nhận từ server)
  const [localMessages, setLocalMessages] = useState([]);
  const [errorState, setErrorState] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Context
  const { user } = useAuth();
  const { currentConversation, setCurrentConversation } = useMessageContext();
  const { markAsRead: socketMarkAsRead, subscribeToMessages } = useSocket();

  // Derived values
  const conversationId = currentConversation?._id;

  // Add message marking functionality
  const markAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await axiosService.patch(`/message/read-all`, {
        partnerId: conversationId,
      });
      return true;
    } catch (error) {
      console.error("Error marking messages as read:", error);
      return false;
    }
  }, []);

  const handleMarkAsRead = useCallback(async () => {
    if (!currentConversation?._id) return;

    const success = await markAsRead(currentConversation._id);
    if (success) {
      setNewMessageCount(0);
      setIsShowScrollButton(false);
      countedMessageIds.current.clear();
    }
  }, [currentConversation?._id, markAsRead]);

  // Function to increment message count only for new, uncounted messages
  const incrementMessageCount = useCallback(
    (message) => {
      // Skip if message is from current user
      const isSentByCurrentUser =
        message.senderId?._id === user?._id || message.senderId === user?._id;

      if (isSentByCurrentUser) return;

      // Skip if already counted this message
      if (countedMessageIds.current.has(message._id)) return;

      // Add to counted set and increment counter
      countedMessageIds.current.add(message._id);
      setNewMessageCount((prev) => prev + 1);
      setIsShowScrollButton(true);
    },
    [user?._id]
  );

  // Reset counted message IDs when conversation changes
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      countedMessageIds.current.clear();
      prevConversationIdRef.current = conversationId;
    }
  }, [conversationId]);

  // Kiểm tra dữ liệu hợp lệ và trạng thái loading
  useEffect(() => {
    if (currentConversation) {
      setIsLoadingConversation(false);

      if (!currentConversation._id) {
        console.error("Invalid conversation data:", currentConversation);
        setErrorState("Invalid conversation data. Please try again.");
        return;
      }

      // Reset error state if conversation data is valid
      setErrorState(null);

      // Ensure conversation is properly initialized
      if (!hasMarkedRead) {
        handleMarkAsRead();
        setHasMarkedRead(true);
      }
    } else {
      setIsLoadingConversation(false);
    }
  }, [currentConversation, hasMarkedRead]);

  // Improved error handling
  useEffect(() => {
    const handleError = (error) => {
      console.error("Global error caught:", error);
      setErrorState(error.message || "An error occurred. Please try again.");

      // Auto-retry for certain errors
      if (
        error.message?.includes("connection") ||
        error.message?.includes("network")
      ) {
        setTimeout(() => {
          if (conversationId) {
            window.dispatchEvent(
              new CustomEvent("force_message_refresh", {
                detail: { conversationId },
              })
            );
          }
        }, 3000);
      }
    };

    // Handle socket connection issues
    const handleSocketError = () => {
      setErrorState("Connection lost. Reconnecting...");

      if (conversationId) {
        setTimeout(() => {
          if (conversationId) {
            window.dispatchEvent(
              new CustomEvent("force_message_refresh", {
                detail: { conversationId },
              })
            );
          }
          setErrorState(null);
        }, 3000);
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("socket_disconnect", handleSocketError);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("socket_disconnect", handleSocketError);
    };
  }, [conversationId]);

  // Queries - chỉ query khi có conversation ID hợp lệ và không có lỗi
  const {
    data: messagesData,
    isLoading: loading,
    refetch,
  } = useMessages(
    conversationId,
    { page, limit: 20 },
    {
      enabled: !!conversationId && !errorState,
      retry: 3,
      retryDelay: 1000,
      onError: (error) => {
        console.error("Error loading messages:", error);
        // Nếu lỗi API, thử tải lại sau 3 giây
        setTimeout(() => {
          if (conversationId && isComponentMounted.current) {
            refetch();
          }
        }, 3000);
      },
    }
  );

  // Memoized values for messages that combines server messages with optimistic ones
  const messages = useMemo(() => {
    try {
      // Get base messages from server
      const serverMessages = messagesData?.messages || [];

      // Debug log to check if messages are loading correctly
      console.log(
        "Processing messages:",
        serverMessages.length,
        "server messages,",
        localMessages.length,
        "local messages"
      );

      // If we have local messages, merge them with server messages
      if (localMessages.length > 0) {
        const serverMessageIds = new Set(serverMessages.map((msg) => msg._id));
        const processedTempIds = new Set();

        // Create a map of message content+timestamp to detect duplicates
        const contentTimeMap = new Map();

        // First pass - record all server messages by content+time to detect duplicates
        serverMessages.forEach((msg) => {
          if (msg.message && msg.createdAt) {
            // Create a key that combines message content, type and approximate time (rounded to nearest 5 seconds)
            const timeApprox =
              Math.floor(new Date(msg.createdAt).getTime() / 5000) * 5000;
            const contentKey = `${msg.message}-${msg.type}-${timeApprox}`;
            contentTimeMap.set(contentKey, msg._id);
          }
        });

        // Filter local messages to only include those not yet in server response
        const pendingLocalMessages = localMessages.filter((msg) => {
          // Skip if no message content or created time
          if (!msg.message || !msg.createdAt) return false;

          // Check if this message already exists in server response by ID
          if (serverMessageIds.has(msg._id)) return false;

          // Check if a temp message has been confirmed and has a server ID now
          if (
            msg._id.startsWith("temp-") &&
            msg.previousTempId &&
            processedTempIds.has(msg.previousTempId)
          ) {
            return false;
          }

          // Check for content duplication - messages with same content sent within 5 seconds
          const timeApprox =
            Math.floor(new Date(msg.createdAt).getTime() / 5000) * 5000;
          const contentKey = `${msg.message}-${msg.type}-${timeApprox}`;

          if (contentTimeMap.has(contentKey)) {
            // This is likely a duplicate message - but only if it's a temporary message
            if (msg._id.startsWith("temp-")) {
              // Mark this temp ID as processed to filter out any other references
              processedTempIds.add(msg._id);
              return false;
            }
          }

          // If it's a new confirmed message with a previous temp ID, remember that temp ID
          if (!msg._id.startsWith("temp-") && msg.previousTempId) {
            processedTempIds.add(msg.previousTempId);
          }

          // Include this message in the final list
          return true;
        });

        // Deduplicate the final combined list as a safety measure
        const deduplicatedMessages = [
          ...serverMessages,
          ...pendingLocalMessages,
        ];
        const finalMessages = [];
        const seenIds = new Set();
        const seenContentTime = new Map();

        // Process newest messages first to keep them in case of duplication
        deduplicatedMessages.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        for (const msg of deduplicatedMessages) {
          // Skip if already seen this ID
          if (seenIds.has(msg._id)) continue;
          seenIds.add(msg._id);

          // Check for content duplication
          if (msg.message && msg.createdAt) {
            const timeApprox =
              Math.floor(new Date(msg.createdAt).getTime() / 5000) * 5000;
            const contentKey = `${msg.message}-${msg.type}-${timeApprox}`;

            if (seenContentTime.has(contentKey)) {
              // Skip temporary messages if we already have a content-duplicate
              if (msg._id.startsWith("temp-")) continue;

              // If the existing message is temporary and this one isn't, replace it
              const existingId = seenContentTime.get(contentKey);
              if (
                existingId.startsWith("temp-") &&
                !msg._id.startsWith("temp-")
              ) {
                finalMessages.splice(
                  finalMessages.findIndex((m) => m._id === existingId),
                  1
                );
              } else {
                // Skip if we already have a non-temporary with this content
                continue;
              }
            }

            seenContentTime.set(contentKey, msg._id);
          }

          finalMessages.push(msg);
        }

        // Sort by creation date (oldest first to display correctly)
        return finalMessages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      }

      // Sort messages by date (oldest first)
      return serverMessages.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    } catch (error) {
      console.error("Error processing messages:", error);
      return messagesData?.messages || [];
    }
  }, [messagesData?.messages, localMessages]);

  const hasMore = useMemo(
    () => messagesData?.hasMore || false,
    [messagesData?.hasMore]
  );

  const { sendMessage, markAllAsRead } = useMessageMutations();

  // Debounced mark as read function to prevent multiple API calls
  const debouncedMarkAsRead = useCallback(
    (convId) => {
      // Clear any existing timeout
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }

      // Set a new timeout
      markAsReadTimeoutRef.current = setTimeout(() => {
        if (isComponentMounted.current && !hasMarkedRead) {
          markAllAsRead.mutate(convId);
          setHasMarkedRead(true);
        }
      }, 300);
    },
    [markAllAsRead, hasMarkedRead]
  );

  // Effect to track component mount status (for async operation safety)
  useEffect(() => {
    isComponentMounted.current = true;

    // Ensure any error state is cleared when component mounts
    setErrorState(null);

    return () => {
      isComponentMounted.current = false;
      // Clear timeout on unmount
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  // Update useEffect for conversation change
  useEffect(() => {
    // Skip if no conversation or same conversation
    if (!conversationId) return;
    if (conversationId === lastConversationIdRef.current) return;

    // Update the last conversation ID ref
    lastConversationIdRef.current = conversationId;

    // Add delay before loading new conversation
    const transitionTimeout = setTimeout(() => {
      // Reset states
      setPage(1);
      setNewMessageCount(0);
      setIsFirstLoad(true);
      setHasMarkedRead(false);
      setLocalMessages([]);
      processedMessageIds.current.clear();
      countedMessageIds.current.clear();
      setErrorState(null);

      // Reset scroll position
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }

      // Force a clean refetch of messages for the new conversation
      if (conversationId) {
        refetch();
      }

      // Mark messages as read once with debounce
      debouncedMarkAsRead(conversationId);
    }, 300); // Reduced to 300ms for quicker response

    return () => {
      clearTimeout(transitionTimeout);
    };
  }, [conversationId, debouncedMarkAsRead, refetch]);

  // Scroll to bottom function with proper memoization
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesEndRef]);

  // Smooth scroll to bottom with a bit more delay for animation
  const scrollToBottomSmooth = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messagesEndRef]);

  // Handle marking messages as read
  const handleMarkMessagesAsRead = useCallback(() => {
    if (conversationId && !hasMarkedRead) {
      debouncedMarkAsRead(conversationId);
    }
  }, [conversationId, debouncedMarkAsRead, hasMarkedRead]);

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      scrollToBottomSmooth();
    }
  }, [messages, isAtBottom, scrollToBottomSmooth]);

  // Listen for urgent new messages via custom event
  useEffect(() => {
    const handleUrgentNewMessage = (event) => {
      try {
        // Check if this event has detail data with message info
        if (event.detail && event.detail.message && event.detail.partnerId) {
          const { message, partnerId, timestamp } = event.detail;

          // Check if this message is for the current conversation
          if (currentConversation && currentConversation._id === partnerId) {
            // CRITICAL FIX: Add to messages immediately
            setLocalMessages((prev) => {
              // Skip if already in local messages
              const alreadyExists = prev.some(
                (m) =>
                  m._id === message._id ||
                  (m.message === message.message &&
                    Math.abs(
                      new Date(m.createdAt) - new Date(message.createdAt)
                    ) < 5000)
              );
              if (alreadyExists) return prev;

              // Add to local state immediately
              return [
                ...prev,
                {
                  ...message,
                  _id: message._id || `urgent-${timestamp}`,
                  urgentUpdate: true,
                },
              ];
            });

            // Scroll to bottom for urgent messages
            setTimeout(scrollToBottomSmooth, 100);

            // Auto mark as read if we're at bottom
            if (isAtBottom) {
              handleMarkMessagesAsRead();
            } else {
              // Đếm tin nhắn mới sử dụng hàm tối ưu
              incrementMessageCount(message);
            }

            // Force a refetch in the background to sync with server
            setTimeout(() => refetch(), 500);
          }
        }
      } catch (error) {
        console.error("Error handling urgent message event:", error);
      }
    };

    // Add event listener with high priority
    window.addEventListener("urgent_new_message", handleUrgentNewMessage);

    // Clean up
    return () => {
      window.removeEventListener("urgent_new_message", handleUrgentNewMessage);
    };
  }, [currentConversation, refetch, isAtBottom, scrollToBottomSmooth, handleMarkMessagesAsRead, user, incrementMessageCount]);

  // Listen for regular conversation updates
  useEffect(() => {
    const handleConversationUpdated = (event) => {
      try {
        // Check if this event has detail data with message info
        if (event.detail && event.detail.message && event.detail.partnerId) {
          const { message, partnerId } = event.detail;

          // Check if this message is for the current conversation
          if (currentConversation && currentConversation._id === partnerId) {
            if (message._id && !message._id.startsWith("temp-")) {
              setLocalMessages((prev) => {
                // Avoid duplicates
                const alreadyExists = prev.some((m) => m._id === message._id);
                // Skip if already in local messages
                if (alreadyExists) return prev;
                return [...prev, message];
              });
            }

            // Force a refetch to ensure backend sync
            refetch();

            // Auto-scroll to bottom when new message arrives
            scrollToBottomSmooth();

            // Auto mark as read if we're at bottom
            if (isAtBottom) {
              handleMarkMessagesAsRead();
            } else {
              // Đếm tin nhắn mới sử dụng hàm tối ưu
              incrementMessageCount(message);
            }
          }
        }
      } catch (error) {
        console.error("Error handling conversation update event:", error);
      }
    };

    // Add event listener
    window.addEventListener("conversation_updated", handleConversationUpdated);

    // Clean up
    return () => {
      window.removeEventListener(
        "conversation_updated",
        handleConversationUpdated
      );
    };
  }, [currentConversation, refetch, isAtBottom, scrollToBottomSmooth, handleMarkMessagesAsRead, user, incrementMessageCount]);

  // Handle message processing after data loads
  useEffect(() => {
    // Skip if loading or no messages
    if (loading || !messages?.length || !conversationId || !user) return;

    // First load logic - just scroll to bottom and record messages
    if (isFirstLoad && messages.length > 0) {
      // Add all current messages to the processed set
      messages.forEach((msg) => {
        if (msg?._id) processedMessageIds.current.add(msg._id);
      });

      // Schedule scroll to bottom
      const timeoutId = setTimeout(() => {
        if (isComponentMounted.current) {
          scrollToBottom();
          setIsFirstLoad(false);

          // Mark as read on first load if not already done
          if (!hasMarkedRead && isAtBottom) {
            handleMarkMessagesAsRead();
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }

    // Find only the new messages (ones we haven't processed)
    const newMessages = messages.filter(
      (msg) => msg?._id && !processedMessageIds.current.has(msg._id)
    );

    // Skip if no new messages
    if (!newMessages.length) return;

    // Update processed set with new message IDs
    newMessages.forEach((msg) => {
      if (msg?._id) processedMessageIds.current.add(msg._id);
    });

    // Handle new message actions
    const hasOwnMessages = newMessages.some(
      (msg) => msg?.senderId?._id === user._id
    );

    if (hasOwnMessages) {
      // If user sent messages, scroll to bottom
      const timeoutId = setTimeout(() => {
        if (isComponentMounted.current) {
          scrollToBottom();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } else if (isAtBottom) {
      // If at bottom, mark messages as read only if not already done
      if (!hasMarkedRead) {
        handleMarkMessagesAsRead();
      }
    } else {
      // Chỉ xử lý tin nhắn từ người khác
      const newMessagesFromOthers = newMessages.filter(
        (msg) => msg?.senderId?._id !== user._id && msg?.senderId !== user._id
      );

      // Chỉ đếm tin nhắn không trùng lặp
      if (newMessagesFromOthers.length > 0) {
        // Lọc để tránh đếm trùng nội dung tin nhắn trong khoảng 5 giây
        const uniqueMessages = newMessagesFromOthers.filter((msg) => {
          // Kiểm tra tin nhắn có trùng nội dung với tin nhắn khác gần đây không
          const isDuplicate = messages.some(
            (existingMsg) =>
              existingMsg._id !== msg._id &&
              existingMsg.message === msg.message &&
              Math.abs(
                new Date(existingMsg.createdAt) - new Date(msg.createdAt)
              ) < 5000
          );
          return !isDuplicate;
        });

        // Đếm tin nhắn mới từng cái một để bảo đảm không trùng lặp
        uniqueMessages.forEach((msg) => {
          incrementMessageCount(msg);
        });
      }
    }
  }, [messages, conversationId, user, isFirstLoad, isAtBottom, scrollToBottom, handleMarkMessagesAsRead, loading, incrementMessageCount]);

  // Handle scrolling - detect bottom position and infinite scrolling
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    // Check for scroll to top (load older messages)
    if (scrollTop < 50 && hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      setPrevScrollHeight(scrollHeight);
      setPage((prevPage) => prevPage + 1);
    }

    // Check if scrolled to bottom
    const isAtBottomNow =
      Math.abs(scrollHeight - clientHeight - scrollTop) < 20;

    // Only update if changed to avoid unnecessary renders
    if (isAtBottomNow !== isAtBottom) {
      setIsAtBottom(isAtBottomNow);

      // If scrolled to bottom and there are new messages, mark as read
      if (isAtBottomNow && newMessageCount > 0) {
        setNewMessageCount(0);
        countedMessageIds.current.clear(); // Reset counted message IDs

        // Mark as read if not already done
        if (!hasMarkedRead && conversationId) {
          handleMarkMessagesAsRead();
        }
      }
    }
  }, [
    hasMore,
    loadingMore,
    loading,
    isAtBottom,
    newMessageCount,
    conversationId,
    handleMarkMessagesAsRead,
    hasMarkedRead,
  ]);

  // Handle maintaining scroll position when loading older messages
  useEffect(() => {
    if (
      !loading &&
      loadingMore &&
      prevScrollHeight > 0 &&
      chatContainerRef.current
    ) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeight;

      if (scrollDiff > 0) {
        chatContainerRef.current.scrollTop = scrollDiff;
      }

      setLoadingMore(false);
      setPrevScrollHeight(0);
    }
  }, [loading, loadingMore, prevScrollHeight]);

  // Gửi tin nhắn văn bản
  const handleSubmitMessage = useCallback(
    async (e) => {
      e?.preventDefault();

      const messageText = newMessage.trim();
      // Bỏ qua nếu không có nội dung tin nhắn hoặc không có người nhận
      if (!messageText || !currentConversation?._id) return;

      try {
        // Lưu nội dung tin nhắn hiện tại và làm sạch input
        const content = messageText;
        const receiverId = currentConversation._id;

        // Reset form ngay lập tức để UX tốt hơn
        setNewMessage("");
        setIsEmojiPickerOpen(false);

        // ****** PHẦN QUAN TRỌNG: FIX LỖI HIỂN THỊ TIN NHẮN ĐÚNG VỊ TRÍ ******
        // Vấn đề gốc rễ: Format senderId của client và server khác nhau
        // => Phải đảm bảo tin nhắn cục bộ có cấu trúc giống hệt tin nhắn server trả về
        const currentUserId = user?._id || user?.id;
        const tempId = `temp-${Date.now()}`; // Đổi sang temp- để nhất quán

        // Log thông tin user hiện tại để debug
        console.log("CURRENT USER DEBUG:", {
          id: currentUserId,
          user: user,
        });

        // Tạo tin nhắn tạm với định dạng GIỐNG HỆT tin nhắn server
        const tempMessage = {
          _id: tempId,
          message: content,
          type: "text",
          // QUAN TRỌNG: SenderID phải là CHÍNH XÁC định dạng server trả về
          // Từ API hook, đó là một object với _id
          senderId: {
            _id: currentUserId,
            username: user.username,
            avatar: user.avatar,
          },
          receiverId: receiverId,
          createdAt: new Date().toISOString(),
          status: "sending",
          // ĐÁNH DẤU CỨNG tin nhắn này từ user hiện tại
          // Đây là thuộc tính tùy chỉnh, chỉ cho frontend
          isFromCurrentUser: true,
          fromMe: true,
        };

        // Thêm vào danh sách tin nhắn để hiển thị ngay
        setLocalMessages((prev) => [...prev, tempMessage]);

        // Debug tin nhắn tạm
        console.log("DEBUG - Tin nhắn tạm:", {
          ...tempMessage,
          senderId: tempMessage.senderId,
          currentUserId,
        });

        // Cuộn xuống để hiển thị tin nhắn mới
        setTimeout(() => {
          scrollToBottom();
        }, 50);

        // Gửi tin nhắn đến server
        const response = await sendMessage.mutateAsync({
          receiverId: receiverId,
          message: content,
          type: "text",
        });

        console.log("DEBUG - Phản hồi từ server:", response);

        if (response && response._id) {
          // Cập nhật tin nhắn tạm với ID thực
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg._id === tempId
                ? {
                    ...msg,
                    _id: response._id,
                    status: "sent",
                    previousTempId: tempId,
                    // Tiếp tục đánh dấu cứng
                    isFromCurrentUser: true,
                    fromMe: true,
                  }
                : msg
            )
          );

          // Đảm bảo đánh dấu cứng message ID này là từ người dùng hiện tại
          // để giúp các lần tải lại trang nhận dạng đúng
          if (typeof window !== "undefined" && window.localStorage) {
            try {
              // Lưu ID tin nhắn đã gửi vào một danh sách trong localStorage
              const sentMessagesKey = `sent_messages_${currentUserId}`;
              const existingSentMessages = JSON.parse(
                localStorage.getItem(sentMessagesKey) || "[]"
              );
              existingSentMessages.push(response._id);
              // Giới hạn số lượng tin nhắn được lưu để tránh quá nhiều dữ liệu
              if (existingSentMessages.length > 100) {
                existingSentMessages.shift();
              }
              localStorage.setItem(
                sentMessagesKey,
                JSON.stringify(existingSentMessages)
              );
            } catch (err) {
              console.error("Lỗi khi lưu ID tin nhắn vào localStorage:", err);
            }
          }
        }
      } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
        toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      }
    },
    [newMessage, currentConversation, user, sendMessage, scrollToBottom]
  );

  // Handle input change
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
  }, []);

  // Listen for new messages from socket
  useEffect(() => {
    let unsubscribeMessages;

    if (currentConversation?._id) {
      // Đăng ký nhận tin nhắn mới qua socket
      unsubscribeMessages = subscribeToMessages(
        currentConversation._id,
        (newMsg) => {
          // Cập nhật UI với tin nhắn mới
          setLocalMessages((prev) => {
            // Kiểm tra tin nhắn đã tồn tại chưa
            const messageExists = prev.some((m) => m._id === newMsg._id);
            if (messageExists) return prev;
            return [...prev, newMsg];
          });

          // Kiểm tra xem có cần scroll xuống cuối không
          if (isAtBottom) {
            setTimeout(scrollToBottom, 100);
          } else {
            // Nếu không ở cuối, tăng số tin nhắn mới
            incrementMessageCount(newMsg);
          }

          // Đánh dấu tin nhắn đã đọc nếu người dùng đang ở cuối
          if (isAtBottom && newMsg.senderId !== user._id) {
            socketMarkAsRead({
              chatId: currentConversation._id,
              senderId: newMsg.senderId,
            });
          }
        }
      );
    }

    // Cleanup
    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
    };
  }, [currentConversation?._id, user?._id, subscribeToMessages, socketMarkAsRead, isAtBottom, scrollToBottom, incrementMessageCount]);

  // Reset mark as read state when conversation has unread messages
  useEffect(() => {
    if (messages.some((msg) => !msg.read && msg.senderId?._id !== user?._id)) {
      setHasMarkedRead(false);
    }
  }, [messages, user]);

  // Check scroll position to show/hide scroll button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScrollBtn = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setIsShowScrollButton(isScrolledUp);
    };

    container.addEventListener("scroll", handleScrollBtn);
    return () => {
      container.removeEventListener("scroll", handleScrollBtn);
    };
  }, []);

  // Send an image message
  const handleSendImage = async (imageUrl) => {
    if (!imageUrl || !conversationId) return;

    try {
      // Create a temporary message
      const tempMessageId = `temp-${Date.now()}`; // Đổi sang temp- để nhất quán
      const localMessage = {
        _id: tempMessageId,
        message: imageUrl,
        type: "image",
        senderId: user,
        receiverId: conversationId,
        createdAt: new Date().toISOString(),
        status: "sending",
        read: false,
        isFromCurrentUser: true, // Đánh dấu cứng
        fromMe: true, // Đánh dấu cứng
      };

      // Add to local messages
      setLocalMessages((prev) => [...prev, localMessage]);

      // Send the actual message
      const response = await sendMessage.mutateAsync({
        receiverId: conversationId,
        message: imageUrl,
        type: "image",
      });

      // Update status and store the previous temp ID
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempMessageId
            ? {
                ...msg,
                status: "sent",
                previousTempId: tempMessageId,
                _id: response.data.message._id || msg._id,
              }
            : msg
        )
      );

      setShowImagePicker(false);
    } catch (error) {
      console.error("Failed to send image:", error);
      // Mark as failed
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id.startsWith("temp-") ? { ...msg, status: "failed" } : msg
        )
      );
    }
  };

  // Handle file upload
  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImageUploading(true);

      // Create a temporary message with local preview
      const tempMessageId = `temp-${Date.now()}`; // Đổi sang temp- để nhất quán
      const localPreview = URL.createObjectURL(file);

      const localMessage = {
        _id: tempMessageId,
        message: localPreview,
        type: "image",
        senderId: user,
        receiverId: conversationId,
        createdAt: new Date().toISOString(),
        status: "sending",
        read: false,
        isFromCurrentUser: true, // Đánh dấu cứng
        fromMe: true, // Đánh dấu cứng
      };

      // Add to local messages
      setLocalMessages((prev) => [...prev, localMessage]);

      // Upload the image
      const imageUrl = await uploadImage(file);

      if (isComponentMounted.current) {
        // Update with real URL
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessageId ? { ...msg, message: imageUrl } : msg
          )
        );

        // Send the message
        const response = await sendMessage.mutateAsync({
          receiverId: conversationId,
          message: imageUrl,
          type: "image",
        });

        // Update status and ID, preserving the previous temp ID
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessageId
              ? {
                  ...msg,
                  status: "sent",
                  previousTempId: tempMessageId,
                  _id: response.data.message._id || msg._id,
                }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Mark as failed
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id.startsWith("temp-") ? { ...msg, status: "failed" } : msg
        )
      );
    } finally {
      if (isComponentMounted.current) {
        setImageUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = useCallback(
    (messageId) => {
      // Find the failed message
      const failedMessage = localMessages.find(
        (msg) => msg._id === messageId && msg.status === "failed"
      );

      if (!failedMessage) return;

      // Update status to sending
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, status: "sending" } : msg
        )
      );

      // Retry sending
      (async () => {
        try {
          const response = await sendMessage.mutateAsync({
            receiverId: conversationId,
            message: failedMessage.message,
            type: failedMessage.type,
          });

          // Update status to sent
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg._id === messageId
                ? {
                    ...msg,
                    status: "sent",
                    _id: response.data.message._id || msg._id,
                  }
                : msg
            )
          );
        } catch (err) {
          console.error("Failed to retry sending message:", err);
          // Mark as failed again
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg._id === messageId ? { ...msg, status: "failed" } : msg
            )
          );
        }
      })();
    },
    [localMessages, sendMessage, conversationId]
  );

  // Render message content with condition for sending status
  const renderMessageContent = useCallback((message) => {
    if (!message) return null;

    if (message.type === "text") {
      // Tăng padding bên phải nếu đang ở trạng thái sending để tránh đè lên
      const rightPadding =
        message.status === "sending" ? "pr-[80px]" : "pr-[45px]";
      return (
        <div
          className={`break-words text-sm leading-relaxed relative ${rightPadding}`}
        >
          {message.message}
        </div>
      );
    } else if (message.type === "image") {
      return (
        <div className="overflow-hidden rounded-lg cursor-pointer hover:opacity-95 transition-opacity relative">
          <img
            src={message.message}
            alt="Message"
            className="max-w-[200px] w-full object-cover"
            onClick={() => window.open(message.message, "_blank")}
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
            onLoad={(e) => {
              // If image is very tall, limit its height
              if (e.target.naturalHeight > e.target.naturalWidth * 1.5) {
                e.target.style.maxHeight = "250px";
              }
            }}
          />
        </div>
      );
    }
    return null;
  }, []);

  // Render message status indicator (based on status property)
  const renderMessageStatus = useCallback((message) => {
    if (!message) return null;

    // Determine status icon based on message state
    if (message.status === "sending") {
      return (
        <div className="flex items-center text-white/70">
          <span className="animate-pulse mr-1 text-[6px]">●</span>
          <span className="text-[8px]">Sending</span>
        </div>
      );
    } else if (message.status === "failed") {
      return (
        <div className="flex items-center text-red-400">
          <span className="mr-1 text-[8px]">!</span>
          <span className="text-[8px]">Error</span>
        </div>
      );
    } else if (message.read) {
      return <BsCheckAll className="text-white text-[10px]" />;
    } else {
      return <BsCheck className="text-white text-[10px]" />;
    }
  }, []);

  // Format message time with error handling
  const formatMessageTime = useCallback((time) => {
    if (!time) return "";
    try {
      return format(new Date(time), "p");
    } catch {
      return "";
    }
  }, []);

  // Function for rendering message list content with improved duplicate prevention
  const getMessageListContent = useCallback(() => {
    if (!messages.length || !user) {
      return !loading ? <EmptyMessageState /> : null;
    }

    // Create a map to track processed messages by ID
    const processedMessages = new Map();

    // First pass: identify duplicates and keep only the most recent version
    messages.forEach((message) => {
      if (!message || !message._id) return;

      // If this message ID already exists, only keep the newer version
      if (processedMessages.has(message._id)) {
        const existing = processedMessages.get(message._id);
        if (
          new Date(message.updatedAt || message.createdAt) >
          new Date(existing.updatedAt || existing.createdAt)
        ) {
          processedMessages.set(message._id, message);
        }
      } else {
        processedMessages.set(message._id, message);
      }
    });

    // Convert map back to array and sort by creation time
    const uniqueMessages = Array.from(processedMessages.values()).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    // Log để debug tin nhắn trước khi render
    console.log(
      "DEBUG MESSAGES BEFORE RENDER:",
      uniqueMessages.slice(-3).map((msg) => ({
        id: msg._id.substring(0, 8),
        message: msg.message?.substring(0, 10),
        senderId:
          typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId,
        currentUserId: user?._id || user?.id,
        isFromCurrentUser: msg.isFromCurrentUser,
        fromMe: msg.fromMe,
        isTemp: msg._id?.startsWith("temp_"),
      }))
    );

    // Use a set to track dates that have already been displayed
    const shownDates = new Set();
    const groups = [];

    // Generate message components
    uniqueMessages.forEach((message, index) => {
      if (!message || !message.createdAt || !message.senderId) return;

      try {
        const messageDate = new Date(message.createdAt);
        const messageDay = messageDate.toDateString();

        // Previous and next messages for grouping
        const prevMessage = index > 0 ? uniqueMessages[index - 1] : null;
        const nextMessage =
          index < uniqueMessages.length - 1 ? uniqueMessages[index + 1] : null;

        // Check if this is the first message of a day
        const isFirstMessageOfDay = !shownDates.has(messageDay);
        if (isFirstMessageOfDay) {
          shownDates.add(messageDay);

          // Add date separator
          groups.push(
            <div
              key={`date-${message._id}`}
              className="flex justify-center w-full my-2"
            >
              <div className="text-xs text-[var(--color-text-tertiary)] px-3 py-1 rounded-full bg-[var(--color-card-bg)] bg-opacity-40">
                {format(messageDate, "MMMM d, yyyy")}
              </div>
            </div>
          );
        }

        // ****** PHẦN QUAN TRỌNG: XÁC ĐỊNH TIN NHẮN CỦA NGƯỜI DÙNG HIỆN TẠI ******
        // Quy trình kiểm tra rõ ràng, theo thứ tự ưu tiên
        let isCurrentUser = false;

        // 0. Kiểm tra tin nhắn từ localStorage trước tiên
        const currentUserId = user?._id || user?.id;
        if (
          currentUserId &&
          message._id &&
          typeof window !== "undefined" &&
          window.localStorage
        ) {
          try {
            const sentMessagesKey = `sent_messages_${currentUserId}`;
            const sentMessages = JSON.parse(
              localStorage.getItem(sentMessagesKey) || "[]"
            );
            if (sentMessages.includes(message._id)) {
              isCurrentUser = true;
              // Log để debug khi tìm thấy tin nhắn trong localStorage
              if (message.message === "hi" || message.message.length < 5) {
                console.log(
                  `DEBUG - Tin nhắn ${
                    message.message
                  } (ID: ${message._id.substring(
                    0,
                    8
                  )}) tìm thấy trong localStorage, xác định là tin nhắn của người dùng hiện tại`
                );
              }
            }
          } catch {
            // Bỏ qua lỗi nếu có
          }
        }

        // 1. Nếu không tìm thấy trong localStorage, kiểm tra các trường đã được đánh dấu cứng từ frontend
        if (
          !isCurrentUser &&
          (message.isFromCurrentUser === true || message.fromMe === true)
        ) {
          isCurrentUser = true;
        }
        // 2. Kiểm tra trạng thái sending/status - tin nhắn đang gửi luôn là của người dùng hiện tại
        else if (message.status === "sending") {
          isCurrentUser = true;
        }
        // 3. Kiểm tra ID tạm thời - ID bắt đầu bằng 'temp_' luôn là của người dùng hiện tại
        else if (
          message._id &&
          typeof message._id === "string" &&
          (message._id.startsWith("temp-") || message._id.startsWith("temp_"))
        ) {
          isCurrentUser = true;
        }
        // 4. Cuối cùng, so sánh ID người gửi với ID người dùng hiện tại
        else {
          if (currentUserId) {
            // Đảm bảo chuyển đổi thành chuỗi trước khi so sánh
            // Nếu senderId là một object (định dạng từ server)
            if (typeof message.senderId === "object" && message.senderId?._id) {
              isCurrentUser =
                String(message.senderId._id) === String(currentUserId);
            }
            // Nếu senderId là một chuỗi
            else if (typeof message.senderId === "string") {
              isCurrentUser =
                String(message.senderId) === String(currentUserId);
            }
            // Trường hợp khác - senderId có thể là bất kỳ kiểu dữ liệu nào
            else if (message.senderId) {
              isCurrentUser =
                String(message.senderId) === String(currentUserId);
            }
          }
        }

        // 5. Kiểm tra phụ trợ cho tin nhắn mới nhất - chỉ áp dụng cho tin nhắn vừa mới gửi
        if (
          !isCurrentUser &&
          user &&
          newMessage &&
          newMessage.trim() === message.message
        ) {
          // So sánh thời gian tạo tin nhắn với thời gian hiện tại
          const messageTime = new Date(message.createdAt).getTime();
          const currentTime = new Date().getTime();
          const timeDiff = currentTime - messageTime;

          // Nếu tin nhắn được tạo trong vòng 10 giây gần đây
          if (timeDiff < 10000) {
            console.log(
              `DEBUG - Tin nhắn mới nhất "${message.message}" có nội dung giống với tin nhắn vừa gửi, được xác định là tin nhắn của người dùng hiện tại`
            );
            isCurrentUser = true;
          }
        }

        // Debug thêm cho tất cả tin nhắn "hi"
        if (message.message === "hi") {
          console.log(
            `DEBUG MESSAGE 'hi' (ID: ${
              message._id?.substring(0, 8) || "unknown"
            })`,
            {
              id: message._id,
              senderId:
                typeof message.senderId === "object"
                  ? message.senderId._id
                  : message.senderId,
              senderIdType: typeof message.senderId,
              currentUserId: user?._id || user?.id,
              userIdType: typeof (user?._id || user?.id),
              isCurrentUser: isCurrentUser,
              isFromCurrentUser: message.isFromCurrentUser,
              fromMe: message.fromMe,
              status: message.status,
              isTemp:
                message._id?.startsWith("temp-") ||
                message._id?.startsWith("temp_"),
            }
          );
        }

        // Check if messages are from the same sender for grouping (affects UI bubbles)
        const getSenderId = (msg) => {
          if (!msg || !msg.senderId) return null;
          return typeof msg.senderId === "object"
            ? msg.senderId._id
            : msg.senderId;
        };

        const currentSenderId = getSenderId(message);
        const prevSenderId = getSenderId(prevMessage);
        const nextSenderId = getSenderId(nextMessage);

        const isPrevSameSender = prevSenderId === currentSenderId;
        const isNextSameSender = nextSenderId === currentSenderId;

        // Check time gap between messages
        const timeDiff = prevMessage
          ? new Date(message.createdAt) - new Date(prevMessage.createdAt)
          : 0;

        // Add time separator for big gaps
        if (timeDiff > 15 * 60 * 1000) {
          groups.push(
            <div
              key={`time-${message._id}`}
              className="flex justify-center my-3"
            >
              <div className="text-xs text-[var(--color-text-tertiary)] px-3 py-0.5 rounded-full bg-[var(--color-card-bg)] bg-opacity-60">
                {format(messageDate, "h:mm a")}
              </div>
            </div>
          );
        }

        // Add the message bubble - LUÔN SỬ DỤNG BIẾN isCurrentUser ĐÃ XÁC ĐỊNH
        groups.push(
          <motion.div
            key={message._id}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            className={`flex flex-col ${
              isCurrentUser ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`flex ${
                isCurrentUser ? "justify-end" : "justify-start"
              } 
              ${isNextSameSender ? "mt-1" : "mt-2"} w-full`}
            >
              <div className={`flex flex-row items-start max-w-[85%]`}>
                {/* Avatar cho tin nhắn của người khác - CHỈ HIỂN THỊ KHI KHÔNG PHẢI NGƯỜI DÙNG HIỆN TẠI */}
                {!isCurrentUser && (
                  <div className="flex-shrink-0 mr-2">
                    {typeof message.senderId === "object" &&
                    message.senderId.avatar ? (
                      <Link to={`/profile/${message.senderId._id}`}>
                        <Avatar
                          src={message.senderId.avatar}
                          alt={message.senderId.username || "User"}
                          size="sm"
                          priority={true}
                        />
                      </Link>
                    ) : (
                      <Link to={`/profile/${message.senderId}`}>
                        <BsPersonCircle className="w-8 h-8 text-[var(--color-text-secondary)]" />
                      </Link>
                    )}
                  </div>
                )}

                {/* Message content */}
                <div className="max-w-full">
                  <div
                    className={`relative group px-3 py-2 rounded-2xl break-words 
                      ${
                        message.message && message.message.length <= 3
                          ? "min-w-[40px]"
                          : message.message && message.message.length <= 10
                          ? "min-w-[50px]"
                          : "min-w-[60px]"
                      } 
                      shadow-sm hover:shadow-md transition-shadow 
                      ${
                        isCurrentUser
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-[var(--color-card-bg-secondary)] text-[var(--color-text-primary)]"
                      } 
                      ${
                        isNextSameSender && isCurrentUser
                          ? "rounded-tr-md"
                          : isNextSameSender && !isCurrentUser
                          ? "rounded-tl-md"
                          : ""
                      } 
                      ${
                        isPrevSameSender && isCurrentUser
                          ? "rounded-br-md"
                          : isPrevSameSender && !isCurrentUser
                          ? "rounded-bl-md"
                          : ""
                      }`}
                    style={{
                      boxShadow: isCurrentUser
                        ? "0 1px 2px rgba(0,0,0,0.1)"
                        : "0 1px 2px rgba(0,0,0,0.15)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {renderMessageContent(message)}

                    {/* Status for current user's messages */}
                    {isCurrentUser && (
                      <div className="absolute bottom-2 right-2.5 flex items-center text-[8px] gap-1">
                        {message.status === "sending" ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center text-white/70">
                              <span className="animate-pulse mr-1 text-[6px]">
                                ●
                              </span>
                              <span className="text-[8px]">Sending</span>
                            </div>
                            <span className="text-white/70 text-[7px] mt-0.5">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <>
                            <span>{renderMessageStatus(message)}</span>
                            <span className="text-white/85">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Time for other's messages */}
                    {!isCurrentUser && (
                      <div className="absolute bottom-2 right-2.5 text-[8px] text-[var(--color-text-secondary)]">
                        {formatMessageTime(message.createdAt)}
                      </div>
                    )}
                  </div>

                  {/* Retry button for failed messages */}
                  {message.status === "failed" && isCurrentUser && (
                    <div className="text-right mt-1">
                      <button
                        onClick={() => handleRetryMessage(message._id)}
                        className="text-xs text-red-400 hover:text-red-600 bg-gray-800/40 px-2 py-0.5 rounded-full"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      } catch (err) {
        console.error("Error rendering message:", err, message);
      }
    });

    return groups;
  }, [
    messages,
    user,
    loading,
    renderMessageContent,
    renderMessageStatus,
    handleRetryMessage,
    formatMessageTime,
  ]);

  // Use the new function in place of the old messageListContent
  const messageListContent = useMemo(
    () => getMessageListContent(),
    [getMessageListContent]
  );

  // Listen for forced message refresh event
  useEffect(() => {
    const handleForceRefresh = (event) => {
      try {
        // Check if event applies to current conversation
        if (
          currentConversation &&
          event.detail?.conversationId === currentConversation._id
        ) {
          // Invalidate the query cache first to ensure fresh data
          window.dispatchEvent(
            new CustomEvent("clear_message_cache", {
              detail: { conversationId: currentConversation._id },
            })
          );

          // Force refetch with a small delay to allow cache clearing
          setTimeout(() => {
            if (isComponentMounted.current) {
              refetch();
            }
          }, 100);
        }
      } catch (error) {
        console.error("Error handling force refresh event:", error);
      }
    };

    window.addEventListener("force_message_refresh", handleForceRefresh);

    return () => {
      window.removeEventListener("force_message_refresh", handleForceRefresh);
    };
  }, [currentConversation, refetch]);

  // Listen for user online status updates
  useEffect(() => {
    const handleUserStatusUpdate = (event) => {
      const { userId, isOnline } = event.detail;

      // Check if this update is for the current conversation
      if (currentConversation && currentConversation._id === userId) {
        setCurrentConversation((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isOnline,
          };
        });
      }
    };

    // Add event listener
    window.addEventListener("user_status_updated", handleUserStatusUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("user_status_updated", handleUserStatusUpdate);
    };
  }, [currentConversation, setCurrentConversation]);

  // Add error UI rendering
  const renderError = () => {
    if (!errorState) return null;

    return (
      <div className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-md my-2">
        <p>{errorState}</p>
        <button
          onClick={() => {
            setErrorState(null);
            if (conversationId) {
              window.dispatchEvent(
                new CustomEvent("force_message_refresh", {
                  detail: { conversationId },
                })
              );
            }
          }}
          className="ml-2 text-sm underline hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  };

  // Tạo phần header chat hiển thị thông tin người nhận và trạng thái online
  const renderHeader = () => {
    if (!currentConversation) return null;

    return (
      <div className="flex items-center justify-between p-3 border-b border-[var(--color-border)] bg-[var(--color-card-bg)]">
        <div className="flex items-center">
          {/* Mobile back button */}
          <button
            onClick={onBackToList}
            className="lg:hidden mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Back to conversations"
          >
            <BsArrowLeft size={20} />
          </button>

          {/* User avatar */}
          <Link
            to={`/profile/${currentConversation.username}`}
            className="flex items-center"
          >
            <Avatar
              src={currentConversation.avatar || ""}
              alt={currentConversation.fullname || currentConversation.username}
              size="md"
              className="mr-2"
            />
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">
                {currentConversation.fullname || currentConversation.username}
              </div>
              <OnlineStatus
                userId={currentConversation._id}
                showText={true}
                className="mt-0.5"
              />
            </div>
          </Link>
        </div>

        <div className="flex items-center">
          {/* Refresh button */}
          <button
            onClick={() => {
              // Force a complete refresh of messages
              window.dispatchEvent(
                new CustomEvent("clear_message_cache", {
                  detail: { conversationId: currentConversation._id },
                })
              );
              setTimeout(() => refetch(), 100);
              toast.success(t("message.refreshed"));
            }}
            className="p-2 mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] rounded-full hover:bg-[var(--color-bg-hover)] transition-colors"
            title={t("message.refresh")}
          >
            <FiRefreshCw size={16} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
            >
              <BsThreeDotsVertical size={18} />
            </button>

            {/* Dropdown menu */}
            {showOptions && (
              <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] z-10">
                <button
                  onClick={() => {
                    setShowOptions(false);
                    // Đánh dấu tất cả tin nhắn đã đọc
                    markAllAsRead.mutate(currentConversation._id);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] flex items-center"
                >
                  <BsCheckAll className="mr-2" /> {t("message.markAllRead")}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(t("message.confirmClearChat"))) {
                      setShowOptions(false);
                      // Xóa toàn bộ lịch sử chat
                      window.dispatchEvent(
                        new CustomEvent("clear_message_cache", {
                          detail: { conversationId: currentConversation._id },
                        })
                      );
                      refetch();
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] flex items-center text-red-500"
                >
                  <HiOutlineTrash className="mr-2" /> {t("message.clearChat")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // The renderMessageArea function that handles all messaging states
  const renderMessageArea = () => {
    if (!currentConversation) {
      return <NoConversationSelected />;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentConversation._id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderError()}

          {/* Loading indicator only for loading more messages */}
          {loading && page > 1 && (
            <div className="flex justify-center my-2">
              <LoadingSpinner size="sm" />
            </div>
          )}

          {/* Empty state when no messages */}
          {!messages.length && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center h-64 text-center"
            >
              <p className="text-[var(--color-text-secondary)] mb-2">
                No messages yet
              </p>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                Say hello to start the conversation
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] px-4 py-2 rounded-full border border-[var(--color-primary)] flex items-center space-x-2"
              >
                <FiRefreshCw className="mr-1" />
                <span>Refresh messages</span>
              </button>
            </motion.div>
          )}

          {/* Message list */}
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-1"
            >
              {messageListContent}
              <div className="h-2" />
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </motion.div>
      </AnimatePresence>
    );
  };

  // Show loading state when changing conversation
  if (isLoadingConversation) {
    return (
      <div className="flex h-full">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  // Kiểm tra và phòng ngừa lỗi
  try {
    // If no conversation is selected, show the placeholder component instead
    if (!conversationId) {
      return <NoConversationSelected />;
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        {renderHeader()}

        {/* Messages container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          {renderMessageArea()}
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSubmitMessage}
          className="px-2 py-2 pt-3 mt-2 border-t border-[var(--color-border)] bg-[var(--color-card-bg)] flex items-center justify-between gap-2 sticky bottom-0 z-10 shadow-md"
        >
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-card-bg-hover)] rounded-full transition-colors flex items-center justify-center"
            >
              <FiImage size={18} />
            </button>

            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className={`p-2 ${
                isEmojiPickerOpen
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)]"
              } hover:text-[var(--color-primary)] hover:bg-[var(--color-card-bg-hover)] rounded-full transition-colors flex items-center justify-center`}
            >
              <BsEmojiSmile size={18} />
            </button>
          </div>

          <div className="flex-1 mx-2 relative">
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              placeholder={t("message.typeMessage")}
              className="w-full px-4 py-2 text-sm bg-[var(--color-card-bg-secondary)] rounded-[18px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] resize-none"
              style={{
                maxHeight: "100px",
                minHeight: "36px",
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
              }}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitMessage(e);
                }
              }}
            />
          </div>

          {imageUploading ? (
            <div className="p-2 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : (
            <button
              type="submit"
              disabled={!newMessage.trim() && !imageUploading}
              className={`p-2 rounded-full flex items-center justify-center ${
                newMessage.trim()
                  ? "text-[var(--color-primary)] hover:bg-[var(--color-card-bg-hover)]"
                  : "text-[var(--color-text-tertiary)]"
              } transition-colors`}
            >
              <FiSend size={18} />
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*"
            className="hidden"
          />
        </form>

        {/* Image Picker Modal */}
        {showImagePicker && (
          <ImagePicker
            onClose={() => setShowImagePicker(false)}
            onSelectImage={handleSendImage}
          />
        )}

        {/* Scroll to bottom button */}
        {isShowScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 right-4 bg-[var(--color-primary)] text-white rounded-full p-2 shadow-md hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering component:", error);
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-[var(--color-card-bg)]">
        <div className="p-4 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Lỗi hiển thị chat</h3>
          <p>{error.message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md"
        >
          Tải lại
        </button>
      </div>
    );
  }
});

export default MessageChat;
