import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  FaUserEdit,
  FaTrash,
  FaUserLock,
  FaUserCheck,
  FaChevronLeft,
  FaChevronRight,
  FaCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminUsers,
  useAdminUserMutations,
  ADMIN_QUERY_KEYS,
} from "../../hooks/queries/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../ui/Button";
import { adminService } from "../../services/adminService";
import { SkeletonUserManagement } from "../../components/skeleton";
import AdvancedSearch from "./AdvancedSearch";

const UserManagement = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingUserId, setProcessingUserId] = useState(null);
  const usersPerPage = 10;
  const queryClient = useQueryClient();

  // Sử dụng React Query hook để lấy dữ liệu người dùng
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

  // Sử dụng React Query mutations
  const { updateUser, deleteUser, toggleUserStatus } = useAdminUserMutations();

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
    searchTerm,
    searchField,
    usersPerPage,
    totalPages,
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

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm(t("admin.users.confirmBan"))) {
      try {
        setProcessingUserId(userId);
        await deleteUser.mutateAsync(userId);
        toast.success(t("admin.users.userDeleted"));
      } catch (error) {
        console.error("Error deleting user:", error);
        toast.error(error.error || t("admin.users.deleteError"));
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
      toast.success(t("admin.users.statusChanged", { status: newStatus }));
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error(error.error || t("admin.users.statusError"));
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
      toast.success(t("admin.users.updateSuccess"));
      closeModal();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(
        error.response?.data?.error ||
          error.message ||
          t("admin.users.updateError")
      );
    }
  };

  if (isLoading) {
    return <SkeletonUserManagement />;
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md p-5 overflow-hidden">
      {/* Header with Advanced Search */}
      <div className="flex flex-col mb-6 space-y-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("admin.userManagement")}
        </h2>

        <AdvancedSearch
          fields={[
            { value: "all", label: t("admin.searchFields.all") },
            { value: "name", label: t("admin.searchFields.name") },
            { value: "email", label: t("admin.searchFields.email") },
            { value: "username", label: t("admin.searchFields.username") },
            { value: "role", label: t("admin.searchFields.role") },
            { value: "status", label: t("admin.searchFields.status") },
          ]}
          onSearch={handleAdvancedSearch}
          loading={isLoading}
        />
      </div>

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[var(--color-bg-secondary)] rounded-lg overflow-hidden">
          <thead className="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]">
            <tr>
              <th className="py-3 px-4 text-left">{t("admin.users.name")}</th>
              <th className="py-3 px-4 text-left">{t("admin.users.email")}</th>
              <th className="py-3 px-4 text-left">{t("admin.users.role")}</th>
              <th className="py-3 px-4 text-left">{t("admin.users.status")}</th>
              <th className="py-3 px-4 text-left">
                {t("admin.users.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr
                  key={user._id}
                  className="hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <td className="py-3 px-4 text-[var(--color-text-primary)]">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center mr-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.fullname}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span>
                            {user.fullname
                              ? user.fullname.charAt(0).toUpperCase()
                              : "U"}
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {user.fullname || user.username || "User"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--color-text-primary)]">
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center text-xs whitespace-nowrap ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-500"
                            : "bg-blue-500/20 text-blue-500"
                        } px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full`}
                      >
                        <FaCircle className="mr-1 text-[0.5rem]" />
                        {user.role === "admin"
                          ? t("admin.users.admin")
                          : t("admin.users.user")}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center text-xs whitespace-nowrap ${
                        user.status === "active"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : "bg-red-500/20 text-red-500"
                      } px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full`}
                    >
                      <FaCircle className="mr-1 text-[0.5rem]" />
                      {user.status === "active"
                        ? t("admin.users.active")
                        : t("admin.users.inactive")}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded"
                        title={t("admin.users.edit")}
                      >
                        <FaUserEdit />
                      </button>
                      <button
                        onClick={() =>
                          handleToggleStatus(user._id, user.status)
                        }
                        className="p-1 text-yellow-500 hover:bg-[var(--color-bg-hover)] rounded"
                        disabled={processingUserId === user._id}
                        title={
                          user.status === "active"
                            ? t("admin.users.deactivate")
                            : t("admin.users.activate")
                        }
                      >
                        {user.status === "active" ? (
                          <FaUserLock />
                        ) : (
                          <FaUserCheck />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user._id)}
                        className="p-1 text-red-500 hover:bg-[var(--color-bg-hover)] rounded"
                        disabled={processingUserId === user._id}
                        title={t("admin.users.delete")}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="5"
                  className="py-4 px-4 text-center text-[var(--color-text-secondary)]"
                >
                  {t("admin.users.noUsers")}
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

            <div className="flex space-x-1">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
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

      {/* User Edit Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div
              className="fixed inset-0 bg-[rgba(0,0,0,0.4)] transition-opacity"
              onClick={closeModal}
            ></div>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] border border-[var(--color-border)] shadow-xl rounded-lg relative z-50">
              <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-4 mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {t("admin.users.editUser")}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveUser}>
                <div className="mb-4">
                  <label
                    className="block text-[var(--color-text-secondary)] mb-2"
                    htmlFor="fullname"
                  >
                    {t("admin.users.fullName")}
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    value={selectedUser.fullname || ""}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        fullname: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-[var(--color-text-secondary)] mb-2"
                    htmlFor="email"
                  >
                    {t("admin.users.email")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={selectedUser.email}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        email: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  />
                </div>

                <div className="mb-4">
                  <label
                    className="block text-[var(--color-text-secondary)] mb-2"
                    htmlFor="role"
                  >
                    {t("admin.users.role")}
                  </label>
                  <select
                    id="role"
                    value={selectedUser.role || "user"}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        role: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  >
                    <option value="user">{t("admin.users.user")}</option>
                    <option value="admin">{t("admin.users.admin")}</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label
                    className="block text-[var(--color-text-secondary)] mb-2"
                    htmlFor="status"
                  >
                    {t("admin.users.status")}
                  </label>
                  <select
                    id="status"
                    value={selectedUser.status || "active"}
                    onChange={(e) =>
                      setSelectedUser({
                        ...selectedUser,
                        status: e.target.value,
                      })
                    }
                    className="w-full p-2 border border-[var(--color-border)] rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  >
                    <option value="active">{t("admin.users.active")}</option>
                    <option value="inactive">
                      {t("admin.users.inactive")}
                    </option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="px-4 py-2"
                  >
                    {t("admin.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-4 py-2"
                    disabled={updateUser.isLoading}
                  >
                    {updateUser.isLoading ? t("admin.saving") : t("admin.save")}
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
