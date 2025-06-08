import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FiSearch, FiMessageSquare, FiUsers } from "react-icons/fi";
import { useConversations } from "../../hooks/queries/useMessageQueries.js";
import {
  useFriends,
  // useFriendRequests,
} from "../../hooks/queries/useFriendQueries";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../common/Avatar";
import { formatTime } from "../../utils/format";
import EmptyPlaceholder from "../common/EmptyPlaceholder";
import { useFriend } from "../../contexts/FriendContext";
import { SkeletonList } from "../skeleton";
import { useTranslation } from "react-i18next";

const MessageList = ({ onSelectConversation, selectedUserId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { friends: contextFriends, fetchFriends } = useFriend();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats");

  // Local state for optimistic updates
  const [localFriends, setLocalFriends] = useState([]);
  // Flag to track initial data loading
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const { data: conversationsData, isLoading: isConversationsLoading } =
    useConversations();
  const { data: friendsData, isLoading: isFriendsLoading } = useFriends();
  // const { data: friendRequestsData } = useFriendRequests();

  // Tìm kiếm cục bộ không cần API
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const searchTermLower = searchQuery.toLowerCase();

    // Tạo một Map để lưu kết quả không trùng lặp (dựa trên ID)
    const uniqueResults = new Map();

    // 1. Tìm trong danh sách bạn bè
    if (Array.isArray(localFriends) && localFriends.length > 0) {
      localFriends.forEach((friend) => {
        if (!friend || !friend._id) return;

        const nameMatch = (friend.fullname || "")
          .toLowerCase()
          .includes(searchTermLower);
        const usernameMatch = (friend.username || "")
          .toLowerCase()
          .includes(searchTermLower);

        if (nameMatch || usernameMatch) {
          uniqueResults.set(friend._id, {
            ...friend,
            isFriend: true,
            resultType: "friend",
          });
        }
      });
    }

    // 2. Tìm trong danh sách cuộc trò chuyện
    if (Array.isArray(conversationsData) && conversationsData.length > 0) {
      conversationsData.forEach((conversation) => {
        if (!conversation?.participant?._id) return;

        const participant = conversation.participant;
        const nameMatch = (participant.fullname || "")
          .toLowerCase()
          .includes(searchTermLower);
        const usernameMatch = (participant.username || "")
          .toLowerCase()
          .includes(searchTermLower);

        if (nameMatch || usernameMatch) {
          uniqueResults.set(participant._id, {
            _id: participant._id,
            username: participant.username,
            fullname: participant.fullname,
            profilePicture: participant.profilePicture,
            isOnline: participant.isOnline || false,
            isFriend: true,
            hasConversation: true,
            lastMessage: conversation.lastMessage,
            unreadCount: conversation.unreadCount,
            resultType: "conversation",
            conversation: conversation,
          });
        }
      });
    }

    // Chuyển Map thành mảng kết quả
    return Array.from(uniqueResults.values());
  }, [searchQuery, localFriends, conversationsData]);

  // Fetch friends data when component mounts
  useEffect(() => {
    if (fetchFriends && !initialDataLoaded) {
      fetchFriends();
      setInitialDataLoaded(true);
    }
  }, [fetchFriends, initialDataLoaded]);

  useEffect(() => {
    // Check if friendsData is valid array data
    const hasFriendsData = friendsData?.data && Array.isArray(friendsData.data);

    // Also check if it's just a direct array (older data structure)
    const isDirectArray = Array.isArray(friendsData);

    if (hasFriendsData) {
      setLocalFriends(friendsData.data);
    } else if (isDirectArray && friendsData.length > 0) {
      setLocalFriends(friendsData);
    }
  }, [friendsData]);

  // Also sync with friends from context
  useEffect(() => {
    if (
      contextFriends &&
      Array.isArray(contextFriends) &&
      contextFriends.length > 0 &&
      localFriends.length === 0
    ) {
      setLocalFriends(contextFriends);
    }
  }, [contextFriends, localFriends.length]);

  // Listen for user online status updates and update friend list
  useEffect(() => {
    const handleUserStatusUpdate = (event) => {
      const { userId, isOnline } = event.detail;

      // Update localFriends if the user is in the list
      setLocalFriends((prev) =>
        prev.map((friend) =>
          friend._id === userId ? { ...friend, isOnline } : friend
        )
      );
    
    };

    // Add event listener
    window.addEventListener("user_status_updated", handleUserStatusUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("user_status_updated", handleUserStatusUpdate);
    };
  }, [conversationsData]);

  // Animation variants
  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
      },
    },
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Reset search when tab changes
  useEffect(() => {
    setSearchQuery("");
    setIsSearchFocused(false);
  }, [activeTab]);

  // Render empty state
  const renderEmptyState = (title, description, icon) => (
    <EmptyPlaceholder
      title={title}
      description={description}
      icon={icon}
      iconSize={40}
      titleClassName="text-sm"
      descriptionClassName="text-xs"
    />
  );

  // Render search results
  const renderSearchResults = () => {
    if (searchQuery.trim() === "") {
      return null;
    }

    if (filteredResults.length === 0) {
      return renderEmptyState(
        t("message.noResults"),
        t("message.noConversation"),
        <FiSearch />
      );
    }

    return (
      <div className="mt-2">
        <div className="text-xs uppercase text-[var(--color-text-secondary)] px-4 py-2">
          {t("message.search")}
        </div>
        <ul>
          {filteredResults.map((result) => (
            <li
              key={`search-${result._id}`}
              className={`px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer ${
                selectedUserId === result._id
                  ? "bg-[var(--color-bg-active)]"
                  : ""
              }`}
              onClick={() => onSelectConversation?.(result)}
            >
              <div className="flex items-center">
                <Avatar
                  src={result.profilePicture}
                  alt={result.fullname || result.username}
                  size="sm"
                  status={result.isOnline ? "online" : "offline"}
                />
                <div className="ml-2.5 flex-1 min-w-0">
                  <div className="font-medium text-[var(--color-text-primary)] text-xs">
                    {result.fullname || result.username}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-secondary)]">
                    {result.username}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // Render conversations list
  const renderConversations = () => {
    if (isConversationsLoading) {
      return <SkeletonList count={5} />;
    }

    if (!conversationsData || conversationsData.length === 0) {
      return renderEmptyState(
        t("message.noConversation"),
        t("message.selectFriend"),
        <FiMessageSquare />
      );
    }

    return (
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {conversationsData.map((conversation) => {
          const participant = conversation.participant;
          if (!participant) return null;

          const lastMessage = conversation.lastMessage;
          const isUnread = conversation.unreadCount > 0;

          return (
            <motion.li
              key={`conversation-${participant._id}`}
              variants={listItemVariants}
              className={`px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors ${
                selectedUserId === participant._id
                  ? "bg-[var(--color-bg-active)]"
                  : ""
              }`}
              onClick={() => onSelectConversation?.(participant)}
            >
              <div className="flex items-center">
                <Avatar
                  src={participant.profilePicture}
                  alt={participant.fullname || participant.username}
                  size="sm"
                  status={participant.isOnline ? "online" : "offline"}
                />
                <div className="ml-2.5 flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span
                      className={`font-medium truncate text-xs ${
                        isUnread
                          ? "text-[var(--color-text-primary)] font-semibold"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {participant.fullname || participant.username}
                    </span>
                    {lastMessage && (
                      <span className="text-[10px] text-[var(--color-text-secondary)]">
                        {formatTime(lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p
                      className={`text-[11px] truncate ${
                        isUnread
                          ? "text-[var(--color-text-primary)] font-medium"
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {lastMessage
                        ? lastMessage.isDeleted
                          ? `${t("message.messageDeleted")}`
                          : lastMessage.sender === user?._id
                          ? `${t("message.you")}: ${lastMessage.content}`
                          : lastMessage.content
                        : t("message.noMessages")}
                    </p>
                    {isUnread && conversation.unreadCount > 0 && (
                      <span className="bg-[var(--color-primary)] text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium ml-1">
                        {conversation.unreadCount > 9
                          ? "9+"
                          : conversation.unreadCount}
                      </span>
                    )}
                    {participant.isOnline && !isUnread && (
                      <span className="w-2 h-2 bg-green-500 rounded-full ml-1"></span>
                    )}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    );
  };

  // Render friends list
  const renderFriends = () => {
    if (isFriendsLoading) {
      return <SkeletonList count={5} />;
    }

    if (localFriends.length === 0) {
      return renderEmptyState(
        t("rightpanel.noFriendsOnline"),
        t("message.noFriends"),
        <FiUsers />
      );
    }

    return (
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {localFriends.map((friend) => (
          <motion.li
            key={`friend-${friend._id}`}
            variants={listItemVariants}
            className={`px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors ${
              selectedUserId === friend._id ? "bg-[var(--color-bg-active)]" : ""
            }`}
            onClick={() => onSelectConversation?.(friend)}
          >
            <div className="flex items-center">
              <Avatar
                src={friend.profilePicture}
                alt={friend.fullname || friend.username}
                size="sm"
                status={friend.isOnline ? "online" : "offline"}
              />
              <div className="ml-2.5">
                <div className="font-medium text-[var(--color-text-primary)] text-xs">
                  {friend.fullname || friend.username}
                </div>
                <div className="text-[11px] text-[var(--color-text-secondary)]">
                  {friend.isOnline ? t("message.online") : t("message.offline")}
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    );
  };

  // Main render
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search and tabs */}
      <div className="p-4 border-b border-[var(--color-border)]">
        {/* Search bar */}
        <div
          className={`flex items-center bg-[var(--color-bg-primary)] rounded-[0.35rem] px-3 py-1.5 border ${
            isSearchFocused
              ? "border-[var(--color-primary)]"
              : "border-[var(--color-border)]"
          } transition-colors`}
        >
          <FiSearch className="text-[var(--color-text-secondary)] text-sm" />
          <input
            type="text"
            className="ml-2 bg-transparent outline-none w-full text-[var(--color-text-primary)] text-xs"
            placeholder={t("message.search")}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        {/* Improved Tabs - better spacing and flexibility for different languages */}
        <div className="flex mt-4 gap-2">
          <button
            className={`flex items-center justify-center flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
              activeTab === "chats"
                ? "bg-[var(--color-primary-light)] text-white border-b-2 border-[var(--color-primary)] font-bold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            }`}
            onClick={() => setActiveTab("chats")}
          >
            <FiMessageSquare className="mr-1 flex-shrink-0" />
            <span className="truncate">{t("message.chats")}</span>
          </button>
          <button
            className={`flex items-center justify-center flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${
              activeTab === "friends"
                ? "bg-[var(--color-primary-light)] text-white border-b-2 border-[var(--color-primary)] font-bold shadow-sm"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            }`}
            onClick={() => setActiveTab("friends")}
          >
            <FiUsers className="mr-1 flex-shrink-0" />
            <span className="truncate">{t("message.friends")}</span>
          </button>
        </div>
      </div>

      {/* Conversation list with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery
          ? renderSearchResults()
          : activeTab === "chats"
          ? renderConversations()
          : renderFriends()}
      </div>
    </div>
  );
};

export default MessageList;
