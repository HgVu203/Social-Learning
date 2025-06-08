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

// Separate component for each following item with its own hooks
const FollowingItem = ({ following, onClose }) => {
  const { t } = useTranslation();
  const userFollow = useUserFollow();
  const { sendFriendRequest } = useFriend();
  const [isProcessing, setIsProcessing] = useState(false);

  // Each item has its own friendship status query
  const { data: friendshipData } = useFriendQueries.useFriendshipStatus(
    following._id,
    { enabled: !!following._id }
  );

  const friendshipStatus = friendshipData?.status || "NOT_FRIEND";

  // Handle follow/unfollow user
  const handleToggleFollow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await userFollow.mutateAsync({
        userId: following._id,
        isFollowing: true, // Always unfollow because these are people we're following
      });
    } catch (error) {
      console.error("Error unfollowing user:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle friend request
  const handleFriendRequest = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      await sendFriendRequest.mutateAsync({ userId: following._id });
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
        to={`/profile/${following._id}`}
        onClick={onClose}
        className="flex items-center flex-grow"
      >
        <Avatar
          src={following.avatar}
          alt={following.username}
          size="sm"
          className="mr-3"
        />
        <div>
          <h4 className="font-medium text-[var(--color-text-primary)]">
            {following.fullname || following.username}
          </h4>
          <p className="text-xs text-[var(--color-text-secondary)]">
            @{following.username}
          </p>
        </div>
      </Link>

      <div className="flex space-x-2">
        {/* Unfollow button */}
        <button
          onClick={handleToggleFollow}
          disabled={isProcessing}
          className="px-2 py-1 rounded-md text-xs font-medium flex items-center bg-[var(--color-primary-light)] text-white hover:bg-[var(--color-primary)] transition-colors"
        >
          {isProcessing ? (
            <ImSpinner8 className="animate-spin mr-1 w-3 h-3" />
          ) : (
            <FiUserMinus className="mr-1" />
          )}
          {t("profile.unfollow")}
        </button>

        {/* Friend button */}
        {renderFriendButton()}
      </div>
    </div>
  );
};

// Add translation strings to each item
const enhanceFollowingWithTranslation = (followingList, t) => {
  if (!followingList || !Array.isArray(followingList)) return [];

  return followingList.map((following) => ({
    ...following,
    translatedStrings: {
      followText: t("profile.follow"),
      unfollowText: t("profile.unfollow"),
      addFriendText: t("friend.add"),
      requestedText: t("friend.requested"),
      friendsText: t("friend.friends"),
    },
  }));
};

const FollowingModal = ({
  isOpen,
  onClose,
  followingList = [],
  isLoading = false,
}) => {
  const { t } = useTranslation();

  // Enhance following list with translations
  const enhancedFollowing = enhanceFollowingWithTranslation(followingList, t);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("profile.following")}>
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <ImSpinner8 className="animate-spin text-[var(--color-primary)] text-xl" />
          </div>
        ) : enhancedFollowing.length === 0 ? (
          <div className="text-center py-6 text-[var(--color-text-secondary)]">
            {t("profile.noFollowing")}
          </div>
        ) : (
          <div className="space-y-3">
            {enhancedFollowing.map((following) => (
              <FollowingItem
                key={following._id}
                following={following}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FollowingModal;
