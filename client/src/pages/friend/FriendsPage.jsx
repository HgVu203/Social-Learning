import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchFriends, 
  fetchPendingRequests, 
  fetchFriendSuggestions,
  acceptFriendRequest,
  rejectFriendRequest,
  unfriend
} from '../../redux/friendSlice';
import { Link } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import { FiUserPlus, FiUserCheck, FiUserX, FiX, FiCheck, FiSearch, FiUsers, FiBell, FiSettings } from 'react-icons/fi';

const FriendsPage = () => {
  const dispatch = useDispatch();
  const { friends, pendingRequests, suggestions, loading, error } = useSelector((state) => state.friend);
  const [activeTab, setActiveTab] = useState('all');
  const [processingIds, setProcessingIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load data based on active tab
    if (activeTab === 'all' || activeTab === 'friends') {
      dispatch(fetchFriends());
    } else if (activeTab === 'requests') {
      dispatch(fetchPendingRequests());
    } else if (activeTab === 'suggestions') {
      dispatch(fetchFriendSuggestions());
    }
  }, [dispatch, activeTab]);

  const handleAcceptRequest = async (requestId) => {
    if (processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set([...prev, requestId]));
    try {
      await dispatch(acceptFriendRequest(requestId)).unwrap();
    } finally {
      setProcessingIds(prev => {
        const updated = new Set([...prev]);
        updated.delete(requestId);
        return updated;
      });
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (processingIds.has(requestId)) return;
    
    setProcessingIds(prev => new Set([...prev, requestId]));
    try {
      await dispatch(rejectFriendRequest(requestId)).unwrap();
    } finally {
      setProcessingIds(prev => {
        const updated = new Set([...prev]);
        updated.delete(requestId);
        return updated;
      });
    }
  };

  const handleUnfriend = async (userId) => {
    if (processingIds.has(userId)) return;
    
    if (window.confirm('Are you sure you want to unfriend this person?')) {
      setProcessingIds(prev => new Set([...prev, userId]));
      try {
        await dispatch(unfriend(userId)).unwrap();
      } finally {
        setProcessingIds(prev => {
          const updated = new Set([...prev]);
          updated.delete(userId);
          return updated;
        });
      }
    }
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[300px]">
          <Loading />
        </div>
      );
    }

    if (activeTab === 'all') {
      return (
        <div>
          {/* Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Friend Requests</h2>
                {pendingRequests.length > 3 && (
                  <Link to="#" onClick={() => setActiveTab('requests')} className="text-blue-600 hover:underline">
                    See All
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.slice(0, 3).map((request) => (
                  <div key={request._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                    <div className="flex flex-col">
                      <div className="mb-3">
                        <Avatar 
                          src={request.sender.avatarImage} 
                          alt={request.sender.fullName} 
                          size="lg"
                          className="mx-auto" 
                        />
                      </div>
                      <div className="text-center mb-3">
                        <Link to={`/profile/${request.sender._id}`} className="font-semibold text-blue-600 hover:underline">
                          {request.sender.fullName}
                        </Link>
                        <p className="text-sm text-gray-500">
                          {request.sender.mutualFriends ? `${request.sender.mutualFriends} mutual friends` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <button 
                          onClick={() => handleAcceptRequest(request._id)}
                          disabled={processingIds.has(request._id)}
                          className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingIds.has(request._id)}
                          className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">People You May Know</h2>
              {suggestions.length > 6 && (
                <Link to="#" onClick={() => setActiveTab('suggestions')} className="text-blue-600 hover:underline">
                  See All
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.slice(0, 6).map((user) => (
                <div key={user._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col">
                    <div className="mb-3">
                      <Avatar 
                        src={user.avatarImage} 
                        alt={user.fullName} 
                        size="lg"
                        className="mx-auto" 
                      />
                    </div>
                    <div className="text-center mb-3">
                      <Link to={`/profile/${user._id}`} className="font-semibold text-blue-600 hover:underline">
                        {user.fullName}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {user.mutualFriends ? `${user.mutualFriends} mutual friends` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                      >
                        <FiUserPlus className="mr-2" /> Add Friend
                      </button>
                      <button className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Friends Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">All Friends</h2>
              {friends.length > 8 && (
                <Link to="#" onClick={() => setActiveTab('friends')} className="text-blue-600 hover:underline">
                  See All
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {friends.slice(0, 8).map((friend) => (
                <div key={friend._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col">
                    <div className="mb-3">
                      <Avatar 
                        src={friend.avatarImage} 
                        alt={friend.fullName} 
                        size="lg"
                        className="mx-auto" 
                      />
                    </div>
                    <div className="text-center">
                      <Link to={`/profile/${friend._id}`} className="font-semibold text-blue-600 hover:underline">
                        {friend.fullName}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {friend.mutualFriends ? `${friend.mutualFriends} mutual friends` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'friends') {
      if (friends.length === 0) {
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">You don't have any friends yet.</p>
            <button 
              onClick={() => setActiveTab('suggestions')} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Find Friends
            </button>
          </div>
        );
      }

      return (
        <div>
          <div className="mb-4 flex items-center">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {friends
              .filter(friend => 
                searchQuery.trim() === '' || 
                friend.fullName.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((friend) => (
                <div key={friend._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col">
                    <div className="mb-3">
                      <Avatar 
                        src={friend.avatarImage} 
                        alt={friend.fullName} 
                        size="lg"
                        className="mx-auto" 
                      />
                    </div>
                    <div className="text-center mb-3">
                      <Link to={`/profile/${friend._id}`} className="font-semibold text-blue-600 hover:underline">
                        {friend.fullName}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {friend.mutualFriends ? `${friend.mutualFriends} mutual friends` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Link 
                        to={`/messages/${friend._id}`}
                        className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors text-center"
                      >
                        Message
                      </Link>
                      <button 
                        onClick={() => handleUnfriend(friend._id)}
                        disabled={processingIds.has(friend._id)}
                        className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        Unfriend
                      </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'requests') {
      if (pendingRequests.length === 0) {
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">No friend requests.</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingRequests.map((request) => (
            <div key={request._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex flex-col">
                <div className="mb-3">
                  <Avatar 
                    src={request.sender.avatarImage} 
                    alt={request.sender.fullName} 
                    size="lg"
                    className="mx-auto" 
                  />
                </div>
                <div className="text-center mb-3">
                  <Link to={`/profile/${request.sender._id}`} className="font-semibold text-blue-600 hover:underline">
                    {request.sender.fullName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {request.sender.mutualFriends ? `${request.sender.mutualFriends} mutual friends` : ''}
                  </p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => handleAcceptRequest(request._id)}
                    disabled={processingIds.has(request._id)}
                    className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => handleRejectRequest(request._id)}
                    disabled={processingIds.has(request._id)}
                    className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'suggestions') {
      if (suggestions.length === 0) {
        return (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 mb-4">No friend suggestions.</p>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((user) => (
            <div key={user._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex flex-col">
                <div className="mb-3">
                  <Avatar 
                    src={user.avatarImage} 
                    alt={user.fullName} 
                    size="lg"
                    className="mx-auto" 
                  />
                </div>
                <div className="text-center mb-3">
                  <Link to={`/profile/${user._id}`} className="font-semibold text-blue-600 hover:underline">
                    {user.fullName}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {user.mutualFriends ? `${user.mutualFriends} mutual friends` : ''}
                  </p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button 
                    className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <FiUserPlus className="mr-2" /> Add Friend
                  </button>
                  <button className="w-full py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Friends</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Friends</h2>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'all' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiUsers className="mr-3" /> 
                    <span>Home</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'requests' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiBell className="mr-3" /> 
                    <span>Requests</span>
                    {pendingRequests.length > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('suggestions')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'suggestions' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiUserPlus className="mr-3" /> 
                    <span>Suggestions</span>
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab('friends')}
                    className={`w-full flex items-center px-3 py-2 rounded-md ${activeTab === 'friends' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <FiUserCheck className="mr-3" /> 
                    <span>All Friends</span>
                    {friends.length > 0 && (
                      <span className="ml-auto text-gray-500 text-xs">
                        {friends.length}
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-grow">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <div className="bg-white rounded-lg shadow-md p-4">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage; 