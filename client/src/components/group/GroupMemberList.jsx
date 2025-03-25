import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGroupById, updateMemberRole } from '../../redux/groupSlice';
import Avatar from '../common/Avatar';
import Loading from '../common/Loading';
import { Link } from 'react-router-dom';
import { FiSearch, FiMoreVertical, FiUserPlus, FiShield, FiX, FiUserCheck } from 'react-icons/fi';
import { BiCrown } from 'react-icons/bi';
import NoData from '../common/NoData';

const MemberItem = ({ member, isAdmin, currentUserId, groupId, onUpdateRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const handleRoleUpdate = async (newRole) => {
    if (processing) return;
    
    setProcessing(true);
    try {
      await onUpdateRole(member.userId, newRole);
      setShowMenu(false);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleRemoveMember = async () => {
    if (processing) return;
    
    if (window.confirm(`Are you sure you want to remove ${member.fullName} from the group?`)) {
      setProcessing(true);
      try {
        await onUpdateRole(member.userId, 'remove');
        setShowMenu(false);
      } finally {
        setProcessing(false);
      }
    }
  };
  
  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md transition-colors">
      <div className="flex items-center">
        <Avatar 
          src={member.avatarImage} 
          alt={member.fullName} 
          size="md" 
          className="mr-3"
        />
        <div>
          <Link to={`/profile/${member.userId}`} className="font-medium text-blue-600 hover:underline">
            {member.fullName}
          </Link>
          <div className="flex items-center text-sm text-gray-500">
            {member.role === 'owner' && (
              <div className="flex items-center text-yellow-600">
                <BiCrown className="mr-1" /> Group Creator
              </div>
            )}
            {member.role === 'admin' && (
              <div className="flex items-center text-blue-600">
                <FiShield className="mr-1" /> Admin
              </div>
            )}
            {member.role === 'member' && (
              <span>Member</span>
            )}
          </div>
        </div>
      </div>
      
      {isAdmin && member.userId !== currentUserId && (
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
            disabled={processing}
          >
            <FiMoreVertical />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg z-10 border">
              <div className="py-1">
                {member.role !== 'admin' && (
                  <button 
                    onClick={() => handleRoleUpdate('admin')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    disabled={processing}
                  >
                    <FiShield className="mr-2" /> Make Admin
                  </button>
                )}
                {member.role === 'admin' && (
                  <button 
                    onClick={() => handleRoleUpdate('member')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    disabled={processing}
                  >
                    <FiUserCheck className="mr-2" /> Remove Admin Status
                  </button>
                )}
                <button 
                  onClick={handleRemoveMember}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                  disabled={processing}
                >
                  <FiX className="mr-2" /> Remove from Group
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GroupMemberList = ({ groupId, isAdmin }) => {
  const dispatch = useDispatch();
  const { currentGroup, loading } = useSelector((state) => state.group);
  const { user } = useSelector((state) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  
  useEffect(() => {
    if (!currentGroup || currentGroup._id !== groupId) {
      dispatch(getGroupById(groupId));
    }
  }, [dispatch, groupId, currentGroup]);
  
  useEffect(() => {
    if (currentGroup?.members) {
      setFilteredMembers(
        currentGroup.members.filter(member => 
          searchQuery.trim() === '' || 
          member.fullName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [currentGroup?.members, searchQuery]);
  
  const handleUpdateRole = async (userId, role) => {
    try {
      await dispatch(updateMemberRole({ 
        groupId, 
        userId, 
        role 
      })).unwrap();
      
      // Refresh group data
      dispatch(getGroupById(groupId));
      return true;
    } catch (error) {
      console.error('Failed to update role:', error);
      return false;
    }
  };
  
  if (loading && !currentGroup) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loading />
      </div>
    );
  }
  
  if (!currentGroup?.members || currentGroup.members.length === 0) {
    return (
      <NoData 
        message="No members found" 
        description="Invite friends to join this group"
      />
    );
  }
  
  const adminMembers = filteredMembers.filter(member => 
    member.role === 'owner' || member.role === 'admin'
  );
  
  const regularMembers = filteredMembers.filter(member => 
    member.role === 'member'
  );
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold mb-4">Group Members ({currentGroup.members.length})</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {isAdmin && (
        <div className="px-4 py-3 border-b bg-gray-50">
          <button className="flex items-center text-blue-600 hover:underline">
            <FiUserPlus className="mr-2" /> Add New Members
          </button>
        </div>
      )}
      
      <div className="divide-y">
        {adminMembers.length > 0 && (
          <div className="p-4">
            <h3 className="font-medium text-sm text-gray-500 mb-2">Admins and Creator ({adminMembers.length})</h3>
            <div className="space-y-1">
              {adminMembers.map(member => (
                <MemberItem 
                  key={member.userId}
                  member={member}
                  isAdmin={isAdmin}
                  currentUserId={user?.id}
                  groupId={groupId}
                  onUpdateRole={handleUpdateRole}
                />
              ))}
            </div>
          </div>
        )}
        
        {regularMembers.length > 0 && (
          <div className="p-4">
            <h3 className="font-medium text-sm text-gray-500 mb-2">Members ({regularMembers.length})</h3>
            <div className="space-y-1">
              {regularMembers.map(member => (
                <MemberItem 
                  key={member.userId}
                  member={member}
                  isAdmin={isAdmin}
                  currentUserId={user?.id}
                  groupId={groupId}
                  onUpdateRole={handleUpdateRole}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMemberList; 