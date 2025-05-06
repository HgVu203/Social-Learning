import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiMessageCircle, FiUserPlus, FiUserCheck } from "react-icons/fi";
import Avatar from "../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useFriend } from "../../contexts/FriendContext";

const UserCard = ({ user }) => {
  const { user: currentUser } = useAuth();
  const {
    sendFriendRequest,
    acceptFriendRequest,
    cancelRequest,
    isFriendRequestLoading,
  } = useFriend();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) return null;

  const isSelf = currentUser && currentUser._id === user._id;
  const isFriend = user.isFriend;
  const isPending = user.status === "pending";
  const isRequestReceived = user.status === "received";

  const handleFriendAction = async () => {
    if (isProcessing || isFriendRequestLoading) return;

    setIsProcessing(true);
    try {
      if (isPending) {
        await cancelRequest(user._id);
      } else if (isRequestReceived) {
        await acceptFriendRequest(user._id);
      } else if (!isFriend && !isSelf) {
        await sendFriendRequest(user._id);
      }
    } catch (error) {
      console.error("Friend action error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card flex flex-col sm:flex-row items-center p-3 sm:p-4 rounded-xl mb-3 border border-[var(--color-border)]"
    >
      <div className="flex items-center w-full sm:w-auto">
        <Link to={`/profile/${user._id}`} className="flex-shrink-0">
          <Avatar
            src={user.avatar}
            alt={user.username || "User"}
            size="lg"
            className="mr-3"
          />
        </Link>

        <div className="flex-1 min-w-0 mr-2">
          <Link
            to={`/profile/${user._id}`}
            className="font-medium text-[var(--color-text-primary)] hover:underline block truncate"
          >
            {user.fullname || user.username}
          </Link>

          <p className="text-sm text-[var(--color-text-secondary)] truncate">
            @{user.username}
          </p>

          {user.bio && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-1 hidden sm:block">
              {user.bio}
            </p>
          )}
        </div>

        <div className="flex space-x-2 ml-auto sm:hidden">
          {!isSelf && (
            <button
              onClick={handleFriendAction}
              disabled={isProcessing || isFriendRequestLoading}
              className={`p-2 rounded-full ${
                isFriend
                  ? "bg-[var(--color-primary)] text-white"
                  : isPending
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                  : isRequestReceived
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              }`}
              title={
                isFriend
                  ? "Friend"
                  : isPending
                  ? "Cancel Request"
                  : isRequestReceived
                  ? "Accept Request"
                  : "Add Friend"
              }
            >
              {isFriend ? (
                <FiUserCheck className="w-5 h-5" />
              ) : isPending || isRequestReceived ? (
                <FiUserPlus className="w-5 h-5" />
              ) : (
                <FiUserPlus className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 mt-3 sm:mt-0 sm:ml-4 justify-center sm:justify-start w-full sm:w-auto">
        {!isSelf && (
          <>
            <Link
              to={`/messages/${user._id}`}
              className="btn btn-secondary p-2 rounded-full sm:hidden"
              title="Message"
            >
              <FiMessageCircle className="w-5 h-5" />
            </Link>

            <Link
              to={`/messages/${user._id}`}
              className="hidden sm:flex btn btn-secondary px-3 py-1.5 rounded-md text-sm items-center"
              title="Message"
            >
              <FiMessageCircle className="w-4 h-4 mr-1" />
              <span>Message</span>
            </Link>

            <button
              onClick={handleFriendAction}
              disabled={isProcessing || isFriendRequestLoading}
              className={`hidden sm:flex px-3 py-1.5 rounded-md text-sm items-center ${
                isFriend
                  ? "bg-[var(--color-primary)] text-white"
                  : isPending
                  ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                  : isRequestReceived
                  ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
              }`}
              title={
                isFriend
                  ? "Friend"
                  : isPending
                  ? "Cancel Request"
                  : isRequestReceived
                  ? "Accept Request"
                  : "Add Friend"
              }
            >
              {isFriend ? (
                <>
                  <FiUserCheck className="w-4 h-4 mr-1" />
                  <span>Friend</span>
                </>
              ) : isPending ? (
                <>
                  <FiUserPlus className="w-4 h-4 mr-1" />
                  <span>Pending</span>
                </>
              ) : isRequestReceived ? (
                <>
                  <FiUserPlus className="w-4 h-4 mr-1" />
                  <span>Accept</span>
                </>
              ) : (
                <>
                  <FiUserPlus className="w-4 h-4 mr-1" />
                  <span>Add Friend</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default UserCard;
