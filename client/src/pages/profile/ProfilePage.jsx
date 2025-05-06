import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import PostList from "../../components/post/PostList";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import LazyImage from "../../components/common/LazyImage";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfile } from "../../hooks/queries/useUserQueries";
import EditProfileModal from "../../components/profile/EditProfileModal";
import { BiCalendar, BiPhone, BiMap, BiUser } from "react-icons/bi";
import { useUserFollow } from "../../hooks/mutations/useUserMutations";
import { SkeletonProfile, SkeletonCard } from "../../components/skeleton";
import { useFriend } from "../../contexts/FriendContext";
import { useFriendQueries } from "../../hooks/queries/useFriendQueries";
import { FiUserPlus, FiSettings } from "react-icons/fi";

// Mapping của màu sắc cho từng rank
const rankColors = {
  Rookie: {
    bg: "bg-gray-700",
    text: "text-gray-200",
    border: "border-gray-500",
    shadow: "shadow-gray-900/20",
    gradient: "from-gray-700 to-gray-600",
  },
  Bronze: {
    bg: "bg-amber-800",
    text: "text-amber-100",
    border: "border-amber-600",
    shadow: "shadow-amber-900/30",
    gradient: "from-amber-700 to-amber-600",
  },
  Silver: {
    bg: "bg-gray-400",
    text: "text-gray-800",
    border: "border-gray-300",
    shadow: "shadow-gray-600/30",
    gradient: "from-gray-300 to-gray-400",
  },
  Gold: {
    bg: "bg-yellow-500",
    text: "text-yellow-900",
    border: "border-yellow-400",
    shadow: "shadow-yellow-700/40",
    gradient: "from-yellow-400 to-yellow-500",
  },
  Platinum: {
    bg: "bg-cyan-600",
    text: "text-cyan-100",
    border: "border-cyan-400",
    shadow: "shadow-cyan-800/30",
    gradient: "from-cyan-500 to-cyan-600",
  },
  Diamond: {
    bg: "bg-blue-700",
    text: "text-blue-100",
    border: "border-blue-400",
    shadow: "shadow-blue-900/30",
    gradient: "from-blue-600 to-blue-700",
  },
  Master: {
    bg: "bg-purple-600",
    text: "text-purple-100",
    border: "border-purple-400",
    shadow: "shadow-purple-800/40",
    gradient: "from-purple-500 to-purple-600",
  },
};

