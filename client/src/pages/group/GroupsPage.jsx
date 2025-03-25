import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups, fetchUserGroups, fetchPopularGroups } from '../../redux/groupSlice';
import { Link, useNavigate } from 'react-router-dom';
import Loading from '../../components/common/Loading';
import Avatar from '../../components/common/Avatar';
import { 
  FiUsers, 
  FiSearch, 
  FiPlusCircle, 
  FiUser, 
  FiClock,
  FiTrendingUp
} from 'react-icons/fi';
import NoData from '../../components/common/NoData';

const GroupsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { groups, userGroups, popularGroups, loading, error, hasMore, page } = useSelector((state) => state.group);
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (activeTab === 'discover') {
      dispatch(fetchGroups());
    } else if (activeTab === 'myGroups') {
      dispatch(fetchUserGroups());
    } else if (activeTab === 'popular') {
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
      dispatch(fetchGroups({ loadMore: true, page: page + 1, query: searchQuery }));
    }
  };

  const renderGroupCard = (group) => (
    <div key={group._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div 
        className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 relative" 
        style={group.coverImage ? { backgroundImage: `url(${group.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      </div>
      
      {/* Group Info */}
      <div className="p-4">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0 -mt-12 relative z-10">
            <Avatar 
              src={group.avatarImage} 
              alt={group.name} 
              size="lg" 
              className="border-4 border-white shadow-md"
            />
          </div>
          <div className="ml-3 -mt-6">
            <Link to={`/groups/${group._id}`} className="text-lg font-bold text-gray-800 hover:underline line-clamp-1">
              {group.name}
            </Link>
            <p className="text-sm text-gray-500 flex items-center">
              <FiUsers className="mr-1" /> {group.membersCount || 0} members
            </p>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {group.description || 'No description'}
        </p>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500 flex items-center">
            <FiClock className="mr-1" /> {group.isPrivate ? 'Private group' : 'Public group'}
          </span>
          {group.isMember ? (
            <Link 
              to={`/groups/${group._id}`}
              className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              View
            </Link>
          ) : (
            <button 
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Join
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading && activeTab !== 'discover' && groups.length === 0) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loading />
        </div>
      );
    }

    if (activeTab === 'discover') {
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
            {groups.map(renderGroupCard)}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'See More'}
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

    if (activeTab === 'myGroups') {
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

    if (activeTab === 'popular') {
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

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Groups</h1>
        <button
          onClick={() => navigate('/groups/create')}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiPlusCircle className="mr-2" /> Create New Group
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
            <div className="p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Groups</h2>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setActiveTab('discover')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'discover' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiSearch className="mr-3" /> 
                    <span>All</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('myGroups')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'myGroups' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiUser className="mr-3" /> 
                    <span>My Groups</span>
                    {userGroups.length > 0 && (
                      <span className="ml-auto text-gray-500 text-xs">
                        {userGroups.length}
                      </span>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('popular')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'popular' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiTrendingUp className="mr-3" /> 
                    <span>Popular</span>
                  </button>
                </li>
                <li>
                  <Link 
                    to="/groups/create"
                    className="w-full flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    <FiPlusCircle className="mr-3" /> 
                    <span>Create New Group</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          
          {userGroups.length > 0 && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-3">Your Groups</h3>
                <ul className="space-y-2">
                  {userGroups.slice(0, 5).map(group => (
                    <li key={group._id}>
                      <Link 
                        to={`/groups/${group._id}`}
                        className="flex items-center px-2 py-1.5 rounded-md hover:bg-gray-50"
                      >
                        <Avatar 
                          src={group.avatarImage} 
                          alt={group.name} 
                          size="sm" 
                          className="mr-2"
                        />
                        <span className="text-sm font-medium truncate">{group.name}</span>
                      </Link>
                    </li>
                  ))}
                  {userGroups.length > 5 && (
                    <li>
                      <button 
                        onClick={() => setActiveTab('myGroups')}
                        className="text-blue-600 text-sm hover:underline ml-2 mt-1"
                      >
                        See All Groups
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
        
        {/* Main content */}
        <div className="flex-grow">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {activeTab === 'discover' && (
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-4">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupsPage; 