import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGroups,
  fetchUserGroups,
  fetchPopularGroups,
} from "../../redux/groupSlice";
import { Link } from "react-router-dom";
import Loading from "../../components/common/Loading";
import Avatar from "../../components/common/Avatar";
import {
  FiUsers,
  FiSearch,
  FiPlusCircle,
  FiUser,
  FiTrendingUp,
  FiLock,
} from "react-icons/fi";
import NoData from "../../components/common/NoData";

const GroupsPage = () => {
  const dispatch = useDispatch();
  const { groups, userGroups, popularGroups, loading, error, hasMore, page } =
    useSelector((state) => state.group);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (activeTab === "all") {
      dispatch(fetchGroups());
    } else if (activeTab === "myGroups") {
      dispatch(fetchUserGroups());
    } else if (activeTab === "popular") {
      dispatch(fetchPopularGroups());
    }
  }, [dispatch, activeTab]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    setSearchTimeout(
      setTimeout(() => {
        dispatch(fetchGroups({ query: value }));
      }, 500)
    );
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      dispatch(
        fetchGroups({ loadMore: true, page: page + 1, query: searchQuery })
      );
    }
  };

  const filteredGroups = groups?.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGroupCard = (group) => (
    <div
      key={group._id}
      className="bg-[#16181c] rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-800 transform hover:-translate-y-1"
    >
      {/* Group Cover Image */}
      <div className="h-36 bg-gradient-to-r from-blue-600 to-indigo-800 relative">
        {group.coverImage && (
          <img
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      </div>

      {/* Group Info */}
      <div className="p-5">
        <div className="flex items-start">
          <Avatar
            size="lg"
            src={group.avatarImage}
            alt={group.name}
            className="mr-4 border-2 border-gray-700"
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{group.name}</h3>
            <p className="text-gray-300 text-sm mb-2 flex items-center">
              {group.isPrivate ? (
                <span className="flex items-center">
                  <FiLock className="mr-1" /> Private
                </span>
              ) : (
                "Public group"
              )}{" "}
              · {group.membersCount || 0} members
            </p>
            <p className="text-gray-300 text-sm line-clamp-2 min-h-[40px]">
              {group.description || "No description"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            to={`/groups/${group._id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View Group
          </Link>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading && activeTab !== "all" && groups.length === 0) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loading />
        </div>
      );
    }

    if (activeTab === "all") {
      if (groups.length === 0 && !loading) {
        return (
          <NoData
            message="No groups found"
            description="Try searching with different keywords or create a new group"
          />
        );
      }

      return (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups?.map(renderGroupCard)}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? "Loading..." : "See More"}
              </button>
            </div>
          )}

          {loading && groups.length > 0 && (
            <div className="flex justify-center mt-4">
              <Loading />
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "myGroups") {
      if (userGroups.length === 0) {
        return (
          <NoData
            message="You haven't joined any groups yet"
            description="Join or create a group to connect with people who share your interests"
          />
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userGroups.map(renderGroupCard)}
        </div>
      );
    }

    if (activeTab === "popular") {
      if (popularGroups.length === 0) {
        return (
          <NoData
            message="No popular groups"
            description="Check back later to see popular groups"
          />
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularGroups.map(renderGroupCard)}
        </div>
      );
    }

    return null;
  };

  if (loading) return <Loading />;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Discover Groups
          </h1>
          <p className="text-gray-400">
            Connect with people who share your interests
          </p>
        </div>
        <Link
          to="/groups/create"
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center shadow-md"
        >
          <FiPlusCircle className="mr-2" /> Create Group
        </Link>
      </div>

      {/* Search and Tabs */}
      <div className="mb-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups by name or description..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-4 py-3 bg-[#1E2024] border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap space-x-2 p-1 bg-[#1E2024] rounded-xl shadow-sm border border-gray-800">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <FiUsers className="inline mr-2" /> All Groups
          </button>
          <button
            onClick={() => setActiveTab("myGroups")}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all ${
              activeTab === "myGroups"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <FiUser className="inline mr-2" /> My Groups
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`px-5 py-2.5 font-medium rounded-lg transition-all ${
              activeTab === "popular"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <FiTrendingUp className="inline mr-2" /> Popular
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 text-red-500 rounded-lg border border-red-900/50">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="bg-[#1E2024] rounded-xl shadow-md p-6 border border-gray-800">
        {renderContent()}
      </div>
    </div>
  );
};

export default GroupsPage;
