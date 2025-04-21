import { useState } from "react";
import { Link } from "react-router-dom";
import { FiLock, FiUsers } from "react-icons/fi";
import { showConfirmToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { useGroupMutations } from "../../hooks/mutations/useGroupMutations";
import { useQueryClient } from "@tanstack/react-query";
import { GROUP_QUERY_KEYS } from "../../hooks/queries/useGroupQueries";

const GroupCard = ({ group }) => {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const { joinGroup, leaveGroup } = useGroupMutations();
  const queryClient = useQueryClient();

  // Sử dụng trực tiếp từ dữ liệu group thay vì lưu trong state
  const isCreator = user?._id === group.createdBy?._id;
  const isMember = group.isMember || isCreator;
  const hasRequestedJoin = group.hasRequestedJoin;

  const handleJoinGroup = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (joining) return;
    setJoining(true);

    try {
      await joinGroup.mutateAsync(group._id);

      // Thay vì chỉ cập nhật local state, force refresh tất cả các query liên quan
      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.myGroups(),
        refetchType: "all",
      });

      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.lists(),
        refetchType: "all",
      });

      queryClient.invalidateQueries({
        queryKey: GROUP_QUERY_KEYS.popular(),
        refetchType: "all",
      });
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (joining) return;

    showConfirmToast("Are you sure you want to leave this group?", async () => {
      setJoining(true);
      try {
        await leaveGroup.mutateAsync(group._id);

        // Force refresh tất cả các query liên quan
        queryClient.invalidateQueries({
          queryKey: GROUP_QUERY_KEYS.myGroups(),
          refetchType: "all",
        });

        queryClient.invalidateQueries({
          queryKey: GROUP_QUERY_KEYS.lists(),
          refetchType: "all",
        });

        queryClient.invalidateQueries({
          queryKey: GROUP_QUERY_KEYS.popular(),
          refetchType: "all",
        });
      } catch (error) {
        console.error("Failed to leave group:", error);
      } finally {
        setJoining(false);
      }
    });
  };

  return (
    <div className="flex bg-[#1E2024] rounded-lg border border-gray-800 hover:border-gray-700 transition-all duration-300 shadow-md hover:shadow-lg p-3 sm:p-4">
      {/* Left side - Group Image with rounded corners */}
      <div className="mr-3 sm:mr-4 flex-shrink-0 flex items-center pr-5">
        <div className="h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 overflow-hidden rounded-lg">
          {group.coverImage ? (
            <img
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-800"></div>
          )}
        </div>
      </div>

      {/* Right side - Group Info */}
      <div className="flex-1 flex flex-col justify-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/groups/${group._id}`}
              className="text-white font-semibold hover:text-blue-400 transition-colors truncate text-lg"
            >
              {group.name}
            </Link>
            {group.isPrivate && (
              <span className="text-yellow-500/90">
                <FiLock className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-400 mb-2">
            <span>{group.isPrivate ? "Private Group" : "Public Group"}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FiUsers className="w-3.5 h-3.5" />
              {group.memberCount || 0} members
            </span>
          </div>

          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {group.description || "No description provided"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isMember ? (
            hasRequestedJoin ? (
              <button
                className="px-4 py-1.5 rounded-lg bg-gray-800/80 text-gray-400 text-sm font-medium disabled:opacity-50"
                disabled={true}
              >
                Request Sent
              </button>
            ) : (
              <button
                onClick={handleJoinGroup}
                className="px-4 py-1.5 rounded-lg bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-sm font-medium transition-colors disabled:opacity-50"
                disabled={joining}
              >
                {joining ? "Processing..." : "Join"}
              </button>
            )
          ) : isCreator ? (
            <Link
              to={`/groups/${group._id}/manage`}
              className="px-4 py-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              Manage
            </Link>
          ) : (
            <button
              onClick={handleLeaveGroup}
              className="px-4 py-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              disabled={joining}
            >
              {joining ? "Processing..." : "Leave"}
            </button>
          )}
          <Link
            to={`/groups/${group._id}`}
            className="px-4 py-1.5 rounded-lg bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white text-sm font-medium transition-colors"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
