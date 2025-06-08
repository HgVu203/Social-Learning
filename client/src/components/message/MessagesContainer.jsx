import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import MessageList from "./MessageList";
import MessageChat from "./MessageChat";
import { useMessageContext } from "../../contexts/MessageContext";
import { useFriends } from "../../hooks/queries/useFriendQueries";
import { useFriend } from "../../contexts/FriendContext";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { useSocket } from "../../contexts/SocketContext";
import { useTranslation } from "react-i18next";
import { FiMessageSquare } from "react-icons/fi";
import { BsPersonCircle } from "react-icons/bs";

const MessagesContainer = ({ userId }) => {
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const { setCurrentConversation, currentConversation } = useMessageContext();
  const location = useLocation();
  const { data: friendsData } = useFriends();
  const { friends: contextFriends } = useFriend();
  const [previousUserId, setPreviousUserId] = useState(null);
  const socket = useSocket();
  const isConnected = socket?.isConnected || false;
  const { t } = useTranslation();

  // Combine friend sources to ensure we have data
  const allFriends = useMemo(() => {
    // Check if friendsData exists and has data property that is an array
    const dataFromQuery =
      friendsData?.data && Array.isArray(friendsData.data)
        ? friendsData.data
        : [];

    // Check if contextFriends is an array
    const dataFromContext = Array.isArray(contextFriends) ? contextFriends : [];

    // Combine both sources, preferring query data if available
    return dataFromQuery.length > 0 ? dataFromQuery : dataFromContext;
  }, [friendsData, contextFriends]);


  useEffect(() => {
    connectSocket();

    // Thử kết nối lại ngay nếu chưa kết nối
    if (!isConnected) {
      // Thử kết nối lại ngay lập tức
      if (socket && typeof socket.forceReconnect === "function") {
        socket.forceReconnect();
      } else {
        connectSocket();
      }

      // Thử kết nối lại nhiều lần trong 10 giây đầu tiên
      const quickReconnectAttempts = [1000, 3000, 6000, 10000];
      quickReconnectAttempts.forEach((delay) => {
        setTimeout(() => {
          if (!isConnected) {
            if (socket && typeof socket.forceReconnect === "function") {
              socket.forceReconnect();
            } else {
              connectSocket();
            }
          }
        }, delay);
      });
    }

    // Thiết lập interval để kiểm tra kết nối và thử lại nếu bị mất
    const checkInterval = setInterval(() => {
      if (!isConnected && currentConversation?._id) {
        // Thử kết nối lại socket
        if (socket && typeof socket.forceReconnect === "function") {
          socket.forceReconnect();
        } else {
          connectSocket();
        }

        // Kích hoạt refresh tin nhắn (sẽ dùng API nếu socket không hoạt động)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("force_message_refresh", {
              detail: { conversationId: currentConversation._id },
            })
          );
        }, 500);
      }
    }, 30000); // Kiểm tra mỗi 30 giây

    // When leaving the messages page, disconnect the socket with navigation flag
    return () => {
      clearInterval(checkInterval);

      // Only disconnect if navigating away from messages page
      if (location.pathname.indexOf("/messages") !== 0) {
        disconnectSocket(true);
      }
    };
  }, [location.pathname, isConnected, currentConversation, socket]);

  // Memoize the select conversation function to avoid recreation on every render
  const selectConversation = useCallback(
    (friend) => {
      if (!friend || !friend._id) return;

      try {
        // Nếu đang ở conversation hiện tại, không cần thay đổi gì
        if (currentConversation && currentConversation._id === friend._id) {
          // Đảm bảo giao diện người dùng di động được cập nhật
          setIsMobileListVisible(false);
          return;
        }

        // Store the previous conversation ID before updating
        if (currentConversation && currentConversation._id) {
          setPreviousUserId(currentConversation._id);
        }

        // Đặt currentConversation với dữ liệu đầy đủ để tránh lỗi
        setCurrentConversation({
          _id: friend._id,
          username: friend.username || "User",
          fullname: friend.fullname || friend.username || "User",
          avatar: friend.avatar || friend.profilePicture || "",
          isOnline: friend.isOnline || false,
        });

        // On mobile, show the chat when a conversation is selected
        setIsMobileListVisible(false);

        // Trigger a refresh of messages after a short delay
        setTimeout(() => {
          if (friend._id) {
            window.dispatchEvent(
              new CustomEvent("force_message_refresh", {
                detail: { conversationId: friend._id },
              })
            );
          }
        }, 100);
      } catch (error) {
        console.error("Error selecting conversation:", error);
        // Hiển thị thông báo lỗi hoặc xử lý theo cách phù hợp
      }
    },
    [setCurrentConversation, currentConversation]
  );

  // Effect to handle conversation changes
  useEffect(() => {
    if (
      previousUserId &&
      currentConversation &&
      previousUserId !== currentConversation._id
    ) {
      if (currentConversation._id) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("force_message_refresh", {
              detail: { conversationId: currentConversation._id },
            })
          );
        }, 200);
      }
    }
  }, [previousUserId, currentConversation]);

  // Auto-select the first friend if no userId is provided and no current conversation
  useEffect(() => {
    // Skip auto-selection completely - we want users to explicitly select a conversation
    // This removes the behavior of automatically selecting the first friend
    if (userId) {
      // Only process URL-based selection (when user explicitly clicks or navigates to a specific conversation)
      try {
        const selectedFriend = allFriends.find(
          (friend) => friend && friend._id === userId
        );

        if (selectedFriend && selectedFriend._id) {
          selectConversation(selectedFriend);
        }
      } catch (error) {
        console.error("Error finding friend from URL:", error);
      }
    }
  }, [allFriends, selectConversation, userId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full card shadow-md overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-bg)] rounded-lg"
    >
      {/* Mobile buttons to navigate between list and conversation */}
      <div className="flex lg:hidden bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        <button
          onClick={() => setIsMobileListVisible(true)}
          className={`w-1/2 text-center py-1.5 px-1 text-xs font-medium flex items-center justify-center ${
            isMobileListVisible
              ? "text-white bg-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-bold shadow-sm"
              : "text-[var(--color-text-primary)]"
          }`}
        >
          <FiMessageSquare className="mr-1 sm:mr-1.5" />
          <span className="truncate">{t("message.chats")}</span>
        </button>
        <button
          onClick={() => setIsMobileListVisible(false)}
          className={`w-1/2 text-center py-1.5 px-1 text-xs font-medium flex items-center justify-center ${
            !isMobileListVisible && currentConversation
              ? "text-white bg-[var(--color-primary)] border-b-2 border-[var(--color-primary)] font-bold shadow-sm"
              : "text-[var(--color-text-primary)]"
          }`}
          disabled={!currentConversation}
        >
          <BsPersonCircle className="mr-1 sm:mr-1.5" />
          <span className="truncate">
            {currentConversation
              ? currentConversation.fullname || currentConversation.username
              : t("message.chat")}
          </span>
        </button>
      </div>

      {/* Main container */}
      <div className="flex h-full">
        {/* Message list (conditional for mobile) */}
        <div
          className={`${
            isMobileListVisible ? "block" : "hidden"
          } lg:block lg:w-1/3 border-r border-[var(--color-border)] h-full bg-[var(--color-bg-secondary)]`}
        >
          <MessageList
            onSelectConversation={selectConversation}
            selectedUserId={currentConversation?._id}
          />
        </div>

        {/* Message chat (conditional for mobile) */}
        <div
          className={`${
            !isMobileListVisible ? "block" : "hidden"
          } lg:block lg:w-2/3 h-full`}
        >
          {currentConversation ? (
            <MessageChat
              recipientId={currentConversation._id}
              recipientName={
                currentConversation.fullname || currentConversation.username
              }
              recipientAvatar={currentConversation.avatar}
              onBack={() => setIsMobileListVisible(true)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center p-4 text-[var(--color-text-secondary)]">
              <div>
                <div className="text-5xl mb-3">💬</div>
                <h2 className="text-sm font-semibold mb-1.5 text-[var(--color-text-primary)]">
                  {t("message.noConversation")}
                </h2>
                <p className="text-xs">{t("message.selectFriend")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessagesContainer;
