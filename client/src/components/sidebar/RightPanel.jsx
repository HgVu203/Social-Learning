import { useEffect } from "react";
import { Link } from "react-router-dom";
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
  FiInfo,
  FiLock,
  FiFileText,
} from "react-icons/fi";
import ThemeToggle from "../ui/ThemeToggle";

const RightPanel = () => {
  const { usePopularGroups } = useGroup();
  const { data: popularGroupsData, isLoading: popularGroupsLoading } =
    usePopularGroups(3); // Only get top 3 popular groups

  const popularGroups = popularGroupsData?.data || [];

  const { friends, friendsLoading, fetchFriends } = useFriend();

  // Filter online friends (if friends has a value)
  const onlineFriends = (friends || []).filter((friend) => friend.isOnline);

  useEffect(() => {
    // Load friends list when component mounts
    if (fetchFriends) {
      fetchFriends();
    }
  }, [fetchFriends]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // If both popular groups and friends are loading, show skeleton loader
  if (popularGroupsLoading && friendsLoading) {
    return <SkeletonRightPanel />;
  }

  return (
    <div className="h-full p-4">
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 bg-[var(--color-bg-primary)] pt-1 pb-3 z-10"
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </div>
          <input
            type="text"
            placeholder="Search developers, groups..."
            className="w-full bg-[var(--color-bg-secondary)] rounded-full py-3 px-12 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
          />
        </div>
      </motion.div>

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
              No friends online at the moment
            </div>
          ) : (
            onlineFriends.map((friend) => (
              <Link
                key={friend._id}
                to={`/profile/${friend._id}`}
                className="px-4 py-3 hover:bg-[var(--color-bg-hover)] block transition-colors"
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar
                      src={friend.avatar}
                      alt={friend.fullname || friend.username}
                      size="md"
                      className="mr-3"
                    />
                    <span className="absolute right-2 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-bg-primary)]"></span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[var(--color-text-primary)]">
                      {friend.fullname || friend.username}
                    </h3>
                    <p className="text-sm text-green-400">Active now</p>
                  </div>
                  <Link
                    to={`/messages/${friend._id}`}
                    className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] bg-[var(--color-bg-secondary)] p-2 rounded-full transition-all hover:shadow-md"
                  >
                    <FiMessageCircle className="w-5 h-5" />
                  </Link>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/friends"
          className="block px-4 py-3 text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] transition-colors text-center font-medium"
        >
          Show all friends
        </Link>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)] rounded-lg"
      >
        <div className="flex flex-wrap gap-3">
          <Link
            to="/about"
            className="hover:text-[var(--color-primary)] transition-colors flex items-center"
          >
            <FiInfo className="w-3 h-3 mr-1" /> About
          </Link>
          <Link
            to="/privacy"
            className="hover:text-[var(--color-primary)] transition-colors flex items-center"
          >
            <FiLock className="w-3 h-3 mr-1" /> Privacy
          </Link>
          <Link
            to="/terms"
            className="hover:text-[var(--color-primary)] transition-colors flex items-center"
          >
            <FiFileText className="w-3 h-3 mr-1" /> Terms
          </Link>
        </div>
        <div className="mt-2 text-center">© 2024 DevConnect</div>

        {/* Theme Toggle */}
        <div className="mt-4 flex items-center justify-center">
          <ThemeToggle className="mr-2" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            Toggle Theme
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default RightPanel;
