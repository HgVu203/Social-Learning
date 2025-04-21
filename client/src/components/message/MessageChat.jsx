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
import {
  FiImage,
  FiSend,
  FiChevronDown,
  FiUserPlus,
  FiRefreshCw,
} from "react-icons/fi";
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
import { reconnectAndRefresh } from "../../services/socket";

// Animation variants outside component
const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

// Function for empty message state
const EmptyMessageState = () => (
  <div className="flex flex-col items-center justify-center h-64 text-center">
    <p className="text-[var(--color-text-secondary)] mb-2">No messages yet</p>
    <p className="text-sm text-[var(--color-text-tertiary)]">
      Say hello to start the conversation
    </p>
  </div>
);

// Function for conversation not selected state
const NoConversationSelected = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex justify-center items-center h-full bg-[var(--color-card-bg)] text-[var(--color-text-secondary)]"
  >
    <div className="text-center max-w-xs p-6">
      <div className="mb-6 flex justify-center">
        <FiSend size={46} className="opacity-30 text-[var(--color-primary)]" />
      </div>
      <h3 className="text-xl font-medium text-[var(--color-text-primary)] mb-2">
        No conversation selected
      </h3>
      <p className="text-sm mb-6">
        Select a friend from the list to start messaging or search for someone
        new to connect with.
      </p>
      <div className="flex justify-center">
        <Link
          to="/friends"
          className="px-4 py-2 bg-[var(--color-primary)] rounded-md text-white text-sm font-medium hover:bg-opacity-90 transition-all flex items-center gap-2"
        >
          <FiUserPlus size={16} />
          Find friends
        </Link>
      </div>
    </div>
  </motion.div>
);

