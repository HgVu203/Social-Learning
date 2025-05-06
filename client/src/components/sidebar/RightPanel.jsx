import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useGroup } from "../../contexts/GroupContext";
import { useFriend } from "../../contexts/FriendContext";
import Avatar from "../common/Avatar";
import { SkeletonRightPanel } from "../skeleton";
import {
  FiUsers,
  FiSearch,
  FiUserCheck,
  FiMessageCircle,
} from "react-icons/fi";
import ThemeToggle from "../ui/ThemeToggle";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const RightPanel = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { usePopularGroups } = useGroup();
  const { data: popularGroupsData, isLoading: popularGroupsLoading } =
    usePopularGroups(3); // Only get top 3 popular groups
  const isLargeScreen = useMediaQuery("(min-width: 1280px)");

  // Giới hạn chỉ hiển thị 3 nhóm phổ biến
  const popularGroups = (popularGroupsData?.data || []).slice(0, 3);

  const { friends, friendsLoading, fetchFriends } = useFriend();

  // Filter online friends (if friends has a value)
  const onlineFriends = (friends || []).filter((friend) => friend.isOnline);

  useEffect(() => {
    // Load friends list when component mounts
    if (fetchFriends) {
      fetchFriends();
    }
  }, [fetchFriends]);

  // Listen for user status updates
  useEffect(() => {
    const handleUserStatusUpdate = (event) => {
      const { userId, isOnline } = event.detail;

      // Fetch updated friend list to reflect online status changes
      if (fetchFriends) {
        console.log(
          `User ${userId} status changed to ${
            isOnline ? "online" : "offline"
          }, refreshing friends list`
        );
        fetchFriends();
      }
    };

    // Add event listener
    window.addEventListener("user_status_updated", handleUserStatusUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("user_status_updated", handleUserStatusUpdate);
    };
  }, [fetchFriends]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // If both popular groups and friends are loading, show skeleton loader
  if (popularGroupsLoading && friendsLoading) {
    return <SkeletonRightPanel />;
  }

  return (
    <div className="h-full p-4 overflow-y-auto">
      {/* Search bar - Only on large screens */}
      {isLargeScreen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 bg-[var(--color-bg-primary)] pt-1 pb-3 z-10"
        >
          <form onSubmit={handleSearch}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, groups, users..."
                className="w-full text-sm bg-[var(--color-bg-secondary)] rounded-full py-3 px-12 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Popular Groups */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card rounded-xl mb-4 overflow-hidden shadow-md"
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <FiUsers className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            Popular Groups
          </h2>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {popularGroupsLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {Array(3)
                  .fill()
                  .map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-[var(--color-bg-light)] rounded-md"></div>
                        <div>
                          <div className="h-4 bg-[var(--color-bg-light)] rounded w-24 mb-1"></div>
                          <div className="h-3 bg-[var(--color-bg-light)] rounded w-16"></div>
                        </div>
                      </div>
                      <div className="h-8 w-16 bg-[var(--color-bg-light)] rounded-md"></div>
                    </div>
                  ))}
              </div>
            </div>
          ) : !popularGroups || popularGroups.length === 0 ? (
            <div className="p-4 text-[var(--color-text-tertiary)] text-center">
              No groups available
            </div>
          ) : (
            popularGroups.map((group) => (
              <Link
                key={group._id}
                to={`/groups/${group._id}`}
                className="px-4 py-3 hover:bg-[var(--color-bg-hover)] block transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg mr-3 flex items-center justify-center bg-[var(--color-bg-tertiary)] overflow-hidden shadow-sm">
                    {group.coverImage ? (
                      <img
                        src={group.coverImage}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-[var(--color-text-primary)]">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--color-text-primary)]">
                      {group.name}
                    </h3>
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                      {group.membersCount || group.members?.length || 0} members
                    </p>
                  </div>
                  {!group.isMember && (
                    <button className="btn btn-primary btn-sm">Join</button>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/groups"
          className="block px-4 py-3 text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-center font-medium"
        >
          Show more groups
        </Link>
      </motion.div>

      {/* Online Friends */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="card rounded-xl mb-4 overflow-hidden shadow-md"
      >
        <div className="flex items-center px-4 py-3 border-b border-[var(--color-border)]">
          <FiUserCheck className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
            Online Friends
          </h2>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {friendsLoading ? (
            <div className="p-4">
              <div className="space-y-3">
                {Array(3)
                  .fill()
                  .map((_, index) => (
                    <div
                      key={index}
                      className="animate-pulse flex items-center"
                    >
                      <div className="w-10 h-10 bg-[var(--color-bg-light)] rounded-full mr-3"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-[var(--color-bg-light)] rounded w-24 mb-1"></div>
                        <div className="h-3 bg-[var(--color-bg-light)] rounded w-16"></div>
                      </div>
                      <div className="h-8 w-8 bg-[var(--color-bg-light)] rounded-full"></div>
                    </div>
                  ))}
              </div>
            </div>
          ) : !onlineFriends || onlineFriends.length === 0 ? (
            <div className="p-4 text-[var(--color-text-tertiary)] text-center">
              No friends online
            </div>
          ) : (
            onlineFriends.slice(0, 5).map((friend) => (
              <div
                key={friend._id}
                className="px-4 py-3 hover:bg-[var(--color-bg-hover)] transition-colors flex items-center justify-between"
              >
                <Link
                  to={`/profile/${friend._id}`}
                  className="flex items-center flex-1"
                >
                  <div className="relative">
                    <Avatar
                      src={friend.avatar}
                      alt={friend.username}
                      size="md"
                    />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-bg-primary)]"></span>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-[var(--color-text-primary)]">
                      {friend.fullname || friend.username}
                    </h3>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      Active now
                    </p>
                  </div>
                </Link>
                <Link
                  to={`/messages/${friend._id}`}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                >
                  <FiMessageCircle className="w-5 h-5" />
                </Link>
              </div>
            ))
          )}
        </div>
        {(onlineFriends?.length > 5 || (friends && friends.length > 0)) && (
          <Link
            to="/friends"
            className="block px-4 py-3 text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-center font-medium"
          >
            {onlineFriends?.length > 5
              ? `See all online friends (${onlineFriends.length})`
              : "See all friends"}
          </Link>
        )}
      </motion.div>

      {/* Theme Toggle */}
      <div className="mt-4 flex justify-center">
        <ThemeToggle />
      </div>
    </div>
  );
};

export default RightPanel;
