import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getGroupById, joinGroup, leaveGroup } from '../../redux/groupSlice';
import { fetchPosts } from '../../redux/postSlice';
import PostList from '../../components/post/PostList';
import Avatar from '../../components/common/Avatar';
import Loading from '../../components/common/Loading';
import GroupMemberList from '../../components/group/GroupMemberList';
import { FiUsers, FiSettings, FiImage, FiEdit2, FiEye, FiLock, FiCalendar } from 'react-icons/fi';

const GroupDetailPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentGroup, loading, error } = useSelector((state) => state.group);
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('discussion');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    dispatch(getGroupById(groupId));
  }, [dispatch, groupId]);

  useEffect(() => {
    if (currentGroup?.isMember) {
      dispatch(fetchPosts({ groupId }));
    }
  }, [dispatch, groupId, currentGroup?.isMember]);

  const handleJoinGroup = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      await dispatch(joinGroup(groupId)).unwrap();
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isJoining) return;
    if (window.confirm('Are you sure you want to leave this group?')) {
      setIsJoining(true);
      try {
        await dispatch(leaveGroup(groupId)).unwrap();
      } finally {
        setIsJoining(false);
      }
    }
  };

  const isAdmin = currentGroup?.members?.some(
    (member) => member.userId === user?.id && (member.role === 'admin' || member.role === 'owner')
  );

  if (loading && !currentGroup) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-4">Group not found</h2>
          <p className="text-gray-500 mb-6">This group may have been deleted or you don't have access to it.</p>
          <button 
            onClick={() => navigate('/groups')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const canCreatePost = currentGroup.isMember;
  const canViewContent = currentGroup.isMember || !currentGroup.isPrivate;

  const renderTabContent = () => {
    if (!canViewContent) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <FiLock className="mx-auto text-4xl text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-4">This is a private group</h2>
          <p className="text-gray-500 mb-6">Join the group to see content and discussions.</p>
          <button 
            onClick={handleJoinGroup}
            disabled={isJoining}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isJoining ? 'Processing...' : 'Join Group'}
          </button>
        </div>
      );
    }

    if (activeTab === 'discussion') {
      return (
        <div>
          {canCreatePost && (
            <div className="bg-white p-4 rounded-lg shadow-md mb-4">
              <div className="flex items-center space-x-3">
                <Avatar src={user?.avatarImage} alt={user?.fullName} size="md" />
                <div 
                  onClick={() => navigate(`/create-post?groupId=${groupId}`)}
                  className="flex-grow bg-gray-100 rounded-full px-4 py-2.5 cursor-pointer hover:bg-gray-200 transition-colors text-gray-500"
                >
                  Write something in the group...
                </div>
              </div>
              <div className="flex mt-3 pt-2 border-t">
                <button className="flex-1 flex items-center justify-center p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <FiImage className="mr-2 text-green-600" />
                  <span>Photo/Video</span>
                </button>
                <button 
                  onClick={() => navigate(`/create-post?groupId=${groupId}`)}
                  className="flex-1 flex items-center justify-center p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <FiEdit2 className="mr-2 text-blue-600" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          )}
          
          <PostList groupId={groupId} />
        </div>
      );
    }

    if (activeTab === 'about') {
      return (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Group Information</h3>
              <p className="text-gray-700 whitespace-pre-line">
                {currentGroup.description || 'This group has no description.'}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-2">Details</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiLock className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {currentGroup.isPrivate ? 'Private Group' : 'Public Group'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentGroup.isPrivate 
                        ? 'Only members can see who is in the group and what they post.'
                        : 'Anyone can see who is in the group and what they post.'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiEye className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">
                      {currentGroup.isPrivate ? 'Hidden' : 'Visible'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {currentGroup.isPrivate 
                        ? 'Only members can find this group.'
                        : 'Anyone can find this group.'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCalendar className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">History</p>
                    <p className="text-sm text-gray-500">
                      Group created on {new Date(currentGroup.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            {isAdmin && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Group Administration</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => navigate(`/groups/${groupId}/settings`)}
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <FiSettings className="mr-1" /> Manage group settings
                  </button>
                  <button 
                    onClick={() => navigate(`/groups/${groupId}/members`)}
                    className="flex items-center text-blue-600 hover:underline"
                  >
                    <FiUsers className="mr-1" /> Manage members
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'members') {
      return <GroupMemberList groupId={groupId} isAdmin={isAdmin} />;
    }

    return null;
  };

  return (
    <div>
      {/* Cover Image */}
      <div 
        className="h-64 bg-gradient-to-r from-blue-500 to-indigo-600 relative"
        style={currentGroup.coverImage ? { backgroundImage: `url(${currentGroup.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end">
          <div className="flex items-end">
            <div className="relative">
              <Avatar 
                src={currentGroup.avatarImage} 
                alt={currentGroup.name} 
                size="xl" 
                className="border-4 border-white shadow-md"
              />
            </div>
            <div className="ml-4 text-white">
              <h1 className="text-3xl font-bold">{currentGroup.name}</h1>
              <div className="flex items-center mt-1">
                <FiUsers className="mr-1" /> 
                <span>{currentGroup.members?.length || 0} members</span>
                <span className="mx-2">•</span>
                <span>{currentGroup.isPrivate ? 'Private Group' : 'Public Group'}</span>
              </div>
            </div>
          </div>
          
          <div>
            {currentGroup.isMember ? (
              <button
                onClick={handleLeaveGroup}
                disabled={isJoining}
                className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-md hover:bg-opacity-30 transition-colors"
              >
                {isJoining ? 'Processing...' : 'Leave Group'}
              </button>
            ) : (
              <button
                onClick={handleJoinGroup}
                disabled={isJoining}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {isJoining ? 'Processing...' : 'Join Group'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('discussion')}
              className={`px-4 py-4 font-medium ${
                activeTab === 'discussion'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Discussion
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-4 font-medium ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-4 font-medium ${
                activeTab === 'about'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              About
            </button>
            
            {isAdmin && (
              <Link
                to={`/groups/${groupId}/settings`}
                className="px-4 py-4 font-medium text-gray-500 hover:text-gray-700 ml-auto flex items-center"
              >
                <FiSettings className="mr-1" /> Settings
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h2 className="text-lg font-medium mb-4">About</h2>
              <p className="text-gray-600 mb-4 line-clamp-3">
                {currentGroup.description || 'No description available.'}
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <FiUsers className="mr-1" /> 
                <span>{currentGroup.members?.length || 0} members</span>
              </div>
              {activeTab !== 'about' && (
                <button
                  onClick={() => setActiveTab('about')}
                  className="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  See More
                </button>
              )}
            </div>
            
            {currentGroup.isMember && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h2 className="text-lg font-medium mb-4">Members</h2>
                <div className="space-y-3">
                  {currentGroup.members?.slice(0, 5).map((member) => (
                    <div key={member._id} className="flex items-center">
                      <Avatar 
                        src={member.user?.avatarImage} 
                        alt={member.user?.username} 
                        size="sm" 
                      />
                      <div className="ml-2">
                        <p className="text-sm font-medium">{member.user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {currentGroup.members?.length > 5 && activeTab !== 'members' && (
                  <button
                    onClick={() => setActiveTab('members')}
                    className="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                  >
                    See All Members
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Main Content */}
          <div className="md:col-span-2">
            {activeTab === 'members' ? (
              <GroupMemberList 
                groupId={groupId} 
                members={currentGroup.members} 
                isAdmin={isAdmin}
              />
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailPage; 