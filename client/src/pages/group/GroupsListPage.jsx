import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSearch,
  FiPlus,
  FiUsers,
  FiTrendingUp,
  FiX,
  FiGrid,
  FiList,
} from "react-icons/fi";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";
import GroupItem from "../../components/group/GroupCard";
import { useDebounce } from "../../hooks/useDebounce";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const GroupsListPage = () => {
  const [activeTab, setActiveTab] = useState("myGroups");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [gridView, setGridView] = useState(true);
  const searchInputRef = useRef(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Use debounce for search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const showSearchResults = debouncedSearchQuery.trim().length > 0;

  const {
    data: popularGroupsData = { data: [] },
    isLoading: popularGroupsLoading,
    error: popularGroupsError,
  } = useGroupQueries.usePopularGroups();

  // Extract the actual array of groups
  const popularGroups = popularGroupsData.data || [];

  const {
    data: myGroupsData = { data: [] },
    isLoading: myGroupsLoading,
    error: myGroupsError,
  } = useGroupQueries.useMyGroups();

  // Extract the actual array of groups
  const myGroups = myGroupsData.data || [];

  const {
    data: searchedGroupsData = { data: [] },
    isLoading: searchedGroupsLoading,
    error: searchedGroupsError,
  } = useGroupQueries.useSearchGroups(debouncedSearchQuery, {
    enabled: debouncedSearchQuery.trim().length > 0,
  });

  // Extract the actual array of groups
  const searchedGroups = searchedGroupsData.data || [];

  // Focus search input when focused state changes
  useEffect(() => {
    if (isSearchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchFocused]);

  // Sort searched groups to show joined groups first
  const sortedSearchResults = useMemo(() => {
    if (!searchedGroups.length) return [];

    // Prepare a map of my groups for faster lookups
    const myGroupIds = new Set(myGroups.map((g) => g._id));

    // Return sorted array with joined groups first
    return [...searchedGroups].sort((a, b) => {
      const aIsMember = myGroupIds.has(a._id) ? 1 : 0;
      const bIsMember = myGroupIds.has(b._id) ? 1 : 0;
      return bIsMember - aIsMember;
    });
  }, [searchedGroups, myGroups]);

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearchFocused(false);
    if (isMobile) {
      setActiveTab("myGroups");
    }
  };

  const renderGroups = () => {
    if (showSearchResults) {
      return renderSearchResults();
    }

    if (activeTab === "popular") {
      return renderPopularGroups();
    }

    return renderMyGroups();
  };

  const renderPopularGroups = () => {
    if (popularGroupsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden animate-pulse h-[280px] md:h-[320px]"
            >
              <div className="h-36 md:h-48 bg-[var(--color-bg-tertiary)] w-full"></div>
              <div className="p-4">
                <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-[var(--color-bg-tertiary)] rounded w-2/3 mb-6"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-[var(--color-bg-tertiary)] rounded-lg flex-1"></div>
                  <div className="h-8 bg-[var(--color-bg-tertiary)] rounded-lg flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (popularGroupsError) {
      return (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            Failed to load popular groups. Please try again later.
          </p>
        </div>
      );
    }

    if (popularGroups.length === 0) {
      return (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            No popular groups available at the moment
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-[var(--color-bg-secondary)] rounded-lg p-1 border border-[var(--color-border)] shadow-md">
            <button
              onClick={() => setGridView(true)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                gridView
                  ? "bg-[var(--color-primary)] text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              aria-label="Grid view"
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setGridView(false)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                !gridView
                  ? "bg-[var(--color-primary)] text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              aria-label="List view"
            >
              <FiList size={18} />
            </button>
          </div>
        </div>

        {gridView ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-2">
            {popularGroups.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl overflow-hidden h-full"
              >
                <GroupItem
                  group={group}
                  index={index}
                  showJoinedBadge={myGroups.some((g) => g._id === group._id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-4 md:space-y-5">
            {popularGroups.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover:shadow-lg transition-shadow rounded-xl overflow-hidden"
              >
                <GroupItem
                  group={group}
                  variant="list"
                  showJoinedBadge={myGroups.some((g) => g._id === group._id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderMyGroups = () => {
    if (myGroupsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1E2024] rounded-xl border border-gray-800 shadow-md overflow-hidden animate-pulse h-[320px]"
            >
              <div className="h-48 bg-gray-800/80 w-full"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-800 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-800/60 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-800/40 rounded w-2/3 mb-6"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-800/80 rounded-lg flex-1"></div>
                  <div className="h-8 bg-gray-800/80 rounded-lg flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (myGroupsError) {
      return (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            Failed to load your groups. Please try again later.
          </p>
        </div>
      );
    }

    if (myGroups.length === 0) {
      return (
        <div className="card p-8 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">
              You haven't joined any groups yet
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Explore popular groups and join communities that interest you
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setActiveTab("popular")}
                className="btn btn-primary"
              >
                Explore Popular Groups
              </button>
              <Link
                to="/groups/create"
                className="btn btn-secondary inline-flex items-center"
              >
                <FiPlus className="mr-2" size={18} />
                Create Group
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex justify-end mb-4">
          <div className="inline-flex bg-[#1E2024]/80 rounded-lg p-1 border border-gray-800 shadow-md">
            <button
              onClick={() => setGridView(true)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                gridView
                  ? "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setGridView(false)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                !gridView
                  ? "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FiList size={18} />
            </button>
          </div>
        </div>

        {gridView ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-2">
            {myGroups.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl overflow-hidden h-full"
              >
                <GroupItem group={group} index={index} showJoinedBadge={true} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-5">
            {myGroups.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover-scale overflow-hidden"
              >
                <GroupItem
                  group={group}
                  index={index}
                  showJoinedBadge={true}
                  isCompact={true}
                />
              </motion.div>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderSearchResults = () => {
    if (searchedGroupsLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1E2024] rounded-xl border border-gray-800 shadow-md overflow-hidden animate-pulse h-[320px]"
            >
              <div className="h-48 bg-gray-800/80 w-full"></div>
              <div className="p-4">
                <div className="h-5 bg-gray-800 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-800/60 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-800/40 rounded w-2/3 mb-6"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-800/80 rounded-lg flex-1"></div>
                  <div className="h-8 bg-gray-800/80 rounded-lg flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (searchedGroupsError) {
      return (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            Failed to search for groups. Please try again later.
          </p>
        </div>
      );
    }

    if (sortedSearchResults.length === 0) {
      return (
        <div className="card p-8 text-center">
          <div className="max-w-md mx-auto">
            <img
              src="/assets/illustrations/search-empty.svg"
              alt="No results"
              className="w-48 h-48 mx-auto mb-4 opacity-80"
            />
            <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">
              No groups found for "{debouncedSearchQuery}"
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Try different keywords or check out popular groups
            </p>
            <button
              onClick={handleClearSearch}
              className="btn btn-secondary mr-3"
            >
              Clear Search
            </button>
            <button
              onClick={() => {
                handleClearSearch();
                setActiveTab("popular");
              }}
              className="btn btn-primary"
            >
              Explore Popular Groups
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[var(--color-text-secondary)]">
            Found {sortedSearchResults.length} group
            {sortedSearchResults.length !== 1 ? "s" : ""}
          </p>

          <div className="inline-flex bg-[#1E2024]/80 rounded-lg p-1 border border-gray-800 shadow-md">
            <button
              onClick={() => setGridView(true)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                gridView
                  ? "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FiGrid size={18} />
            </button>
            <button
              onClick={() => setGridView(false)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                !gridView
                  ? "bg-gradient-to-r from-blue-600/80 to-indigo-700/80 text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FiList size={18} />
            </button>
          </div>
        </div>

        {gridView ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-2">
            {sortedSearchResults.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100,
                }}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl overflow-hidden h-full"
              >
                <GroupItem
                  group={group}
                  index={index}
                  showJoinedBadge={myGroups.some((g) => g._id === group._id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col space-y-5">
            {sortedSearchResults.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover-scale overflow-hidden"
              >
                <GroupItem
                  group={group}
                  index={index}
                  showJoinedBadge={myGroups.some((g) => g._id === group._id)}
                  isCompact={true}
                />
              </motion.div>
            ))}
          </div>
        )}
      </>
    );
  };

  // Render tabs with better mobile support
  const renderTabs = () => {
    const tabs = [
      {
        id: "myGroups",
        label: "My Groups",
        icon: <FiUsers className="w-5 h-5" />,
      },
      {
        id: "popular",
        label: "Popular",
        icon: <FiTrendingUp className="w-5 h-5" />,
      },
    ];

    return (
      <div className="mb-6">
        <div className="flex overflow-x-auto no-scrollbar bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery("");
                setIsSearchFocused(false);
              }}
              className={`flex items-center py-3 px-5 font-medium whitespace-nowrap flex-1 justify-center transition-colors cursor-pointer ${
                activeTab === tab.id && !showSearchResults
                  ? "text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span className="flex items-center">
                <span className="mr-2">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === "myGroups" && myGroups.length > 0 && (
                  <span className="ml-2 bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded-full text-xs">
                    {myGroups.length}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render responsive search bar
  const renderSearchBar = () => {
    return (
      <AnimatePresence mode="wait">
        {!isSearchFocused && !showSearchResults ? (
          <motion.button
            key="search-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSearchFocused(true)}
            className="flex items-center gap-2 w-full p-3 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)] cursor-pointer"
          >
            <FiSearch className="text-[var(--color-text-tertiary)]" />
            <span className="text-sm">Search groups...</span>
          </motion.button>
        ) : (
          <motion.div
            key="search-input"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full"
          >
            <div className="flex items-center w-full bg-[var(--color-bg-secondary)] rounded-full border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={handleClearSearch}
                className="p-3 text-[var(--color-text-secondary)] cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search groups..."
                autoFocus
                className="flex-1 bg-transparent border-none py-3 px-2 focus:outline-none text-[var(--color-text-primary)]"
              />
              <div className="p-3 text-[var(--color-text-secondary)]">
                <FiSearch className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 md:px-4 pt-4 pb-20 sm:pb-10">
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between mb-6 gap-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]"
        >
          Groups
        </motion.h1>

        <Link
          to="/groups/create"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors shadow-sm w-full md:w-auto"
        >
          <FiPlus className="mr-2" />
          <span>Create Group</span>
        </Link>
      </div>

      {/* Search Bar with improved mobile UX */}
      <div className="mb-6">{renderSearchBar()}</div>

      {/* Tabs with better mobile support */}
      {!showSearchResults && renderTabs()}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (showSearchResults ? "-search" : "")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderGroups()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GroupsListPage;
