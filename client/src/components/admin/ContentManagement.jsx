import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  FaClone,
  FaLayerGroup,
  FaSearch,
} from "react-icons/fa";
import { toast } from "react-toastify";
import {
  useAdminPosts,
  useAdminPostMutations,
  ADMIN_QUERY_KEYS,
} from "../../hooks/queries/useAdminQueries";
import { useQueryClient } from "@tanstack/react-query";
import Button from "../ui/Button";
import { SkeletonContentManagement } from "../skeleton";
import { adminService } from "../../services/adminService";
import AdvancedSearch from "./AdvancedSearch";

const ContentManagement = () => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingPostId, setProcessingPostId] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState(null);
  const queryClient = useQueryClient();

  // State để theo dõi trạng thái phân tích
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDuplicateAnalyzing, setIsDuplicateAnalyzing] = useState(false);

  // State để hiển thị và theo dõi các bài viết có nội dung vi phạm
  const [offensivePostsVisible, setOffensivePostsVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  // State để hiển thị kết quả phân tích bài viết trùng lặp
  const [duplicateAnalysisResult, setDuplicateAnalysisResult] = useState(null);

  // State để lưu danh sách bài viết vi phạm
  const [offensivePosts, setOffensivePosts] = useState([]);
  const [offensivePostsPagination, setOffensivePostsPagination] =
    useState(null);
  const [loadingOffensivePosts, setLoadingOffensivePosts] = useState(false);
  // State để lưu danh sách các nhóm bài viết trùng lặp
  const [duplicateGroups, setDuplicateGroups] = useState([]);

  const postsPerPage = 10;

  // Sử dụng React Query để lấy dữ liệu
  const {
    data: postsData,
    isLoading,
    refetch,
  } = useAdminPosts(
    currentPage,
    postsPerPage,
    searchField === "status" ? searchTerm : "",
    searchField !== "status"
      ? {
          field: searchField,
          term: searchTerm,
          findDuplicates: showDuplicates,
        }
      : {
          findDuplicates: showDuplicates,
        }
  );

  // Các danh sách và dữ liệu phân trang
  const rawPosts = postsData?.data || [];
  const totalPages = offensivePostsVisible
    ? offensivePostsPagination?.totalPages || 1
    : showDuplicates && selectedDuplicateGroup
    ? Math.ceil(
        duplicateGroups[selectedDuplicateGroup - 1]?.postIds.length /
          postsPerPage
      ) || 1
    : postsData?.pagination?.totalPages || 1;

  // Lọc các bài viết theo nhóm trùng lặp
  const displayedPosts = useMemo(() => {
    // Nếu đang hiển thị bài viết vi phạm, trả về danh sách bài viết vi phạm
    if (offensivePostsVisible) {
      return offensivePosts;
    }

    // Nếu không hiển thị bài viết trùng lặp, trả về tất cả bài viết
    if (!showDuplicates) {
      return rawPosts;
    }

    // Nếu có nhóm trùng lặp được chọn, lọc bài viết theo nhóm đó
    if (showDuplicates && selectedDuplicateGroup) {
      console.log(
        "Filtering posts for duplicate group:",
        selectedDuplicateGroup
      );
      console.log("Duplicate groups:", duplicateGroups);
      console.log(
        "Selected group:",
        duplicateGroups[selectedDuplicateGroup - 1]
      );
      console.log("Raw posts count:", rawPosts.length);

      if (!duplicateGroups[selectedDuplicateGroup - 1]) {
        console.error("Invalid duplicate group selected");
        return [];
      }

      const targetPostIds = duplicateGroups[selectedDuplicateGroup - 1].postIds;
      console.log("Target post IDs:", targetPostIds);

      // Filter posts that match IDs in the selected group
      const filtered = rawPosts.filter((post) =>
        targetPostIds.includes(post._id)
      );

      console.log("Filtered posts count:", filtered.length);
      return filtered;
    }

    return rawPosts;
  }, [
    rawPosts,
    offensivePosts,
    offensivePostsVisible,
    showDuplicates,
    selectedDuplicateGroup,
    duplicateGroups,
  ]);

  // Xử lý tìm kiếm nâng cao
  const handleAdvancedSearch = ({ field, term }) => {
    setSearchField(field);
    setSearchTerm(term);
    setSelectedDuplicateGroup(null);
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      refetch();
    }
  };

  // Xử lý quay lại từ chế độ xem trùng lặp
  const handleExitDuplicatesView = () => {
    setShowDuplicates(false);
    setSelectedDuplicateGroup(null);
    setCurrentPage(1);
    setTimeout(() => {
      refetch(); // Làm mới dữ liệu khi thoát chế độ xem trùng lặp
    }, 0);
  };

  // Sử dụng React Query mutations
  const { updatePostStatus, deletePost, restorePost } = useAdminPostMutations();

  // Function to refresh data
  const refreshData = () => {
    // Invalidate tất cả các queries liên quan đến posts thay vì chỉ invalidate một query cụ thể
    queryClient.invalidateQueries({
      queryKey: ADMIN_QUERY_KEYS.posts(),
    });
  };

  // Thêm useEffect mới để prefetch dữ liệu trang kế tiếp
  useEffect(() => {
    // Prefetch dữ liệu trang tiếp theo để tăng tốc độ chuyển trang
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ADMIN_QUERY_KEYS.postsList({
          page: nextPage,
          limit: postsPerPage,
          status: searchField === "status" ? searchTerm : "",
          search: {
            field: searchField,
            term: searchTerm,
            findDuplicates: showDuplicates,
          },
        }),
        queryFn: async () => {
          // Make sure to use the current state value when creating the request
          const currentShowDuplicates = showDuplicates;
          console.log(
            `Prefetching page ${nextPage} with findDuplicates=${currentShowDuplicates}`
          );

          return await adminService.getAllPosts(
            nextPage,
            postsPerPage,
            searchField === "status" ? searchTerm : "",
            {
              field: searchField,
              term: searchTerm,
              findDuplicates: currentShowDuplicates,
            }
          );
        },
      });
    }
  }, [
    currentPage,
    searchField,
    searchTerm,
    showDuplicates,
    postsPerPage,
    totalPages,
    queryClient,
  ]);

  const handleSelectDuplicateGroup = (groupIndex) => {
    setSelectedDuplicateGroup(
      groupIndex === selectedDuplicateGroup ? null : groupIndex
    );
  };

  // Hàm hiển thị status rõ ràng
  const getStatusDisplay = (status) => {
    return t(`admin.status.${status}`) || status;
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      if (offensivePostsVisible) {
        handleOffensivePageChange(pageNumber);
      } else {
        setCurrentPage(pageNumber);
        setSelectedDuplicateGroup(null);

        // Tải trước dữ liệu trang kế tiếp khi người dùng chuyển trang
        if (pageNumber < totalPages) {
          // Capture current state value to ensure consistency
          const currentShowDuplicates = showDuplicates;

          queryClient.prefetchQuery({
            queryKey: ADMIN_QUERY_KEYS.postsList({
              page: pageNumber + 1,
              limit: postsPerPage,
              status: searchField === "status" ? searchTerm : "",
              search: {
                field: searchField,
                term: searchTerm,
                findDuplicates: currentShowDuplicates,
              },
            }),
            queryFn: async () => {
              console.log(
                `Page change prefetching with findDuplicates=${currentShowDuplicates}`
              );

              return await adminService.getAllPosts(
                pageNumber + 1,
                postsPerPage,
                searchField === "status" ? searchTerm : "",
                {
                  field: searchField,
                  term: searchTerm,
                  findDuplicates: currentShowDuplicates,
                }
              );
            },
          });
        }
      }
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
    if (window.confirm(t("admin.contentManagement.confirmDelete"))) {
      try {
        setProcessingPostId(postId);
        await deletePost.mutateAsync(postId);
        toast.success(t("admin.contentManagement.toast.deleteSuccess"));
        refreshData();

        if (isModalOpen && selectedPost && selectedPost._id === postId) {
          closeModal();
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error(
          error.response?.data?.error ||
            t("admin.contentManagement.toast.deleteError")
        );
      } finally {
        setProcessingPostId(null);
      }
    }
  };

  const handleRestorePost = async (postId) => {
    try {
      setProcessingPostId(postId);
      await restorePost.mutateAsync(postId);
      toast.success(t("admin.contentManagement.toast.restoreSuccess"));
      refreshData();

      if (isModalOpen && selectedPost && selectedPost._id === postId) {
        closeModal();
      }
    } catch (error) {
      console.error("Error restoring post:", error);
      toast.error(
        error.response?.data?.error ||
          t("admin.contentManagement.toast.restoreError")
      );
    } finally {
      setProcessingPostId(null);
    }
  };

  const handleUpdatePostStatus = async (postId, status) => {
    try {
      setProcessingPostId(postId);
      // Không cần truy cập dữ liệu từ response vì optimistic updates đã cập nhật dữ liệu UI
      await updatePostStatus.mutateAsync({
        postId,
        status,
      });

      // Cập nhật post trong modal nếu đang mở
      if (isModalOpen && selectedPost && selectedPost._id === postId) {
        setSelectedPost({
          ...selectedPost,
          status,
        });
      }

      toast.success(
        status === "featured"
          ? t("admin.contentManagement.toast.featured")
          : status === "blocked"
          ? t("admin.contentManagement.toast.blocked")
          : t("admin.contentManagement.toast.approved")
      );
    } catch (error) {
      console.error("Error updating post status:", error);
      toast.error(
        error.response?.data?.error ||
          t("admin.contentManagement.toast.statusError")
      );
    } finally {
      setProcessingPostId(null);
    }
  };

  // Xử lý chặn tất cả bài viết trong nhóm
  const handleBlockAllInGroup = async (groupIndex) => {
    try {
      if (!duplicateGroups[groupIndex - 1]) return;

      const postIds = duplicateGroups[groupIndex - 1].postIds;
      if (!postIds.length) return;

      // Hiển thị confirm dialog
      if (
        !window.confirm(t("admin.contentManagement.confirmBlockDuplicates"))
      ) {
        return;
      }

      // Tạo promise array để xử lý song song
      const blockPromises = postIds.map((postId) =>
        updatePostStatus.mutateAsync({ postId, status: "blocked" })
      );

      // Chờ tất cả hoàn thành
      await Promise.all(blockPromises);

      toast.success(t("admin.contentManagement.toast.duplicatesBlocked"));
      refreshData();

      // Reset selected group nếu đang chọn
      if (selectedDuplicateGroup === groupIndex) {
        setSelectedDuplicateGroup(null);
      }
    } catch (error) {
      console.error("Error blocking duplicate posts:", error);
      toast.error(t("admin.contentManagement.toast.blockDuplicatesError"));
    }
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  // Hàm hiển thị các bài viết vi phạm
  const handleViewOffensivePosts = async () => {
    try {
      setLoadingOffensivePosts(true);
      setOffensivePostsVisible(true);
      setCurrentPage(1);
      setSelectedDuplicateGroup(null);

      // Gọi API trực tiếp để lấy danh sách bài viết vi phạm
      const result = await adminService.getOffensivePosts(1, postsPerPage);

      if (result && result.success) {
        setOffensivePosts(result.data || []);
        setOffensivePostsPagination(result.pagination);
      } else {
        toast.error("Không thể lấy danh sách bài viết vi phạm");
        setOffensivePostsVisible(false);
      }
    } catch (error) {
      console.error("Error fetching offensive posts:", error);
      toast.error(
        "Lỗi khi tải bài viết vi phạm: " + (error.message || "Unknown error")
      );
      setOffensivePostsVisible(false);
    } finally {
      setLoadingOffensivePosts(false);
    }
  };

  // Thêm hàm xử lý chuyển trang cho bài viết vi phạm
  const handleOffensivePageChange = async (pageNumber) => {
    try {
      if (
        pageNumber <= 0 ||
        pageNumber > (offensivePostsPagination?.totalPages || 1)
      ) {
        return;
      }

      setLoadingOffensivePosts(true);
      setCurrentPage(pageNumber);

      const result = await adminService.getOffensivePosts(
        pageNumber,
        postsPerPage
      );

      if (result && result.success) {
        setOffensivePosts(result.data || []);
        setOffensivePostsPagination(result.pagination);
      } else {
        toast.error("Không thể tải trang bài viết vi phạm");
      }
    } catch (error) {
      console.error("Error changing offensive posts page:", error);
      toast.error(
        "Lỗi khi chuyển trang: " + (error.message || "Unknown error")
      );
    } finally {
      setLoadingOffensivePosts(false);
    }
  };

  // Quay lại chế độ xem tất cả bài viết
  const handleBackToAllPosts = () => {
    setOffensivePostsVisible(false);
    setOffensivePosts([]);
    setSearchField("all");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Hàm phân tích tất cả nội dung nhạy cảm
  const handleAnalyzeAllContent = async () => {
    if (!window.confirm(t("admin.contentManagement.confirmAnalyzeAll"))) {
      return;
    }

    try {
      setIsAnalyzing(true);
      setOffensivePostsVisible(false);
      setAnalysisResult(null);
      console.log("Starting content analysis for all posts...");

      try {
        const result = await adminService.analyzeAllPostsContent();
        console.log("Analysis result:", result);

        if (!result || !result.success) {
          const errorMsg = result?.error || "Failed to analyze content";
          console.error("Analysis failed:", errorMsg);
          toast.error(errorMsg);
          return;
        }

        // Nếu không có bài viết nào để phân tích
        if (result.stats.totalPosts === 0) {
          toast.info("No posts found for analysis.");
          return;
        }

        // Lưu kết quả phân tích để hiển thị nút
        setAnalysisResult(result.stats);

        // Hiển thị thống kê chi tiết
        toast.success(
          t("admin.contentManagement.toast.analyzeSuccess", {
            total: result.stats.totalPosts,
            offensive: result.stats.offensivePosts,
          })
        );

        // Nếu có lỗi trong quá trình phân tích bài viết riêng lẻ
        if (result.stats.errorCount > 0) {
          toast.warning(
            `${result.stats.errorCount} posts could not be analyzed due to errors.`
          );
        }

        // Làm mới dữ liệu sau khi phân tích
        refreshData();
      } catch (apiError) {
        console.error("API call failed:", apiError);

        // Hiển thị thông báo lỗi cụ thể hơn
        const errorMsg =
          apiError.response?.data?.error ||
          apiError.message ||
          t("admin.contentManagement.toast.analyzeError");

        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Fatal error in analyze content handler:", error);
      toast.error("A critical error occurred while analyzing content");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Hàm phân tích bài viết trùng lặp
  const handleAnalyzeDuplicates = async () => {
    if (
      !window.confirm(t("admin.contentManagement.confirmAnalyzeDuplicates"))
    ) {
      return;
    }

    try {
      setIsDuplicateAnalyzing(true);
      console.log("Starting duplicate content analysis...");

      try {
        const result = await adminService.analyzeDuplicateContent();
        console.log("Duplicate analysis result:", result);

        if (!result || !result.success) {
          const errorMsg =
            result?.error || "Failed to analyze duplicate content";
          console.error("Duplicate analysis failed:", errorMsg);
          toast.error(errorMsg);
          return;
        }

        // Nếu không có bài viết nào để phân tích
        if (result.stats.validPosts === 0) {
          toast.info("No valid posts found for duplicate analysis.");
          return;
        }

        // Lưu kết quả phân tích trùng lặp để hiển thị
        setDuplicateAnalysisResult(result.stats);

        // Lưu danh sách duplicateGroups từ kết quả API
        if (result.duplicateGroups && result.duplicateGroups.length > 0) {
          setDuplicateGroups(result.duplicateGroups);
        }

        // Hiển thị thống kê chi tiết
        toast.success(
          t("admin.contentManagement.toast.analyzeDuplicateSuccess", {
            total: result.stats.validPosts,
            duplicates: result.stats.duplicatePosts,
            groups: result.stats.duplicateGroups,
          })
        );

        // Làm mới dữ liệu sau khi phân tích
        refreshData();
      } catch (apiError) {
        console.error("API call failed:", apiError);

        // Hiển thị thông báo lỗi cụ thể hơn
        const errorMsg =
          apiError.response?.data?.error ||
          apiError.message ||
          t("admin.contentManagement.toast.analyzeDuplicateError");

        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Fatal error in analyze duplicates handler:", error);
      toast.error(
        "A critical error occurred while analyzing duplicate content"
      );
    } finally {
      setIsDuplicateAnalyzing(false);
    }
  };

  // Hàm xem danh sách bài viết trùng lặp
  const handleViewDuplicatePosts = () => {
    setShowDuplicates(true);
    // Chọn nhóm đầu tiên để hiển thị
    setSelectedDuplicateGroup(1);
    setCurrentPage(1);

    // Làm mới dữ liệu và lấy thông tin chi tiết về các bài viết trong nhóm trùng lặp
    setTimeout(() => {
      refetch();
    }, 0);
  };

  if (isLoading) {
    return <SkeletonContentManagement />;
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-md p-5 overflow-hidden">
      {/* Header with search */}
      <div className="flex flex-col mb-6 space-y-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {t("admin.contentManagement.title")}
        </h2>

        <div className="flex flex-col space-y-3">
          {!offensivePostsVisible && !showDuplicates ? (
            <AdvancedSearch
              fields={[
                { value: "all", label: t("admin.searchFields.all") },
                { value: "content", label: t("admin.searchFields.content") },
                { value: "author", label: t("admin.searchFields.author") },
                { value: "date", label: t("admin.searchFields.date") },
                { value: "status", label: t("admin.searchFields.status") },
                {
                  value: "offensiveContent",
                  label: "Nội dung vi phạm",
                  hidden: true,
                },
              ]}
              onSearch={handleAdvancedSearch}
              loading={isLoading}
            />
          ) : offensivePostsVisible ? (
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-amber-600">
                Danh sách bài viết có nội dung vi phạm
                {offensivePostsPagination &&
                  ` (${offensivePostsPagination.totalPosts} bài viết)`}
              </h3>
              <button
                onClick={handleBackToAllPosts}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
              >
                <FaChevronLeft />
                <span>Quay lại tất cả bài viết</span>
              </button>
            </div>
          ) : showDuplicates ? (
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-red-600">
                Danh sách bài viết trùng lặp
                {duplicateAnalysisResult &&
                  ` (${duplicateAnalysisResult.duplicateGroups} nhóm trùng lặp)`}
              </h3>
              <button
                onClick={handleExitDuplicatesView}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
              >
                <FaChevronLeft />
                <span>Quay lại tất cả bài viết</span>
              </button>
            </div>
          ) : null}

          <div className="flex justify-between items-center flex-wrap gap-2">
            {/* Nút hiển thị kết quả phân tích bài viết trùng lặp và nội dung vi phạm */}
            {!offensivePostsVisible && !showDuplicates && (
              <div className="flex items-center gap-2">
                {/* Nút phân tích lại tất cả nội dung */}
                <button
                  onClick={handleAnalyzeAllContent}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-blue-500 text-white hover:bg-blue-600"
                  title={t("admin.contentManagement.analyzeAllContent")}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      <span>{t("admin.contentManagement.analyzing")}</span>
                    </>
                  ) : (
                    <>
                      <FaSearch className="text-white" />
                      <span>
                        {t("admin.contentManagement.analyzeAllContent")}
                      </span>
                    </>
                  )}
                </button>

                {/* Nút phân tích bài viết trùng lặp */}
                <button
                  onClick={handleAnalyzeDuplicates}
                  disabled={isDuplicateAnalyzing}
                  className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-purple-500 text-white hover:bg-purple-600"
                  title={t("admin.contentManagement.analyzeDuplicateContent")}
                >
                  {isDuplicateAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                      <span>
                        {t("admin.contentManagement.analyzingDuplicates")}
                      </span>
                    </>
                  ) : (
                    <>
                      <FaClone className="text-white" />
                      <span>
                        {t("admin.contentManagement.analyzeDuplicateContent")}
                      </span>
                    </>
                  )}
                </button>

                {/* Nút xem danh sách bài viết trùng lặp */}
                {duplicateAnalysisResult &&
                  duplicateAnalysisResult.duplicateGroups > 0 && (
                    <button
                      onClick={handleViewDuplicatePosts}
                      className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-lg border transition-all 
                      bg-red-500 text-white hover:bg-red-600`}
                      title="Xem danh sách bài viết trùng lặp"
                    >
                      <FaClone className="text-white" />
                      <span>
                        Xem {duplicateAnalysisResult.duplicateGroups} nhóm trùng
                        lặp
                      </span>
                    </button>
                  )}

                {/* Nút hiển thị kết quả phân tích bài viết vi phạm */}
                {analysisResult && analysisResult.offensivePosts > 0 && (
                  <button
                    onClick={handleViewOffensivePosts}
                    disabled={loadingOffensivePosts}
                    className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg border transition-all bg-amber-500 text-white hover:bg-amber-600"
                    title="Xem danh sách bài viết vi phạm"
                  >
                    {loadingOffensivePosts ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        <span>Đang tải bài viết vi phạm...</span>
                      </>
                    ) : (
                      <>
                        <FaFlag className="text-white" />
                        <span>
                          Xem {analysisResult.offensivePosts} bài vi phạm
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Thống kê số lượng nhóm trùng lặp */}
            {!offensivePostsVisible &&
              showDuplicates &&
              duplicateGroups.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-[var(--color-text-secondary)]">
                    <span className="font-medium text-red-500">
                      {duplicateGroups.length}
                    </span>{" "}
                    {t("admin.contentManagement.duplicateGroupsFound")}
                  </div>
                </div>
              )}
          </div>

          {/* Hiển thị các nhóm bài viết trùng lặp */}
          {!offensivePostsVisible &&
            showDuplicates &&
            duplicateGroups.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                <div className="w-full mb-1 text-sm font-medium text-[var(--color-text-primary)]">
                  {t("admin.contentManagement.selectDuplicateGroup")}:
                </div>
                {duplicateGroups.map((group, index) => (
                  <div key={`group-${index}`} className="flex">
                    <button
                      onClick={() => handleSelectDuplicateGroup(index + 1)}
                      className={`flex items-center gap-1 px-3 py-1 text-xs rounded-l-md ${
                        selectedDuplicateGroup === index + 1
                          ? "bg-red-500 text-white"
                          : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                      }`}
                    >
                      <FaLayerGroup className="mr-1" />
                      {t("admin.contentManagement.group")} {index + 1}
                      <span className="ml-1 bg-[rgba(255,255,255,0.2)] text-white px-1 rounded">
                        {group.postIds.length}
                      </span>
                    </button>
                    <button
                      onClick={() => handleBlockAllInGroup(index + 1)}
                      className="bg-amber-500 text-white text-xs px-2 rounded-r-md hover:bg-amber-600"
                      title={t("admin.contentManagement.blockAllInGroup")}
                    >
                      <FaFlag />
                    </button>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl shadow-sm">
        <table className="min-w-full border rounded-lg bg-[var(--color-bg-secondary)] border-[var(--color-border)]">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.content")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.author")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.stats")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.date")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.status")}
              </th>
              <th className="py-3 px-4 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                {t("admin.contentManagement.table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {displayedPosts.length > 0 ? (
              displayedPosts.map((post) => (
                <tr
                  key={post._id}
                  className={`hover:bg-[var(--color-bg-hover)] transition-colors ${
                    offensivePostsVisible
                      ? "bg-red-50/70 dark:bg-red-900/10"
                      : showDuplicates &&
                        selectedDuplicateGroup &&
                        duplicateGroups[
                          selectedDuplicateGroup - 1
                        ]?.postIds.includes(post._id)
                      ? "bg-red-50 dark:bg-red-900/10"
                      : ""
                  }`}
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
                        {offensivePostsVisible &&
                          post.offensiveWords &&
                          post.offensiveWords.length > 0 && (
                            <p className="text-xs font-semibold text-red-500 mt-1">
                              Từ ngữ vi phạm: {post.offensiveWords.join(", ")}
                            </p>
                          )}
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
                      <div className="flex items-center text-[var(--color-text-secondary)]">
                        <FaEye className="mr-1" />
                        <span>{post.views || 0}</span>
                      </div>
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

                    {/* Hiển thị badge trùng lặp nếu post nằm trong nhóm trùng lặp */}
                    {showDuplicates &&
                      duplicateGroups.some((group) =>
                        group.postIds.includes(post._id)
                      ) && (
                        <span className="ml-2 px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-500">
                          <FaClone className="mr-1 text-[0.5rem]" />
                          {t("admin.contentManagement.duplicate")}
                        </span>
                      )}
                  </td>

                  {/* Actions column */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewPost(post)}
                        className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-full transition-all cursor-pointer"
                        title={t("admin.contentManagement.table.viewPost")}
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
                            title={t(
                              "admin.contentManagement.table.makeFeatured"
                            )}
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
                          title={t(
                            "admin.contentManagement.table.removeFromFeatured"
                          )}
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
                            title={t("admin.contentManagement.table.blockPost")}
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
                          title={t("admin.contentManagement.table.approvePost")}
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
                          title={t("admin.contentManagement.table.restorePost")}
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
                          title={t("admin.contentManagement.table.deletePost")}
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
                  {showDuplicates &&
                  !selectedDuplicateGroup &&
                  duplicateGroups.length > 0
                    ? t("admin.contentManagement.selectGroupToViewDuplicates")
                    : t("admin.contentManagement.noPostsFound")}
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
              className="fixed inset-0 bg-[rgba(0,0,0,0.4)] transition-opacity"
              onClick={closeModal}
            ></div>

            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-[var(--color-bg-secondary)] rounded-lg shadow-xl relative z-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
                  {t("admin.contentManagement.postDetails.title")}
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
                      {t("admin.contentManagement.postDetails.postedOn")}{" "}
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
                      <span>
                        {selectedPost.likes?.length || 0}{" "}
                        {t("admin.contentManagement.postDetails.likes")}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FaComment className="mr-1" />
                      <span>
                        {selectedPost.comments?.length || 0}{" "}
                        {t("admin.contentManagement.postDetails.comments")}
                      </span>
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
                  {t("admin.contentManagement.postDetails.close")}
                </Button>

                {selectedPost.status !== "deleted" && (
                  <Button
                    variant="danger"
                    disabled={deletePost.isPending}
                    onClick={() => handleDeletePost(selectedPost._id)}
                  >
                    {deletePost.isPending ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        {t("admin.contentManagement.postDetails.deleting")}
                      </span>
                    ) : (
                      t("admin.contentManagement.postDetails.deletePost")
                    )}
                  </Button>
                )}

                {selectedPost.status === "deleted" && (
                  <Button
                    variant="warning"
                    disabled={restorePost.isPending}
                    onClick={() => handleRestorePost(selectedPost._id)}
                  >
                    {restorePost.isPending ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        {t("admin.contentManagement.postDetails.restoring")}
                      </span>
                    ) : (
                      t("admin.contentManagement.postDetails.restorePost")
                    )}
                  </Button>
                )}

                {selectedPost.status !== "blocked" &&
                  selectedPost.status !== "deleted" && (
                    <Button
                      variant="warning"
                      disabled={
                        updatePostStatus.isPending &&
                        processingPostId === selectedPost._id
                      }
                      onClick={() =>
                        handleUpdatePostStatus(selectedPost._id, "blocked")
                      }
                    >
                      {updatePostStatus.isPending &&
                      processingPostId === selectedPost._id ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          {t("admin.contentManagement.postDetails.blocking")}
                        </span>
                      ) : (
                        t("admin.contentManagement.postDetails.blockPost")
                      )}
                    </Button>
                  )}

                {selectedPost.status !== "approved" &&
                  selectedPost.status !== "deleted" && (
                    <Button
                      variant="success"
                      disabled={
                        updatePostStatus.isPending &&
                        processingPostId === selectedPost._id
                      }
                      onClick={() =>
                        handleUpdatePostStatus(selectedPost._id, "approved")
                      }
                    >
                      {updatePostStatus.isPending &&
                      processingPostId === selectedPost._id ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          {t("admin.contentManagement.postDetails.approving")}
                        </span>
                      ) : (
                        t("admin.contentManagement.postDetails.approvePost")
                      )}
                    </Button>
                  )}

                {selectedPost.status !== "deleted" &&
                  !selectedPost.featured && (
                    <Button
                      variant="primary"
                      disabled={
                        updatePostStatus.isPending &&
                        processingPostId === selectedPost._id
                      }
                      onClick={() =>
                        handleUpdatePostStatus(selectedPost._id, "featured")
                      }
                    >
                      {updatePostStatus.isPending &&
                      processingPostId === selectedPost._id ? (
                        <span className="flex items-center">
                          <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                          {t("admin.contentManagement.postDetails.featuring")}
                        </span>
                      ) : (
                        t("admin.contentManagement.postDetails.featurePost")
                      )}
                    </Button>
                  )}

                {selectedPost.status !== "deleted" && selectedPost.featured && (
                  <Button
                    variant="secondary"
                    disabled={
                      updatePostStatus.isPending &&
                      processingPostId === selectedPost._id
                    }
                    onClick={() =>
                      handleUpdatePostStatus(selectedPost._id, "approved")
                    }
                  >
                    {updatePostStatus.isPending &&
                    processingPostId === selectedPost._id ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 mr-2 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        {t("admin.contentManagement.postDetails.removing")}
                      </span>
                    ) : (
                      t("admin.contentManagement.postDetails.removeFeature")
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
