import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiLock, FiUsers, FiCheck } from "react-icons/fi";
import PropTypes from "prop-types";
import { showConfirmToast } from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { useGroupMutations } from "../../hooks/mutations/useGroupMutations";
import { useQueryClient } from "@tanstack/react-query";
import { GROUP_QUERY_KEYS } from "../../hooks/queries/useGroupQueries";
import LazyImage from "../common/LazyImage";
import { prefetchImages } from "../../utils/prefetch";
import { useTranslation } from "react-i18next";

const GroupCard = ({
  group,
  index = 0,
  showJoinedBadge = false,
  isCompact = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);
  const { joinGroup, leaveGroup } = useGroupMutations();
  const queryClient = useQueryClient();

  // Sử dụng trực tiếp từ dữ liệu group thay vì lưu trong state
  const isCreator = user?._id === group.createdBy?._id;
  const isMember = group.isMember || isCreator;
  const hasRequestedJoin = group.hasRequestedJoin;

  // Prefetch ảnh bìa nhóm khi component mount
  useEffect(() => {
    if (group.coverImage) {
      // Với nhóm hiển thị ở vị trí đầu tiên, prefetch ngay
      prefetchImages(group.coverImage, { highPriority: index < 3 });
    }
  }, [group.coverImage, index]);

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

    showConfirmToast(
      t("common.confirmLeaveGroup"),
      async () => {
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
      },
      null,
      {
        icon: "logout",
        confirmText: t("common.leaveGroup"),
        confirmColor: "purple",
      }
    );
  };

  return (
    <div
      className={`group flex flex-col bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] hover:border-blue-700/50 transition-all duration-300 shadow-md hover:shadow-xl h-full ${
        isCompact ? "p-3" : "p-3"
      }`}
    >
      {/* Top - Group Image with rounded corners */}
      <div className="mb-2 w-full overflow-hidden rounded-lg">
        <div className="h-32 relative w-full overflow-hidden">
          {group.coverImage ? (
            <LazyImage
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover"
              style={{ objectFit: "cover", objectPosition: "center" }}
              eager={index < 3} // Tải trước cho 3 nhóm đầu tiên
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-800 transition-all duration-700"></div>
          )}
          {group.isPrivate && (
            <span className="absolute top-2 right-2 bg-yellow-500/90 text-black p-1 rounded-lg flex items-center">
              <FiLock className="w-3 h-3" />
            </span>
          )}
          {showJoinedBadge && (
            <span className="absolute top-2 left-2 bg-green-600/90 text-white text-xs px-1.5 py-0.5 rounded-lg flex items-center shadow-lg">
              <FiCheck className="mr-0.5 w-3 h-3" /> {t("group.joinedBadge")}
            </span>
          )}
        </div>
      </div>

      {/* Bottom - Group Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/groups/${group._id}`}
            className="block text-[var(--color-text-primary)] font-bold hover:text-blue-400 transition-colors text-base truncate mb-1 leading-tight"
          >
            {group.name}
          </Link>

          <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] mb-2">
            <span>
              {group.isPrivate ? t("group.private") : t("group.public")}
            </span>
            <span className="text-[var(--color-text-tertiary)]">•</span>
            <span className="flex items-center gap-0.5">
              <FiUsers className="w-3 h-3" />
              {group.memberCount || 0} {t("group.members")}
            </span>
          </div>

          {!isCompact && (
            <p className="text-[var(--color-text-secondary)] text-xs mb-2 line-clamp-2 h-8">
              {group.description || t("group.noDescription")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-auto">
          {!isMember ? (
            hasRequestedJoin ? (
              <button
                className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs font-medium disabled:opacity-50 w-full truncate whitespace-nowrap overflow-hidden text-ellipsis"
                disabled={true}
              >
                {t("group.requestSent")}
              </button>
            ) : (
              <button
                onClick={handleJoinGroup}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-medium transition-all disabled:opacity-50 flex-1 shadow-lg hover:shadow-blue-700/20 cursor-pointer truncate whitespace-nowrap overflow-hidden text-ellipsis"
                disabled={joining}
              >
                {joining ? "..." : t("group.join")}
              </button>
            )
          ) : isCreator ? (
            <Link
              to={`/groups/${group._id}/manage`}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white text-xs font-medium transition-all flex-1 text-center shadow-lg cursor-pointer truncate whitespace-nowrap overflow-hidden text-ellipsis"
            >
              {t("group.manage")}
            </Link>
          ) : (
            <button
              onClick={handleLeaveGroup}
              className="px-3 py-1.5 rounded-lg bg-gray-700/80 hover:bg-gray-600 text-white text-xs font-medium transition-colors disabled:opacity-50 flex-1 cursor-pointer truncate whitespace-nowrap overflow-hidden text-ellipsis"
              disabled={joining}
            >
              {joining ? "..." : t("group.leave")}
            </button>
          )}
          <Link
            to={`/groups/${group._id}`}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-medium transition-all flex-1 text-center shadow-lg hover:shadow-blue-700/20 cursor-pointer truncate whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {t("group.view")}
          </Link>
        </div>
      </div>
    </div>
  );
};

// Add prop types validation
GroupCard.propTypes = {
  group: PropTypes.object.isRequired,
  index: PropTypes.number,
  showJoinedBadge: PropTypes.bool,
  isCompact: PropTypes.bool,
};

export default GroupCard;
