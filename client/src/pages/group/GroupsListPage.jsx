import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGroups, fetchUserGroups, fetchPopularGroups, clearGroups } from '../../redux/groupSlice';
import { Link } from 'react-router-dom';
import GroupCard from '../../components/group/GroupCard';
import Loading from '../../components/common/Loading';
import { FiPlus, FiSearch } from 'react-icons/fi';

const GroupsListPage = () => {
  const dispatch = useDispatch();
  const { groups, userGroups, popularGroups, loading, hasMore, error } = useSelector((state) => state.group);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Reset groups state when component mounts
    dispatch(clearGroups());
    
    // Fetch groups based on active tab
    if (activeTab === 'all') {
      dispatch(fetchGroups());
    } else if (activeTab === 'my') {
      dispatch(fetchUserGroups());
    } else if (activeTab === 'popular') {
      dispatch(fetchPopularGroups(10));
    }
  }, [dispatch, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    dispatch(fetchGroups({ query: searchQuery }));
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      dispatch(fetchGroups({ loadMore: true }));
    }
  };

  const renderGroups = () => {
    let groupsToRender = [];
    
    if (isSearching) {
      groupsToRender = groups;
    } else if (activeTab === 'all') {
      groupsToRender = groups;
    } else if (activeTab === 'my') {
      groupsToRender = userGroups;
    } else if (activeTab === 'popular') {
      groupsToRender = popularGroups;
    }
    
    if (groupsToRender.length === 0 && !loading) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            {isSearching 
              ? 'Không tìm thấy nhóm nào phù hợp với từ khóa tìm kiếm.' 
              : activeTab === 'my' 
                ? 'Bạn chưa tham gia nhóm nào.' 
                : 'Không có nhóm nào.'}
          </p>
          <Link 
            to="/groups/create"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="mr-1" />
            Tạo nhóm mới
          </Link>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupsToRender.map((group) => (
          <GroupCard key={group._id} group={group} />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Nhóm</h1>
        <Link 
          to="/groups/create"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="mr-1" />
          Tạo nhóm mới
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex space-x-1">
              <button 
                onClick={() => handleTabChange('all')}
                className={`px-4 py-2 rounded-md ${activeTab === 'all' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Tất cả
              </button>
              <button 
                onClick={() => handleTabChange('my')}
                className={`px-4 py-2 rounded-md ${activeTab === 'my' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Nhóm của tôi
              </button>
              <button 
                onClick={() => handleTabChange('popular')}
                className={`px-4 py-2 rounded-md ${activeTab === 'popular' 
                  ? 'bg-blue-50 text-blue-600 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Phổ biến
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="flex w-full md:w-auto">
              <div className="relative flex-grow">
                <input
                  type="text"
                  placeholder="Tìm kiếm nhóm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
              <button 
                type="submit"
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Tìm
              </button>
            </form>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 border-b">
            {error}
          </div>
        )}
        
        <div className="p-4">
          {loading && groups.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loading />
            </div>
          ) : (
            <>
              {renderGroups()}
              
              {activeTab === 'all' && hasMore && !isSearching && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Đang tải...' : 'Xem thêm'}
                  </button>
                </div>
              )}
              
              {loading && groups.length > 0 && (
                <div className="flex justify-center py-4">
                  <Loading />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupsListPage; 