const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const userFollow = useUserFollow();
  const [followersCount, setFollowersCount] = useState(0);
  const prevUserId = useRef(null);
  const { sendFriendRequest } = useFriend();
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);

  // Get friendship status
  const { data: friendshipData } = useFriendQueries.useFriendshipStatus(
    userId,
    {
      enabled: !!userId && !!currentUser,
    }
  );

  const friendshipStatus = friendshipData?.status || "NOT_FRIEND";
  const isFriend = friendshipStatus === "FRIEND";

  // If no userId provided and user is logged in, use current user's id
  const targetUserId = userId || currentUser?._id;

  console.log(
    "ProfilePage - TargetUserId:",
    targetUserId,
    "CurrentUser:",
    currentUser
  );

  const {
    data: profileData,
    isLoading: loading,
    error,
    refetch,
  } = useUserProfile(targetUserId);

  console.log("Profile Data from query:", profileData);

  // Đảm bảo profile có dữ liệu
  const profile = profileData?.data || null;

  console.log("Profile after parsing:", profile);

  // Luôn refetch data khi component mount để đảm bảo dữ liệu mới nhất
  useEffect(() => {
    if (targetUserId) {
      console.log(
        `[ProfilePage] Component mounted, refetching data for ${targetUserId}`
      );
      // Sử dụng setTimeout để đảm bảo token đã được load xong
      setTimeout(() => {
        refetch();
        console.log("[ProfilePage] Triggered refetch on mount");
      }, 300);
    }
  }, [targetUserId, refetch, currentUser]);

  // Refetch data khi user ID thay đổi (route change)
  useEffect(() => {
    if (userId && userId !== prevUserId.current) {
      console.log(
        `[ProfilePage] User ID changed from ${prevUserId.current} to ${userId}`
      );
      prevUserId.current = userId;

      // Đảm bảo cập nhật data từ server
      setTimeout(() => {
        refetch();
        console.log("[ProfilePage] Triggered refetch on user change");
      }, 300);
    }
  }, [userId, refetch]);

  useEffect(() => {
    if (!targetUserId) {
      navigate("/login");
    }
  }, [targetUserId, navigate]);

  // Cập nhật state từ dữ liệu profile từ server
  useEffect(() => {
    if (profile) {
      // Xác định giá trị từ profile data
      const newFollowersCount = profile.followersCount || 0;
      // Đảm bảo isFollowing luôn là boolean
      const newIsFollowing = profile.isFollowing === true;

      // Cập nhật state từ server
      setFollowersCount(newFollowersCount);
      setIsFollowing(newIsFollowing);

      // Update ref with server values
      followStateRef.current.currentState = newIsFollowing;
      followStateRef.current.followersCount = newFollowersCount;
      followStateRef.current.isProcessing = false;
      followStateRef.current.lastUpdated = Date.now();
    }
  }, [profile]);

  // Check if this is the current user's profile
  const isOwnProfile =
    !userId || (currentUser && profile && currentUser._id === profile._id);

  // Add ref to track follow state
  const followStateRef = useRef({
    isProcessing: false,
    lastUpdated: 0,
    currentState: false,
    followersCount: 0,
  });

  // Add local processing state to prevent UI flicker
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleFollow = useCallback(async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    // Kiểm tra xem profile có tồn tại không
    if (!profile || !profile._id) {
      return;
    }

    if (isProcessing) return; // Prevent multiple clicks

    setIsProcessing(true);

    // Optimistic update
    const currentlyFollowing = isFollowing;
    const currentFollowersCount = followersCount;
    const newFollowersCount = currentlyFollowing
      ? Math.max(currentFollowersCount - 1, 0)
      : currentFollowersCount + 1;

    // Update local state first for immediate feedback
    setIsFollowing(!currentlyFollowing);
    setFollowersCount(newFollowersCount);

    try {
      // Call API
      const response = await userFollow.mutateAsync(profile._id);

      // Update with actual API response
      if (response && response.success) {
        setIsFollowing(response.data.isFollowing);
        setFollowersCount(response.data.followersCount);
      }
    } catch {
      // Revert on error
      setIsFollowing(currentlyFollowing);
      setFollowersCount(currentFollowersCount);
    } finally {
      setIsProcessing(false);
    }
  }, [
    isFollowing,
    isProcessing,
    userFollow,
    profile,
    navigate,
    currentUser,
    followersCount,
  ]);

  const handleSendFriendRequest = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (!profile || !profile._id || sendingFriendRequest) return;

    try {
      setSendingFriendRequest(true);
      await sendFriendRequest({ userId: profile._id });
    } catch (error) {
      console.error("Failed to send friend request:", error);
    } finally {
      setSendingFriendRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-4 px-3 sm:px-4 md:py-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] pb-4">
          Profile
        </h1>
        <div className="space-y-4">
          <SkeletonProfile />
          <div className="grid grid-cols-1 gap-4">
            <SkeletonCard height="h-40" />
            <SkeletonCard height="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-7xl mx-auto py-4 px-3 sm:px-4">
        <div className="text-center py-8 text-gray-400 bg-[var(--color-bg-secondary)] rounded-lg">
          <div className="mb-4">
            <svg
              className="w-12 h-12 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Profile not found</h2>
          <p className="text-gray-500">
            This user profile doesn't exist or you don't have permission to view
            it.
          </p>
          <div className="mt-6">
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Lấy màu sắc cho rank hiện tại
  const rankColor = rankColors[profile.rank] || rankColors.Rookie;

  return (
    <div className="max-w-7xl mx-auto py-4 px-3 sm:px-4 md:py-6">
      {/* Profile Header */}
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] pb-4"
      >
        Profile
      </motion.h1>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card mb-4 sm:mb-6 overflow-hidden relative"
      >
        {/* Settings button (only visible on own profile) */}
        {isOwnProfile && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <button
              onClick={() => navigate("/settings")}
              className="bg-[var(--color-bg-secondary)] p-2 sm:p-2.5 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-primary)] shadow-sm cursor-pointer"
              title="Settings"
            >
              <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        )}

        {/* Profile Info */}
        <div className="px-4 py-5 sm:px-6 sm:py-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex justify-center sm:justify-start mb-4 sm:mb-0">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <LazyImage
                  src={profile.avatar || defaultAvatar}
                  alt={profile.username}
                  className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-[var(--color-bg-secondary)] shadow-xl"
                  style={{ objectFit: "cover" }}
                />
              </motion.div>
            </div>

            <div className="sm:ml-6 flex-grow text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <div className="flex items-center justify-center sm:justify-start">
                    <h1
                      className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] truncate max-w-[200px] sm:max-w-[250px] md:max-w-[300px] group relative"
                      title={profile.fullname}
                    >
                      {profile.fullname}
                      {profile.fullname && profile.fullname.length > 20 && (
                        <span className="absolute hidden group-hover:block bg-gray-800 text-white text-sm rounded p-1 -mt-8 shadow-lg z-10">
                          {profile.fullname}
                        </span>
                      )}
                    </h1>

                    {/* Rank Badge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${rankColor.text} bg-gradient-to-r ${rankColor.gradient} border ${rankColor.border} ${rankColor.shadow}`}
                    >
                      {profile.rank}
                    </motion.div>
                  </div>
                  <p
                    className="text-[var(--color-text-secondary)] text-sm truncate max-w-[200px] sm:max-w-[250px] md:max-w-[300px] mx-auto sm:mx-0"
                    title={`@${profile.username}`}
                  >
                    @{profile.username}
                  </p>

                  {/* Replace points display with Follow/Add Friend or Edit Profile buttons based on ownership */}
                  {!isOwnProfile ? (
                    <div className="mt-4 flex space-x-3 justify-center sm:justify-start">
                      <button
                        className={`relative overflow-hidden group rounded-md px-4 py-1.5 sm:px-5 sm:py-2 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ${
                          isFollowing
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                        }`}
                        onClick={handleToggleFollow}
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 relative z-10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {isFollowing ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          )}
                        </svg>
                        <span className="font-semibold text-sm sm:text-base relative z-10">
                          {isFollowing ? "Following" : "Follow"}
                        </span>
                      </button>

                      {/* Message button - moved from bottom right to here */}
                      {isFriend && (
                        <button
                          onClick={() => navigate(`/messages/${profile._id}`)}
                          className="relative overflow-hidden group rounded-md px-4 py-1.5 sm:px-5 sm:py-2 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg active:scale-95 bg-gradient-to-r from-gray-600 to-gray-700 text-white"
                        >
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-700 to-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 relative z-10"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span className="font-semibold text-sm sm:text-base relative z-10">
                            Message
                          </span>
                        </button>
                      )}

                      {!isFriend && (
                        <button
                          onClick={handleSendFriendRequest}
                          disabled={
                            friendshipStatus === "PENDING_SENT" ||
                            sendingFriendRequest
                          }
                          className={`relative overflow-hidden group rounded-md px-4 py-1.5 sm:px-5 sm:py-2 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ${
                            friendshipStatus === "PENDING_SENT"
                              ? "bg-gray-500 text-white opacity-80 cursor-not-allowed"
                              : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                          }`}
                        >
                          <span
                            className={`absolute inset-0 w-full h-full bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                              friendshipStatus === "PENDING_SENT"
                                ? "hidden"
                                : ""
                            } rounded-md`}
                          ></span>
                          <FiUserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 relative z-10" />
                          <span className="font-semibold text-sm sm:text-base relative z-10">
                            {friendshipStatus === "PENDING_SENT"
                              ? "Sent"
                              : friendshipStatus === "PENDING_RECEIVED"
                              ? "Accept"
                              : "Add Friend"}
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 flex justify-center sm:justify-start">
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="relative overflow-hidden group rounded-md px-4 py-1.5 sm:px-5 sm:py-2 flex items-center justify-center transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg active:scale-95 bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></span>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 relative z-10"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        <span className="font-semibold text-sm sm:text-base relative z-10">
                          Edit Profile
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* User Bio & Location */}
              {(profile.bio || profile.location) && (
                <div className="mt-4 text-[var(--color-text-secondary)] text-center sm:text-left px-2 sm:px-0">
                  {profile.bio && (
                    <p className="mb-2 whitespace-pre-wrap line-clamp-2 sm:line-clamp-3 group relative">
                      {profile.bio}
                      {profile.bio.length > 100 && (
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-[var(--color-primary)] font-medium ml-1 hover:underline absolute cursor-pointer"
                        >
                          more
                        </button>
                      )}
                    </p>
                  )}

                  {profile.location && (
                    <div className="flex items-center text-sm mt-2 justify-center sm:justify-start">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span
                        className="truncate max-w-[150px] sm:max-w-[250px]"
                        title={profile.location}
                      >
                        {profile.location}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Social Media Links */}
              {profile.links && profile.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3 justify-center sm:justify-start">
                  {profile.links.map((link, index) => (
                    <a
                      key={index}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)] transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9.32 13.42l1.43 1.43a2.99 2.99 0 004.24 0l2.55-2.55a2.99 2.99 0 000-4.24 2.97 2.97 0 00-2.12-.88c-.8 0-1.58.31-2.12.88l-.71.71a.996.996 0 101.41 1.41l.71-.71a1 1 0 011.42 0 1 1 0 010 1.42l-2.55 2.55a1 1 0 01-1.42 0 .996.996 0 010-1.41L13.73 10a1 1 0 10-1.41-1.41l-1.57 1.57a3 3 0 00-.03 4.26zm5.36-2.84l-1.43-1.43a2.99 2.99 0 00-4.24 0L6.46 11.7a2.99 2.99 0 000 4.24 2.97 2.97 0 002.12.88c.8 0 1.58-.31 2.12-.88l.71-.71a.996.996 0 10-1.41-1.41l-.71.71a1 1 0 01-1.42 0 1 1 0 010-1.42l2.55-2.55a1 1 0 011.42 0c.39.39.39 1.02 0 1.41l-1.57 1.57a1 1 0 101.41 1.41l1.57-1.57a3 3 0 00.03-4.26z" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Profile Content */}
      <div className="mt-4 sm:mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Stats Card */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-3 sm:mb-4 text-[var(--color-text-primary)]">
              Stats
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[var(--color-text-secondary)]">
                    Current Rank
                  </span>
                  <div
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${rankColor.text} bg-gradient-to-r ${rankColor.gradient}`}
                  >
                    {profile.rank}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[var(--color-text-secondary)]">
                    Points
                  </span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {profile.points || 0}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[var(--color-text-secondary)]">
                    Followers
                  </span>
                  <span className="text-[var(--color-text-primary)] font-semibold">
                    {followersCount || 0}
                  </span>
                </div>
              </div>

              {profile.rank !== "Master" && (
                <div>
                  <div className="flex justify-between items-center mb-1 text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Next rank: {getNextRank(profile.rank)}
                    </span>
                    <span className="text-[var(--color-text-tertiary)]">
                      {getPointsToNextRankPercentage(
                        profile.rank,
                        profile.points
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)]"
                      style={{
                        width: `${getPointsToNextRankPercentage(
                          profile.rank,
                          profile.points
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About Card */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-3 sm:mb-4 text-[var(--color-text-primary)]">
              About
            </h2>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-[var(--color-bg-tertiary)] p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex items-center justify-center">
                  <BiCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <span className="block text-xs sm:text-sm text-[var(--color-text-secondary)]">
                    Joined
                  </span>
                  <span className="block font-medium text-[var(--color-text-primary)] text-sm sm:text-base">
                    {new Date(
                      profile.createdAt || Date.now()
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {profile.phone && (
                <div className="flex items-center mt-2 sm:mt-3">
                  <div className="flex-shrink-0 bg-[var(--color-bg-tertiary)] p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex items-center justify-center">
                    <BiPhone className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm text-[var(--color-text-secondary)]">
                      Phone
                    </span>
                    <span className="block font-medium text-[var(--color-text-primary)] text-sm sm:text-base">
                      {profile.phone}
                    </span>
                  </div>
                </div>
              )}

              {profile.address && (
                <div className="flex items-center mt-2 sm:mt-3">
                  <div className="flex-shrink-0 bg-[var(--color-bg-tertiary)] p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex items-center justify-center">
                    <BiMap className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm text-[var(--color-text-secondary)]">
                      Address
                    </span>
                    <span className="block font-medium text-[var(--color-text-primary)] text-sm sm:text-base truncate max-w-[180px] sm:max-w-[220px]">
                      {profile.address}
                    </span>
                  </div>
                </div>
              )}

              {profile.bio ? (
                <div className="flex items-center mt-2 sm:mt-3">
                  <div className="flex-shrink-0 bg-[var(--color-bg-tertiary)] p-1.5 sm:p-2 rounded-lg mr-2 sm:mr-3 flex items-center justify-center">
                    <BiUser className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-secondary)]" />
                  </div>
                  <div>
                    <span className="block text-xs sm:text-sm text-[var(--color-text-secondary)]">
                      Bio
                    </span>
                    <span className="block font-medium text-[var(--color-text-primary)] text-sm sm:text-base line-clamp-3">
                      {profile.bio}
                    </span>
                  </div>
                </div>
              ) : (
                isOwnProfile && (
                  <div className="mt-2 sm:mt-3 p-2 sm:p-3 border border-dashed border-[var(--color-border)] rounded-lg text-center">
                    <p className="text-[var(--color-text-secondary)] text-xs sm:text-sm">
                      Add information about yourself by{" "}
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-[var(--color-primary)] hover:underline"
                      >
                        editing your profile
                      </button>
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Additional Info can go in this third column on larger screens */}
          <div className="hidden lg:block bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-primary)]">
              Activity
            </h2>

            <div className="space-y-4">
              {/* Activity summary could go here */}
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">
                  Posts
                </span>
                <span className="text-[var(--color-text-primary)] font-semibold">
                  {profile.posts?.length || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">
                  Comments
                </span>
                <span className="text-[var(--color-text-primary)] font-semibold">
                  {profile.commentsCount || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--color-text-secondary)]">
                  Following
                </span>
                <span className="text-[var(--color-text-primary)] font-semibold">
                  {profile.followingCount || 0}
                </span>
              </div>

              <div className="h-px bg-[var(--color-border)] my-2"></div>

              <div className="text-center">
                <Link
                  to={`/messages/${profile._id}`}
                  className={`inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-md 
                    ${
                      isOwnProfile || !isFriend
                        ? "bg-gray-600/50 text-gray-400 cursor-not-allowed opacity-60"
                        : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                    }`}
                  onClick={(e) => {
                    if (isOwnProfile || !isFriend) e.preventDefault();
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Message
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section - Full Width */}
        <div className="w-full mt-4 sm:mt-6">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mb-3 sm:mb-4 flex items-center">
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-[var(--color-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              {isOwnProfile ? "Your Posts" : `${profile.fullname}'s Posts`}
            </h2>

            {profile.posts && profile.posts.length > 0 ? (
              <PostList posts={profile.posts} loading={false} error={null} />
            ) : (
              <div className="text-center py-8 sm:py-10 bg-[var(--color-bg-tertiary)] rounded-lg">
                <svg
                  className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[var(--color-text-tertiary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
                <p className="mt-2 text-[var(--color-text-secondary)]">
                  No posts yet
                </p>

                {isOwnProfile && (
                  <Link
                    to="/create-post"
                    className="mt-3 sm:mt-4 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Create Your First Post
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isOwnProfile && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};

// Helper function để xác định rank tiếp theo
function getNextRank(currentRank) {
  const ranks = [
    "Rookie",
    "Bronze",
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Master",
  ];

  const currentIndex = ranks.indexOf(currentRank);
  if (currentIndex === ranks.length - 1) {
    return "Max Rank";
  }

  return ranks[currentIndex + 1];
}

// Helper function để tính phần trăm tiến độ đến rank tiếp theo
// eslint-disable-next-line no-unused-vars
function getPointsToNextRank(currentRank, points) {
  // Định nghĩa số điểm cần cho mỗi rank
  const rankThresholds = {
    Rookie: { min: 0, max: 100 },
    Bronze: { min: 100, max: 500 },
    Silver: { min: 500, max: 1500 },
    Gold: { min: 1500, max: 3000 },
    Platinum: { min: 3000, max: 6000 },
    Diamond: { min: 6000, max: 10000 },
    Master: { min: 10000, max: Infinity },
  };

  const current = rankThresholds[currentRank];

  // Nếu đã là rank cao nhất
  if (currentRank === "Master") {
    return 100;
  }

  // Tính toán phần trăm hoàn thành
  const pointsInCurrentRank = points - current.min;
  const pointsNeededForNextRank = current.max - current.min;
  let percentage = Math.floor(
    (pointsInCurrentRank / pointsNeededForNextRank) * 100
  );

  // Giới hạn trong khoảng 0-100
  return Math.min(Math.max(percentage, 0), 100);
}

// Calculate percentage progress to next rank
function getPointsToNextRankPercentage(currentRank, points) {
  if (currentRank === "Master") return 100;

  const rankThresholds = {
    Rookie: 0,
    Bronze: 100,
    Silver: 300,
    Gold: 700,
    Platinum: 1500,
    Diamond: 3000,
    Master: 6000,
  };

  const currentPoints = points || 0;
  const currentThreshold = rankThresholds[currentRank] || 0;
  const nextRank = getNextRank(currentRank);
  const nextThreshold = rankThresholds[nextRank] || 100;

  const pointsNeeded = nextThreshold - currentThreshold;
  const pointsGained = currentPoints - currentThreshold;

  const percentage = Math.min(
    100,
    Math.max(0, (pointsGained / pointsNeeded) * 100)
  );
  return Math.round(percentage);
}

export default ProfilePage;
