import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import MessageList from "./MessageList";
import MessageChat from "./MessageChat";
import { useMessageContext } from "../../contexts/MessageContext";
import { useFriends } from "../../hooks/queries/useFriendQueries";
import { useFriend } from "../../contexts/FriendContext";
import {
  connectSocket,
  disconnectSocket,
  reconnectAndRefresh,
} from "../../services/socket";
import { FiRefreshCw } from "react-icons/fi";

const MessagesContainer = ({ userId }) => {
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const { setCurrentConversation, currentConversation } = useMessageContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: friendsData } = useFriends();
  const { friends: contextFriends } = useFriend();
  const [previousUserId, setPreviousUserId] = useState(null);

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

  // Ensure socket connection is active when component mounts
  useEffect(() => {
    // Ensure socket is connected when viewing messages
    connectSocket();

    // When leaving the messages page, disconnect the socket with navigation flag
    return () => {
      // Only disconnect if navigating away from messages page
      if (location.pathname.indexOf("/messages") !== 0) {
        disconnectSocket(true);
      }
    };
  }, [location.pathname]);

  // Memoize the select conversation function to avoid recreation on every render
  const selectConversation = useCallback(
    (friend) => {
      if (!friend || !friend._id) return;

      try {
        // Nếu đang ở conversation hiện tại, không cần thay đổi gì
        if (currentConversation && currentConversation._id === friend._id) {
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
      } catch (error) {
        console.error("Error selecting conversation:", error);
        // Hiển thị thông báo lỗi hoặc xử lý theo cách phù hợp
      }
    },
    [setCurrentConversation, currentConversation]
  );

  // Effect to handle conversation changes - ensure socket reconnection
  useEffect(() => {
    if (
      previousUserId &&
      currentConversation &&
      previousUserId !== currentConversation._id
    ) {
      // When changing conversation partners, reconnect the socket
      // This ensures a clean state for the new conversation
      console.log("Switching conversation, refreshing socket connection");

      // Temporarily disconnect and reconnect the socket
      const reconnectSocket = async () => {
        // Temporary disconnect with navigation flag
        disconnectSocket(true);

        // Small delay to allow socket to disconnect properly
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Reconnect with a fresh connection
        connectSocket();
      };

      reconnectSocket();
    }
  }, [previousUserId, currentConversation]);

  // Set current conversation based on userId from URL
  useEffect(() => {
    // Skip if no userId or no friends loaded yet
    if (!userId || !allFriends || allFriends.length === 0) return;

    // Skip if already viewing the right conversation
    if (currentConversation && currentConversation._id === userId) return;

    try {
      // Find the friend by userId with safe null checks
      const selectedFriend = allFriends.find(
        (friend) => friend && friend._id === userId
      );

      if (selectedFriend && selectedFriend._id) {
        selectConversation(selectedFriend);
      } else {
        console.warn(`Friend with ID ${userId} not found in friends list`);
      }
    } catch (error) {
      console.error("Error finding friend:", error);
    }
  }, [userId, allFriends, currentConversation, selectConversation]);

  // Auto-select the first friend if no userId is provided and no current conversation
  useEffect(() => {
    // Skip if url has userId, or we don't have friends, or already have a conversation
    if (userId || !allFriends || allFriends.length === 0 || currentConversation)
      return;

    try {
      const firstFriend = allFriends[0];
      if (!firstFriend || !firstFriend._id) {
        console.warn("First friend is invalid or missing ID");
        return;
      }

      // Auto-select the first friend
      selectConversation(firstFriend);

      // Update URL to reflect the selected conversation
      navigate(`/messages/${firstFriend._id}`, { replace: true });
    } catch (error) {
      console.error("Error auto-selecting first friend:", error);
    }
  }, [allFriends, currentConversation, navigate, userId, selectConversation]);

  // For smaller screens, toggle between contacts list and chat
  const toggleMobileView = () => {
    setIsMobileListVisible(!isMobileListVisible);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full card shadow-md overflow-hidden border border-[var(--color-border)] bg-[var(--color-card-bg)] rounded-lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        {/* Mobile toggle button - only visible on small screens */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-[var(--color-border)]">
          <button
            onClick={toggleMobileView}
            className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium flex items-center shadow-sm hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            {isMobileListVisible ? "Show Chat" : "Show Contacts"}
          </button>
          <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
            {isMobileListVisible
              ? "Contacts"
              : currentConversation?.fullname ||
                currentConversation?.username ||
                "Chat"}
          </h2>
          {!isMobileListVisible && currentConversation && (
            <button
              onClick={() => {
                reconnectAndRefresh(currentConversation._id);
              }}
              className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] rounded-full transition-colors"
              title="Refresh chat"
            >
              <FiRefreshCw size={18} />
            </button>
          )}
        </div>

        {/* Contact list - hidden on mobile when chat is active */}
        <div
          className={`md:col-span-1 h-full border-r border-[var(--color-border)] ${
            !isMobileListVisible && "hidden md:block"
          } flex flex-col bg-[var(--color-bg-secondary)]`}
          style={{ isolation: "isolate" }}
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
          } overflow-hidden`}
          style={{ isolation: "isolate" }}
        >
          <MessageChat
            key={currentConversation?._id || "no-conversation"}
            onBackToList={() => setIsMobileListVisible(true)}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default MessagesContainer;