// Prevent infinite render loops by memoizing the MessageChat component
const MessageChat = React.memo(function MessageChat({ onBackToList }) {
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
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [errorState, setErrorState] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  // Context
  const { user } = useAuth();
  const { currentConversation } = useMessageContext();

  // Derived values
  const conversationId = currentConversation?._id;

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

      if (!currentConversation._id || !currentConversation.username) {
        console.error("Invalid conversation data:", currentConversation);
        setErrorState("Invalid conversation data. Please try again.");
      } else {
        // Reset error state if conversation data is valid
        setErrorState(null);
      }
    } else {
      // Reset loading state when no conversation is selected
      setIsLoadingConversation(false);
    }
  }, [currentConversation]);

  // Kiểm tra lỗi
  useEffect(() => {
    const handleError = (error) => {
      console.error("Global error caught:", error);
      setErrorState(error.message);
    };

    // Xử lý lỗi kết nối Socket
    const handleSocketError = () => {
      console.log("Socket connection lost, attempting to reconnect...");
      // Thử kết nối lại socket sau 3 giây
      if (conversationId) {
        setTimeout(() => {
          reconnectAndRefresh(conversationId);
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
            console.log("Retrying to fetch messages for:", conversationId);
            refetch();
          }
        }, 3000);
      },
      onSuccess: (data) => {
        console.log(
          "Messages loaded successfully:",
          data?.messages?.length || 0,
          "messages"
        );
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
        optimisticMessages.length,
        "optimistic messages"
      );

      // If we have optimistic messages, merge them with server messages
      if (optimisticMessages.length > 0) {
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

        // Filter optimistic messages to only include those not yet in server response
        const pendingOptimisticMessages = optimisticMessages.filter((msg) => {
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
          ...pendingOptimisticMessages,
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
  }, [messagesData?.messages, optimisticMessages]);

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

  // Reset state when conversation changes
  useEffect(() => {
    // Skip if no conversation or same conversation
    if (!conversationId) return;
    if (conversationId === lastConversationIdRef.current) return;

    // Update the last conversation ID ref
    lastConversationIdRef.current = conversationId;

    // Reset states
    setPage(1);
    setNewMessageCount(0);
    setIsFirstLoad(true);
    setHasMarkedRead(false);
    setOptimisticMessages([]);
    processedMessageIds.current.clear();
    countedMessageIds.current.clear(); // Reset counted message IDs
    setErrorState(null); // Clear any error state on conversation change

    // Reset scroll position
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }

    // Force a clean refetch of messages for the new conversation
    setTimeout(() => {
      if (conversationId) {
        refetch();
      }
    }, 200);

    // Mark messages as read once with debounce
    debouncedMarkAsRead(conversationId);
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
        console.log("🔥 Urgent new message received!", event.detail);
        // Check if this event has detail data with message info
        if (event.detail && event.detail.message && event.detail.partnerId) {
          const { message, partnerId, timestamp } = event.detail;

          // Check if this message is for the current conversation
          if (currentConversation && currentConversation._id === partnerId) {
            console.log(
              "⚡ PRIORITY: Urgent new message for active conversation:",
              message
            );

            // CRITICAL FIX: Add to messages immediately
            setOptimisticMessages((prev) => {
              // Skip if already in optimistic messages
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
            console.log(
              "Received new message for current conversation:",
              message
            );

            // CRITICAL FIX: Immediately add this message to optimistic messages
            // to show it in the UI without waiting for refetch
            if (message._id && !message._id.startsWith("temp-")) {
              setOptimisticMessages((prev) => {
                // Avoid duplicates
                const alreadyExists = prev.some((m) => m._id === message._id);
                // Skip if already in optimistic messages
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

  // Send a text message
  const handleSendMessage = useCallback(
    async (event) => {
      if (event) event.preventDefault();
      if (!newMessage.trim() || !conversationId) return;

      try {
        // Clear input before sending to improve perceived performance
        const messageToSend = newMessage.trim();
        setNewMessage("");

        // Create a temporary message object with pending status
        const tempMessageId = `temp-${Date.now()}`;
        const optimisticMessage = {
          _id: tempMessageId,
          message: messageToSend,
          type: "text",
          senderId: user,
          receiverId: conversationId,
          createdAt: new Date().toISOString(),
          status: "sending", // Use status to track message state: sending, sent, delivered, read
          read: false,
        };

        // Update UI immediately with the optimistic message
        setOptimisticMessages((prev) => [...prev, optimisticMessage]);

        // Scroll to bottom to show the new message
        setTimeout(() => scrollToBottom(), 50);

        // Send the actual message
        const response = await sendMessage.mutateAsync({
          receiverId: conversationId,
          message: messageToSend,
          type: "text",
        });

        // Update the temporary message status to sent
        setOptimisticMessages((prev) =>
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
      } catch (err) {
        console.error("Failed to send message:", err);
        // Mark the message as failed
        setOptimisticMessages((prev) =>
          prev.map((msg) =>
            msg._id.startsWith("temp-") ? { ...msg, status: "failed" } : msg
          )
        );
      }
    },
    [newMessage, conversationId, sendMessage, user, scrollToBottom]
  );

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
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage = {
        _id: tempMessageId,
        message: imageUrl,
        type: "image",
        senderId: user,
        receiverId: conversationId,
        createdAt: new Date().toISOString(),
        status: "sending",
        read: false,
      };

      // Add to optimistic messages
      setOptimisticMessages((prev) => [...prev, optimisticMessage]);

      // Send the actual message
      const response = await sendMessage.mutateAsync({
        receiverId: conversationId,
        message: imageUrl,
        type: "image",
      });

      // Update status and store the previous temp ID
      setOptimisticMessages((prev) =>
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
      setOptimisticMessages((prev) =>
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
      const tempMessageId = `temp-${Date.now()}`;
      const localPreview = URL.createObjectURL(file);

      const optimisticMessage = {
        _id: tempMessageId,
        message: localPreview,
        type: "image",
        senderId: user,
        receiverId: conversationId,
        createdAt: new Date().toISOString(),
        status: "sending",
        read: false,
      };

      // Add to optimistic messages
      setOptimisticMessages((prev) => [...prev, optimisticMessage]);

      // Upload the image
      const imageUrl = await uploadImage(file);

      if (isComponentMounted.current) {
        // Update with real URL
        setOptimisticMessages((prev) =>
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
        setOptimisticMessages((prev) =>
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
      setOptimisticMessages((prev) =>
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
      const failedMessage = optimisticMessages.find(
        (msg) => msg._id === messageId && msg.status === "failed"
      );

      if (!failedMessage) return;

      // Update status to sending
      setOptimisticMessages((prev) =>
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
          setOptimisticMessages((prev) =>
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
          setOptimisticMessages((prev) =>
            prev.map((msg) =>
              msg._id === messageId ? { ...msg, status: "failed" } : msg
            )
          );
        }
      })();
    },
    [optimisticMessages, sendMessage, conversationId]
  );

  // Render message content with smaller padding
  const renderMessageContent = useCallback((message) => {
    if (!message) return null;

    if (message.type === "text") {
      return (
        <div className="break-words text-sm leading-relaxed relative pr-[45px]">
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

  // Memoize the message list for better performance
  const messageListContent = useMemo(() => {
    if (!messages.length || !user) {
      return !loading ? <EmptyMessageState /> : null;
    }

    // Render message groups
    return messages.reduce((groups, message, index) => {
      if (!message || !message.createdAt || !message.senderId) return groups;

      try {
        const messageDate = new Date(message.createdAt);
        const messageDay = messageDate.toDateString();

        const prevMessage =
          index < messages.length - 1 ? messages[index + 1] : null;
        const prevMessageDay =
          prevMessage && prevMessage.createdAt
            ? new Date(prevMessage.createdAt).toDateString()
            : null;

        // Cải thiện logic kiểm tra người gửi là chính mình
        let isCurrentUser = false;
        try {
          if (typeof message.senderId === "object") {
            isCurrentUser = message.senderId._id === user._id;
          } else {
            isCurrentUser = message.senderId === user._id;
          }
          // Debug log để kiểm tra
          console.log("Message ownership check:", {
            messageSenderId:
              typeof message.senderId === "object"
                ? message.senderId._id
                : message.senderId,
            currentUserId: user._id,
            isCurrentUser,
          });
        } catch (err) {
          console.error("Error determining message sender:", err);
          isCurrentUser = false;
        }

        // Check if next message is from same sender (for grouping)
        const nextMessage = index > 0 ? messages[index - 1] : null;
        const isNextSameSender =
          nextMessage && nextMessage.senderId && message.senderId
            ? typeof nextMessage.senderId === "object" &&
              typeof message.senderId === "object"
              ? nextMessage.senderId._id === message.senderId._id
              : nextMessage.senderId === message.senderId
            : false;

        // Check if previous message is from same sender (for grouping)
        const isPrevSameSender =
          prevMessage && prevMessage.senderId && message.senderId
            ? typeof prevMessage.senderId === "object" &&
              typeof message.senderId === "object"
              ? prevMessage.senderId._id === message.senderId._id
              : prevMessage.senderId === message.senderId
            : false;

        // Time difference between messages
        const timeDiff =
          prevMessage && prevMessage.createdAt
            ? new Date(message.createdAt) - new Date(prevMessage.createdAt)
            : 0;

        // Show date divider if day changes or it's the first message
        if (messageDay !== prevMessageDay || !prevMessage) {
          groups.push(
            <div
              key={`date-${message._id || index}`}
              className="flex justify-center my-4"
            >
              <div className="px-4 py-1.5 rounded-full bg-[var(--color-card-bg-secondary)] text-xs text-[var(--color-text-secondary)] shadow-sm backdrop-blur-sm bg-opacity-80 border border-[var(--color-border-light)] border-opacity-30">
                {format(messageDate, "MMMM d, yyyy")}
              </div>
            </div>
          );
        }

        // Add time divider if messages are more than 10 minutes apart and not from same sender
        if (timeDiff > 10 * 60 * 1000 && !isPrevSameSender) {
          groups.push(
            <div
              key={`time-${message._id || index}`}
              className="flex justify-center my-3"
            >
              <div className="text-xs text-[var(--color-text-tertiary)] px-3 py-0.5 rounded-full bg-[var(--color-card-bg)] bg-opacity-60">
                {format(messageDate, "h:mm a")}
              </div>
            </div>
          );
        }

        // Message bubble component
        groups.push(
          <motion.div
            key={message._id || `msg-${index}`}
            variants={messageVariants}
            initial="hidden"
            animate="visible"
            className={`flex ${
              isCurrentUser ? "justify-end" : "justify-start"
            } ${isNextSameSender ? "mt-1" : "mt-2.5"}`}
          >
            <div
              className={`flex flex-row items-start ${
                !isCurrentUser && isNextSameSender ? "pl-10" : ""
              }`}
            >
              {/* Luôn hiển thị avatar cho người khác nếu không phải message liền kề cùng người gửi */}
              {!isCurrentUser && !isNextSameSender && (
                <div className="flex-shrink-0 mr-2">
                  {typeof message.senderId === "object" &&
                  message.senderId.avatar ? (
                    <Avatar
                      src={message.senderId.avatar}
                      alt={message.senderId.username || "User"}
                      size="sm"
                    />
                  ) : (
                    <BsPersonCircle className="w-8 h-8 text-[var(--color-text-secondary)]" />
                  )}
                </div>
              )}

              {/* Message bubble with space for avatar alignment */}
              <div
                className={`${
                  !isCurrentUser && isNextSameSender ? "ml-10" : ""
                } max-w-full`}
              >
                <div
                  className={`relative group px-3 py-2 rounded-2xl break-words ${
                    message.message && message.message.length <= 3
                      ? "min-w-[40px]"
                      : message.message && message.message.length <= 10
                      ? "min-w-[50px]"
                      : "min-w-[60px]"
                  } shadow-sm hover:shadow-md transition-shadow ${
                    isCurrentUser
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-[var(--color-card-bg-secondary)] text-[var(--color-text-primary)]"
                  } ${
                    isNextSameSender && isCurrentUser
                      ? "rounded-tr-md"
                      : isNextSameSender && !isCurrentUser
                      ? "rounded-tl-md"
                      : ""
                  } ${
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

                  {/* Message status indicators for current user's messages - inline with text */}
                  {isCurrentUser && (
                    <div className="absolute bottom-2 right-2.5 flex items-center text-[8px]">
                      <span className="text-white/85 mr-0.5">
                        {formatMessageTime(message.createdAt)}
                      </span>
                      <span>{renderMessageStatus(message)}</span>
                    </div>
                  )}

                  {/* Show time for messages from other users - inline with text */}
                  {!isCurrentUser && (
                    <div className="absolute bottom-2 right-2.5 text-[8px] text-[var(--color-text-secondary)]">
                      {formatMessageTime(message.createdAt)}
                    </div>
                  )}
                </div>

                {/* Custom retry button for failed messages */}
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
          </motion.div>
        );

        return groups;
      } catch (err) {
        console.error("Error rendering message:", err);
        return groups;
      }
    }, []);
  }, [
    messages,
    user,
    loading,
    renderMessageContent,
    formatMessageTime,
    renderMessageStatus,
    handleRetryMessage,
  ]);

  // Listen for forced message refresh event
  useEffect(() => {
    const handleForceRefresh = (event) => {
      try {
        // Check if event applies to current conversation
        if (
          currentConversation &&
          event.detail?.conversationId === currentConversation._id
        ) {
          console.log(
            "Forced message refresh for conversation:",
            currentConversation._id
          );
          refetch();
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

  // The renderMessageArea function that handles all messaging states
  const renderMessageArea = () => {
    // Show loading state
    if (loading && page === 1) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[var(--color-text-secondary)]">
            Loading messages...
          </p>
        </div>
      );
    }

    // Kiểm tra và xử lý trường hợp không có tin nhắn từ server
    const hasServerMessages =
      messagesData?.messages && messagesData.messages.length > 0;
    const hasOptimisticMessages =
      optimisticMessages && optimisticMessages.length > 0;
    const noMessagesAtAll =
      !hasServerMessages && !hasOptimisticMessages && !loading;

    console.log("Message display status:", {
      hasServerMessages,
      hasOptimisticMessages,
      messagesCount: messages?.length || 0,
      loadingState: loading,
    });

    return (
      <>
        {/* Load more messages indicator */}
        {loading && page > 1 && (
          <div className="flex justify-center my-2">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {/* Load more button */}
        {!loading && hasMore && (
          <div className="flex justify-center my-2">
            <button
              onClick={() => {
                if (!loadingMore) {
                  setLoadingMore(true);
                  setPrevScrollHeight(
                    chatContainerRef.current?.scrollHeight || 0
                  );
                  setPage((prevPage) => prevPage + 1);
                }
              }}
              className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] px-4 py-2 rounded-full"
              disabled={loadingMore}
            >
              Load earlier messages
            </button>
          </div>
        )}

        {/* Empty state when no messages */}
        {noMessagesAtAll && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-[var(--color-text-secondary)] mb-2">
              No messages yet
            </p>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              Say hello to start the conversation
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] px-4 py-2 rounded-full border border-[var(--color-primary)]"
            >
              Refresh messages
            </button>
          </div>
        )}

        {/* Message list */}
        {(hasServerMessages || hasOptimisticMessages) && (
          <div className="space-y-1">{messageListContent}</div>
        )}

        {/* A div for scrolling to the bottom of the chat */}
        <div ref={messagesEndRef}></div>

        {/* New message notification when not at bottom */}
        {newMessageCount > 0 && !isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-full shadow-lg cursor-pointer z-10"
            onClick={() => {
              scrollToBottom();
              // Reset counter immediately on click
              setNewMessageCount(0);
            }}
          >
            <div className="flex items-center">
              <span className="mr-2">
                {/* Show exact count or 'New messages' */}
                {newMessageCount === 1
                  ? "1 new message"
                  : newMessageCount > 3
                  ? "New messages"
                  : `${newMessageCount} new messages`}
              </span>
              <FiChevronDown />
            </div>
          </motion.div>
        )}
      </>
    );
  };

  // Empty state when no conversation is selected
  if (!currentConversation) {
    return <NoConversationSelected />;
  }

  // Show loading state when changing conversation
  if (isLoadingConversation) {
    return (
      <div className="flex h-full justify-center items-center bg-[var(--color-card-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error state if error occurred
  if (errorState) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-[var(--color-card-bg)]">
        <div className="p-4 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Chat Display Error</h3>
          <p>{errorState}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md"
        >
          Reload
        </button>
      </div>
    );
  }

  // Kiểm tra và phòng ngừa lỗi
  try {
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 border-b border-[var(--color-border)] flex items-center bg-[var(--color-card-bg-secondary)] sticky top-0 z-10 shadow-sm"
        >
          <div className="md:hidden">
            <button
              onClick={onBackToList}
              className="p-2 mr-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-card-bg-hover)] rounded-full transition-colors"
            >
              <BsArrowLeft />
            </button>
          </div>
          <div className="flex-1 flex items-center">
            <div className="relative mr-2">
              {currentConversation?.avatar ? (
                <Avatar
                  src={currentConversation.avatar}
                  alt={currentConversation.username || "User"}
                  size="md"
                  className="border-2 border-[var(--color-primary-light)] border-opacity-30"
                />
              ) : (
                <BsPersonCircle className="w-9 h-9 text-[var(--color-text-secondary)]" />
              )}
              {currentConversation?.isOnline && (
                <span className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-card-bg-secondary)] shadow-sm"></span>
              )}
            </div>
            <div className="ml-3">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                {currentConversation?.fullname ||
                  currentConversation?.username ||
                  "User"}
              </h3>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {currentConversation?.isOnline ? "Active now" : "Offline"}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => {
                if (currentConversation && currentConversation._id) {
                  reconnectAndRefresh(currentConversation._id);
                }
              }}
              className="p-2 mr-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] rounded-full hover:bg-[var(--color-card-bg-hover)] transition-colors"
              title="Refresh messages"
            >
              <FiRefreshCw size={18} />
            </button>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-full hover:bg-[var(--color-card-bg-hover)] transition-colors"
            >
              <BsThreeDotsVertical />
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-2 py-2 w-48 bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] z-20"
                >
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-card-bg-hover)] text-[var(--color-text-error)] flex items-center"
                    onClick={() => setShowOptions(false)}
                  >
                    <HiOutlineTrash className="mr-2" />
                    Delete conversation
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-3 pb-6 bg-[var(--color-card-bg)] no-scrollbar"
          onScroll={handleScroll}
          style={{
            isolation: "isolate",
            height: "calc(100vh - 170px)",
            backgroundImage:
              "linear-gradient(to bottom, rgba(40, 40, 50, 0.2) 0%, rgba(30, 30, 40, 0) 100%)",
          }}
        >
          {renderMessageArea()}
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-2 border-t border-[var(--color-border)] bg-[var(--color-card-bg)] flex items-center justify-between gap-2"
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
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-card-bg-hover)] rounded-full transition-colors flex items-center justify-center"
            >
              <BsEmojiSmile size={18} />
            </button>
          </div>

          <div className="flex-1 mx-2 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
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
                  handleSendMessage(e);
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
