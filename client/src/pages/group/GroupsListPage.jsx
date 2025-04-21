import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import useGroupQueries from "../../hooks/queries/useGroupQueries";
import Loading from "../../components/common/Loading";

const GroupsListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: myGroupsData,
    isLoading: myGroupsLoading,
    error: myGroupsError,
  } = useGroupQueries.useMyGroups();

  const { data: myGroups = [] } = myGroupsData || {};

  // Filter groups based on search query
  const filteredGroups = myGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description &&
        group.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const renderGroupList = () => {
    if (myGroupsLoading) {
      return <Loading />;
    }

    if (myGroupsError) {
      return (
        <div className="bg-red-900/20 text-red-500 p-4 rounded-lg">
          {myGroupsError.message || "Failed to load groups"}
        </div>
      );
    }

    if (filteredGroups.length === 0) {
      return (
        <div className="card py-10 px-4 text-center">
          <h3 className="text-xl font-semibold mb-3 text-[var(--color-text-primary)]">
            No groups found
          </h3>
          <p className="text-[var(--color-text-secondary)] mb-6">
            {searchQuery
              ? "No groups match your search query."
              : "You haven't joined any groups yet."}
          </p>
          <Link to="/groups/create" className="btn btn-primary">
            Create a Group
          </Link>
        </div>
      );
    }

    return (
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredGroups.map((group) => (
          <motion.div
            key={group._id}
            variants={item}
            className="card overflow-hidden hover-scale"
          >
            {/* Group Cover Image or Placeholder */}
            <div className="h-36 relative bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-light)]">
              {group.coverImage && (
                <img
                  src={group.coverImage}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Semi-transparent overlay for better readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

              {/* Privacy Badge */}
              <div className="absolute top-3 right-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    group.isPrivate
                      ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                      : "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                  }`}
                >
                  {group.isPrivate ? "Private" : "Public"}
                </span>
              </div>
            </div>

            {/* Group Info */}
            <div className="p-4">
              <Link to={`/groups/${group._id}`}>
                <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors">
                  {group.name}
                </h3>
              </Link>
              <p className="text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                {group.description || "No description available"}
              </p>

              {/* Group Stats */}
              <div className="flex items-center justify-between text-sm text-[var(--color-text-tertiary)]">
                <div className="flex items-center">
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {group.membersCount || 0} members
                </div>

                <div className="flex items-center">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  {group.postsCount || 0} posts
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex justify-end gap-2">
                <Link
                  to={`/groups/${group._id}`}
                  className="btn btn-primary btn-sm"
                >
                  View Group
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            My Groups
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            Manage your group memberships
          </p>
        </div>

        <Link to="/groups/create" className="btn btn-primary">
          <svg
            className="w-5 h-5 mr-2"
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
          Create Group
        </Link>
      </motion.div>

      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center"
      >
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-[var(--color-text-tertiary)]"
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
            </div>
            <input
              type="text"
              placeholder="Search your groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2 pl-10 pr-4 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>
      </motion.div>

      {/* Group List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {renderGroupList()}
      </motion.div>
    </div>
  );
};

export default GroupsListPage;
