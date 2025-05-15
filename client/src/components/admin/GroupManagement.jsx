import { useState, useEffect } from "react";
import {
  FaUsers,
  FaEdit,
  FaTrash,
  FaSearch,
  FaCheck,
  FaBan,
  FaCalendarAlt,
  FaUserFriends,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminGroups,
  useAdminGroupMutations,
  ADMIN_QUERY_KEYS,
} from "../../hooks/queries/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { SkeletonGroupManagement } from "../skeleton";
import { adminService } from "../../services/adminService";

const GroupManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingGroupId, setProcessingGroupId] = useState(null);
  const groupsPerPage = 5;
  const queryClient = useQueryClient();

  // Sử dụng React Query để lấy dữ liệu
  const {
    data: groupsData,
    isLoading,
    refetch,
    error,
  } = useAdminGroups(currentPage, groupsPerPage);

  // Debug data
  useEffect(() => {
    console.log("GroupsData received:", groupsData);
    console.log("Error:", error);
  }, [groupsData, error]);

  // Sửa lại để đảm bảo dữ liệu được xử lý đúng
  const filteredGroups = groupsData?.data || [];
  const totalPages = groupsData?.pagination?.totalPages || 1;

  // Sử dụng React Query mutations
  const { updateGroup, deleteGroup } = useAdminGroupMutations();

  // Tìm kiếm dữ liệu
  const searchGroups = () => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      refetch();
    }
  };

  useEffect(() => {
    if (searchTerm === "") {
      searchGroups();
    }
  }, [searchTerm]);

  // Prefetch data for next page
  useEffect(() => {
    // Prefetch dữ liệu trang tiếp theo để tăng tốc độ chuyển trang
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ADMIN_QUERY_KEYS.groupsList({
          page: nextPage,
          limit: groupsPerPage,
        }),
        queryFn: async () => {
          return await adminService.getAllGroups(nextPage, groupsPerPage);
        },
      });
    }
  }, [currentPage, groupsPerPage, totalPages, queryClient]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);

      // Tải trước dữ liệu trang kế tiếp khi người dùng chuyển trang
      if (pageNumber < totalPages) {
        queryClient.prefetchQuery({
          queryKey: ADMIN_QUERY_KEYS.groupsList({
            page: pageNumber + 1,
            limit: groupsPerPage,
          }),
          queryFn: async () => {
            return await adminService.getAllGroups(
              pageNumber + 1,
              groupsPerPage
            );
          },
        });
      }
    }
  };

  const handleEditGroup = (group) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        setProcessingGroupId(groupId);
        await deleteGroup.mutateAsync(groupId);
        toast.success("Group deleted successfully");
      } catch (error) {
        console.error("Error deleting group:", error);
        toast.error(error.response?.data?.error || "Failed to delete group");
      } finally {
        setProcessingGroupId(null);
      }
    }
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      await updateGroup.mutateAsync({
        groupId: selectedGroup._id,
        groupData: {
          name: selectedGroup.name,
          description: selectedGroup.description,
          status: selectedGroup.status,
        },
      });
      toast.success("Group updated successfully");
      closeModal();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(
        error.response?.data?.error || error.message || "Failed to update group"
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedGroup({
      ...selectedGroup,
      [name]: value,
    });
  };

  if (isLoading) {
    return <SkeletonGroupManagement />;
  }

  // Hiển thị thông báo lỗi nếu có
  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 mb-4">Failed to load groups</div>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h3 className="text-lg font-semibold mb-4 md:mb-0 text-[var(--color-text-primary)]">
          Group Management
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchGroups()}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full md:w-64 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
          <FaSearch
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-primary)] opacity-70 cursor-pointer"
            onClick={searchGroups}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Group
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Description
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Members
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Created
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredGroups && filteredGroups.length > 0 ? (
              filteredGroups.map((group) => (
                <tr
                  key={group._id}
                  className="hover:bg-[var(--color-bg-hover)]"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-3">
                        <FaUsers className="text-lg" />
                      </div>
                      <div className="text-[var(--color-text-primary)]">
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {group.category || "No category"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-[var(--color-text-primary)] max-w-xs truncate">
                      {group.description || "No description"}
                    </p>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center text-[var(--color-text-primary)]">
                      <FaUserFriends className="mr-2 text-[var(--color-primary)] opacity-70" />
                      <span>
                        {group.memberCount ||
                          (group.members ? group.members.length : 0)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                        group.status === "active"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : group.status === "featured"
                          ? "bg-amber-500/20 text-amber-500"
                          : group.status === "pending"
                          ? "bg-blue-500/20 text-blue-500"
                          : group.status === "blocked"
                          ? "bg-rose-500/20 text-rose-500"
                          : "bg-rose-500/20 text-rose-500"
                      }`}
                    >
                      {group.status === "active" ? (
                        <FaCheck className="mr-1" />
                      ) : group.status === "featured" ? (
                        <FaCheck className="mr-1" />
                      ) : group.status === "pending" ? (
                        <FaCheck className="mr-1" />
                      ) : group.status === "blocked" ? (
                        <FaBan className="mr-1" />
                      ) : (
                        <FaBan className="mr-1" />
                      )}
                      {group.status || "Unknown"}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    <div className="flex items-center">
                      <FaCalendarAlt className="mr-2 text-[var(--color-primary)] opacity-70" />
                      {new Date(group.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditGroup(group)}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-full transition-all cursor-pointer"
                        title="Edit Group"
                        disabled={
                          deleteGroup.isPending &&
                          processingGroupId === group._id
                        }
                      >
                        <FaEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group._id)}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          deleteGroup.isPending &&
                          processingGroupId === group._id
                            ? "bg-gray-300/20 text-gray-400"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                        }`}
                        title="Delete Group"
                        disabled={
                          deleteGroup.isPending &&
                          processingGroupId === group._id
                        }
                      >
                        {deleteGroup.isPending &&
                        processingGroupId === group._id ? (
                          <div className="w-6 h-6 border-2 border-t-transparent border-rose-400 rounded-full animate-spin"></div>
                        ) : (
                          <FaTrash className="text-lg" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="py-4 px-4 text-center text-[var(--color-text-secondary)]"
                >
                  No groups found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center justify-center mt-6 space-x-2">
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

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                // Display only current page, first, last, and pages around current
                const shouldDisplay =
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 &&
                    pageNumber <= currentPage + 1);

                if (!shouldDisplay) {
                  return pageNumber === 2 || pageNumber === totalPages - 1 ? (
                    <span
                      key={`ellipsis-${pageNumber}`}
                      className="px-3 py-1 text-[var(--color-text-secondary)]"
                    >
                      ...
                    </span>
                  ) : null;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === pageNumber
                        ? "bg-[var(--color-primary)] text-white cursor-default"
                        : "hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] cursor-pointer"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>

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

      {/* Edit Group Modal */}
      {isModalOpen && selectedGroup && (
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
                  Edit Group
                </h2>
                <button
                  onClick={closeModal}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  disabled={updateGroup.isPending}
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

              <form onSubmit={handleSaveGroup}>
                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="name"
                  >
                    Group Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={selectedGroup.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary)]/60 transition-all"
                    placeholder="Enter group name"
                    disabled={updateGroup.isPending}
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="description"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={selectedGroup.description || ""}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary)]/60 transition-all resize-none"
                    placeholder="Enter group description"
                    disabled={updateGroup.isPending}
                  ></textarea>
                </div>

                <div className="mb-6">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="status"
                  >
                    Status
                  </label>
                  <Select
                    id="status"
                    name="status"
                    value={selectedGroup.status}
                    onChange={handleInputChange}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "featured", label: "Featured" },
                      { value: "pending", label: "Pending" },
                      { value: "blocked", label: "Blocked" },
                    ]}
                    disabled={updateGroup.isPending}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    disabled={updateGroup.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={updateGroup.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;
