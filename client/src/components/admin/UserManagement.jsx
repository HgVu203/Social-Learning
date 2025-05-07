import { useState, useEffect } from "react";
import {
  FaUserEdit,
  FaTrash,
  FaSearch,
  FaUserLock,
  FaUserCheck,
  FaUserShield,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminUsers,
  useAdminUserMutations,
} from "../../hooks/queries/useAdminQueries";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { SkeletonUserManagement } from "../skeleton";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingUserId, setProcessingUserId] = useState(null);
  const usersPerPage = 8;

  // Sử dụng React Query hook để lấy dữ liệu người dùng
  const { data: userData, isLoading } = useAdminUsers(
    currentPage,
    usersPerPage,
    searchTerm
  );

  const filteredUsers = userData?.data || [];
  const totalPages = userData?.pagination?.totalPages || 1;

  // Sử dụng React Query mutations
  const { updateUser, deleteUser, toggleUserStatus } = useAdminUserMutations();

  // Reset to first page when searching
  useEffect(() => {
    if (currentPage !== 1 && searchTerm) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        setProcessingUserId(userId);
        await deleteUser.mutateAsync(userId);
        toast.success("User deleted successfully");
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error(error.error || "Failed to delete user");
      } finally {
        setProcessingUserId(null);
      }
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      setProcessingUserId(userId);
      await toggleUserStatus.mutateAsync({ userId, status: newStatus });
      toast.success(`User status changed to ${newStatus}`);
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error(error.error || "Failed to change user status");
    } finally {
      setProcessingUserId(null);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({
        userId: selectedUser._id,
        userData: {
          username: selectedUser.username,
          email: selectedUser.email,
          fullname: selectedUser.fullname,
          role: selectedUser.role,
          status: selectedUser.status,
        },
      });
      toast.success("User updated successfully");
      closeModal();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(
        error.response?.data?.error || error.message || "Failed to update user"
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedUser({
      ...selectedUser,
      [name]: value,
    });
  };

  // Hàm để trả về icon cho từng vai trò
  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <FaUserShield className="mr-1" />;
      default:
        return <FaUser className="mr-1" />;
    }
  };

  if (isLoading) {
    return <SkeletonUserManagement />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h3 className="text-lg font-semibold mb-4 md:mb-0 text-[var(--color-text-primary)]">
          User Management
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] w-full md:w-64 bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)]"
          />
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-primary)] opacity-70" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                ID
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Name
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Email
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Role
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Join Date
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
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {user._id.substring(0, 8)}...
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {user.fullname || user.username}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {user.email}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-500/20 text-purple-500"
                          : "bg-slate-500/20 text-slate-500"
                      }`}
                    >
                      {getRoleIcon(user.role)}
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.status === "active"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : user.status === "banned"
                          ? "bg-rose-500/20 text-rose-500"
                          : "bg-amber-500/20 text-amber-500"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-full transition-all cursor-pointer"
                        title="Edit User"
                        disabled={
                          (deleteUser.isPending &&
                            processingUserId === user._id) ||
                          (toggleUserStatus.isPending &&
                            processingUserId === user._id)
                        }
                      >
                        <FaUserEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() =>
                          handleToggleStatus(user._id, user.status)
                        }
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          toggleUserStatus.isPending &&
                          processingUserId === user._id
                            ? "bg-gray-300/20 text-gray-400"
                            : user.status === "active"
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500"
                        }`}
                        title={
                          user.status === "active"
                            ? "Deactivate User"
                            : "Activate User"
                        }
                        disabled={
                          (deleteUser.isPending &&
                            processingUserId === user._id) ||
                          (toggleUserStatus.isPending &&
                            processingUserId === user._id)
                        }
                      >
                        {toggleUserStatus.isPending &&
                        processingUserId === user._id ? (
                          <div className="w-6 h-6 border-2 border-t-transparent border-amber-500 rounded-full animate-spin"></div>
                        ) : user.status === "active" ? (
                          <FaUserLock className="text-lg" />
                        ) : (
                          <FaUserCheck className="text-lg" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className={`p-1.5 rounded-full transition-all cursor-pointer ${
                          deleteUser.isPending && processingUserId === user._id
                            ? "bg-gray-300/20 text-gray-400"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500"
                        }`}
                        title="Delete User"
                        disabled={
                          (deleteUser.isPending &&
                            processingUserId === user._id) ||
                          (toggleUserStatus.isPending &&
                            processingUserId === user._id)
                        }
                      >
                        {deleteUser.isPending &&
                        processingUserId === user._id ? (
                          <div className="w-6 h-6 border-2 border-t-transparent border-rose-500 rounded-full animate-spin"></div>
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
                  colSpan="7"
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

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            {/* Backdrop trong suốt */}
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
                  Edit User
                </h2>
                <button
                  onClick={closeModal}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  disabled={updateUser.isPending}
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

              <form onSubmit={handleSaveUser}>
                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={selectedUser.username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary)]/60 transition-all"
                    placeholder="Enter username"
                    disabled={updateUser.isPending}
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={selectedUser.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary)]/60 transition-all"
                    placeholder="Enter email"
                    disabled={updateUser.isPending}
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="fullname"
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    name="fullname"
                    value={selectedUser.fullname}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] shadow-sm hover:border-[var(--color-primary)]/60 transition-all"
                    placeholder="Enter full name"
                    disabled={updateUser.isPending}
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
                    htmlFor="role"
                  >
                    Role
                  </label>
                  <Select
                    id="role"
                    name="role"
                    value={selectedUser.role}
                    onChange={handleInputChange}
                    options={[
                      { value: "user", label: "User" },
                      { value: "admin", label: "Admin" },
                    ]}
                    disabled={updateUser.isPending}
                  />
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
                    value={selectedUser.status}
                    onChange={handleInputChange}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                      { value: "banned", label: "Banned" },
                    ]}
                    disabled={updateUser.isPending}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="secondary"
                    onClick={closeModal}
                    disabled={updateUser.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={updateUser.isPending}
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

export default UserManagement;
