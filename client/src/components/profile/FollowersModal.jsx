import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import { useUserFollow } from "../../hooks/mutations/useUserMutations";
import { useFriend } from "../../contexts/FriendContext";
import { FiUserPlus, FiUserMinus, FiUserCheck } from "react-icons/fi";
import { ImSpinner8 } from "react-icons/im";
import { useFriendQueries } from "../../hooks/queries/useFriendQueries";

// Separate component for each follower item with its own hooks
const FollowerItem = ({ follower, onClose }) => {
  const { t } = useTranslation();
  const userFollow = useUserFollow();
  const { sendFriendRequest } = useFriend();
  const [isProcessing, setIsProcessing] = useState(false);

  // Each item has its own friendship status query
  const { data: friendshipData } = useFriendQueries.useFriendshipStatus(
    follower._id,
    { enabled: !!follower._id }
  );

  const friendshipStatus = friendshipData?.status || "NOT_FRIEND";

  // Handle follow/unfollow user
  const handleToggleFollow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await userFollow.mutateAsync({
        userId: follower._id,
        isFollowing: follower.isFollowing || false,
      });
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle friend request
  const handleFriendRequest = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await sendFriendRequest.mutateAsync({ userId: follower._id });
    } catch (error) {
      console.error("Error sending friend request:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render friend button based on friendship status
  const renderFriendButton = () => {
    switch (friendshipStatus) {
      case "NOT_FRIEND":
        return (
          <button
            onClick={handleFriendRequest}
            disabled={isProcessing}
            className="px-2 py-1 rounded-md bg-[var(--color-primary)] text-white text-xs font-medium flex items-center hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <FiUserPlus className="mr-1" />
            {t("friend.addFriend")}
          </button>
        );
      case "PENDING_SENT":
        return (
          <button
            disabled
            className="px-2 py-1 rounded-md bg-gray-500 text-white text-xs font-medium flex items-center opacity-70"
          >
            <FiUserCheck className="mr-1" />
            {t("friend.pending")}
          </button>
        );
      case "FRIEND":
        return (
          <button
            disabled
            className="px-2 py-1 rounded-md bg-green-600 text-white text-xs font-medium flex items-center"
          >
            <FiUserCheck className="mr-1" />
            {t("friend.friend")}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors">
      <Link
        to={`/profile/${follower._id}`}
        onClick={onClose}
        className="flex items-center flex-grow"
      >
        <Avatar
          src={follower.avatar}
          alt={follower.username}
          size="sm"
          className="mr-3"
        />
        <div>
          <h4 className="font-medium text-[var(--color-text-primary)]">
            {follower.fullname || follower.username}
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            @{follower.username}
          </p>
        </div>
      </Link>

      <div className="flex space-x-2">
        {/* Follow/Unfollow button */}
        <button
          onClick={handleToggleFollow}
          disabled={isProcessing}
          className={`px-2 py-1 rounded-md text-xs font-medium flex items-center transition-colors ${
            follower.isFollowing
              ? "bg-[var(--color-primary-light)] text-white hover:bg-[var(--color-primary)]"
              : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
          }`}
        >
          {isProcessing ? (
            <ImSpinner8 className="animate-spin mr-1 w-3 h-3" />
          ) : follower.isFollowing ? (
            <FiUserMinus className="mr-1" />
          ) : (
            <FiUserPlus className="mr-1" />
          )}
          {follower.isFollowing ? t("profile.unfollow") : t("profile.follow")}
        </button>

        {/* Friend button */}
        {renderFriendButton()}
      </div>
    </div>
  );
};

// Add translation strings to each follower
const enhanceFollowersWithTranslation = (followers, t) => {
  if (!followers || !Array.isArray(followers)) return [];

  return followers.map((follower) => ({
    ...follower,
    translatedStrings: {
      followText: t("profile.follow"),
      unfollowText: t("profile.unfollow"),
      addFriendText: t("friend.add"),
      requestedText: t("friend.requested"),
      friendsText: t("friend.friends"),
    },
  }));
};

const FollowersModal = ({
  isOpen,
  onClose,
  followersList = [],
  isLoading = false,
}) => {
  const { t } = useTranslation();

  // Enhance followers with translations
  const enhancedFollowers = enhanceFollowersWithTranslation(followersList, t);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("profile.followers")}>
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <ImSpinner8 className="animate-spin text-[var(--color-primary)] text-xl" />
          </div>
        ) : enhancedFollowers.length === 0 ? (
          <div className="text-center py-6 text-[var(--color-text-secondary)]">
            {t("profile.noFollowers")}
          </div>
        ) : (
          <div className="space-y-3">
            {enhancedFollowers.map((follower) => (
              <FollowerItem
                key={follower._id}
                follower={follower}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FollowersModal;
