import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { joinGroup, leaveGroup } from '../../redux/groupSlice';
import Avatar from '../common/Avatar';

const GroupCard = ({ group }) => {
  const [isHovered, setIsHovered] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [joining, setJoining] = useState(false);

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (joining) return;
    
    setJoining(true);
    try {
      await dispatch(joinGroup(group._id)).unwrap();
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (joining) return;
    
    if (window.confirm('Bạn có chắc muốn rời khỏi nhóm này?')) {
      setJoining(true);
      try {
        await dispatch(leaveGroup(group._id)).unwrap();
      } finally {
        setJoining(false);
      }
    }
  };

  const isCreator = user?._id === group.creator?._id;
  const isMember = group.isMember || isCreator;
  const hasRequestedJoin = group.hasRequestedJoin;

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/groups/${group._id}`}>
        <div className="relative h-32 bg-gradient-to-r from-blue-400 to-indigo-500">
          {group.coverImage && (
            <img 
              src={group.coverImage} 
              alt={`${group.name} cover`} 
              className="w-full h-full object-cover" 
            />
          )}
          <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-white font-bold truncate">{group.name}</h3>
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center mb-2">
            <Avatar
              src={group.avatarImage}
              alt={group.name}
              size="md"
              className="mr-2"
            />
            <div>
              <p className="text-gray-600 text-sm">
                {group.isPrivate ? 'Nhóm riêng tư' : 'Nhóm công khai'} · {group.memberCount || 0} thành viên
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 text-sm mb-4 line-clamp-2">
            {group.description || 'Không có mô tả'}
          </p>
          
          <div className="flex justify-between items-center">
            {!isMember ? (
              hasRequestedJoin ? (
                <button 
                  className="w-full py-2 px-4 rounded bg-gray-200 text-gray-600 disabled:opacity-50"
                  disabled={true}
                >
                  Đã gửi yêu cầu
                </button>
              ) : (
                <button 
                  onClick={handleJoinGroup} 
                  className="w-full py-2 px-4 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={joining}
                >
                  {joining ? 'Đang xử lý...' : 'Tham gia nhóm'}
                </button>
              )
            ) : (
              isCreator ? (
                <Link 
                  to={`/groups/${group._id}/manage`}
                  className="block w-full text-center py-2 px-4 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Quản lý nhóm
                </Link>
              ) : (
                <button 
                  onClick={handleLeaveGroup} 
                  className="w-full py-2 px-4 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50"
                  disabled={joining}
                >
                  {joining ? 'Đang xử lý...' : 'Rời nhóm'}
                </button>
              )
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default GroupCard; 