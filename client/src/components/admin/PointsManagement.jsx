import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaPlus,
  FaMinus,
  FaMedal,
  FaTrophy,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaUserShield,
  FaHandHoldingHeart,
  FaBullhorn,
  FaChalkboardTeacher,
  FaLightbulb,
  FaAward,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminUsers,
  useUpdateUserPoints,
  ADMIN_QUERY_KEYS,
} from "../../hooks/queries/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { SkeletonPointsManagement } from "../skeleton";
import { adminService } from "../../services/adminService";
import AdvancedSearch from "./AdvancedSearch";

const PointsManagement = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsToUpdate, setPointsToUpdate] = useState(0);
  const [badgeToAssign, setBadgeToAssign] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operation, setOperation] = useState("add");
  const usersPerPage = 10;
  const queryClient = useQueryClient();

  // Sử dụng React Query để lấy dữ liệu người dùng
  const {
    data: userData,
    isLoading,
    refetch,
  } = useAdminUsers(currentPage, usersPerPage, searchTerm, searchField);

  // Xử lý tìm kiếm nâng cao
  const handleAdvancedSearch = ({ field, term }) => {
    setSearchField(field);
    setSearchTerm(term);
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      refetch();
    }
  };

  const filteredUsers = userData?.data || [];
  const totalPages = userData?.pagination?.totalPages || 1;

  // Helper function to ensure badge format is consistent for display
  const normalizeBadge = (badge) => {
    if (!badge) return null;

    // Convert string badge to object format if needed
    if (typeof badge === "string") {
      return { name: badge, earnedAt: new Date().toISOString() };
    }

    // If it's already an object with name, return it
    if (badge.name) {
      return badge;
    }

    // Otherwise return null
    return null;
  };

  // Sử dụng React Query mutation để cập nhật điểm
  const updateUserPoints = useUpdateUserPoints();

  // Prefetch data for next page
  useEffect(() => {
    // Prefetch dữ liệu trang tiếp theo để tăng tốc độ chuyển trang
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ADMIN_QUERY_KEYS.usersList({
          page: nextPage,
          limit: usersPerPage,
          searchTerm,
          searchField,
        }),
        queryFn: async () => {
          return await adminService.getAllUsers(
            nextPage,
            usersPerPage,
            searchTerm,
            searchField
          );
        },
      });
    }
  }, [
    currentPage,
    totalPages,
    usersPerPage,
    searchTerm,
    searchField,
    queryClient,
  ]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);

      // Tải trước dữ liệu trang kế tiếp khi người dùng chuyển trang
      if (pageNumber < totalPages) {
        queryClient.prefetchQuery({
          queryKey: ADMIN_QUERY_KEYS.usersList({
            page: pageNumber + 1,
            limit: usersPerPage,
            searchTerm,
            searchField,
          }),
          queryFn: async () => {
            return await adminService.getAllUsers(
              pageNumber + 1,
              usersPerPage,
              searchTerm,
              searchField
            );
          },
        });
      }
    }
  };

  const handleManagePoints = (user) => {
    setSelectedUser(user);
    setPointsToUpdate(0);
    setBadgeToAssign("");
    setOperation("add");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handlePointsChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setPointsToUpdate(value >= 0 ? value : 0);
  };

  const handleUpdatePoints = async () => {
    if (pointsToUpdate <= 0 && !badgeToAssign) {
      toast.error(t("admin.pointsManagement.toast.enterPointsOrBadge"));
      return;
    }

    // Calculate points only if user has entered some value
    const calculatedPoints =
      pointsToUpdate > 0
        ? operation === "add"
          ? pointsToUpdate
          : -pointsToUpdate
        : 0; // Send 0 if no points to update but a badge is selected

    try {
      // Tính toán giá trị points mới cho optimistic update
      const newPoints =
        selectedUser.points !== undefined
          ? selectedUser.points + calculatedPoints
          : calculatedPoints > 0
          ? calculatedPoints
          : 0;

      // Tạo badge mới nếu có chọn badge
      const newBadge = badgeToAssign
        ? {
            name: badgeToAssign,
            earnedAt: new Date().toISOString(),
          }
        : selectedUser.badge;

      setSelectedUser((prev) => ({
        ...prev,
        points: newPoints,
        badge: newBadge,
      }));

      // Cập nhật cache của React Query để danh sách hiển thị đúng ngay lập tức
      queryClient.setQueryData(
        ADMIN_QUERY_KEYS.usersList({
          page: currentPage,
          limit: usersPerPage,
          searchTerm,
          searchField,
        }),
        (oldData) => {
          if (!oldData) return oldData;
          const updatedData = {
            ...oldData,
            data: oldData.data.map((user) =>
              user._id === selectedUser._id
                ? {
                    ...user,
                    points: newPoints,
                    badge: newBadge,
                  }
                : user
            ),
          };
          return updatedData;
        }
      );
      await updateUserPoints.mutateAsync({
        userId: selectedUser._id,
        points: calculatedPoints,
        badge: badgeToAssign || undefined,
      });

      // Only mention points in the success message if points were actually updated
      let successMessage = "";
      if (pointsToUpdate > 0) {
        const operationText =
          operation === "add"
            ? t("admin.pointsManagement.toast.addedTo")
            : t("admin.pointsManagement.toast.subtractedFrom");
        successMessage = `${operationText} ${
          selectedUser.fullname || selectedUser.username
        }${t("admin.pointsManagement.toast.points")}`;
      }

      if (badgeToAssign) {
        const badgeText =
          pointsToUpdate > 0
            ? t("admin.pointsManagement.toast.andAssignedBadge")
            : t("admin.pointsManagement.toast.successfullyAssignedBadge");
        successMessage += `${badgeText} ${
          selectedUser.fullname || selectedUser.username
        }`;
      }

      toast.success(successMessage);

      // Force a complete cache invalidation and refetch
      await queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.users(),
        refetchActive: true,
        refetchInactive: true,
      });

      // Force refetch with timeout to ensure UI updates
      setTimeout(() => {
        refetch();
      }, 500);

      closeModal();
    } catch (error) {
      console.error("[Points Management] Error updating points:", error);
      toast.error(t("admin.pointsManagement.toast.updateError"));

      // Revert optimistic updates if there's an error
      queryClient.invalidateQueries({
        queryKey: ADMIN_QUERY_KEYS.users(),
      });
    }
  };

  const getBadgeIcon = (badge) => {
    if (!badge) return null;

    // Get badge name from either string or object
    const badgeName = typeof badge === "string" ? badge : badge.name;

    if (!badgeName) return null;

    switch (badgeName) {
      case "gold":
        return <FaTrophy className="text-yellow-500" />;
      case "silver":
        return <FaMedal className="text-gray-400" />;
      case "bronze":
        return <FaMedal className="text-amber-700" />;
      case "star":
        return <FaStar className="text-blue-500" />;
      case "expert":
        return <FaUserShield className="text-indigo-500" />;
      case "contributor":
        return <FaHandHoldingHeart className="text-pink-500" />;
      case "influencer":
        return <FaBullhorn className="text-orange-500" />;
      case "teacher":
        return <FaChalkboardTeacher className="text-teal-500" />;
      case "innovator":
        return <FaLightbulb className="text-yellow-400" />;
      case "veteran":
        return <FaAward className="text-purple-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <SkeletonPointsManagement />;
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md p-5 overflow-hidden">
      {/* Header with Advanced Search */}
      <div className="flex flex-col mb-6 space-y-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("admin.pointsManagement.title")}
        </h2>

        <AdvancedSearch
          fields={[
            { value: "all", label: t("admin.searchFields.all") },
            { value: "name", label: t("admin.searchFields.name") },
            { value: "email", label: t("admin.searchFields.email") },
            { value: "username", label: t("admin.searchFields.username") },
            { value: "points", label: t("admin.searchFields.points") },
            { value: "badge", label: t("admin.searchFields.badge") },
          ]}
          onSearch={handleAdvancedSearch}
          loading={isLoading}
        />
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.pointsManagement.table.user")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.pointsManagement.table.email")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.pointsManagement.table.points")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.pointsManagement.table.badges")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.pointsManagement.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-[var(--color-bg-hover)]">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.fullname || user.username}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          user.fullname?.charAt(0).toUpperCase() ||
                          user.username?.charAt(0).toUpperCase() ||
                          "U"
                        )}
                      </div>
                      <div className="text-[var(--color-text-primary)]">
                        <p className="font-medium">
                          {user.fullname || user.username}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {user.email}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="px-3 py-1 text-sm font-semibold rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        {user.points || 0} points
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-1">
                      {normalizeBadge(user.badge) ? (
                        <div className="flex items-center space-x-1">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-bg-hover)]"
                            title={normalizeBadge(user.badge).name}
                          >
                            {getBadgeIcon(normalizeBadge(user.badge))}
                          </span>
                          <span className="text-sm text-[var(--color-text-primary)] capitalize">
                            {normalizeBadge(user.badge).name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--color-text-tertiary)]">
                          {t("admin.pointsManagement.table.noBadge")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleManagePoints(user)}
                      className="px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg transition-all cursor-pointer"
                    >
                      {t("admin.pointsManagement.table.managePoints")}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="py-4 px-4 text-center text-[var(--color-text-secondary)]"
                >
                  {t("admin.pointsManagement.table.noUsersFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`p-2 rounded-full ${
                currentPage === 1
                  ? "text-[var(--color-text-tertiary)] cursor-not-allowed"
                  : "text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer"
              }`}
            >
              <FaChevronLeft />
            </button>

            {(() => {
              const pageNumbers = [];
              const showEllipsisStart = currentPage > 3;
              const showEllipsisEnd = currentPage < totalPages - 2;
              const rangeStart = Math.max(
                1,
                showEllipsisStart ? currentPage - 2 : 1
              );
              const rangeEnd = Math.min(
                totalPages,
                showEllipsisEnd ? currentPage + 2 : totalPages
              );

              if (showEllipsisStart) {
                pageNumbers.push(1);
                pageNumbers.push("ellipsis-start");
              }

              for (let i = rangeStart; i <= rangeEnd; i++) {
                pageNumbers.push(i);
              }

              if (showEllipsisEnd) {
                pageNumbers.push("ellipsis-end");
                pageNumbers.push(totalPages);
              }

              return pageNumbers.map((num, idx) => {
                if (num === "ellipsis-start" || num === "ellipsis-end") {
                  return (
                    <span
                      key={num}
                      className="w-8 h-8 flex items-center justify-center text-[var(--color-text-tertiary)]"
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handlePageChange(num)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                      currentPage === num
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                    }`}
                  >
                    {num}
                  </button>
                );
              });
            })()}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-full ${
                currentPage === totalPages
                  ? "text-[var(--color-text-tertiary)] cursor-not-allowed"
                  : "text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 cursor-pointer"
              }`}
            >
              <FaChevronRight />
            </button>
          </nav>
        </div>
      )}

      {/* Points Management Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div
              className="fixed inset-0 bg-[rgba(0,0,0,0.4)]"
              onClick={closeModal}
            ></div>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-[0_0_25px_rgba(0,0,0,0.3)] rounded-lg relative z-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                  {t("admin.pointsManagement.modal.title")}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  disabled={updateUserPoints.isPending}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4 flex items-center p-3 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
                <div className="h-12 w-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-4">
                  {selectedUser.fullname?.charAt(0).toUpperCase() ||
                    selectedUser.username?.charAt(0).toUpperCase() ||
                    "U"}
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {selectedUser.fullname || selectedUser.username}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {selectedUser.email}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold text-[var(--color-primary)]">
                      {t("admin.pointsManagement.modal.currentPoints")}:{" "}
                      {selectedUser.points || 0}
                    </p>
                    {selectedUser.badge && selectedUser.badge.name && (
                      <div className="flex items-center">
                        <span className="mx-1 text-[var(--color-text-tertiary)]">
                          •
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center">
                          {t("admin.pointsManagement.modal.badge")}:
                          <span className="ml-1 inline-flex items-center justify-center w-5 h-5">
                            {getBadgeIcon(selectedUser.badge)}
                          </span>
                          <span className="ml-1">
                            {selectedUser.badge.name}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Button
                    type="button"
                    onClick={() => setOperation("add")}
                    variant={operation === "add" ? "success" : "secondary"}
                    disabled={updateUserPoints.isPending}
                    icon={<FaPlus />}
                  >
                    {t("admin.pointsManagement.modal.addPoints")}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOperation("subtract")}
                    variant={operation === "subtract" ? "danger" : "secondary"}
                    disabled={updateUserPoints.isPending}
                    icon={<FaMinus />}
                  >
                    {t("admin.pointsManagement.modal.subtractPoints")}
                  </Button>
                </div>

                {pointsToUpdate <= 0 && !badgeToAssign && (
                  <div className="mb-2 text-rose-500 text-sm">
                    {t("admin.pointsManagement.modal.enterPointsOrBadge")}
                  </div>
                )}

                <label
                  className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                  htmlFor="points"
                >
                  {t("admin.pointsManagement.modal.pointsTo")}{" "}
                  {operation === "add" ? "add" : "subtract"}
                </label>
                <input
                  type="number"
                  id="points"
                  name="points"
                  value={pointsToUpdate}
                  onChange={handlePointsChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] ${
                    pointsToUpdate <= 0 && !badgeToAssign
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60"
                  } text-[var(--color-text-primary)] shadow-sm transition-all`}
                  placeholder={t("admin.pointsManagement.modal.enterPoints")}
                  disabled={updateUserPoints.isPending}
                />
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                  htmlFor="badge"
                >
                  {t("admin.pointsManagement.modal.assignBadge")} (Optional)
                </label>
                <Select
                  id="badge"
                  name="badge"
                  value={badgeToAssign}
                  onChange={(e) => setBadgeToAssign(e.target.value)}
                  options={[
                    {
                      value: "",
                      label: t("admin.pointsManagement.modal.noBadge"),
                    },
                    {
                      value: "gold",
                      label: t("admin.pointsManagement.modal.goldTrophy"),
                    },
                    {
                      value: "silver",
                      label: t("admin.pointsManagement.modal.silverMedal"),
                    },
                    {
                      value: "bronze",
                      label: t("admin.pointsManagement.modal.bronzeMedal"),
                    },
                    {
                      value: "star",
                      label: t("admin.pointsManagement.modal.starBadge"),
                    },
                    {
                      value: "expert",
                      label: t("admin.pointsManagement.modal.expert"),
                    },
                    {
                      value: "contributor",
                      label: t("admin.pointsManagement.modal.contributor"),
                    },
                    {
                      value: "influencer",
                      label: t("admin.pointsManagement.modal.influencer"),
                    },
                    {
                      value: "teacher",
                      label: t("admin.pointsManagement.modal.teacher"),
                    },
                    {
                      value: "innovator",
                      label: t("admin.pointsManagement.modal.innovator"),
                    },
                    {
                      value: "veteran",
                      label: t("admin.pointsManagement.modal.veteran"),
                    },
                  ]}
                  disabled={updateUserPoints.isPending}
                  className={
                    pointsToUpdate <= 0 && !badgeToAssign
                      ? "border-rose-500"
                      : ""
                  }
                />
              </div>

              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={closeModal}
                  disabled={updateUserPoints.isPending}
                >
                  {t("admin.pointsManagement.modal.cancel")}
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={handleUpdatePoints}
                  isLoading={updateUserPoints.isPending}
                  disabled={
                    updateUserPoints.isPending ||
                    (pointsToUpdate <= 0 && !badgeToAssign)
                  }
                >
                  {operation === "add"
                    ? t("admin.pointsManagement.modal.addPoints")
                    : t("admin.pointsManagement.modal.subtractPoints")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsManagement;
