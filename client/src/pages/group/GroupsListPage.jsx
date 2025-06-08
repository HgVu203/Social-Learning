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
import { useTranslation } from "react-i18next";

const GroupsListPage = () => {
  const { t } = useTranslation();
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
            {t("group.failedToLoad")}
          </p>
        </div>
      );
    }

    if (popularGroups.length === 0) {
      return (
        <div className="card p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">
            {t("group.noGroups")}
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
              aria-label={t("common.gridView")}
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
              aria-label={t("common.listView")}
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
            {t("group.failedToLoad")}
          </p>
        </div>
      );
    }

    if (myGroups.length === 0) {
      return (
        <div className="card p-8 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-primary)]">
              {t("group.noJoinedGroups")}
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {t("group.exploreGroups")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setActiveTab("popular")}
                className="btn btn-primary"
              >
                {t("group.explorePopularGroups")}
              </button>
              <Link
                to="/create-group"
                className="btn btn-secondary inline-flex items-center"
              >
                <FiPlus className="mr-2" size={18} />
                {t("group.createGroup")}
              </Link>
            </div>
          </div>
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
              aria-label={t("common.gridView")}
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
              aria-label={t("common.listView")}
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
            {t("group.failedToLoad")}
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
              {t("group.noGroupsFound", { query: debouncedSearchQuery })}
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {t("group.tryDifferentKeywords")}
            </p>
            <button
              onClick={handleClearSearch}
              className="btn btn-secondary mr-3"
            >
              {t("group.clearSearch")}
            </button>
            <button
              onClick={() => {
                handleClearSearch();
                setActiveTab("popular");
              }}
              className="btn btn-primary"
            >
              {t("group.explorePopularGroups")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[var(--color-text-secondary)]">
            {sortedSearchResults.length === 1
              ? t("group.searchResults", { count: sortedSearchResults.length })
              : t("group.searchResultsPlural", {
                  count: sortedSearchResults.length,
                })}
          </p>

          <div className="inline-flex bg-[var(--color-bg-secondary)] rounded-lg p-1 border border-[var(--color-border)] shadow-md">
            <button
              onClick={() => setGridView(true)}
              className={`p-2.5 rounded-md transition-all duration-200 cursor-pointer ${
                gridView
                  ? "bg-[var(--color-primary)] text-white shadow-inner"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
              aria-label={t("common.gridView")}
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
              aria-label={t("common.listView")}
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
    return (
      <div className="flex font-medium text-sm bg-[var(--color-bg-secondary)] shadow-sm rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab("myGroups")}
          className={`flex items-center justify-center py-4 px-5 md:px-8 ${
            activeTab === "myGroups"
              ? "bg-[var(--color-primary)] text-white font-semibold"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          } flex-1 transition-all duration-200`}
        >
          <FiUsers
            className={`${
              activeTab === "myGroups" ? "text-white" : ""
            } w-5 h-5 mr-2`}
          />
          <span className="font-semibold">{t("group.myGroups")}</span>
        </button>
        <button
          onClick={() => setActiveTab("popular")}
          className={`flex items-center justify-center py-4 px-5 md:px-8 ${
            activeTab === "popular"
              ? "bg-[var(--color-primary)] text-white font-semibold"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
          } flex-1 transition-all duration-200`}
        >
          <FiTrendingUp
            className={`${
              activeTab === "popular" ? "text-white" : ""
            } w-5 h-5 mr-2`}
          />
          <span className="font-semibold">{t("group.popular")}</span>
        </button>
      </div>
    );
  };

  // Render responsive search bar
  const renderSearchBar = () => {
    return (
      <div className="relative my-4">
        <div
          className={`flex items-center rounded-full px-4 py-2 ${
            isSearchFocused || debouncedSearchQuery
              ? "bg-[var(--color-bg-secondary)] border border-[var(--color-primary-light)] shadow-inner"
              : "bg-[var(--color-bg-secondary)]"
          } shadow-sm transition-all duration-300`}
        >
          <FiSearch
            className={`${
              isSearchFocused || debouncedSearchQuery
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)]"
            } w-5 h-5 mr-2`}
          />
          <input
            type="text"
            placeholder={t("group.searchGroups")}
            className="bg-[var(--color-bg-secondary)] border-none outline-none w-full text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            ref={searchInputRef}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-[1200px] px-4 mx-auto py-4 sm:py-6 md:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("group.title")}
        </h1>
        <Link
          to="/create-group"
          className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg font-medium text-sm transition-colors shadow-md hover:shadow-lg"
        >
          <FiPlus className="mr-1.5 w-4 h-4" />
          {t("group.createGroup")}
        </Link>
      </div>

      {/* Search bar */}
      {renderSearchBar()}

      {/* Tabs */}
      {!showSearchResults && renderTabs()}

      {/* Group List */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (showSearchResults ? "search" : "")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderGroups()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GroupsListPage;
