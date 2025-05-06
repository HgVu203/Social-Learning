import { useState } from "react";
import { Link } from "react-router-dom";
import { FiLock, FiUsers, FiCheck } from "react-icons/fi";
import PropTypes from "prop-types";
import { showConfirmToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { useGroupMutations } from "../../hooks/mutations/useGroupMutations";
import { useQueryClient } from "@tanstack/react-query";
import { GROUP_QUERY_KEYS } from "../../hooks/queries/useGroupQueries";
import LazyImage from "../common/LazyImage";

const GroupCardSearch = ({ group }) => {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const { joinGroup, leaveGroup } = useGroupMutations();
  const queryClient = useQueryClient();

  // Use data directly from group instead of storing in state
  const isCreator = user?._id === group.createdBy?._id;
  const isMember = group.isMember || isCreator;
  const hasRequestedJoin = group.hasRequestedJoin;

  // Remove the highlighting border
  const matchStyles = "";

  const handleJoinGroup = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (joining) return;
    setJoining(true);

    try {
      await joinGroup.mutateAsync(group._id);

      // Invalidate relevant queries to refresh data
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

    showConfirmToast(
      "Are you sure you want to leave this group?",
      async () => {
        setJoining(true);
        try {
          await leaveGroup.mutateAsync(group._id);

          // Invalidate all relevant queries
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
      },
      null,
      {
        icon: "logout",
        confirmText: "Leave Group",
        confirmColor: "purple",
      }
    );
  };

  return (
    <div
      className={`flex bg-[#1E2024] rounded-xl border border-gray-800 hover:border-blue-700/50 transition-all duration-300 shadow-md hover:shadow-xl overflow-hidden ${matchStyles}`}
    >
      {/* Left - Group Image */}
      <div className="w-20 h-20 sm:w-28 sm:h-28 flex-shrink-0 relative">
        {group.coverImage ? (
          <LazyImage
            src={group.coverImage}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-800"></div>
        )}
        {group.isPrivate && (
          <span className="absolute top-1 right-1 bg-yellow-500/90 text-black p-0.5 rounded-md flex items-center">
            <FiLock className="w-2.5 h-2.5" />
          </span>
        )}
        {isMember && (
          <span className="absolute bottom-1 right-1 bg-green-600/90 text-white text-xs px-1 py-0.5 rounded-md flex items-center shadow-lg">
            <FiCheck className="w-2.5 h-2.5" />
          </span>
        )}
      </div>

      {/* Middle - Group Info */}
      <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
        <div>
          <Link
            to={`/groups/${group._id}`}
            className="block text-white font-bold hover:text-blue-400 transition-colors text-base truncate mb-2"
          >
            {group.name}
          </Link>

          <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
            <span>{group.isPrivate ? "Private" : "Public"}</span>
            <span className="text-gray-600">•</span>
            <span className="flex items-center gap-0.5">
              <FiUsers className="w-3 h-3" />
              {group.membersCount || group.members?.length || 0} members
            </span>
          </div>

          <p className="text-gray-300 text-xs line-clamp-1 mb-2">
            {group.description || "No description provided"}
          </p>

          {/* Add tags display */}
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {group.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded-sm"
                >
                  {tag}
                </span>
              ))}
              {group.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{group.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right - Actions */}
      <div className="p-3 flex flex-col justify-center gap-3 min-w-[90px]">
        {!isMember ? (
          hasRequestedJoin ? (
            <button
              className="px-3 py-1.5 rounded-md bg-gray-800/80 text-gray-400 text-xs font-medium disabled:opacity-50 w-full"
              disabled={true}
            >
              Requested
            </button>
          ) : (
            <button
              onClick={handleJoinGroup}
              className="px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-medium transition-all disabled:opacity-50 cursor-pointer"
              disabled={joining}
            >
              {joining ? "..." : "Join"}
            </button>
          )
        ) : isCreator ? (
          <Link
            to={`/groups/${group._id}/manage`}
            className="px-3 py-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white text-xs font-medium transition-all text-center cursor-pointer"
          >
            Manage
          </Link>
        ) : (
          <button
            onClick={handleLeaveGroup}
            className="px-3 py-1.5 rounded-md bg-gray-700/80 hover:bg-gray-600 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
            disabled={joining}
          >
            {joining ? "..." : "Leave"}
          </button>
        )}
        <Link
          to={`/groups/${group._id}`}
          className="px-3 py-1.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-medium transition-all text-center cursor-pointer"
        >
          View
        </Link>
      </div>
    </div>
  );
};

// Add prop types validation
GroupCardSearch.propTypes = {
  group: PropTypes.object.isRequired,
};

export default GroupCardSearch;
