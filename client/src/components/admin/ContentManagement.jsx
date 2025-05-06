import { useState, useEffect } from "react";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaFlag,
  FaThumbsUp,
  FaComment,
  FaShareAlt,
  FaCircle,
  FaArrowUp,
  FaArrowDown,
  FaUndo,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminPosts,
  useAdminPostMutations,
  ADMIN_QUERY_KEYS,
} from "../../hooks/queries/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import Select from "../ui/Select";
import Button from "../ui/Button";
import { SkeletonContentManagement } from "../skeleton";

const ContentManagement = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingPostId, setProcessingPostId] = useState(null);
  const queryClient = useQueryClient();

  const postsPerPage = 10;

  // Sử dụng React Query để lấy dữ liệu
  const { data: postsData, isLoading } = useAdminPosts(
    currentPage,
    postsPerPage,
    filter
  );

  const posts = postsData?.data || [];
  const totalPages = postsData?.pagination?.totalPages || 1;

  // Sử dụng React Query mutations
  const { updatePostStatus, deletePost, restorePost } = useAdminPostMutations();

  // Thêm useEffect để kiểm tra giá trị status thực tế
  useEffect(() => {
    if (posts.length > 0) {
      console.log(
        "Posts status values:",
        posts.map((post) => ({
          id: post._id,
          status: post.status,
          deleted: post.deleted,
        }))
      );
    }
  }, [posts]);

  useEffect(() => {
    if (currentPage !== 1 && filter) {
      setCurrentPage(1);
    }
  }, [filter]);

  // Thêm useEffect mới để đảm bảo dữ liệu luôn được refresh khi cần
  useEffect(() => {
    // Force refresh data khi có thay đổi
    const queryKey = ADMIN_QUERY_KEYS.postsList({
      page: currentPage,
      limit: postsPerPage,
      status: filter,
    });
    queryClient.invalidateQueries({ queryKey });
  }, [filter, currentPage, postsPerPage, queryClient]);

  // Hàm hiển thị status rõ ràng
  const getStatusDisplay = (status) => {
    console.log(`Status value for display: "${status}"`); // Log để kiểm tra

    switch (status) {
      case "active":
      case "approved":
        return "Approved";
      case "featured":
        return "Featured";
      case "blocked":
        return "Blocked";
      case "deleted":
        return "Deleted";
      case "pending":
        return "Pending";
      default:
        console.warn(`Unknown status: "${status}"`);
        return status || "Unknown"; // Hiển thị giá trị thực thay vì mặc định "Approved"
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleViewPost = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        setProcessingPostId(postId);
        await deletePost.mutateAsync(postId);
        toast.success("Post deleted successfully");

        if (isModalOpen && selectedPost && selectedPost._id === postId) {
          closeModal();
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error(error.response?.data?.error || "Failed to delete post");
      } finally {
        setProcessingPostId(null);
      }
    }
  };

  const handleRestorePost = async (postId) => {
    try {
      setProcessingPostId(postId);
      await restorePost.mutateAsync(postId);
      toast.success("Post restored successfully");

      if (isModalOpen && selectedPost && selectedPost._id === postId) {
        closeModal();
      }
    } catch (error) {
      console.error("Error restoring post:", error);
      toast.error(error.response?.data?.error || "Failed to restore post");
    } finally {
      setProcessingPostId(null);
    }
  };

  const handleUpdatePostStatus = async (postId, status) => {
    try {
      setProcessingPostId(postId);
      console.log(`Attempting to update post ${postId} to status: ${status}`);

      const response = await updatePostStatus.mutateAsync({
        postId,
        status,
      });

      console.log("Update response from server:", response);

      // Cập nhật UI theo response thực từ server
      if (response && response.data) {
        const updatedPost = response.data;
        console.log("Updated post data from server:", updatedPost);

        // Cập nhật post trong modal nếu đang mở
        if (isModalOpen && selectedPost && selectedPost._id === postId) {
          setSelectedPost((prevPost) => ({
            ...prevPost,
            ...updatedPost,
          }));
        }

        // Force refresh data
        queryClient.invalidateQueries({
          queryKey: ADMIN_QUERY_KEYS.postsList({
            page: currentPage,
            limit: postsPerPage,
            status: filter,
          }),
        });
      }

      toast.success(
        `Post ${
          status === "featured"
            ? "featured"
            : status === "blocked"
            ? "blocked"
            : "approved"
        } successfully`
      );

      if (isModalOpen) {
        closeModal();
      }
    } catch (error) {
      console.error("Error updating post status:", error);
      toast.error(
        error.response?.data?.error || "Failed to update post status"
      );
    } finally {
      setProcessingPostId(null);
    }
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (isLoading) {
    return <SkeletonContentManagement />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h3 className="text-lg font-semibold mb-4 md:mb-0 text-[var(--color-text-primary)]">
          Content Management
        </h3>
        <div className="flex space-x-2">
          <div className="relative">
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: "", label: "All Posts" },
                { value: "approved", label: "Approved" },
                { value: "pending", label: "Pending" },
                { value: "featured", label: "Featured" },
                { value: "blocked", label: "Blocked" },
                { value: "deleted", label: "Deleted" },
              ]}
              className="w-52"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Content
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Author
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Engagement
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Views
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Date
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr
                  key={post._id}
                  className="hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-start">
                      {post.image ? (
                        <div className="h-10 w-10 rounded bg-gray-300 mr-3 overflow-hidden flex-shrink-0">
                          <img
                            src={post.image}
                            alt="Post"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://placehold.co/100x100/e0e0e0/9e9e9e?text=N/A";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-300 mr-3 flex-shrink-0 flex items-center justify-center text-[var(--color-text-secondary)]">
                          <FaShareAlt />
                        </div>
                      )}
                      <div className="text-[var(--color-text-primary)]">
                        <p className="font-medium">
                          {truncateText(post.content, 40)}
                        </p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {post.category || "Uncategorized"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-2 flex-shrink-0">
                        {post.author?.fullname
                          ? post.author.fullname.charAt(0).toUpperCase()
                          : post.author?.username
                          ? post.author.username.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                      <span className="text-[var(--color-text-primary)]">
                        {post.author?.fullname ||
                          post.author?.username ||
                          "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-4">
                      <div className="flex items-center text-[var(--color-text-secondary)]">
                        <FaThumbsUp className="mr-1" />
                        <span>{post.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center text-[var(--color-text-secondary)]">
                        <FaComment className="mr-1" />
                        <span>{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center text-[var(--color-text-secondary)]">
                      <FaEye className="mr-1" />
                      <span>{post.views || 0}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--color-text-primary)]">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                        post.status === "active" || post.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : post.status === "featured"
                          ? "bg-purple-500/20 text-purple-500"
                          : post.status === "blocked"
                          ? "bg-red-500/20 text-red-500"
                          : post.status === "deleted"
                          ? "bg-gray-500/20 text-gray-500"
                          : post.status === "pending"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      <FaCircle className="mr-1 text-[0.5rem]" />
                      {getStatusDisplay(post.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewPost(post)}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-full transition-all cursor-pointer"
                        title="View Post"
                      >
                        <FaEye className="text-base" />
                      </button>

                      {post.status !== "featured" &&
                        post.status !== "deleted" && (
                          <button
                            onClick={() =>
                              handleUpdatePostStatus(post._id, "featured")
                            }
                            className={`p-1.5 rounded-full transition-all cursor-pointer ${
                              updatePostStatus.isPending &&
                              processingPostId === post._id
                                ? "bg-gray-300/20 text-gray-400"
                                : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-500"
                            }`}
                            title="Make Featured"
                            disabled={
                              (updatePostStatus.isPending &&
                                processingPostId === post._id) ||
                              (deletePost.isPending &&
                                processingPostId === post._id) ||
                              (restorePost.isPending &&
                                processingPostId === post._id)
                            }
                          >
                            {updatePostStatus.isPending &&
                            processingPostId === post._id ? (
                              <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                            ) : (
                              <FaArrowUp className="text-base" />
                            )}
                          </button>
                        )}

                      {post.status === "featured" && (
                        <button
                          onClick={() =>
                            handleUpdatePostStatus(post._id, "approved")
                          }
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                              ? "bg-gray-300/20 text-gray-400"
                              : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-500"
                          }`}
                          title="Remove from Featured"
                          disabled={
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                          }
                        >
                          {updatePostStatus.isPending &&
                          processingPostId === post._id ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                          ) : (
                            <FaArrowDown className="text-base" />
                          )}
                        </button>
                      )}

                      {post.status !== "blocked" &&
                        post.status !== "deleted" && (
                          <button
                            onClick={() =>
                              handleUpdatePostStatus(post._id, "blocked")
                            }
                            className={`p-1.5 rounded-full transition-all cursor-pointer ${
                              (updatePostStatus.isPending &&
                                processingPostId === post._id) ||
                              (deletePost.isPending &&
                                processingPostId === post._id) ||
                              (restorePost.isPending &&
                                processingPostId === post._id)
                                ? "bg-gray-300/20 text-gray-400"
                                : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-500"
                            }`}
                            title="Block Post"
                            disabled={
                              (updatePostStatus.isPending &&
                                processingPostId === post._id) ||
                              (deletePost.isPending &&
                                processingPostId === post._id) ||
                              (restorePost.isPending &&
                                processingPostId === post._id)
                            }
                          >
                            {updatePostStatus.isPending &&
                            processingPostId === post._id ? (
                              <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                            ) : (
                              <FaFlag className="text-base" />
                            )}
                          </button>
                        )}

                      {post.status === "blocked" && (
                        <button
                          onClick={() =>
                            handleUpdatePostStatus(post._id, "approved")
                          }
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                              ? "bg-gray-300/20 text-gray-400"
                              : "bg-green-500/10 hover:bg-green-500/20 text-green-500"
                          }`}
                          title="Approve Post"
                          disabled={
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                          }
                        >
                          {updatePostStatus.isPending &&
                          processingPostId === post._id ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                          ) : (
                            <FaEdit className="text-base" />
                          )}
                        </button>
                      )}

                      {post.status === "deleted" ? (
                        <button
                          onClick={() => handleRestorePost(post._id)}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                              ? "bg-gray-300/20 text-gray-400"
                              : "bg-green-500/10 hover:bg-green-500/20 text-green-500"
                          }`}
                          title="Restore Post"
                          disabled={
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                          }
                        >
                          {restorePost.isPending &&
                          processingPostId === post._id ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                          ) : (
                            <FaUndo className="text-base" />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className={`p-1.5 rounded-full transition-all cursor-pointer ${
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                              ? "bg-gray-300/20 text-gray-400"
                              : "bg-red-500/10 hover:bg-red-500/20 text-red-500"
                          }`}
                          title="Delete Post"
                          disabled={
                            (updatePostStatus.isPending &&
                              processingPostId === post._id) ||
                            (deletePost.isPending &&
                              processingPostId === post._id) ||
                            (restorePost.isPending &&
                              processingPostId === post._id)
                          }
                        >
                          {deletePost.isPending &&
                          processingPostId === post._id ? (
                            <div className="w-5 h-5 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></div>
                          ) : (
                            <FaTrash className="text-base" />
                          )}
                        </button>
                      )}
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
                  No posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex items-center justify-center space-x-2">
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

      {/* Post Detail Modal */}
      {isModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <div
              className="fixed inset-0 backdrop-blur-[1.5px] bg-[rgba(0,0,0,0.15)] transition-opacity"
              onClick={closeModal}
            ></div>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] rounded-lg shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  Post Details
                </h3>
                <button
                  onClick={closeModal}
                  className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
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

              <div className="bg-[var(--color-bg-primary)] p-4 rounded-lg mb-4 border border-[var(--color-border)]">
                <div className="flex items-start mb-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white mr-3 flex-shrink-0">
                    {selectedPost.author?.fullname
                      ? selectedPost.author.fullname.charAt(0).toUpperCase()
                      : selectedPost.author?.username
                      ? selectedPost.author.username.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {selectedPost.author?.fullname ||
                        selectedPost.author?.username ||
                        "Unknown"}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Posted on{" "}
                      {new Date(selectedPost.createdAt).toLocaleDateString()} at{" "}
                      {new Date(selectedPost.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="text-[var(--color-text-primary)] mb-3">
                  {selectedPost.content}
                </div>

                {selectedPost.image && (
                  <img
                    src={selectedPost.image}
                    alt="Post content"
                    className="rounded-lg w-full h-auto max-h-72 object-contain my-3 bg-[var(--color-bg-tertiary)]"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/600x400/e0e0e0/9e9e9e?text=Image+Not+Available";
                    }}
                  />
                )}

                <div className="flex justify-between items-center mt-4 text-[var(--color-text-secondary)] text-sm">
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <FaThumbsUp className="mr-1" />
                      <span>{selectedPost.likes?.length || 0} likes</span>
                    </div>
                    <div className="flex items-center">
                      <FaComment className="mr-1" />
                      <span>{selectedPost.comments?.length || 0} comments</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                        selectedPost.status === "active" ||
                        selectedPost.status === "approved"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : selectedPost.status === "featured"
                          ? "bg-purple-500/20 text-purple-500"
                          : selectedPost.status === "blocked"
                          ? "bg-red-500/20 text-red-500"
                          : selectedPost.status === "deleted"
                          ? "bg-gray-500/20 text-gray-500"
                          : selectedPost.status === "pending"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-blue-500/20 text-blue-500"
                      }`}
                    >
                      <FaCircle className="mr-1 text-[0.5rem]" />
                      {getStatusDisplay(selectedPost.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 justify-end">
                <Button
                  onClick={closeModal}
                  variant="secondary"
                  disabled={
                    (updatePostStatus.isPending &&
                      processingPostId === selectedPost._id) ||
                    (deletePost.isPending &&
                      processingPostId === selectedPost._id) ||
                    (restorePost.isPending &&
                      processingPostId === selectedPost._id)
                  }
                >
                  Close
                </Button>

                {selectedPost.status !== "deleted" && (
                  <Button
                    onClick={() => handleDeletePost(selectedPost._id)}
                    variant="danger"
                    disabled={
                      (updatePostStatus.isPending &&
                        processingPostId === selectedPost._id) ||
                      (deletePost.isPending &&
                        processingPostId === selectedPost._id) ||
                      (restorePost.isPending &&
                        processingPostId === selectedPost._id)
                    }
                  >
                    {deletePost.isPending &&
                    processingPostId === selectedPost._id ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        Deleting...
                      </span>
                    ) : (
                      "Delete Post"
                    )}
                  </Button>
                )}

                {selectedPost.status === "deleted" && (
                  <Button
                    onClick={() => handleRestorePost(selectedPost._id)}
                    variant="success"
                    disabled={
                      (updatePostStatus.isPending &&
                        processingPostId === selectedPost._id) ||
                      (deletePost.isPending &&
                        processingPostId === selectedPost._id) ||
                      (restorePost.isPending &&
                        processingPostId === selectedPost._id)
                    }
                  >
                    {restorePost.isPending &&
                    processingPostId === selectedPost._id ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        Restoring...
                      </span>
                    ) : (
                      "Restore Post"
                    )}
                  </Button>
                )}

                {selectedPost.status !== "blocked" &&
                  selectedPost.status !== "deleted" && (
                    <Button
                      onClick={() =>
                        handleUpdatePostStatus(selectedPost._id, "blocked")
                      }
                      variant="warning"
                      disabled={
                        (updatePostStatus.isPending &&
                          processingPostId === selectedPost._id) ||
                        (deletePost.isPending &&
                          processingPostId === selectedPost._id) ||
                        (restorePost.isPending &&
                          processingPostId === selectedPost._id)
                      }
                    >
                      {updatePostStatus.isPending &&
                      processingPostId === selectedPost._id ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          Blocking...
                        </span>
                      ) : (
                        "Block Post"
                      )}
                    </Button>
                  )}

                {selectedPost.status === "blocked" && (
                  <Button
                    onClick={() =>
                      handleUpdatePostStatus(selectedPost._id, "approved")
                    }
                    variant="success"
                    disabled={
                      (updatePostStatus.isPending &&
                        processingPostId === selectedPost._id) ||
                      (deletePost.isPending &&
                        processingPostId === selectedPost._id) ||
                      (restorePost.isPending &&
                        processingPostId === selectedPost._id)
                    }
                  >
                    {updatePostStatus.isPending &&
                    processingPostId === selectedPost._id ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        Approving...
                      </span>
                    ) : (
                      "Approve Post"
                    )}
                  </Button>
                )}

                {selectedPost.status !== "featured" &&
                  selectedPost.status !== "deleted" &&
                  selectedPost.status !== "blocked" && (
                    <Button
                      onClick={() =>
                        handleUpdatePostStatus(selectedPost._id, "featured")
                      }
                      variant="primary"
                      disabled={
                        (updatePostStatus.isPending &&
                          processingPostId === selectedPost._id) ||
                        (deletePost.isPending &&
                          processingPostId === selectedPost._id) ||
                        (restorePost.isPending &&
                          processingPostId === selectedPost._id)
                      }
                    >
                      {updatePostStatus.isPending &&
                      processingPostId === selectedPost._id ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          Featuring...
                        </span>
                      ) : (
                        "Feature Post"
                      )}
                    </Button>
                  )}

                {selectedPost.status === "featured" && (
                  <Button
                    onClick={() =>
                      handleUpdatePostStatus(selectedPost._id, "approved")
                    }
                    variant="primary"
                    disabled={
                      (updatePostStatus.isPending &&
                        processingPostId === selectedPost._id) ||
                      (deletePost.isPending &&
                        processingPostId === selectedPost._id) ||
                      (restorePost.isPending &&
                        processingPostId === selectedPost._id)
                    }
                  >
                    {updatePostStatus.isPending &&
                    processingPostId === selectedPost._id ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        Removing...
                      </span>
                    ) : (
                      "Remove Feature"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;
