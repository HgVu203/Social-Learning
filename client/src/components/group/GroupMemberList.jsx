import { useEffect, useState } from "react";
import { useGroup } from "../../contexts/GroupContext";
import { useAuth } from "../../contexts/AuthContext";
import Avatar from "../common/Avatar";
import Loading from "../common/Loading";
import {
  showSuccessToast,
  showErrorToast,
  showConfirmToast,
} from "../../utils/toast";
import {
  FiChevronDown,
  FiUserX,
  FiShield,
  FiEdit,
  FiUser,
  FiUserPlus,
} from "react-icons/fi";
import { Link } from "react-router-dom";

const GroupMemberList = ({ groupId, isAdmin, isManagePage = false }) => {
  const { user: currentUser } = useAuth();
  const {
    currentGroup,
    currentGroupLoading: loading,
    selectGroup,
    updateMemberRole,
    removeMember,
  } = useGroup();

  const [members, setMembers] = useState([]);
  const [showRoleMenu, setShowRoleMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingMember, setUpdatingMember] = useState(null);

  useEffect(() => {
    if (currentGroup) {
      setMembers(currentGroup.members || []);
    }
  }, [currentGroup]);

  useEffect(() => {
    if (groupId && currentUser) {
      selectGroup(groupId);
    }
  }, [groupId, currentUser, selectGroup]);

  const filteredMembers = members.filter((member) =>
    member.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRemoveMember = async (memberId) => {
    showConfirmToast(
      "Are you sure you want to remove this member?",
      async () => {
        setUpdatingMember(memberId);
        try {
          await removeMember.mutateAsync({ groupId, memberId });
          showSuccessToast("Member removed successfully");
        } catch (error) {
          console.error("Failed to remove member:", error);
          showErrorToast("Failed to remove member. Please try again.");
          // Keep the UI consistent if the API call fails
          setMembers(members.filter((m) => m.user?._id !== memberId));
        } finally {
          setUpdatingMember(null);
        }
      }
    );
  };

  const handleRoleChange = async (memberId, role) => {
    if (memberId === currentUser?._id && role !== "admin") {
      showConfirmToast(
        "Are you sure you want to demote yourself? You may lose admin privileges.",
        async () => {
          setUpdatingMember(memberId);
          try {
            await updateMemberRole.mutateAsync({
              groupId,
              userId: memberId,
              role,
            });

            // Update the local state to reflect the change
            setMembers(
              members.map((member) =>
                member.user?._id === memberId ? { ...member, role } : member
              )
            );
            showSuccessToast(`Member role updated to ${role}`);
          } catch (error) {
            console.error("Failed to update member role:", error);
            showErrorToast("Failed to update member role. Please try again.");
          } finally {
            setUpdatingMember(null);
            setShowRoleMenu(null);
          }
        }
      );
      return;
    }

    setUpdatingMember(memberId);
    try {
      await updateMemberRole.mutateAsync({
        groupId,
        userId: memberId,
        role,
      });

      // Update the local state to reflect the change
      setMembers(
        members.map((member) =>
          member.user?._id === memberId ? { ...member, role } : member
        )
      );
      showSuccessToast(`Member role updated to ${role}`);
    } catch (error) {
      console.error("Failed to update member role:", error);
      showErrorToast("Failed to update member role. Please try again.");
    } finally {
      setUpdatingMember(null);
      setShowRoleMenu(null);
    }
  };

  if (loading && !currentGroup) {
    return (
      <div className="flex justify-center py-8">
        <Loading />
      </div>
    );
  }

  if (!members.length) {
    return (
      <div className="text-center p-8">
        <div className="text-gray-400 text-lg">No members to display</div>
      </div>
    );
  }

  const membersByRole = {
    admins: members.filter((m) => m.role === "admin"),
    members: members.filter((m) => m.role !== "admin"),
  };

  return (
    <div className="space-y-6">
      {isManagePage && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            Group Members Management
          </h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <FiUserPlus />
            Invite Members
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white font-bold">
          Group Members ({members.length})
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
        </div>
      </div>

      {isManagePage && (
        <>
          <div className="mb-4">
            <h3 className="text-lg text-white font-medium mb-2 flex items-center">
              <FiShield className="mr-2 text-blue-500" /> Administrators (
              {membersByRole.admins.length})
            </h3>
            <div className="bg-[#16181c] rounded-xl border border-gray-700 divide-y divide-gray-800">
              {membersByRole.admins.map((member) => (
                <MemberItem
                  key={member.user?._id}
                  member={member}
                  currentGroup={currentGroup}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  showRoleMenu={showRoleMenu}
                  setShowRoleMenu={setShowRoleMenu}
                  handleRoleChange={handleRoleChange}
                  handleRemoveMember={handleRemoveMember}
                  updatingMember={updatingMember}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg text-white font-medium mb-2 flex items-center">
              <FiUser className="mr-2 text-gray-400" /> Members (
              {membersByRole.members.length})
            </h3>
          </div>
        </>
      )}

      <div className="bg-[#16181c] rounded-xl border border-gray-700 divide-y divide-gray-800">
        {(isManagePage ? membersByRole.members : filteredMembers).map(
          (member) => (
            <MemberItem
              key={member.user?._id}
              member={member}
              currentGroup={currentGroup}
              currentUser={currentUser}
              isAdmin={isAdmin}
              showRoleMenu={showRoleMenu}
              setShowRoleMenu={setShowRoleMenu}
              handleRoleChange={handleRoleChange}
              handleRemoveMember={handleRemoveMember}
              updatingMember={updatingMember}
            />
          )
        )}
      </div>
    </div>
  );
};

// Extracted MemberItem component for reusability
const MemberItem = ({
  member,
  currentGroup,
  currentUser,
  isAdmin,
  showRoleMenu,
  setShowRoleMenu,
  handleRoleChange,
  handleRemoveMember,
  updatingMember,
}) => {
  const isCreator = member.user?._id === currentGroup?.createdBy?._id;
  const isCurrentUser = member.user?._id === currentUser?._id;
  const canManage = isAdmin && !isCreator && !isCurrentUser;

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link to={`/profile/${member.user?._id}`}>
          <Avatar
            src={member.user?.avatar}
            alt={member.user?.username}
            size="md"
            className="rounded-full"
          />
        </Link>
        <div>
          <Link
            to={`/profile/${member.user?._id}`}
            className="text-white hover:underline font-medium"
          >
            {member.user?.fullname || member.user?.username || "Unknown User"}
          </Link>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-sm text-gray-400">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </span>
            {member.role === "admin" && (
              <span className="flex items-center text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                <FiShield className="mr-1" /> Admin
              </span>
            )}
            {isCreator && (
              <span className="flex items-center text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
                <FiEdit className="mr-1" /> Creator
              </span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex space-x-2">
          <div className="relative">
            <button
              onClick={() =>
                setShowRoleMenu(
                  showRoleMenu === member.user?._id ? null : member.user?._id
                )
              }
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg flex items-center transition-colors text-sm"
              disabled={updatingMember === member.user?._id}
            >
              <FiEdit className="mr-1" />
              {member.role} <FiChevronDown className="ml-1" />
            </button>
            {showRoleMenu === member.user?._id && (
              <div className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                <ul>
                  <li
                    className={`px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-300 text-sm ${
                      member.role === "admin" ? "bg-gray-700" : ""
                    }`}
                    onClick={() => handleRoleChange(member.user?._id, "admin")}
                  >
                    Admin
                  </li>
                  <li
                    className={`px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-300 text-sm ${
                      member.role === "member" ? "bg-gray-700" : ""
                    }`}
                    onClick={() => handleRoleChange(member.user?._id, "member")}
                  >
                    Member
                  </li>
                </ul>
              </div>
            )}
          </div>
          <button
            onClick={() => handleRemoveMember(member.user?._id)}
            className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 rounded-lg flex items-center transition-colors text-sm"
            disabled={updatingMember === member.user?._id}
          >
            <FiUserX className="mr-1" /> Remove
          </button>
        </div>
      )}

      {member.user?._id === currentGroup?.createdBy?._id && isAdmin && (
        <div className="flex space-x-2">
          <div className="px-3 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-sm">
            Group Creator (Cannot modify)
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMemberList;
