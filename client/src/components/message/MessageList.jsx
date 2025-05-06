import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiSearch, FiMessageSquare, FiUsers, FiUserPlus } from "react-icons/fi";
import { useConversations } from "../../hooks/queries/useMessageQueries.js";
import {
  useFriends,
  useFriendRequests,
} from "../../hooks/queries/useFriendQueries";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../common/Avatar";
import Loading from "../common/Loading";
import { formatTime } from "../../utils/format";
import EmptyPlaceholder from "../common/EmptyPlaceholder";
import { useMessageContext } from "../../contexts/MessageContext";
import { useFriend } from "../../contexts/FriendContext";
import { SkeletonList } from "../skeleton";

const MessageList = ({ onSelectFriend }) => {
  const { user } = useAuth();
  const { isConversationActive } = useMessageContext();
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
  const { data: friendRequestsData } = useFriendRequests();

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
      console.log("Explicitly fetching friends data for MessageList");
      fetchFriends();
      setInitialDataLoaded(true);
    }
  }, [fetchFriends, initialDataLoaded]);

  // Log friend requests for debugging
  useEffect(() => {
    if (
      friendRequestsData?.received &&
      Array.isArray(friendRequestsData.received)
    ) {
      console.log(
        "Friend requests received:",
        friendRequestsData.received.length
      );
    }
  }, [friendRequestsData]);

  useEffect(() => {
    // Check if friendsData is valid array data
    const hasFriendsData = friendsData?.data && Array.isArray(friendsData.data);

    // Also check if it's just a direct array (older data structure)
    const isDirectArray = Array.isArray(friendsData);

    if (hasFriendsData) {
      console.log(
        "Updating localFriends from friendsData.data:",
        friendsData.data
      );
      setLocalFriends(friendsData.data);
    } else if (isDirectArray && friendsData.length > 0) {
      console.log(
        "Updating localFriends from direct friendsData array:",
        friendsData
      );
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
      console.log("Updating localFriends from contextFriends:", contextFriends);
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

      // Also update conversations if they include this user
      if (Array.isArray(conversationsData)) {
        // This will trigger re-render of conversations with updated online status
        // The actual data update happens in the backend and will be reflected on next data fetch
        console.log(
          `User ${userId} is now ${
            isOnline ? "online" : "offline"
          } - UI will update on next render`
        );
      }
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

  const staggerListVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
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
    <EmptyPlaceholder title={title} description={description} icon={icon} />
  );

  // Render search results
  const renderSearchResults = () => {
    if (!filteredResults?.length) {
      return renderEmptyState(
        "No matches found",
        "Try a different search term or check your friend list.",
        <FiSearch size={40} className="text-gray-400" />
      );
    }

    // Phân tách kết quả thành các cuộc trò chuyện và bạn bè
    const conversations = filteredResults.filter(
      (r) => r.resultType === "conversation"
    );
    const friends = filteredResults.filter(
      (r) =>
        r.resultType === "friend" && !conversations.some((c) => c._id === r._id)
    );

    return (
      <div className="space-y-4">
        {/* Phần conversations */}
        {conversations.length > 0 && (
          <div>
            <div className="px-2 py-1 mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
              Conversations
            </div>
            <motion.div
              variants={staggerListVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1 px-2"
            >
              {conversations.map((result) => (
                <Link to={`/messages/${result._id}`} key={result._id}>
                  <motion.div
                    variants={listItemVariants}
                    className={`p-2 rounded-lg hover:bg-[var(--color-card-bg-hover)] transition-all duration-200 flex items-center relative ${
                      isConversationActive(result._id)
                        ? "bg-[var(--color-card-bg-hover)]"
                        : "bg-[var(--color-card-bg-secondary)]"
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        src={result.profilePicture}
                        size="sm"
                        alt={result.username}
                      />
                      {result.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-[var(--color-card-bg-secondary)] rounded-full"></span>
                      )}
                    </div>
                    <div className="ml-2 flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-medium text-[var(--color-text-primary)] truncate max-w-[70%]">
                          {result.fullname || result.username}
                        </h3>
                        <span className="text-[9px] text-[var(--color-text-secondary)] ml-1 opacity-80">
                          {formatTime(result.lastMessage?.createdAt)}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate mt-0.5">
                        {result.lastMessage ? (
                          <>
                            {result.lastMessage.sender === user._id
                              ? "You: "
                              : ""}
                            {result.lastMessage.type === "image"
                              ? "🖼️ Photo"
                              : result.lastMessage.content}
                          </>
                        ) : (
                          "Start a conversation"
                        )}
                      </p>
                      {result.unreadCount > 0 && (
                        <span className="absolute right-2 bg-[var(--color-primary)] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                          {result.unreadCount}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          </div>
        )}

        {/* Phần friends */}
        {friends.length > 0 && (
          <div>
            <div className="px-2 py-1 mb-1 text-xs font-medium text-[var(--color-text-secondary)]">
              Friends
            </div>
            <motion.div
              variants={staggerListVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1"
            >
              {friends.map((friend) => (
                <motion.div
                  key={friend._id}
                  variants={listItemVariants}
                  className="px-2 py-2 hover:bg-[var(--color-card-bg-hover)] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                  onClick={() => onSelectFriend && onSelectFriend(friend)}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <Avatar
                        src={friend.profilePicture || friend.avatar}
                        alt={friend.username || "User"}
                        size="sm"
                      />
                      {friend.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-[var(--color-bg-secondary)]"></span>
                      )}
                    </div>
                    <div className="ml-2">
                      <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
                        {friend.fullname || friend.username || "User"}
                      </h3>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {friend.isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  // Render conversations list
  const renderConversations = () => {
    if (isConversationsLoading) {
      return <Loading />;
    }

    if (!conversationsData?.length) {
      return renderEmptyState(
        "No conversations yet",
        "Start chatting with your friends to see conversations here.",
        <FiMessageSquare size={40} className="text-gray-400" />
      );
    }

    return (
      <motion.div
        variants={staggerListVariants}
        initial="hidden"
        animate="visible"
        className="space-y-1 px-2"
      >
        {conversationsData.map((conversation) => (
          <Link
            to={`/messages/${conversation.participant._id}`}
            key={conversation._id}
          >
            <motion.div
              variants={listItemVariants}
              className={`p-2 rounded-lg hover:bg-[var(--color-card-bg-hover)] transition-all duration-200 flex items-center relative ${
                isConversationActive(conversation.participant._id)
                  ? "bg-[var(--color-card-bg-hover)]"
                  : "bg-[var(--color-card-bg-secondary)]"
              }`}
            >
              <div className="relative">
                <Avatar
                  src={conversation.participant.profilePicture}
                  size="sm"
                  alt={conversation.participant.username}
                />
                {conversation.participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border-2 border-[var(--color-card-bg-secondary)] rounded-full"></span>
                )}
              </div>
              <div className="ml-2 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-[var(--color-text-primary)] truncate max-w-[70%]">
                    {conversation.participant.fullname ||
                      conversation.participant.username}
                  </h3>
                  <span className="text-[9px] text-[var(--color-text-secondary)] ml-1 opacity-80">
                    {formatTime(conversation.lastMessage?.createdAt)}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--color-text-secondary)] truncate mt-0.5">
                  {conversation.lastMessage ? (
                    <>
                      {conversation.lastMessage.sender === user._id
                        ? "You: "
                        : ""}
                      {conversation.lastMessage.type === "image"
                        ? "🖼️ Photo"
                        : conversation.lastMessage.content}
                    </>
                  ) : (
                    "Start a conversation"
                  )}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="absolute right-2 bg-[var(--color-primary)] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    );
  };

  // Render friends list
  const renderFriends = () => {
    // Check for loading and error states first
    if (isFriendsLoading) {
      return <SkeletonList count={5} />;
    }

    // Ensure localFriends is an array (defensive programming)
    const friendsList = Array.isArray(localFriends) ? localFriends : [];

    // If we have no friends after ensuring it's an array
    if (friendsList.length === 0) {
      return renderEmptyState(
        "No friends yet",
        "Add friends to start messaging",
        <FiUserPlus size={32} />
      );
    }

    try {
      return (
        <motion.div
          variants={staggerListVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1"
        >
          {friendsList.map((friend) => {
            // Skip invalid friend data
            if (!friend || !friend._id) {
              console.warn("Invalid friend data encountered:", friend);
              return null;
            }

            return (
              <motion.div
                key={friend._id}
                variants={listItemVariants}
                className="px-2 py-2 hover:bg-[var(--color-card-bg-hover)] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                onClick={() => onSelectFriend && onSelectFriend(friend)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar
                      src={friend.profilePicture || friend.avatar}
                      alt={friend.username || "User"}
                      size="sm"
                    />
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-[var(--color-bg-secondary)]"></span>
                    )}
                  </div>
                  <div className="ml-2">
                    <h3 className="text-xs font-medium text-[var(--color-text-primary)]">
                      {friend.fullname || friend.username || "User"}
                    </h3>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">
                      {friend.isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      );
    } catch (error) {
      console.error("Error rendering friends list:", error);
      return (
        <div className="p-4 text-[var(--color-text-error)]">
          <p>Error displaying friends list. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-[var(--color-primary)] text-white rounded"
          >
            Refresh
          </button>
        </div>
      );
    }
  };

  // Main render
  return (
    <div className="relative flex flex-col h-full">
      {/* Fixed Search Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shadow-sm p-2">
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            className="w-full p-2 pl-8 bg-[var(--color-card-bg)] text-[var(--color-text-primary)] rounded-lg border border-[var(--color-border)] outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-sm"
          />
          <FiSearch
            className="absolute left-2.5 top-2.5 text-[var(--color-text-secondary)]"
            size={16}
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          <button
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center ${
              activeTab === "chats"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-card-bg-hover)] text-[var(--color-text-secondary)]"
            }`}
            onClick={() => setActiveTab("chats")}
          >
            <FiMessageSquare className="mr-1" />
            <span>Chats</span>
          </button>
          <button
            className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center ${
              activeTab === "friends"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-card-bg-hover)] text-[var(--color-text-secondary)]"
            }`}
            onClick={() => setActiveTab("friends")}
          >
            <FiUsers className="mr-1" />
            <span>Friends</span>
          </button>
        </div>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Content based on state */}
        {isSearchFocused && searchQuery ? (
          <div className="py-2 px-2">
            <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider pb-2">
              Search Results
            </p>
            {renderSearchResults()}
          </div>
        ) : activeTab === "chats" ? (
          <div className="py-2 px-2">{renderConversations()}</div>
        ) : (
          <div className="py-2 px-2">{renderFriends()}</div>
        )}
      </div>
    </div>
  );
};

export default MessageList;
