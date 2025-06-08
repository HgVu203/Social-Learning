import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";
import { useGroupMutations } from "../../hooks/mutations/useGroupMutations";
import { useGroupPosts } from "../../hooks/queries/usePostQueries";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import PostList from "../../components/post/PostList";
import Avatar from "../../components/common/Avatar";
import GroupMemberList from "../../components/group/GroupMemberList";
import {
  showErrorToast,
  showInfoToast,
  showConfirmToast,
} from "../../utils/toast";
import {
  FiUsers,
  FiSettings,
  FiImage,
  FiEye,
  FiLock,
  FiCalendar,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import { SkeletonGroup, SkeletonList } from "../../components/skeleton";
import { useTranslation } from "react-i18next";

const GroupDetailPage = ({ isManagePage = false, isSettingsPage = false }) => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchGroupPosts } = usePostContext();
  const { t } = useTranslation();

  console.log("GroupDetailPage - GroupId:", groupId, "User:", user);

  // Initialize activeTab state before using it in the query below
  const [activeTab, setActiveTab] = useState(
    isManagePage ? "members" : isSettingsPage ? "settings" : "discussion"
  );

  // Tối ưu hóa: Chia các API call thành ba phần riêng biệt
  // 1. Thông tin cơ bản về nhóm
  const {
    data: basicData,
    isLoading: loadingBasic,
    error: basicError,
    refetch: refetchBasic,
  } = useGroupQueries.useGroupBasicInfo(groupId);

  // 2. Thông tin về thành viên nhóm (nếu trong tab members)
  const {
    data: membersData,
    isLoading: loadingMembers,
    error: membersError,
  } = useGroupQueries.useGroupMembersOnly(groupId, 1, 20, {
    enabled: groupId && (isManagePage || activeTab === "members"),
  });

  // 3. Bài viết trong nhóm (nếu trong tab discussion)
  const {
    data: postsData,
    isLoading: loadingPosts,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useGroupPosts(groupId, 10);

  // Tổng hợp dữ liệu
  const groupBasic = basicData?.data || null;
  const groupMembers = membersData?.data || [];

  // Kiểm tra trạng thái posts để hiển thị trong UI
  console.log("Posts data status:", {
    loading: loadingPosts,
    hasMore: hasNextPage,
    postCount: postsData?.pages?.length || 0,
    isFetching: isFetchingNextPage,
  });

  // Hàm để tải thêm bài viết khi cuộn xuống
  const handleLoadMorePosts = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Tạo một kết hợp để có dữ liệu tương thích với code hiện tại
  const currentGroup = groupBasic
    ? {
        ...groupBasic,
        members: groupMembers,
        membersCount:
          membersData?.pagination?.total ||
          groupBasic.membersCount ||
          groupBasic.members?.length ||
          (groupBasic.createdBy && groupBasic.createdBy._id ? 1 : 0), // Ensure creator counts as a member
        // Kiểm tra xem người dùng hiện tại có phải là thành viên không
        isMember:
          user &&
          (groupMembers.some(
            (member) => member.user?._id?.toString() === user?._id?.toString()
          ) ||
            // Count the creator as a member automatically
            (groupBasic.createdBy &&
              groupBasic.createdBy._id?.toString() === user?._id?.toString())),
      }
    : null;

  console.log("Current Group after combining data:", currentGroup);

  const { joinGroup, leaveGroup, updateGroup } = useGroupMutations();
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Combine all errors
  const error = basicError?.message || membersError?.message || null;

  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const coverInputRef = useRef(null);

  // Cập nhật form khi có dữ liệu cơ bản
  useEffect(() => {
    if (groupBasic && isSettingsPage) {
      setGroupForm({
        name: groupBasic.name || "",
        description: groupBasic.description || "",
        isPrivate: groupBasic.isPrivate || false,
      });
    }
  }, [groupBasic, isSettingsPage]);

  const loading = loadingBasic || (isManagePage && loadingMembers);

  useEffect(() => {
    // No need to dispatch anything as React Query handles data fetching
    console.log(
      "Group detail page mounted/updated - groupId:",
      groupId,
      "user:",
      user?._id
    );
  }, [groupId, user]);

  useEffect(() => {
    if (currentGroup?.isMember && activeTab === "discussion") {
      console.log("[GroupDetailPage] Fetching group posts for group:", groupId);
      fetchGroupPosts(groupId);
    }
  }, [fetchGroupPosts, groupId, currentGroup?.isMember, activeTab]);

  useEffect(() => {
    // Switch to appropriate tab based on page type
    if (isManagePage) {
      setActiveTab("members");
    } else if (isSettingsPage) {
      setActiveTab("settings");
    }
  }, [isManagePage, isSettingsPage]);

  const handleJoinGroup = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      await joinGroup.mutateAsync(groupId);
    } catch (error) {
      console.error("Failed to join group:", error);
      showErrorToast(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to join the group. Please try again."
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isJoining) return;

    showConfirmToast(
      t("common.confirmLeaveGroup"),
      async () => {
        setIsJoining(true);
        try {
          const response = await leaveGroup.mutateAsync(groupId);
          // Thông báo thành công đã được xử lý trong mutation, không cần hiển thị thêm

          // If response has a message about group deletion, navigate to the groups list
          if (
            response.message &&
            response.message.includes("group was deleted")
          ) {
            navigate("/groups");
            return;
          }

          // For normal leave, the component will be re-rendered with updated data
        } catch (error) {
          console.error("Failed to leave group:", error);
          showErrorToast(
            error?.response?.data?.error ||
              error?.response?.data?.message ||
              t("group.failedToLeave")
          );
        } finally {
          setIsJoining(false);
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

  const handleSaveSettings = async () => {
    if (isSaving) return;

    // Basic validation
    if (!groupForm.name.trim()) {
      showErrorToast(t("group.groupNameRequired"));
      return;
    }

    setIsSaving(true);
    try {
      console.log("Starting group update process");

      // Create form data for file uploads
      const formData = new FormData();

      // Add standard fields
      formData.append("name", groupForm.name.trim());
      formData.append("description", groupForm.description.trim());
      formData.append("isPrivate", groupForm.isPrivate);

      // Add tags if provided
      if (groupForm.tags && groupForm.tags.length > 0) {
        // Convert tags array to JSON string to ensure proper transmission
        formData.append("tags", JSON.stringify(groupForm.tags));
      }

      // Handle the cover image - important for proper file upload
      if (coverFile) {
        try {
          // Validate the file again before upload
          if (coverFile.size > 5 * 1024 * 1024) {
            showErrorToast(t("toast.error.fileSize"));
            setIsSaving(false);
            return;
          }

          if (!coverFile.type.match(/^image\/(jpeg|jpg|png|gif)$/i)) {
            showErrorToast(t("toast.error.fileType"));
            setIsSaving(false);
            return;
          }

          // This is the key step: append with unique filename for proper server handling
          const fileExt = coverFile.name.split(".").pop();
          const uniqueFilename = `cover_${Date.now()}_${Math.floor(
            Math.random() * 1000
          )}.${fileExt}`;

          // Append with explicit file name to ensure it's properly processed on the server
          formData.append("coverImage", coverFile, uniqueFilename);
          console.log(
            `Adding coverImage to form data: ${uniqueFilename} (${coverFile.type}, ${coverFile.size} bytes)`
          );
        } catch (fileError) {
          console.error("Error preparing file for upload:", fileError);
          showErrorToast(t("toast.error.uploadFailed"));
          setIsSaving(false);
          return;
        }
      }

      console.log("FormData created successfully for group update");

      // Log all form data entries to verify content
      for (let [key, value] of formData.entries()) {
        console.log(
          `FormData entry: ${key} = ${
            value instanceof File
              ? `${value.name} (${value.type}, ${value.size} bytes)`
              : value
          }`
        );
      }

      console.log("Sending update request to server for group:", groupId);
      try {
        const response = await updateGroup.mutateAsync({
          groupId,
          groupData: formData,
        });

        console.log("Update response received:", response);

        // Reset file states after successful update
        setCoverFile(null);
        setCoverPreview(null);

        // Success toast is already shown by the mutation
      } catch (apiError) {
        console.error("API error when updating group:", apiError);
        // Enhanced error logging
        if (apiError.response) {
          console.error("API response error:", {
            status: apiError.response.status,
            data: apiError.response.data,
            headers: apiError.response.headers,
          });
        }
        throw apiError; // Re-throw to be caught by the outer catch
      }
    } catch (error) {
      console.error("Failed to update group settings:", error);

      // Enhanced error handling
      let errorMessage = "Failed to update group settings. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      showErrorToast(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    showConfirmToast(
      t("group.confirmDeleteGroup"),
      () => {
        // Implementation for deleting group would go here
        showInfoToast(t("group.deleteNotImplemented"));
      },
      null,
      {
        icon: "delete",
        confirmText: t("group.deleteGroup"),
        confirmColor: "red",
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGroupForm({
      ...groupForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    // Log file details
    console.log("Selected file details:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast(t("toast.error.fileSize"));
      return;
    }

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/i)) {
      showErrorToast(t("toast.error.fileType"));
      return;
    }

    // Create preview
    const reader = new FileReader();

    reader.onloadstart = () => {
      console.log("Starting to read the file");
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentLoaded = Math.round((event.loaded / event.total) * 100);
        console.log(`File reading progress: ${percentLoaded}%`);
      }
    };

    reader.onloadend = () => {
      console.log("File read complete");
      setCoverFile(file);
      setCoverPreview(reader.result);
      console.log("Cover image preview created, size:", reader.result.length);
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      showErrorToast(t("group.failedReadImage"));
    };

    console.log("Starting file read as Data URL");
    reader.readAsDataURL(file);
  };

  const isAdmin =
    currentGroup?.members?.some(
      (member) =>
        member.user?._id?.toString() === user?._id?.toString() &&
        member.role === "admin"
    ) || currentGroup?.createdBy?._id === user?._id;

  if (loading && !currentGroup) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6">
          <SkeletonGroup />
        </div>
        <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg p-6 border border-[var(--color-border)]">
          <div className="mb-4 h-8 bg-[var(--color-bg-light)] w-24 rounded"></div>
          <SkeletonList count={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <button
            onClick={() => refetchBasic()}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            {t("group.groupNotFound")}
          </h2>
          <p className="text-gray-500 mb-6">{t("group.groupMayBeDeleted")}</p>
          <button
            onClick={() => navigate("/groups")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {t("group.backToGroup")}
          </button>
        </div>
      </div>
    );
  }

  const canCreatePost = currentGroup.isMember;
  const canViewContent = currentGroup.isMember || !currentGroup.isPrivate;

  const renderTabContent = () => {
    if (!canViewContent) {
      return (
        <div className="bg-[#1E2024] p-8 rounded-lg shadow-md text-center">
          <FiLock className="mx-auto text-4xl text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-4">
            {t("group.privateGroupContent")}
          </h2>
          <p className="text-gray-400 mb-6">{t("group.joinToSeeContent")}</p>
          <button
            onClick={handleJoinGroup}
            disabled={isJoining}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isJoining ? t("common.submitting") : t("group.join")}
          </button>
        </div>
      );
    }

    if (activeTab === "discussion") {
      return (
        <div>
          {canCreatePost && (
            <div className="bg-[#1E2024] p-4 rounded-lg shadow-md mb-4 border border-gray-800">
              <div className="flex items-center space-x-3">
                <Link to={`/profile/${user?._id}`}>
                  <Avatar
                    src={user?.avatarImage}
                    alt={user?.fullName}
                    size="md"
                  />
                </Link>
                <div
                  onClick={() => navigate(`/create-post?groupId=${groupId}`)}
                  className="flex-grow bg-gradient-to-r from-[#242830] to-[#1e2229] rounded-full px-5 py-3.5 cursor-pointer text-[#9ca3af] shadow-inner border border-gray-700/40 flex items-center relative overflow-hidden"
                >
                  <FiImage className="mr-3 text-blue-500 relative z-10" />
                  <span className="font-medium text-[#9ca3af] relative z-10">
                    {t("group.writeInGroup")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <PostList
            groupId={groupId}
            hasMorePosts={hasNextPage}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={handleLoadMorePosts}
          />
        </div>
      );
    }

    if (activeTab === "about") {
      return (
        <div className="bg-[#1E2024] rounded-lg shadow-md p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">
            {t("group.about")}
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">
                {t("group.groupInformation")}
              </h3>
              <p className="text-gray-300 whitespace-pre-line">
                {currentGroup.description || t("group.noDescription")}
              </p>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">
                {t("group.details")}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiLock className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">
                      {currentGroup.isPrivate
                        ? t("group.private")
                        : t("group.public")}
                    </p>
                    <p className="text-sm text-gray-400">
                      {currentGroup.isPrivate
                        ? t("group.privateDescription")
                        : t("group.publicDescription")}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiEye className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">
                      {currentGroup.isPrivate
                        ? t("group.hidden")
                        : t("group.visible")}
                    </p>
                    <p className="text-sm text-gray-400">
                      {currentGroup.isPrivate
                        ? t("group.hiddenDescription")
                        : t("group.visibleDescription")}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCalendar className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">
                      {t("group.history")}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t("group.createdOn")}{" "}
                      {new Date(currentGroup.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            {isAdmin && (
              <div className="border-t border-gray-800 pt-4">
                <h3 className="text-lg font-medium text-gray-200 mb-2">
                  {t("group.adminControls")}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/groups/${groupId}/settings`)}
                    className="flex items-center text-blue-500 hover:underline cursor-pointer"
                  >
                    <FiSettings className="mr-1" />{" "}
                    {t("group.manageGroupSettings")}
                  </button>
                  <button
                    onClick={() => navigate(`/groups/${groupId}/manage`)}
                    className="flex items-center text-blue-500 hover:underline cursor-pointer"
                  >
                    <FiUsers className="mr-1" /> {t("group.manageMembers")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "members") {
      return (
        <div className="bg-[#1E2024] rounded-lg shadow-md p-6 border border-gray-800">
          <GroupMemberList
            groupId={groupId}
            isAdmin={isAdmin}
            isManagePage={isManagePage}
          />
        </div>
      );
    }

    if (activeTab === "settings" && isAdmin) {
      return (
        <div className="bg-[#1E2024] rounded-lg shadow-md p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-6">
            {t("group.settings")}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t("group.groupName")}
              </label>
              <input
                type="text"
                name="name"
                value={groupForm.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder={t("group.groupNamePlaceholder")}
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {t("group.description")}
              </label>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder={t("group.descriptionPlaceholder")}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrivate"
                name="isPrivate"
                checked={groupForm.isPrivate}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 border-gray-700 rounded focus:ring-blue-500 bg-gray-700"
              />
              <label htmlFor="isPrivate" className="ml-2 block text-gray-300">
                {t("group.isPrivate")}
              </label>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-200 mb-4">
                {t("group.media")}
              </h3>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  {t("group.coverImage")}
                </label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="relative border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer h-60"
                >
                  {coverPreview || currentGroup.coverImage ? (
                    <div className="relative h-full w-full">
                      <img
                        src={coverPreview || currentGroup.coverImage}
                        alt="Cover preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium">
                          {t("group.clickToChangeCover")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FiImage className="mx-auto text-gray-500 text-xl mb-2" />
                      <p className="text-sm text-gray-400">
                        {t("group.clickToUploadCover")}
                      </p>
                    </>
                  )}

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6 flex justify-between">
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-red-600/30 hover:bg-red-700/50 text-red-300 rounded-lg flex items-center transition-colors cursor-pointer"
              >
                <FiTrash2 className="mr-1" /> {t("group.deleteGroup")}
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center disabled:opacity-50 cursor-pointer"
              >
                <FiSave className="mr-1" />
                {isSaving ? t("group.savingChanges") : t("group.saveChanges")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Sửa đổi UI để hiển thị tab Settings nếu isSettingsPage=true
  const renderTabs = () => {
    if (isSettingsPage) {
      return (
        <div className="flex flex-wrap space-x-2 mb-2 md:mb-0">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="px-4 py-2.5 font-medium rounded-lg transition-all text-gray-300 hover:bg-gray-800 cursor-pointer"
          >
            {t("group.backToGroup")}
          </button>
          <div className="text-gray-400 py-2.5">|</div>
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm">
            {t("group.settings")}
          </div>
        </div>
      );
    }

    if (isManagePage) {
      return (
        <div className="flex flex-wrap space-x-2 mb-2 md:mb-0">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="px-4 py-2.5 font-medium rounded-lg transition-all text-gray-300 hover:bg-gray-800 cursor-pointer"
          >
            {t("group.backToGroup")}
          </button>
          <div className="text-gray-400 py-2.5">|</div>
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm">
            {t("group.manageMembers")}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap space-x-2 mb-2 md:mb-0">
        <button
          onClick={() => setActiveTab("discussion")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === "discussion"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          {t("group.discussion")}
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === "members"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          {t("group.members")}
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === "about"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          {t("group.about")}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Group Header - Chỉ hiển thị khi không phải trang settings hoặc manage */}
      {!isSettingsPage && !isManagePage && (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl overflow-hidden shadow-lg mb-8 border border-[var(--color-border)]">
          <div className="relative h-64 md:h-72 lg:h-80">
            {currentGroup.coverImage ? (
              <img
                src={currentGroup.coverImage}
                alt={`${currentGroup.name} cover`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)]/80 via-[var(--color-bg-primary)]/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full p-6">
              <div className="flex flex-col md:flex-row md:items-end">
                <div>
                  <h1 className="text-[var(--color-text-primary)] text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">
                    {currentGroup.name}
                  </h1>
                  <p className="text-[var(--color-text-secondary)] flex items-center mb-4">
                    {currentGroup.isPrivate ? (
                      <span className="flex items-center">
                        <FiLock className="mr-1" /> {t("group.private")}
                      </span>
                    ) : (
                      <span className="flex items-center text-green-400">
                        <FiUsers className="mr-1" /> {t("group.public")}
                      </span>
                    )}{" "}
                    <span className="mx-2">•</span>{" "}
                    {currentGroup.members?.length || 0} {t("group.members")}
                    <span className="mx-2">•</span> {t("group.created")}{" "}
                    {new Date(currentGroup.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hiển thị tiêu đề trang tương ứng khi là trang settings hoặc manage */}
      {(isSettingsPage || isManagePage) && (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-lg mb-8 border border-[var(--color-border)]">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {isSettingsPage ? t("group.settings") : t("group.groupMembers")}
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">
            {isSettingsPage
              ? t("group.customizeSettings")
              : t("group.manageMembers")}
          </p>
        </div>
      )}

      {/* Group Actions */}
      <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg mb-8 border border-[var(--color-border)]">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between border-b border-[var(--color-border)]">
          {renderTabs()}

          {!isSettingsPage && !isManagePage && (
            <div className="flex space-x-2">
              {isAdmin && (
                <Link
                  to={`/groups/${groupId}/settings`}
                  className="px-4 py-2.5 bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-hover)] text-[var(--color-text-secondary)] rounded-lg hover:from-[var(--color-bg-hover)] hover:to-[var(--color-bg-tertiary)] transition-all font-medium flex items-center shadow-sm cursor-pointer"
                >
                  <FiSettings className="mr-1" /> {t("group.settings")}
                </Link>
              )}
              {currentGroup.isMember || isAdmin ? (
                <button
                  onClick={handleLeaveGroup}
                  disabled={isJoining}
                  className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-bg-tertiary)] to-[var(--color-bg-hover)] text-[var(--color-text-secondary)] rounded-lg hover:from-[var(--color-bg-hover)] hover:to-[var(--color-bg-tertiary)] transition-all disabled:opacity-50 font-medium shadow-sm cursor-pointer"
                >
                  {isJoining ? t("common.submitting") : t("group.leave")}
                </button>
              ) : (
                <button
                  onClick={handleJoinGroup}
                  disabled={isJoining}
                  className="px-5 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)] text-white rounded-lg hover:from-[var(--color-primary-hover)] hover:to-[var(--color-primary)] transition-all disabled:opacity-50 font-medium shadow-sm cursor-pointer"
                >
                  {isJoining ? t("common.submitting") : t("group.join")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--color-bg-secondary)] rounded-xl shadow-lg p-6 border border-[var(--color-border)]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default GroupDetailPage;
