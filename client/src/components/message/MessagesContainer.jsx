import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import MessageList from "./MessageList";
import MessageChat from "./MessageChat";
import { useMessageContext } from "../../contexts/MessageContext";
import { useFriends } from "../../hooks/queries/useFriendQueries";
import { useFriend } from "../../contexts/FriendContext";
import { connectSocket, disconnectSocket } from "../../services/socket";
import { useSocket } from "../../contexts/SocketContext";

const MessagesContainer = ({ userId }) => {
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const { setCurrentConversation, currentConversation } = useMessageContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: friendsData } = useFriends();
  const { friends: contextFriends } = useFriend();
  const [previousUserId, setPreviousUserId] = useState(null);
  const { isConnected, forceReconnect } = useSocket();

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

  // Cải thiện kết nối socket khi component khởi tạo
  useEffect(() => {
    console.log("MessagesContainer mounted, ensuring socket connection");

    // Đảm bảo socket đã kết nối khi xem tin nhắn
    connectSocket();

    // Thử kết nối lại ngay nếu chưa kết nối
    if (!isConnected) {
      console.log("Socket not connected yet, forcing immediate reconnect");
      // Thử kết nối lại ngay lập tức
      forceReconnect();

      // Thử kết nối lại nhiều lần trong 10 giây đầu tiên
      const quickReconnectAttempts = [1000, 3000, 6000, 10000];
      quickReconnectAttempts.forEach((delay) => {
        setTimeout(() => {
          if (!isConnected) {
            console.log(`Retry connection after ${delay}ms`);
            forceReconnect();
          }
        }, delay);
      });
    }

    // Thiết lập interval để kiểm tra kết nối và thử lại nếu bị mất
    const checkInterval = setInterval(() => {
      if (!isConnected && currentConversation?._id) {
        console.log("Connection lost, attempting to reconnect...");
        // Thử kết nối lại socket
        forceReconnect();

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
  }, [location.pathname, isConnected, currentConversation, forceReconnect]);

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

  // Cải thiện xử lý khi thay đổi người chat
  const handleRefreshConversation = useCallback(() => {
    if (!currentConversation?._id) return;

    // Prevent simultaneous refreshes by using a timeout
    if (window.refreshTimeout) {
      clearTimeout(window.refreshTimeout);
    }

    // Kích hoạt refresh tin nhắn
    window.dispatchEvent(
      new CustomEvent("force_message_refresh", {
        detail: { conversationId: currentConversation._id },
      })
    );

    // Đặt lại trạng thái sau 2 giây
    window.refreshTimeout = setTimeout(() => {
      // Cleanup timeout
    }, 2000);
  }, [currentConversation]);

  // Effect to handle conversation changes
  useEffect(() => {
    if (
      previousUserId &&
      currentConversation &&
      previousUserId !== currentConversation._id
    ) {
      // When changing conversation partners
      console.log("Switching conversation, refreshing messages");

      // Just trigger a refresh for messages rather than reconnect socket
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
      {/* Alert for disconnected socket */}
      {!isConnected && (
        <div className="w-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 py-1 px-3 sm:px-4 text-xs sm:text-sm flex justify-between items-center">
          <span className="line-clamp-1">
            Connection lost. Messages will still load via API.
          </span>
          <button
            onClick={() => {
              forceReconnect();
              handleRefreshConversation();
            }}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium ml-2 sm:ml-4 py-0.5 px-2 text-xs rounded bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 whitespace-nowrap"
          >
            Reconnect
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        {/* Contact list - hidden on mobile when chat is active */}
        <div
          className={`md:col-span-1 h-full border-r border-[var(--color-border)] ${
            !isMobileListVisible && "hidden md:block"
          } flex flex-col bg-[var(--color-bg-secondary)] overflow-hidden`}
        >
          <div className="flex-1 overflow-hidden">
            <MessageList
              onSelectFriend={(friend) => {
                if (!friend || !friend._id) return;
                selectConversation(friend);
                // Update URL to reflect the selected conversation
                navigate(`/messages/${friend._id}`, { replace: true });
              }}
            />
          </div>
        </div>

        {/* Chat area - hidden on mobile when contact list is active */}
        <div
          className={`md:col-span-2 h-full ${
            isMobileListVisible && "hidden md:block"
          } overflow-hidden flex flex-col`}
        >
          <div className="flex-1 overflow-hidden">
            <MessageChat
              key={currentConversation?._id || "no-conversation"}
              onBackToList={() => setIsMobileListVisible(true)}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MessagesContainer;
