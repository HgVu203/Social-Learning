import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GroupCard from "../../components/group/GroupCard";
import Loading from "../../components/common/Loading";
import {
  FiPlus,
  FiSearch,
  FiUsers,
  FiUser,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";
import { useGroup } from "../../contexts/GroupContext";

const GroupsListPage = () => {
  const [activeTab, setActiveTab] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [previousTab, setPreviousTab] = useState("popular");

  // Get the query functions from context
  const { useAllGroups, useUserGroups, usePopularGroups } = useGroup();

  // Use custom hooks for queries
  const {
    data: userGroupsData,
    isLoading: userGroupsLoading,
    error: userGroupsError,
  } = useUserGroups();

  const {
    data: popularGroupsData,
    isLoading: popularGroupsLoading,
    error: popularGroupsError,
  } = usePopularGroups();

  // Sử dụng biến tách biệt cho search query để tránh re-render không cần thiết
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");

  const {
    data: allGroupsData,
    isLoading: allGroupsLoading,
    error: allGroupsError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAllGroups(currentSearchQuery);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPreviousTab(tab);
    setSearchQuery("");
    setIsSearching(false);
    setCurrentSearchQuery("");
  };

  // Initialize with "popular" tab
  useEffect(() => {
    handleTabChange("popular");
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();

    // Nếu ô tìm kiếm trống, reset trạng thái tìm kiếm và hiển thị lại dữ liệu của tab trước đó
    if (!searchQuery.trim()) {
      setCurrentSearchQuery("");
      setIsSearching(false);
      setActiveTab(previousTab);
      return;
    }

    // Lưu tab hiện tại trước khi chuyển sang chế độ tìm kiếm
    if (!isSearching) {
      setPreviousTab(activeTab);
    }

    // Nếu có nội dung tìm kiếm, tiến hành tìm kiếm bình thường
    setCurrentSearchQuery(searchQuery.trim());
    setIsSearching(true);
    setActiveTab("search");
  };

  const handleLoadMore = () => {
    if (isSearching && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentSearchQuery("");
    setIsSearching(false);
    setActiveTab(previousTab);
  };

  // Prepare data based on active tab
  const userGroups = userGroupsData?.data || [];
  // Đảm bảo cấu trúc dữ liệu nhất quán
  const popularGroups = popularGroupsData?.data || [];

  // In ra thông tin chi tiết hơn để debug
  console.log("User groups:", userGroups, "from data:", userGroupsData);
  console.log(
    "Popular groups:",
    popularGroups,
    "from data:",
    popularGroupsData
  );
  console.log("Active tab:", activeTab, "isSearching:", isSearching);
  console.log("All groups data:", allGroupsData);

  // Xử lý dữ liệu tìm kiếm từ infinite query
  const searchGroups =
    isSearching && allGroupsData
      ? allGroupsData.pages.flatMap((page) => page.groups)
      : [];

  // Determine loading and error states
  const loading =
    activeTab === "my"
      ? userGroupsLoading
      : activeTab === "popular"
      ? popularGroupsLoading
      : allGroupsLoading;

  const error =
    activeTab === "my"
      ? userGroupsError
      : activeTab === "popular"
      ? popularGroupsError
      : allGroupsError;

  const renderGroups = () => {
    let groupsToRender = [];

    // Xác định nhóm hiển thị dựa vào trạng thái hiện tại
    if (isSearching) {
      groupsToRender = searchGroups;
    } else if (activeTab === "my") {
      groupsToRender = userGroups;
    } else if (activeTab === "popular") {
      groupsToRender = popularGroups;
    }

    // Debug thông tin
    console.log("Rendering groups:", {
      isSearching,
      activeTab,
      groupsToRender,
      count: groupsToRender.length,
    });

    if (groupsToRender.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUsers className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-400 text-lg mb-2">
              {isSearching
                ? "No groups found matching your search."
                : activeTab === "my"
                ? "You haven't joined any groups yet."
                : "No popular groups available."}
            </p>
            <p className="text-gray-500 mb-6">
              {isSearching
                ? "Try searching with different keywords"
                : "Create a new group or join existing ones"}
            </p>
          </div>
          <Link
            to="/groups/create"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-sm"
          >
            <FiPlus className="mr-2" />
            Create New Group
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {groupsToRender.map((group) => (
          <GroupCard key={group._id} group={group} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-white mb-2">Groups</h1>
          <p className="text-gray-400">
            Discover and join groups with shared interests
          </p>
        </div>
        <Link
          to="/groups/create"
          className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-sm self-start md:self-center"
        >
          <FiPlus className="mr-2" />
          Create New Group
        </Link>
      </div>

      <div className="mb-8 space-y-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-16 py-3 bg-[#1E2024] border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />

          {/* Clear button */}
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-24 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-white"
              aria-label="Clear search"
            >
              <FiX className="h-5 w-5" />
            </button>
          )}

          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-medium"
          >
            Search
          </button>
        </form>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-1 bg-[#1E2024] rounded-xl shadow-sm border border-gray-800/50">
          <button
            onClick={() => handleTabChange("my")}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all flex items-center ${
              activeTab === "my"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <FiUser className="mr-2" /> My Groups
          </button>
          <button
            onClick={() => handleTabChange("popular")}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all flex items-center ${
              activeTab === "popular"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            }`}
          >
            <FiTrendingUp className="mr-2" /> Popular
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-500 font-medium">
            {error.message || "Error loading groups"}
          </p>
        </div>
      )}

      {/* Content */}
      {loading &&
      (activeTab === "my"
        ? userGroups.length === 0
        : activeTab === "popular"
        ? popularGroups.length === 0
        : searchGroups.length === 0) ? (
        <div className="flex justify-center py-12">
          <Loading />
        </div>
      ) : (
        <>
          {/* Hiển thị thông báo kết quả tìm kiếm nếu đang tìm kiếm */}
          {isSearching && (
            <div className="mb-4 py-2 px-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <p className="text-gray-300">
                Showing {searchGroups.length} results for "{currentSearchQuery}"
                <button
                  onClick={handleClearSearch}
                  className="ml-3 text-blue-400 hover:text-blue-300 underline"
                >
                  Clear search
                </button>
              </p>
            </div>
          )}

          {renderGroups()}

          {isSearching && hasNextPage && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 font-medium shadow-sm"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {isFetchingNextPage && searchGroups.length > 0 && (
            <div className="flex justify-center py-6">
              <Loading />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GroupsListPage;
