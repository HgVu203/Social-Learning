import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiSearch,
  FiPlus,
  FiMessageSquare,
  FiUsers,
  FiUserPlus,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { useConversations } from "../../hooks/queries/useMessageQueries.js";
import {
  useFriends,
  useFriendRequests,
} from "../../hooks/queries/useFriendQueries";
import { useSearchUsers } from "../../hooks/queries/useUserQueries";
import { useAuth } from "../../contexts/AuthContext";
import { useFriendMutations } from "../../hooks/mutations/useFriendMutations";
import { showErrorToast } from "../../utils/toast";
import Avatar from "../common/Avatar";
import Loading from "../common/Loading";
import { formatTime } from "../../utils/format";
import EmptyPlaceholder from "../common/EmptyPlaceholder";
import { useQueryClient } from "@tanstack/react-query";
import { useMessageContext } from "../../contexts/MessageContext";
import { useFriend } from "../../contexts/FriendContext";
import { SkeletonList } from "../skeleton";

const MessageList = ({ onSelectFriend }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConversationActive } = useMessageContext();
  const { friends: contextFriends, fetchFriends } = useFriend();
  const navigate = useNavigate();

  const containerRef = useRef(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chats");
  const [processingIds, setProcessingIds] = useState([]);

  // Local state for optimistic updates
  const [localFriendRequests, setLocalFriendRequests] = useState([]);
  const [localFriends, setLocalFriends] = useState([]);
  // Local state for search results
  const [localSearchResults, setLocalSearchResults] = useState([]);
  // Flag to track initial data loading
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Thêm state để lưu trữ các ID đang chờ xử lý UI
  const [pendingUiRequests, setPendingUiRequests] = useState([]);

  const { data: searchResults, isLoading: isSearchLoading } =
    useSearchUsers(searchQuery);
  const { data: conversationsData, isLoading: isConversationsLoading } =
    useConversations();
  const { data: friendsData, isLoading: isFriendsLoading } = useFriends();
  const { data: friendRequestsData } = useFriendRequests();

  // Get friend mutation hooks
  const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useFriendMutations();

  // Fetch friends data when component mounts
  useEffect(() => {
    if (fetchFriends && !initialDataLoaded) {
      console.log("Explicitly fetching friends data for MessageList");
      fetchFriends();
      setInitialDataLoaded(true);
    }
  }, [fetchFriends, initialDataLoaded]);

  // Sync local state with server data
  useEffect(() => {
    if (
      friendRequestsData?.received &&
      Array.isArray(friendRequestsData.received)
    ) {
      setLocalFriendRequests(friendRequestsData.received);
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

  // Sync search results
  useEffect(() => {
    if (searchResults?.length) {
      setLocalSearchResults(searchResults);
    }
  }, [searchResults]);

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

  // Xử lý chấp nhận lời mời kết bạn
  const handleAcceptFriendRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // Tìm request cần xử lý
    const requestToAccept = localFriendRequests.find(
      (request) => request.sender._id === userId
    );

    if (requestToAccept) {
      // 1. Optimistic UI update - xóa khỏi danh sách yêu cầu
      setLocalFriendRequests((prev) =>
        prev.filter((request) => request.sender._id !== userId)
      );

      // 2. Thêm vào danh sách bạn tạm thời
      const newFriend = {
        _id: requestToAccept.sender._id,
        username: requestToAccept.sender.username,
        fullname: requestToAccept.sender.fullname,
        profilePicture: requestToAccept.sender.profilePicture,
        isOnline: requestToAccept.sender.isOnline || false,
      };

      setLocalFriends((prev) => [newFriend, ...prev]);

      // 3. Cập nhật kết quả tìm kiếm nếu có user này
      setLocalSearchResults((prevResults) =>
        prevResults.map((result) =>
          result._id === userId
            ? { ...result, friendRequestReceived: false, isFriend: true }
            : result
        )
      );

      try {
        // 4. Gọi API
        await acceptFriendRequest.mutateAsync({ requestId: userId });

        // 5. Cập nhật cache để đảm bảo tính đồng bộ
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
        queryClient.invalidateQueries({ queryKey: ["search-users"] });
      } catch (error) {
        console.error("Error accepting friend request:", error);
        showErrorToast(
          error?.response?.data?.error || "Failed to accept friend request"
        );

        // 6. Khôi phục UI nếu lỗi
        if (friendRequestsData?.received) {
          setLocalFriendRequests(friendRequestsData.received);
        }
        if (friendsData) {
          setLocalFriends(friendsData);
        }
        if (searchResults) {
          setLocalSearchResults(searchResults);
        }
      } finally {
        setProcessingIds((prev) => prev.filter((id) => id !== userId));
      }
    }
  };

  // Xử lý từ chối lời mời kết bạn
  const handleRejectFriendRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // 1. Optimistic UI update - xóa khỏi danh sách yêu cầu
    setLocalFriendRequests((prev) =>
      prev.filter((request) => request.sender._id !== userId)
    );

    // 2. Cập nhật kết quả tìm kiếm nếu có user này
    setLocalSearchResults((prevResults) =>
      prevResults.map((result) =>
        result._id === userId
          ? { ...result, friendRequestReceived: false }
          : result
      )
    );

    try {
      // 3. Gọi API
      await rejectFriendRequest.mutateAsync({ requestId: userId });

      // 4. Cập nhật cache
      queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["search-users"] });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      showErrorToast(
        error?.response?.data?.error || "Failed to reject friend request"
      );

      // 5. Khôi phục UI nếu lỗi
      if (friendRequestsData?.received) {
        setLocalFriendRequests(friendRequestsData.received);
      }
      if (searchResults) {
        setLocalSearchResults(searchResults);
      }
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Thêm hàm xử lý gửi yêu cầu kết bạn với phản hồi UI tức thì
  const handleSendFriendRequest = async (userId) => {
    // Đánh dấu đang xử lý để hiển thị spinner
    setProcessingIds((prev) => [...prev, userId]);

    // Đánh dấu UI đang chờ xử lý
    setPendingUiRequests((prev) => [...prev, userId]);

    // Cập nhật UI ngay lập tức
    setLocalSearchResults((prevResults) =>
      prevResults.map((result) =>
        result._id === userId ? { ...result, friendRequestSent: true } : result
      )
    );

    try {
      // Gọi API
      await sendFriendRequest.mutateAsync({ userId });

      // Cập nhật cache sau khi API thành công
      queryClient.invalidateQueries({ queryKey: ["search-users"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
    } catch (error) {
      console.error("Error sending friend request:", error);
      showErrorToast(
        error?.response?.data?.error || "Failed to send friend request"
      );

      // Khôi phục UI nếu có lỗi
      setLocalSearchResults((prevResults) =>
        prevResults.map((result) =>
          result._id === userId
            ? { ...result, friendRequestSent: false }
            : result
        )
      );
    } finally {
      // Bỏ đánh dấu đang xử lý
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
      setPendingUiRequests((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Hàm xử lý hủy yêu cầu kết bạn
  const handleCancelRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // 1. Optimistic UI update
    setLocalSearchResults((prevResults) =>
      prevResults.map((result) =>
        result._id === userId ? { ...result, friendRequestSent: false } : result
      )
    );

    // 2. Cập nhật cache
    queryClient.setQueryData(["friendship-status", userId], {
      status: "NOT_FRIEND",
    });

    try {
      // 3. Gọi API
      await removeFriend.mutateAsync(userId);

      // 4. Cập nhật cache
      queryClient.invalidateQueries({ queryKey: ["search-users"] });
      queryClient.invalidateQueries({ queryKey: ["friendship-status"] });
    } catch (error) {
      console.error("Error canceling friend request:", error);
      showErrorToast(
        error?.response?.data?.error || "Failed to cancel friend request"
      );

      // 5. Khôi phục UI nếu có lỗi
      if (searchResults) {
        setLocalSearchResults(searchResults);
      }
      queryClient.invalidateQueries({
        queryKey: ["friendship-status", userId],
      });
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Render search results
  const renderSearchResults = () => {
    if (isSearchLoading) {
      return <Loading />;
    }

    if (!localSearchResults?.length) {
      return renderEmptyState(
        "No users found",
        "Try a different search term or check your network connection.",
        <FiSearch size={40} className="text-gray-400" />
      );
    }

    return (
      <motion.div
        variants={staggerListVariants}
        initial="hidden"
        animate="visible"
        className="space-y-2 px-4"
      >
        {localSearchResults.map((result) => {
          // Đã gửi lời mời kết bạn (từ state optimistic hoặc thực tế)
          const hasSentRequest =
            result.friendRequestSent || pendingUiRequests.includes(result._id);

          return (
            <motion.div
              key={result._id}
              variants={listItemVariants}
              className={`p-3 rounded-lg bg-[var(--color-card-bg-secondary)] hover:bg-[var(--color-card-bg-hover)] transition-all duration-200 flex items-center justify-between ${
                result.isFriend ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (result.isFriend && onSelectFriend) {
                  onSelectFriend(result);
                  navigate(`/messages/${result._id}`);
                }
              }}
            >
              <div className="flex items-center space-x-3">
                <Avatar
                  src={result.profilePicture}
                  size="md"
                  alt={result.username}
                />
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {result.fullname || result.username}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    @{result.username}
                    {result.isFriend && (
                      <span className="inline-flex items-center ml-1 text-xs">
                        <FiMessageSquare
                          size={10}
                          className="text-[var(--color-primary)] opacity-70 mr-0.5"
                        />
                        Click to chat
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {user._id !== result._id && (
                <div className="flex items-center">
                  {result.isFriend ? null : hasSentRequest ? (
                    <button
                      onClick={() => handleCancelRequest(result._id)}
                      disabled={processingIds.includes(result._id)}
                      className="rounded-full px-4 py-1.5 border border-[var(--color-border)] bg-[var(--color-card-bg)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--color-border)] transition-all disabled:opacity-50"
                    >
                      <FiX size={16} />
                      Cancel
                    </button>
                  ) : result.friendRequestReceived ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptFriendRequest(result._id)}
                        disabled={processingIds.includes(result._id)}
                        className="rounded-full px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium flex items-center gap-1.5 hover:bg-opacity-90 transition-all disabled:opacity-50"
                      >
                        <FiCheck size={14} />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectFriendRequest(result._id)}
                        disabled={processingIds.includes(result._id)}
                        className="rounded-full px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-card-bg)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--color-border)] transition-all disabled:opacity-50"
                      >
                        <FiX size={14} />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendFriendRequest(result._id)}
                      disabled={processingIds.includes(result._id)}
                      className="rounded-full px-4 py-1.5 border border-[var(--color-border)] bg-[var(--color-card-bg)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--color-border)] transition-all disabled:opacity-50"
                    >
                      <FiUserPlus size={16} />
                      Add
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
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
        className="space-y-2 px-4"
      >
        {conversationsData.map((conversation) => (
          <Link
            to={`/messages/${conversation.participant._id}`}
            key={conversation._id}
          >
            <motion.div
              variants={listItemVariants}
              className={`p-3 rounded-lg hover:bg-[var(--color-card-bg-hover)] transition-all duration-200 flex items-center relative ${
                isConversationActive(conversation.participant._id)
                  ? "bg-[var(--color-card-bg-hover)]"
                  : "bg-[var(--color-card-bg-secondary)]"
              }`}
            >
              <div className="relative">
                <Avatar
                  src={conversation.participant.profilePicture}
                  size="md"
                  alt={conversation.participant.username}
                />
                {conversation.participant.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--color-card-bg-secondary)] rounded-full"></span>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-[var(--color-text-primary)] truncate max-w-[70%]">
                    {conversation.participant.fullname ||
                      conversation.participant.username}
                  </h3>
                  <span className="text-[10px] text-[var(--color-text-secondary)] ml-2 opacity-80">
                    {formatTime(conversation.lastMessage?.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] truncate mt-0.5">
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
                  <span className="absolute right-3 bg-[var(--color-primary)] text-white text-xs font-medium px-2 py-0.5 rounded-full">
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
                className="px-3 py-3 hover:bg-[var(--color-card-bg-hover)] rounded-lg cursor-pointer transition-colors flex items-center justify-between"
                onClick={() => onSelectFriend && onSelectFriend(friend)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar
                      src={friend.profilePicture || friend.avatar}
                      alt={friend.username || "User"}
                      size="md"
                    />
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-bg-secondary)]"></span>
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                      {friend.fullname || friend.username || "User"}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search input */}
      <div
        className={`flex-shrink-0 p-4 border-b border-[var(--color-border)] transition-all duration-300 ${
          isSearchFocused ? "bg-[var(--color-card-bg)]" : "bg-transparent"
        }`}
      >
        <div
          className={`relative transition-all duration-300 ${
            isSearchFocused ? "ring-2 ring-[var(--color-primary)]" : ""
          }`}
        >
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full py-2.5 pl-10 pr-4 rounded-full bg-[var(--color-card-bg)] border border-[var(--color-border)] focus:outline-none transition-colors"
          />
          <FiSearch className="absolute left-3.5 top-3 text-[var(--color-text-secondary)]" />
        </div>
      </div>

      {/* Tabs navigation */}
      {!searchQuery && (
        <>
          <div className="flex-shrink-0 px-4 pt-3 pb-2 flex space-x-1 border-b border-[var(--color-border)]">
            <button
              onClick={() => setActiveTab("chats")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "chats"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-card-bg-hover)]"
              }`}
            >
              <FiMessageSquare />
              Chats
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === "friends"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-card-bg-hover)]"
              }`}
            >
              <FiUsers />
              Friends
            </button>
          </div>

          {/* Display friends count when on friends tab */}
          {activeTab === "friends" && (
            <div className="flex-shrink-0 border-b border-[var(--color-border)] px-4 py-2">
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
                Friends ({localFriends?.length || contextFriends?.length || 0})
              </h3>
            </div>
          )}
        </>
      )}

      {/* Main content area - with fixed max height to ensure scrolling is contained */}
      <div
        className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-240px)] py-4 no-scrollbar"
        ref={containerRef}
        style={{ scrollbarWidth: "none" }}
      >
        {searchQuery
          ? renderSearchResults()
          : activeTab === "chats"
          ? renderConversations()
          : renderFriends()}
      </div>

      {/* Floating New Chat button */}
      {activeTab === "chats" && !searchQuery && !isConversationsLoading && (
        <Link
          to="/friends"
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg hover:bg-opacity-90 transition-all"
        >
          <FiPlus size={24} />
        </Link>
      )}
    </div>
  );
};

export default MessageList;
