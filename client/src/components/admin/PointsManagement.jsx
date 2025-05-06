import { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaMinus,
  FaMedal,
  FaTrophy,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminUsers,
  useUpdateUserPoints,
} from "../../hooks/queries/useAdminQueries";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { SkeletonPointsManagement } from "../skeleton";

const PointsManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pointsToUpdate, setPointsToUpdate] = useState(0);
  const [badgeToAssign, setBadgeToAssign] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operation, setOperation] = useState("add");
  const usersPerPage = 8;

  // Sử dụng React Query để lấy dữ liệu người dùng
  const {
    data: userData,
    isLoading,
    refetch,
  } = useAdminUsers(currentPage, usersPerPage, searchTerm);

  const filteredUsers = userData?.data || [];
  const totalPages = userData?.pagination?.totalPages || 1;

  // Sử dụng React Query mutation để cập nhật điểm
  const updateUserPoints = useUpdateUserPoints();

  // Tìm kiếm người dùng
  const searchUsers = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      refetch();
    }
  };

  useEffect(() => {
    if (searchTerm === "") {
      searchUsers();
    }
  }, [searchTerm]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
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
      toast.error("Please enter points or select a badge to update");
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
      await updateUserPoints.mutateAsync({
        userId: selectedUser._id,
        points: calculatedPoints,
        badge: badgeToAssign || undefined,
      });

      // Only mention points in the success message if points were actually updated
      let successMessage = "";
      if (pointsToUpdate > 0) {
        const operationText =
          operation === "add" ? "added to" : "subtracted from";
        successMessage = `Successfully ${operationText} ${
          selectedUser.fullname || selectedUser.username
        }'s points`;
      } else if (badgeToAssign) {
        successMessage = `Successfully assigned badge to ${
          selectedUser.fullname || selectedUser.username
        }`;
      }

      toast.success(successMessage);
      closeModal();
    } catch (error) {
      console.error("Error updating points:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          "Failed to update points"
      );
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case "gold":
        return <FaTrophy className="text-yellow-500" />;
      case "silver":
        return <FaMedal className="text-gray-400" />;
      case "bronze":
        return <FaMedal className="text-amber-700" />;
      case "star":
        return <FaStar className="text-blue-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return <SkeletonPointsManagement />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h3 className="text-lg font-semibold mb-4 md:mb-0 text-[var(--color-text-primary)]">
          Points Management
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full md:w-64 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
          <FaSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-primary)] opacity-70 cursor-pointer"
            onClick={searchUsers}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                User
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Email
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Points
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Badges
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Actions
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
                      {user.badges && user.badges.length > 0 ? (
                        user.badges.map((badge, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-bg-hover)]"
                            title={badge}
                          >
                            {getBadgeIcon(badge)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-[var(--color-text-tertiary)]">
                          No badges
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <button
                      onClick={() => handleManagePoints(user)}
                      className="px-3 py-1.5 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg transition-all cursor-pointer"
                    >
                      Manage Points
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
                  No users found.
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
              className="fixed inset-0 backdrop-blur-[1.5px] bg-[rgba(0,0,0,0.15)] pointer-events-auto"
              onClick={closeModal}
            ></div>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-md p-6 my-8 text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-[0_0_25px_rgba(0,0,0,0.3)] rounded-lg pointer-events-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Manage User Points
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
                  <p className="text-sm font-semibold text-[var(--color-primary)]">
                    Current points: {selectedUser.points || 0}
                  </p>
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
                    Add Points
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setOperation("subtract")}
                    variant={operation === "subtract" ? "danger" : "secondary"}
                    disabled={updateUserPoints.isPending}
                    icon={<FaMinus />}
                  >
                    Subtract Points
                  </Button>
                </div>

                {pointsToUpdate <= 0 && !badgeToAssign && (
                  <div className="mb-2 text-rose-500 text-sm">
                    Please enter points or select a badge to update
                  </div>
                )}

                <label
                  className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                  htmlFor="points"
                >
                  Points to {operation === "add" ? "add" : "subtract"}
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
                  placeholder="Enter points"
                  disabled={updateUserPoints.isPending}
                />
              </div>

              <div className="mb-6">
                <label
                  className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                  htmlFor="badge"
                >
                  Assign Badge (Optional)
                </label>
                <Select
                  id="badge"
                  name="badge"
                  value={badgeToAssign}
                  onChange={(e) => setBadgeToAssign(e.target.value)}
                  options={[
                    { value: "", label: "No badge" },
                    { value: "gold", label: "Gold Trophy" },
                    { value: "silver", label: "Silver Medal" },
                    { value: "bronze", label: "Bronze Medal" },
                    { value: "star", label: "Star Badge" },
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
                  Cancel
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
                  {operation === "add" ? "Add Points" : "Subtract Points"}
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
