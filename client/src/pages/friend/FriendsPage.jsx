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

const FriendsPage = () => {
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
            className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] cursor-pointer"
          >
            <FiUserPlus className="mr-1 sm:mr-2" size={16} />
            <span className="hidden xs:inline">Add Friend</span>
            <span className="xs:hidden">Add</span>
          </button>
        );
      case "FRIEND":
        return (
          <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2">
            <Link
              to={`/messages/${userId}`}
              className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] cursor-pointer"
            >
              <FiMessageSquare className="mr-1 sm:mr-2" size={16} />
              <span className="hidden xs:inline">Message</span>
              <span className="xs:hidden">Msg</span>
            </Link>
            <button
              onClick={handleLocalUnfriend}
              className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] cursor-pointer"
            >
              <FiUserX className="mr-1 sm:mr-2" size={16} />
              <span>Unfriend</span>
            </button>
          </div>
        );
      case "PENDING_SENT":
        return (
          <button
            disabled
            className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-gray-400 to-gray-500 text-white text-sm sm:text-base font-medium rounded-md opacity-75 cursor-not-allowed flex items-center justify-center min-w-[90px] sm:min-w-[140px]"
          >
            <FiClock className="mr-1 sm:mr-2" size={16} />
            <span className="hidden xs:inline">Request Sent</span>
            <span className="xs:hidden">Sent</span>
          </button>
        );
      case "PENDING_RECEIVED":
        return (
          <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2 flex-shrink-0 ml-1 sm:ml-3">
            <button
              onClick={handleLocalAccept}
              disabled={processingIds.includes(userId)}
              className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiUserCheck className="mr-1 sm:mr-2" size={16} />
              <span>Confirm</span>
            </button>
            <button
              onClick={handleLocalReject}
              disabled={processingIds.includes(userId)}
              className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Delete</span>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFriendRequests = () => {
    // Lọc lại một lần nữa để đảm bảo
    const filteredRequests = localPendingRequests.filter((request) => {
      // Chỉ hiển thị những request từ người chưa phải bạn bè
      return !localFriends.some((friend) => friend._id === request.userId._id);
    });

    // Loại bỏ trùng lặp
    const uniqueFilteredRequests = removeDuplicates(filteredRequests, "_id");

    if (uniqueFilteredRequests.length === 0) {
      return (
        <div className="card p-6 text-center">
          <p className="text-[var(--color-text-secondary)]">
            No new friend requests.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {uniqueFilteredRequests.map((request, index) => (
          <motion.div
            key={`friend-request-${request._id}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-2 sm:p-3 flex flex-col xs:flex-row items-start xs:items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors rounded-xl gap-3 xs:gap-0"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0 w-full xs:w-auto">
              <Link
                to={`/profile/${request.userId._id}`}
                className="flex-shrink-0 rounded-full overflow-hidden"
              >
                <Avatar
                  src={request.userId.avatar}
                  alt={request.userId.username}
                  size="lg"
                  className="flex-shrink-0 hover:opacity-90 transition-opacity"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${request.userId._id}`}
                  className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block"
                >
                  {request.userId.fullname || request.userId.username}
                </Link>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">
                  @{request.userId.username}
                </p>
              </div>
            </div>
            <div className="flex flex-row xs:flex-row space-x-2 flex-shrink-0 ml-0 xs:ml-3 w-full xs:w-auto justify-end">
              <button
                onClick={() => handleAcceptRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FiUserCheck className="mr-1 sm:mr-2" size={16} /> Confirm
              </button>
              <button
                onClick={() => handleRejectRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Delete
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
        <div className="card p-6 text-center">
          <p className="text-[var(--color-text-secondary)]">
            You don't have any friends yet.
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
        <div className="space-y-3">
          {uniqueFilteredFriends.map((friend, index) => (
            <motion.div
              key={`friend-${friend._id}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="card p-2 sm:p-3 flex flex-col xs:flex-row items-start xs:items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors rounded-xl gap-3 xs:gap-0"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0 w-full xs:w-auto">
                <Link
                  to={`/profile/${friend._id}`}
                  className="flex-shrink-0 rounded-full overflow-hidden"
                >
                  <Avatar
                    src={friend.avatar}
                    alt={friend.username}
                    size="lg"
                    className="flex-shrink-0 hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${friend._id}`}
                    className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block"
                  >
                    {friend.fullname || friend.username}
                  </Link>
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">
                    @{friend.username}
                  </p>
                </div>
              </div>
              <div className="flex flex-row xs:flex-row space-x-2 flex-shrink-0 ml-0 xs:ml-3 w-full xs:w-auto justify-end">
                <Link
                  to={`/messages/${friend._id}`}
                  className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] flex-1 xs:flex-none cursor-pointer"
                >
                  <FiMessageSquare className="mr-1 sm:mr-2" size={16} />
                  <span className="hidden sm:inline">Message</span>
                  <span className="sm:hidden">Msg</span>
                </Link>
                <button
                  onClick={() => handleUnfriend(friend._id)}
                  disabled={processingIds.includes(friend._id)}
                  className="py-1.5 sm:py-2 px-3 sm:px-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm sm:text-base font-medium rounded-md hover:shadow-md active:scale-95 transition-all flex items-center justify-center min-w-[90px] sm:min-w-[120px] flex-1 xs:flex-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <FiUserX className="mr-1 sm:mr-2" size={16} />
                  <span className="hidden sm:inline">Unfriend</span>
                  <span className="sm:hidden">Remove</span>
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
      <div className="card mb-4 sm:mb-6">
        <div className="p-3 sm:p-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-semibold text-[var(--color-text-primary)]">
            Search Results
          </h2>
          {searchLoading && <LoadingSpinner size="sm" />}
        </div>

        {searchResults?.data && searchResults.data.length > 0 ? (
          <div className="p-3 sm:p-4 space-y-3">
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
                  className="bg-[var(--color-bg-secondary)] rounded-xl p-2 sm:p-3 flex flex-col xs:flex-row items-start xs:items-center justify-between shadow-sm hover:bg-[var(--color-bg-hover)] transition-colors gap-3 xs:gap-0"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0 w-full xs:w-auto">
                    <Link
                      to={`/profile/${user._id}`}
                      className="flex-shrink-0 rounded-full overflow-hidden"
                    >
                      <Avatar
                        src={user.avatar}
                        alt={user.username}
                        size="lg"
                        className="flex-shrink-0 hover:opacity-90 transition-opacity"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${user._id}`}
                        className="font-semibold text-[var(--color-text-primary)] hover:underline truncate block"
                      >
                        {user.fullname || user.username}
                      </Link>
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-0 xs:ml-3 w-full xs:w-auto flex justify-end">
                    {renderFriendshipButton()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 sm:p-6 text-center">
            <p className="text-gray-400">
              {searchLoading
                ? "Searching..."
                : `No users found matching "${debouncedQuery}"`}
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
          className="card p-3 flex items-center justify-between animate-pulse mb-3"
        >
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-14 h-14 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="flex-1">
              <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-9 w-24 bg-blue-300 dark:bg-blue-700 rounded-xl"></div>
            <div className="h-9 w-24 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      ));
  };

  // Cập nhật hàm renderContent() để hiển thị skeleton
  const renderContent = () => {
    // Display skeleton loader when no cached data available
    if (loading && !localFriends.length) {
      return (
        <div className="space-y-3">
          <div className="flex justify-center my-2 mb-4">
            <div className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg text-sm">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Loading friends...</span>
            </div>
          </div>
          {renderSkeletonFriends()}
        </div>
      );
    } else if (loading && localFriends.length > 0) {
      // If we have cached data, show it with a small loading indicator
      return (
        <>
          <div className="flex justify-center my-2 mb-4">
            <div className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)] bg-opacity-10 rounded-lg text-sm">
              <LoadingSpinner size="sm" className="mr-2" />
              <span>Updating...</span>
            </div>
          </div>
          {showSearchResults
            ? renderSearchResults()
            : activeTab === "requests"
            ? renderFriendRequests()
            : renderAllFriends()}
        </>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900/20 text-red-500 p-4 rounded-lg">
          {error.message || "Could not load friends data"}
        </div>
      );
    }

    if (showSearchResults) {
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
    <div className="p-1 sm:p-3 md:p-4 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6"
      >
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">
          Friends
        </h1>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-[var(--color-text-tertiary)] w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <input
            type="text"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-1.5 sm:py-2 pl-9 sm:pl-10 pr-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          {showSearchResults && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowSearchResults(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex mb-4 sm:mb-6 border-b border-[var(--color-border)] overflow-x-auto scrollbar-hide"
      >
        <button
          onClick={() => {
            setActiveTab("all");
            setShowSearchResults(false);
          }}
          className={`flex items-center py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base relative transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "all" && !showSearchResults
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <FiUsers className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
          <span>All Friends</span>
          {localFriends.length > 0 && (
            <span className="ml-1.5 sm:ml-2 bg-[var(--color-bg-tertiary)] px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
              {removeDuplicates(localFriends, "_id").length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("requests");
            setShowSearchResults(false);
          }}
          className={`flex items-center py-2 sm:py-3 px-3 sm:px-4 text-sm sm:text-base relative transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === "requests" && !showSearchResults
              ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <FiBell className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
          <span>Requests</span>
          {localPendingRequests.length > 0 && (
            <span className="ml-1.5 sm:ml-2 bg-[var(--color-primary)] text-white px-1.5 sm:px-2 py-0.5 rounded-full text-xs">
              {removeDuplicates(localPendingRequests, "_id").length}
            </span>
          )}
        </button>
        {showSearchResults && (
          <div className="flex items-center py-2 sm:py-3 px-3 sm:px-4 text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] whitespace-nowrap">
            <FiSearch className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            <span>Search Results</span>
          </div>
        )}
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};

export default FriendsPage;
