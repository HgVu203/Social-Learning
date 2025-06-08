import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Avatar from "../../components/common/Avatar";
import {
  FiUsers,
  FiUserX,
  FiMessageSquare,
  FiSearch,
  FiUserPlus,
  FiClock,
  FiUserCheck,
  FiBell,
} from "react-icons/fi";
import { showErrorToast } from "../../utils/toast";
import { useFriend } from "../../contexts/FriendContext";
import { useSearchUsers } from "../../hooks/queries/useUserQueries";
import { useFriendshipStatus } from "../../hooks/queries/useFriendQueries";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const FriendsPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const {
    friends,
    friendRequests: pendingRequests,
    friendsLoading: loading,
    friendsError: error,
    fetchFriends,
    fetchFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend: unfriend,
    sendFriendRequest,
  } = useFriend();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);

  // State để lưu danh sách tạm thời cho optimistic updates
  const [localPendingRequests, setLocalPendingRequests] = useState([]);
  const [localFriends, setLocalFriends] = useState([]);
  // Thêm flag để theo dõi xem đã fetch dữ liệu hay chưa
  const [hasFetched, setHasFetched] = useState(false);

  // Đồng bộ state cục bộ với dữ liệu từ server khi có thay đổi
  useEffect(() => {
    if (pendingRequests?.length > 0) {
      // Loại bỏ các bản sao trùng lặp trước khi cập nhật state
      const uniqueRequests = removeDuplicates(pendingRequests, "_id");
      setLocalPendingRequests(uniqueRequests);
    }
  }, [pendingRequests]);

  useEffect(() => {
    if (friends?.length > 0) {
      // Loại bỏ các bản sao trùng lặp trước khi cập nhật state
      const uniqueFriends = removeDuplicates(friends, "_id");
      setLocalFriends(uniqueFriends);
    }
  }, [friends]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery.trim().length >= 2) {
        setShowSearchResults(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data immediately when component mounts - CRITICAL
  useEffect(() => {
    const fetchData = async () => {
      // First immediate fetch - highest priority
      console.log("Initial friends data fetch");
      fetchFriends();
      fetchFriendRequests();

      // Mark as fetched
      setHasFetched(true);

      // Second fetch after a short delay to ensure fresh data
      setTimeout(() => {
        console.log("Follow-up friends data fetch");
        fetchFriends();
        fetchFriendRequests();
      }, 1000);
    };

    // Only fetch once on initial load
    if (!hasFetched) {
      fetchData();
    }

    // Initialize local state with any available data from cache
    if (friends?.length > 0 && localFriends.length === 0) {
      setLocalFriends(friends);
    }

    if (pendingRequests?.length > 0 && localPendingRequests.length === 0) {
      setLocalPendingRequests(pendingRequests);
    }
  }, [
    fetchFriends,
    fetchFriendRequests,
    friends,
    pendingRequests,
    hasFetched,
    localFriends.length,
    localPendingRequests.length,
  ]);

  // Add useEffect to filter pending requests when they change
  useEffect(() => {
    if (Array.isArray(pendingRequests)) {
      // Lọc bỏ các request từ những người đã là bạn bè
      const filteredRequests = pendingRequests.filter((request) => {
        // Kiểm tra xem người gửi request có trong danh sách bạn bè không
        return !localFriends.some(
          (friend) => friend._id === request.userId._id
        );
      });
      // Loại bỏ trùng lặp
      const uniqueFilteredRequests = removeDuplicates(filteredRequests, "_id");
      setLocalPendingRequests(uniqueFilteredRequests);
    }
  }, [pendingRequests, localFriends]);

  // Get search results
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    debouncedQuery,
    {
      enabled: debouncedQuery.length >= 2,
      page: 1,
      limit: 10,
    }
  );

  // Handle friend request actions
  const handleSendFriendRequest = async (userId) => {
    // Đánh dấu ngay là đang xử lý
    setProcessingIds((prev) => [...prev, userId]);

    try {
      // Gọi API
      await sendFriendRequest.mutateAsync({ userId });

      // Cập nhật cache và invalidate queries sau khi API thành công
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["search-users"] });
    } catch (error) {
      console.error("Error sending friend request:", error);
      showErrorToast(
        error?.response?.data?.error || "Failed to send friend request"
      );

      // Khôi phục trạng thái nếu có lỗi
      queryClient.setQueryData(["friendship-status", userId], {
        status: "NOT_FRIEND",
      });
    } finally {
      // Gỡ bỏ ID khỏi danh sách đang xử lý
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleAcceptRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // Tìm request cần xử lý
    const requestToAccept = localPendingRequests.find(
      (request) => request.userId._id === userId
    );

    if (requestToAccept) {
      // 1. Optimistic UI update - xóa khỏi danh sách yêu cầu
      setLocalPendingRequests((prev) =>
        prev.filter((request) => request.userId._id !== userId)
      );

      // 2. Thêm vào danh sách bạn bè tạm thời
      const newFriend = {
        _id: requestToAccept.userId._id,
        username: requestToAccept.userId.username,
        fullname: requestToAccept.userId.fullname,
        avatar: requestToAccept.userId.avatar,
        email: requestToAccept.userId.email,
        friendshipId: requestToAccept._id,
      };

      setLocalFriends((prev) => [newFriend, ...prev]);

      try {
        // 3. Gọi API
        await acceptFriendRequest.mutateAsync({
          requestId: userId,
        });

        // 4. Cập nhật cache để đảm bảo tính đồng bộ
        queryClient.invalidateQueries({ queryKey: ["friends"] });
        queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
      } catch (error) {
        console.error("Failed to accept friend request:", error);
        showErrorToast(
          error?.response?.data?.error || "Failed to accept friend request"
        );

        // 5. Khôi phục lại UI nếu có lỗi
        setLocalPendingRequests(pendingRequests);
        setLocalFriends(friends);
      } finally {
        setProcessingIds((prev) => prev.filter((id) => id !== userId));
      }
    }
  };

  const handleRejectRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // Optimistic UI update - xóa khỏi danh sách yêu cầu
    setLocalPendingRequests((prev) =>
      prev.filter((request) => request.userId._id !== userId)
    );

    try {
      await rejectFriendRequest.mutateAsync({
        requestId: userId,
      });

      // Cập nhật cache
      queryClient.invalidateQueries({ queryKey: ["friends", "requests"] });
    } catch (error) {
      console.error("Failed to reject friend request:", error);
      showErrorToast(
        error?.response?.data?.error || "Failed to reject friend request"
      );

      // Khôi phục UI nếu có lỗi
      setLocalPendingRequests(pendingRequests);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleUnfriend = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);

    // Optimistic UI update - xóa người dùng khỏi danh sách bạn bè
    setLocalFriends((prev) => prev.filter((friend) => friend._id !== userId));

    try {
      await unfriend.mutateAsync(userId);

      // Cập nhật cache
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    } catch (error) {
      console.error("Failed to unfriend:", error);
      showErrorToast(error?.response?.data?.error || "Failed to unfriend");

      // Khôi phục UI nếu có lỗi
      setLocalFriends(friends);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Render friendship button based on status
  const FriendRequestButton = ({ userId }) => {
    const { data: statusData, isLoading: statusLoading } =
      useFriendshipStatus(userId);
    const status = statusData?.status || "NOT_FRIEND";

    // Tạo state local để kiểm soát UI hiển thị
    const [localStatus, setLocalStatus] = useState(status);

    // Đồng bộ status từ API với local status khi có thay đổi
    useEffect(() => {
      if (status && !processingIds.includes(userId)) {
        setLocalStatus(status);
      }
    }, [status, userId]);

    // Local handlers để cập nhật UI ngay lập tức
    const handleLocalSendRequest = () => {
      // Cập nhật UI ngay lập tức, không đợi API
      setLocalStatus("PENDING_SENT");

      // Cập nhật cache trước khi gọi API
      queryClient.setQueryData(["friendship-status", userId], {
        status: "PENDING_SENT",
      });

      // Sau đó gọi API trong background
      handleSendFriendRequest(userId);
    };

    const handleLocalUnfriend = () => {
      setLocalStatus("NOT_FRIEND");
      handleUnfriend(userId);
    };

    const handleLocalAccept = () => {
      setLocalStatus("FRIEND");
      handleAcceptRequest(userId);
    };

    const handleLocalReject = () => {
      setLocalStatus("NOT_FRIEND");
      handleRejectRequest(userId);
    };

    if (statusLoading || processingIds.includes(userId)) {
      return <LoadingSpinner size="sm" />;
    }

    switch (localStatus) {
      case "NOT_FRIEND":
        return (
          <button
            onClick={handleLocalSendRequest}
            className="py-1.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[80px] cursor-pointer"
          >
            <FiUserPlus className="mr-2" size={16} />
            <span className="hidden xs:inline">
              {t("friend.sendFriendRequest")}
            </span>
            <span className="xs:hidden">{t("common.add")}</span>
          </button>
        );
      case "FRIEND":
        return (
          <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-3">
            <Link
              to={`/messages/${userId}`}
              className="py-1.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[80px] cursor-pointer"
            >
              <FiMessageSquare className="mr-2" size={16} />
              <span className="hidden xs:inline">{t("message.message")}</span>
              <span className="xs:hidden">{t("friend.msg")}</span>
            </Link>
            <button
              onClick={handleLocalUnfriend}
              className="py-1.5 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-md hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all flex items-center justify-center min-w-[80px] cursor-pointer"
            >
              <FiUserX className="mr-2" size={16} />
              <span>{t("friend.unfriend")}</span>
            </button>
          </div>
        );
      case "PENDING_SENT":
        return (
          <button
            disabled
            className="py-1.5 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] text-sm font-medium rounded-md opacity-75 cursor-not-allowed flex items-center justify-center min-w-[80px]"
          >
            <FiClock className="mr-2" size={16} />
            <span className="hidden xs:inline">
              {t("profile.friendRequestSent")}
            </span>
            <span className="xs:hidden">{t("profile.friendRequestSent")}</span>
          </button>
        );
      case "PENDING_RECEIVED":
        return (
          <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-3 flex-shrink-0">
            <button
              onClick={handleLocalAccept}
              disabled={processingIds.includes(userId)}
              className="py-1.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiUserCheck className="mr-2" size={16} />
              <span>{t("friend.confirm")}</span>
            </button>
            <button
              onClick={handleLocalReject}
              disabled={processingIds.includes(userId)}
              className="py-1.5 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-md hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all flex items-center justify-center min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{t("friend.delete")}</span>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFriendRequests = () => {
    // Filter unique requests that are not already friends
    const uniqueFilteredRequests = removeDuplicates(
      localPendingRequests,
      "_id"
    );

    if (uniqueFilteredRequests.length === 0) {
      return (
        <div className="card p-5 sm:p-6 text-center">
          <p className="text-[var(--color-text-secondary)]">
            {t("friend.noFriendRequests")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {uniqueFilteredRequests.map((request, index) => (
          <motion.div
            key={`friend-request-${request._id}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="card p-4 sm:p-5 flex flex-col xs:flex-row items-start xs:items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors rounded-xl gap-3 xs:gap-0"
          >
            <div className="flex items-center space-x-4 flex-1 min-w-0 w-full xs:w-auto">
              <Link
                to={`/profile/${request.userId._id}`}
                className="flex-shrink-0 rounded-full overflow-hidden"
              >
                <Avatar
                  src={request.userId.avatar}
                  alt={request.userId.username}
                  size="lg"
                  className="flex-shrink-0 hover:opacity-90 transition-opacity w-14 h-14 sm:w-16 sm:h-16"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${request.userId._id}`}
                  className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block text-base sm:text-lg"
                >
                  {request.userId.fullname || request.userId.username}
                </Link>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">
                  @{request.userId.username}
                </p>
              </div>
            </div>
            <div className="flex flex-row xs:flex-row space-x-3 flex-shrink-0 ml-0 xs:ml-3 w-full xs:w-auto justify-end">
              <button
                onClick={() => handleAcceptRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[80px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiUserCheck className="mr-2" size={16} /> {t("friend.confirm")}
              </button>
              <button
                onClick={() => handleRejectRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-md hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all flex items-center justify-center min-w-[80px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {t("friend.delete")}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderAllFriends = () => {
    if (localFriends.length === 0) {
      return (
        <div className="card p-5 sm:p-6 text-center">
          <p className="text-[var(--color-text-secondary)]">
            {t("friend.noFriendsYet")}
          </p>
        </div>
      );
    }

    const filteredFriends = localFriends.filter(
      (friend) =>
        searchQuery.trim() === "" ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Loại bỏ trùng lặp trước khi render
    const uniqueFilteredFriends = removeDuplicates(filteredFriends, "_id");

    return (
      <>
        <div className="space-y-4">
          {uniqueFilteredFriends.map((friend, index) => (
            <motion.div
              key={`friend-${friend._id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="card p-4 sm:p-5 flex flex-col xs:flex-row items-start xs:items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors rounded-xl gap-3 xs:gap-0"
            >
              <div className="flex items-center space-x-4 flex-1 min-w-0 w-full xs:w-auto">
                <Link
                  to={`/profile/${friend._id}`}
                  className="flex-shrink-0 rounded-full overflow-hidden"
                >
                  <Avatar
                    src={friend.avatar}
                    alt={friend.username}
                    size="lg"
                    className="flex-shrink-0 hover:opacity-90 transition-opacity w-14 h-14 sm:w-16 sm:h-16"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${friend._id}`}
                    className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block text-base sm:text-lg"
                  >
                    {friend.fullname || friend.username}
                  </Link>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">
                    @{friend.username}
                  </p>
                </div>
              </div>
              <div className="flex flex-row xs:flex-row space-x-3 flex-shrink-0 ml-0 xs:ml-3 w-full xs:w-auto justify-end">
                <Link
                  to={`/messages/${friend._id}`}
                  className="py-1.5 px-4 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[80px] flex-1 xs:flex-none cursor-pointer"
                >
                  <FiMessageSquare className="mr-2" size={16} />
                  <span className="hidden sm:inline">
                    {t("message.message")}
                  </span>
                  <span className="sm:hidden">{t("friend.msg")}</span>
                </Link>
                <button
                  onClick={() => handleUnfriend(friend._id)}
                  disabled={processingIds.includes(friend._id)}
                  className="py-1.5 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm font-medium rounded-md hover:bg-[var(--color-bg-hover)] active:scale-95 transition-all flex items-center justify-center min-w-[80px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiUserX className="mr-2" size={16} />
                  <span className="hidden sm:inline">
                    {t("friend.unfriend")}
                  </span>
                  <span className="sm:hidden">{t("friend.remove")}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  const renderSearchResults = () => {
    if (!showSearchResults || debouncedQuery.length < 2) {
      return null;
    }

    return (
      <div className="card mb-5 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)]">
            {t("friend.searchResults")}
          </h2>
          {searchLoading && <LoadingSpinner size="sm" />}
        </div>

        {searchResults?.data && searchResults.data.length > 0 ? (
          <div className="p-4 sm:p-5 space-y-4">
            {searchResults.data.map((user, index) => {
              // Kiểm tra xem user này có đang được xử lý không
              const isProcessing = processingIds.includes(user._id);

              // Cách hiển thị nút dựa trên trạng thái hiện tại
              const renderFriendshipButton = () => {
                // Nếu có trong processingIds, hiển thị spinner
                if (isProcessing) {
                  return <LoadingSpinner size="sm" />;
                }

                // Sử dụng FriendRequestButton có sẵn
                return <FriendRequestButton userId={user._id} />;
              };

              return (
                <div
                  key={`search-result-${user._id}-${index}`}
                  className="bg-[var(--color-bg-secondary)] rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-sm hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <Link
                      to={`/profile/${user._id}`}
                      className="flex-shrink-0 rounded-full overflow-hidden"
                    >
                      <Avatar
                        src={user.avatar}
                        alt={user.username}
                        size="lg"
                        className="flex-shrink-0 hover:opacity-90 transition-opacity w-14 h-14 sm:w-16 sm:h-16"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${user._id}`}
                        className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block text-base sm:text-lg"
                      >
                        {user.fullname || user.username}
                      </Link>
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center ml-4 flex-shrink-0">
                    {renderFriendshipButton()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 sm:p-6 text-center">
            <p className="text-[var(--color-text-secondary)]">
              {t("friend.noSearchResults")}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Thêm SkeletonLoader khi đang tải dữ liệu
  const renderSkeletonFriends = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div
          key={`skeleton-friend-${index}`}
          className="card p-4 sm:p-5 flex items-center justify-between animate-pulse mb-4"
        >
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-5 sm:h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 w-24 sm:w-28 bg-[var(--color-primary)] bg-opacity-70 rounded-md"></div>
            <div className="h-10 w-24 sm:w-28 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
          </div>
        </div>
      ));
  };

  // Cập nhật hàm renderContent() để hiển thị skeleton
  const renderContent = () => {
    // Display skeleton loader when no cached data available
    if (loading && !localFriends.length) {
      return (
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center px-4 py-2.5 bg-[var(--color-primary)] bg-opacity-10 rounded-lg text-sm font-medium">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>{t("common.loading")}</span>
            </div>
          </div>
          {renderSkeletonFriends()}
        </div>
      );
    } else if (loading && localFriends.length > 0) {
      // If we have cached data, show it with a small loading indicator
      return (
        <>
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center px-4 py-2.5 bg-[var(--color-primary)] bg-opacity-10 rounded-lg text-sm font-medium">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>{t("common.loading")}</span>
            </div>
          </div>
          {showSearchResults && debouncedQuery.length >= 2
            ? renderSearchResults()
            : activeTab === "requests"
            ? renderFriendRequests()
            : renderAllFriends()}
        </>
      );
    }

    if (error) {
      return (
        <div className="bg-red-500/10 text-red-500 p-5 rounded-lg border border-red-200 dark:border-red-800">
          {error.message || t("friend.loadError")}
        </div>
      );
    }

    // Hiển thị một trong ba: kết quả tìm kiếm, yêu cầu kết bạn, hoặc tất cả bạn bè
    // Thêm điều kiện debouncedQuery.length >= 2 để đảm bảo chỉ hiển thị kết quả tìm kiếm khi có
    // đủ ký tự để tìm kiếm
    if (showSearchResults && debouncedQuery.length >= 2) {
      return renderSearchResults();
    }

    switch (activeTab) {
      case "requests":
        return renderFriendRequests();
      case "all":
      default:
        return renderAllFriends();
    }
  };

  // Thêm hàm utility để loại bỏ phần tử trùng lặp trong mảng
  const removeDuplicates = (array, key) => {
    return array.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t[key] === item[key])
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-3 sm:px-4 md:py-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] pb-4"
      >
        {t("friend.title")}
      </motion.h1>

      {/* Thanh tìm kiếm và tabs */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("friend.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text-primary)] text-sm placeholder-[var(--color-text-tertiary)] transition-colors"
            />
          </div>
        </div>
        <div className="flex space-x-2 overflow-x-auto sm:overflow-visible">
          <button
            onClick={() => {
              setActiveTab("all");
              setShowSearchResults(false);
            }}
            className={`px-3 py-1.5 rounded-md flex items-center justify-center transition-colors ${
              activeTab === "all"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
            } flex-shrink-0 text-sm`}
          >
            <FiUsers className="mr-2" />
            {t("friend.allFriends")}
          </button>
          <button
            onClick={() => {
              setActiveTab("requests");
              setShowSearchResults(false);
            }}
            className={`px-3 py-1.5 rounded-md flex items-center justify-center transition-colors ${
              activeTab === "requests"
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
            } flex-shrink-0 text-sm relative`}
          >
            <FiBell className="mr-2" />
            {t("friend.requests")}
            {localPendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {localPendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main content section */}
      {renderContent()}
    </div>
  );
};

export default FriendsPage;
