import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../../components/common/Avatar";
import Loading from "../../components/common/Loading";
import { FiUsers, FiUserX, FiMessageSquare, FiSearch } from "react-icons/fi";
import { showConfirmToast } from "../../utils/toast";
import { FiBell } from "react-icons/fi";
import { useFriend } from "../../contexts/FriendContext";

const FriendsPage = () => {
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
  } = useFriend();

  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingIds, setProcessingIds] = useState([]);

  useEffect(() => {
    // Load all data on component mount
    fetchFriends();
    fetchFriendRequests();
  }, [fetchFriends, fetchFriendRequests]);

  const handleAcceptRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);
    try {
      await acceptFriendRequest.mutateAsync(userId);
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleRejectRequest = async (userId) => {
    setProcessingIds((prev) => [...prev, userId]);
    try {
      await rejectFriendRequest.mutateAsync(userId);
    } catch (error) {
      console.error("Failed to reject friend request:", error);
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleUnfriend = async (userId) => {
    showConfirmToast(
      "Are you sure you want to unfriend this person?",
      async () => {
        setProcessingIds((prev) => [...prev, userId]);
        try {
          await unfriend.mutateAsync(userId);
        } catch (error) {
          console.error("Failed to unfriend:", error);
        } finally {
          setProcessingIds((prev) => prev.filter((id) => id !== userId));
        }
      }
    );
  };

  const renderFriendRequests = () => {
    if (pendingRequests.length === 0) {
      return (
        <div className="bg-[#18191a] rounded-lg p-6 text-center shadow-md border border-gray-700">
          <p className="text-gray-400">No new friend requests.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {pendingRequests.map((request) => (
          <div
            key={request._id}
            className="bg-[#242526] rounded-lg p-3 flex items-center justify-between shadow-sm border border-gray-700 hover:bg-[#3a3b3c] transition-colors"
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <Link
                to={`/profile/${request.userId._id}`}
                className="flex-shrink-0"
              >
                <Avatar
                  src={request.userId.avatar}
                  alt={request.userId.username}
                  size="xl"
                  className="flex-shrink-0 hover:opacity-90 transition-opacity"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/profile/${request.userId._id}`}
                  className="font-semibold text-white hover:underline truncate"
                >
                  {request.userId.username}
                </Link>
              </div>
            </div>
            <div className="flex space-x-2 flex-shrink-0 ml-3">
              <button
                onClick={() => handleAcceptRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                onClick={() => handleRejectRequest(request.userId._id)}
                disabled={processingIds.includes(request.userId._id)}
                className="py-1.5 px-4 bg-[#4e4f50] text-white text-sm font-semibold rounded-lg hover:bg-[#5f6061] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAllFriends = () => {
    if (friends.length === 0) {
      return (
        <div className="bg-[#18191a] rounded-lg p-6 text-center shadow-md border border-gray-700">
          <p className="text-gray-400">You don't have any friends yet.</p>
        </div>
      );
    }

    const filteredFriends = friends.filter(
      (friend) =>
        searchQuery.trim() === "" ||
        friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <>
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#3a3b3c] border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="space-y-3">
          {filteredFriends.map((friend) => (
            <div
              key={friend._id}
              className="bg-[#242526] rounded-lg p-3 flex items-center justify-between shadow-sm border border-gray-700 hover:bg-[#3a3b3c] transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Link to={`/profile/${friend._id}`} className="flex-shrink-0">
                  <Avatar
                    src={friend.avatar}
                    alt={friend.username}
                    size="xl"
                    className="flex-shrink-0 hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${friend._id}`}
                    className="font-semibold text-white hover:underline truncate"
                  >
                    {friend.fullname || friend.username}
                  </Link>
                  <p className="text-sm text-gray-400 truncate">
                    {friend.email}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 flex-shrink-0 ml-3">
                <Link
                  to={`/chat/${friend._id}`}
                  className="py-1.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <FiMessageSquare className="mr-2" size={16} /> Message
                </Link>
                <button
                  onClick={() => handleUnfriend(friend._id)}
                  disabled={processingIds.includes(friend._id)}
                  className="py-1.5 px-4 bg-[#4e4f50] text-white text-sm font-semibold rounded-lg hover:bg-[#5f6061] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <FiUserX className="mr-2" size={16} /> Unfriend
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderContent = () => {
    if (loading && !friends.length && !pendingRequests.length) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loading />
        </div>
      );
    }

    if (activeTab === "requests") {
      return renderFriendRequests();
    } else if (activeTab === "all") {
      return renderAllFriends();
    }

    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Friends</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-2 px-4 rounded-md text-sm font-medium flex-1 sm:flex-none flex items-center justify-center ${
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-[#3a3b3c] text-gray-300 hover:bg-[#4d4e4f]"
            } transition-colors`}
          >
            <FiUsers className="mr-2" /> All Friends
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-2 px-4 rounded-md text-sm font-medium flex-1 sm:flex-none flex items-center justify-center ${
              activeTab === "requests"
                ? "bg-blue-600 text-white"
                : "bg-[#3a3b3c] text-gray-300 hover:bg-[#4d4e4f]"
            } transition-colors`}
          >
            <FiBell className="mr-2" /> Friend Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded-md mb-4">{error}</div>
      )}

      {renderContent()}
    </div>
  );
};

export default FriendsPage;
