import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useGroup } from "../../contexts/GroupContext";
import { useFriend } from "../../contexts/FriendContext";
import Avatar from "../common/Avatar";
import Loading from "../common/Loading";

const RightPanel = () => {
  const { usePopularGroups } = useGroup();
  const { data: popularGroupsData, isLoading: popularGroupsLoading } =
    usePopularGroups(3); // Chỉ lấy 3 nhóm phổ biến nhất

  const popularGroups = popularGroupsData?.data || [];

  const { friends, friendsLoading, fetchFriends } = useFriend();

  // Lọc bạn bè đang online (nếu friends có giá trị)
  const onlineFriends = (friends || []).filter((friend) => friend.isOnline);

  useEffect(() => {
    // Tải danh sách bạn bè khi component được mount
    if (fetchFriends) {
      fetchFriends();
    }
  }, [fetchFriends]);

  return (
    <div className="h-full p-4">
      {/* Search bar */}
      <div className="sticky top-0 bg-black pt-1 pb-3 z-10">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-gray-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"></path>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search developers, groups..."
            className="w-full bg-[#202327] rounded-full py-3 px-12 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-black"
          />
        </div>
      </div>

      {/* Popular Groups */}
      <div className="bg-[#16181c] rounded-2xl mb-4">
        <h2 className="text-xl font-bold px-4 py-3 text-white">
          Popular Groups
        </h2>
        <div className="divide-y divide-gray-800">
          {popularGroupsLoading ? (
            <div className="p-4 flex justify-center">
              <Loading />
            </div>
          ) : !popularGroups || popularGroups.length === 0 ? (
            <div className="p-4 text-gray-400 text-center">
              No groups available
            </div>
          ) : (
            popularGroups.map((group) => (
              <Link
                key={group._id}
                to={`/groups/${group._id}`}
                className="px-4 py-3 hover:bg-[#1d1f23] block transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg mr-3 flex items-center justify-center bg-gray-700 overflow-hidden">
                    {group.coverImage ? (
                      <img
                        src={group.coverImage}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {group.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.membersCount || group.members?.length || 0} members
                    </p>
                  </div>
                  {!group.isMember && (
                    <button className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold hover:bg-blue-600 transition-colors">
                      Join
                    </button>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/groups"
          className="block px-4 py-3 text-blue-500 hover:bg-[#1d1f23] transition-colors rounded-b-2xl"
        >
          Show more groups
        </Link>
      </div>

      {/* Online Friends */}
      <div className="bg-[#16181c] rounded-2xl mb-4">
        <h2 className="text-xl font-bold px-4 py-3 text-white">
          Online Friends
        </h2>
        <div className="divide-y divide-gray-800">
          {friendsLoading ? (
            <div className="p-4 flex justify-center">
              <Loading />
            </div>
          ) : !onlineFriends || onlineFriends.length === 0 ? (
            <div className="p-4 text-gray-400 text-center">
              No friends online at the moment
            </div>
          ) : (
            onlineFriends.map((friend) => (
              <Link
                key={friend._id}
                to={`/profile/${friend._id}`}
                className="px-4 py-3 hover:bg-[#1d1f23] block transition-colors"
              >
                <div className="flex items-center">
                  <div className="relative">
                    <Avatar
                      src={friend.avatar}
                      alt={friend.fullname || friend.username}
                      size="md"
                      className="mr-3"
                    />
                    <span className="absolute right-2 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#16181c]"></span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">
                      {friend.fullname || friend.username}
                    </h3>
                    <p className="text-sm text-green-400">Active now</p>
                  </div>
                  <Link
                    to={`/messages?user=${friend._id}`}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </Link>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link
          to="/friends"
          className="block px-4 py-3 text-blue-500 hover:bg-[#1d1f23] transition-colors rounded-b-2xl"
        >
          Show all friends
        </Link>
      </div>

      {/* Footer */}
      <div className="px-4 text-xs text-gray-500">
        <div className="flex flex-wrap gap-2">
          <Link to="/about" className="hover:underline">
            About
          </Link>
          <Link to="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <span>© 2024 DevConnect</span>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
