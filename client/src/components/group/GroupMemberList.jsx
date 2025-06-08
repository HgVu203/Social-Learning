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
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const GroupMemberList = ({ groupId, isAdmin, isManagePage = false }) => {
  const { t } = useTranslation();
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

      // Ensure the creator is included in members list
      if (
        currentGroup.createdBy &&
        !currentGroup.members?.some(
          (member) =>
            member.user?._id?.toString() ===
            currentGroup.createdBy?._id?.toString()
        )
      ) {
        setMembers((prevMembers) => [
          ...prevMembers,
          {
            user: currentGroup.createdBy,
            role: "admin",
            joinedAt: currentGroup.createdAt,
          },
        ]);
      }
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
      t("group.confirmKickMember"),
      async () => {
        setUpdatingMember(memberId);
        try {
          await removeMember.mutateAsync({ groupId, memberId });
          showSuccessToast(t("group.memberRemoved"));
        } catch (error) {
          console.error("Failed to remove member:", error);
          showErrorToast(
            error?.response?.data?.message || "Failed to remove member"
          );
        } finally {
          setUpdatingMember(null);
        }
      },
      null,
      {
        confirmText: t("group.kickMember"),
        confirmColor: "red",
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
            showSuccessToast(
              role === "admin"
                ? t("group.memberMadeAdmin")
                : t("group.adminRoleRemoved")
            );
          } catch (error) {
            console.error("Failed to update member role:", error);
            showErrorToast(
              error?.response?.data?.message || "Failed to update member role"
            );
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
      showSuccessToast(
        role === "admin"
          ? t("group.memberMadeAdmin")
          : t("group.adminRoleRemoved")
      );
    } catch (error) {
      console.error("Failed to update member role:", error);
      showErrorToast(
        error?.response?.data?.message || "Failed to update member role"
      );
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

  // Filter members by role
  const membersByRole = {
    admins: members.filter((m) => m.role === "admin"),
    members: members.filter((m) => m.role !== "admin"),
  };

  // Apply search filter to both role groups
  const filteredMembersByRole = {
    admins: membersByRole.admins.filter((member) =>
      member.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    members: membersByRole.members.filter((member) =>
      member.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t("group.groupMembers")} ({members.length})
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder={t("group.searchMembers")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-1.5 pl-10 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)]">
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
            <h3 className="text-lg font-medium mb-2 flex items-center text-[var(--color-text-primary)]">
              <FiShield className="mr-2 text-[var(--color-primary)]" />{" "}
              {t("group.administrators")} ({membersByRole.admins.length})
            </h3>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {filteredMembersByRole.admins.map((member) => (
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
                  t={t}
                />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center text-[var(--color-text-primary)]">
              <FiUser className="mr-2 text-[var(--color-text-tertiary)]" />{" "}
              {t("group.regularMembers")} ({membersByRole.members.length})
            </h3>
          </div>
        </>
      )}

      <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {(isManagePage ? filteredMembersByRole.members : filteredMembers).map(
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
              t={t}
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
  t,
}) => {
  const isCreator = member.user?._id === currentGroup?.createdBy?._id;
  const isCurrentUser = member.user?._id === currentUser?._id;
  const canManage = isAdmin && !isCreator && !isCurrentUser;

  return (
    <div className="p-4 flex items-center justify-between hover:bg-[var(--color-bg-hover)] transition-colors">
      <div className="flex items-center space-x-3">
        <Link to={`/profile/${member.user?._id}`}>
          <Avatar
            src={member.user?.avatar}
            alt={member.user?.username}
            size="md"
            className="rounded-full hover:opacity-90 transition-opacity"
          />
        </Link>
        <div>
          <Link
            to={`/profile/${member.user?._id}`}
            className="text-[var(--color-text-primary)] hover:underline font-medium"
          >
            {member.user?.fullname || member.user?.username || "Unknown User"}
          </Link>
          <div className="flex items-center space-x-2 mt-1 flex-wrap">
            <div className="text-xs text-[var(--color-text-tertiary)]">
              {t("profile.joinedOn")}{" "}
              {new Date(member.joinedAt).toLocaleDateString()}
            </div>
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
              className="px-3 py-1.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-md flex items-center transition-colors text-sm border border-[var(--color-border)]"
              disabled={updatingMember === member.user?._id}
            >
              <FiEdit className="mr-1" />
              {member.role} <FiChevronDown className="ml-1" />
            </button>
            {showRoleMenu === member.user?._id && (
              <div className="absolute right-0 mt-1 w-40 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-lg z-10">
                <ul>
                  <li
                    className={`px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-[var(--color-text-primary)] text-sm ${
                      member.role === "admin"
                        ? "bg-[var(--color-bg-hover)]"
                        : ""
                    }`}
                    onClick={() => handleRoleChange(member.user?._id, "admin")}
                  >
                    Admin
                  </li>
                  <li
                    className={`px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-[var(--color-text-primary)] text-sm ${
                      member.role === "member"
                        ? "bg-[var(--color-bg-hover)]"
                        : ""
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
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md flex items-center transition-colors text-sm"
            disabled={updatingMember === member.user?._id}
          >
            <FiUserX className="mr-1" /> {t("group.remove")}
          </button>
        </div>
      )}

      {member.user?._id === currentGroup?.createdBy?._id && isAdmin && (
        <div className="flex space-x-2">
          <div className="px-3 py-1.5 bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] rounded-md text-sm border border-[var(--color-border)]">
            <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md flex items-center">
              <FiShield className="mr-1" size={10} />
              {t("group.groupCreator")} ({t("group.cannotModify")})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupMemberList;
