import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";
import { useGroupMutations } from "../../hooks/mutations/useGroupMutations";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import PostList from "../../components/post/PostList";
import Avatar from "../../components/common/Avatar";
import Loading from "../../components/common/Loading";
import GroupMemberList from "../../components/group/GroupMemberList";
import {
  showSuccessToast,
  showErrorToast,
  showConfirmToast,
  showInfoToast,
} from "../../utils/toast";
import {
  FiUsers,
  FiSettings,
  FiImage,
  FiEdit2,
  FiEye,
  FiLock,
  FiCalendar,
  FiSave,
  FiTrash2,
} from "react-icons/fi";

const GroupDetailPage = ({ isManagePage = false, isSettingsPage = false }) => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchGroupPosts } = usePostContext();

  console.log("GroupDetailPage - GroupId:", groupId, "User:", user);

  const {
    data: groupData,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useGroupQueries.useGroup(groupId);

  console.log("Group Data:", groupData);

  // Đảm bảo currentGroup có dữ liệu
  const currentGroup = groupData?.data || null;

  console.log("Current Group after parsing:", currentGroup);

  const { joinGroup, leaveGroup, updateGroup } = useGroupMutations();
  const [activeTab, setActiveTab] = useState(
    isManagePage ? "members" : isSettingsPage ? "settings" : "discussion"
  );
  const [isJoining, setIsJoining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(queryError?.message || null);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    isPrivate: false,
  });

  // Cập nhật error state khi queryError thay đổi
  useEffect(() => {
    if (queryError) {
      setError(queryError.message || "Error loading group data");
      console.error("Group data error:", queryError);
    } else {
      setError(null);
    }
  }, [queryError]);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const coverInputRef = useRef(null);

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
    if (currentGroup?.isMember) {
      fetchGroupPosts(groupId);
    }
  }, [fetchGroupPosts, groupId, currentGroup?.isMember]);

  useEffect(() => {
    // Switch to appropriate tab based on page type
    if (isManagePage) {
      setActiveTab("members");
    } else if (isSettingsPage) {
      setActiveTab("settings");
    }
  }, [isManagePage, isSettingsPage]);

  useEffect(() => {
    // Initialize form with current group data when available
    if (currentGroup) {
      setGroupForm({
        name: currentGroup.name || "",
        description: currentGroup.description || "",
        isPrivate: currentGroup.isPrivate || false,
      });
    }
  }, [currentGroup]);

  const handleJoinGroup = async () => {
    if (isJoining) return;
    setIsJoining(true);
    try {
      await joinGroup.mutateAsync(groupId);
      showSuccessToast("You have joined the group successfully");
    } catch (error) {
      console.error("Failed to join group:", error);
      showErrorToast(
        error?.response?.data?.message ||
          "Failed to join the group. Please try again."
      );
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (isJoining) return;

    showConfirmToast("Are you sure you want to leave this group?", async () => {
      setIsJoining(true);
      try {
        const response = await leaveGroup.mutateAsync(groupId);
        showSuccessToast("You have left the group successfully");

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
          error?.response?.data?.message ||
            "Failed to leave the group. Please try again."
        );
      } finally {
        setIsJoining(false);
      }
    });
  };

  const handleSaveSettings = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Create form data for file uploads
      const formData = new FormData();
      formData.append("name", groupForm.name);
      formData.append("description", groupForm.description);
      formData.append("isPrivate", groupForm.isPrivate);

      if (coverFile) {
        formData.append("coverImage", coverFile);
        console.log("Adding coverImage to form data", coverFile.name);
      }

      console.log("Updating group with formData", formData);

      const response = await updateGroup.mutateAsync({
        groupId,
        groupData: formData,
      });

      console.log("Update response:", response);

      // Reset file states after successful update
      setCoverFile(null);
      setCoverPreview(null);

      showSuccessToast("Group settings updated successfully");
    } catch (error) {
      console.error("Failed to update group settings:", error);
      showErrorToast(
        error?.response?.data?.message ||
          "Failed to update group settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    showConfirmToast(
      "Are you sure you want to delete this group? This action cannot be undone.",
      () => {
        // Implementation for deleting group would go here
        showInfoToast("Delete group functionality is not yet implemented");
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
    if (!file) return;

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showErrorToast("Image size should be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverFile(file);
      setCoverPreview(reader.result);
    };
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
          <p className="text-red-500 font-medium mb-2">{error}</p>
          <button
            onClick={() => refetch()}
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
            Group not found
          </h2>
          <p className="text-gray-500 mb-6">
            This group may have been deleted or you don't have access to it.
          </p>
          <button
            onClick={() => navigate("/groups")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Groups
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
            This is a private group
          </h2>
          <p className="text-gray-400 mb-6">
            Join the group to see content and discussions.
          </p>
          <button
            onClick={handleJoinGroup}
            disabled={isJoining}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {isJoining ? "Processing..." : "Join Group"}
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
                <Avatar
                  src={user?.avatarImage}
                  alt={user?.fullName}
                  size="md"
                />
                <div
                  onClick={() => navigate(`/create-post?groupId=${groupId}`)}
                  className="flex-grow bg-[#16181c] rounded-full px-4 py-2.5 cursor-pointer hover:bg-gray-800 transition-colors text-gray-400"
                >
                  Write something in the group...
                </div>
              </div>
              <div className="flex mt-3 pt-2 border-t border-gray-800">
                <button className="flex-1 flex items-center justify-center p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-300">
                  <FiImage className="mr-2 text-green-600" />
                  <span>Photo/Video</span>
                </button>
                <button
                  onClick={() => navigate(`/create-post?groupId=${groupId}`)}
                  className="flex-1 flex items-center justify-center p-2 hover:bg-gray-800 rounded-md transition-colors text-gray-300"
                >
                  <FiEdit2 className="mr-2 text-blue-600" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          )}

          <PostList groupId={groupId} />
        </div>
      );
    }

    if (activeTab === "about") {
      return (
        <div className="bg-[#1E2024] rounded-lg shadow-md p-6 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">About</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">
                Group Information
              </h3>
              <p className="text-gray-300 whitespace-pre-line">
                {currentGroup.description || "This group has no description."}
              </p>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h3 className="text-lg font-medium text-gray-200 mb-2">
                Details
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <FiLock className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">
                      {currentGroup.isPrivate
                        ? "Private Group"
                        : "Public Group"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {currentGroup.isPrivate
                        ? "Only members can see who is in the group and what they post."
                        : "Anyone can see who is in the group and what they post."}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiEye className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">
                      {currentGroup.isPrivate ? "Hidden" : "Visible"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {currentGroup.isPrivate
                        ? "Only members can find this group."
                        : "Anyone can find this group."}
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <FiCalendar className="mt-1 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-200">History</p>
                    <p className="text-sm text-gray-400">
                      Group created on{" "}
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
                  Group Administration
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/groups/${groupId}/settings`)}
                    className="flex items-center text-blue-500 hover:underline"
                  >
                    <FiSettings className="mr-1" /> Manage group settings
                  </button>
                  <button
                    onClick={() => navigate(`/groups/${groupId}/manage`)}
                    className="flex items-center text-blue-500 hover:underline"
                  >
                    <FiUsers className="mr-1" /> Manage members
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
          <h2 className="text-xl font-bold text-white mb-6">Group Settings</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Group Name
              </label>
              <input
                type="text"
                name="name"
                value={groupForm.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter group name"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={groupForm.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 bg-[#16181c] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Enter group description"
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
                Private Group
              </label>
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gray-200 mb-4">Media</h3>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Cover Image
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
                          Click to change cover image
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FiImage className="mx-auto text-gray-500 text-xl mb-2" />
                      <p className="text-sm text-gray-400">
                        Click to upload group cover image
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
                className="px-4 py-2 bg-red-600/30 hover:bg-red-700/50 text-red-300 rounded-lg flex items-center transition-colors"
              >
                <FiTrash2 className="mr-1" /> Delete Group
              </button>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center disabled:opacity-50"
              >
                <FiSave className="mr-1" />
                {isSaving ? "Saving..." : "Save Changes"}
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
            className="px-4 py-2.5 font-medium rounded-lg transition-all text-gray-300 hover:bg-gray-800"
          >
            Back to Group
          </button>
          <div className="text-gray-400 py-2.5">|</div>
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm">
            Settings
          </div>
        </div>
      );
    }

    if (isManagePage) {
      return (
        <div className="flex flex-wrap space-x-2 mb-2 md:mb-0">
          <button
            onClick={() => navigate(`/groups/${groupId}`)}
            className="px-4 py-2.5 font-medium rounded-lg transition-all text-gray-300 hover:bg-gray-800"
          >
            Back to Group
          </button>
          <div className="text-gray-400 py-2.5">|</div>
          <div className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg shadow-sm">
            Manage Members
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap space-x-2 mb-2 md:mb-0">
        <button
          onClick={() => setActiveTab("discussion")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all ${
            activeTab === "discussion"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          Discussions
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all ${
            activeTab === "members"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          Members
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`px-4 py-2.5 font-medium rounded-lg transition-all ${
            activeTab === "about"
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          About
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Group Header - Chỉ hiển thị khi không phải trang settings hoặc manage */}
      {!isSettingsPage && !isManagePage && (
        <div className="bg-[#1E2024] rounded-xl overflow-hidden shadow-lg mb-8 border border-gray-700">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full p-6">
              <div className="flex flex-col md:flex-row md:items-end">
                <div>
                  <h1 className="text-white text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">
                    {currentGroup.name}
                  </h1>
                  <p className="text-gray-300 flex items-center mb-4">
                    {currentGroup.isPrivate ? (
                      <span className="flex items-center">
                        <FiLock className="mr-1" /> Private Group
                      </span>
                    ) : (
                      <span className="flex items-center text-green-400">
                        <FiUsers className="mr-1" /> Public Group
                      </span>
                    )}{" "}
                    <span className="mx-2">•</span>{" "}
                    {currentGroup.members?.length || 0} members
                    <span className="mx-2">•</span> Created{" "}
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
        <div className="bg-[#1E2024] rounded-xl p-6 shadow-lg mb-8 border border-gray-700">
          <h1 className="text-2xl font-bold text-white">
            {isSettingsPage ? "Group Settings" : "Manage Group Members"}
          </h1>
          <p className="text-gray-400 mt-1">
            {isSettingsPage
              ? "Customize your group's settings and appearance"
              : "Manage members and permissions for your group"}
          </p>
        </div>
      )}

      {/* Group Actions */}
      <div className="bg-[#1E2024] rounded-xl shadow-lg mb-8 border border-gray-700">
        <div className="px-6 py-4 flex flex-wrap items-center justify-between border-b border-gray-700">
          {renderTabs()}

          {!isSettingsPage && !isManagePage && (
            <div className="flex space-x-2">
              {isAdmin && (
                <Link
                  to={`/groups/${groupId}/settings`}
                  className="px-4 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all font-medium flex items-center shadow-sm"
                >
                  <FiSettings className="mr-1" /> Settings
                </Link>
              )}
              {currentGroup.isMember || isAdmin ? (
                <button
                  onClick={handleLeaveGroup}
                  disabled={isJoining}
                  className="px-5 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 text-gray-200 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 font-medium shadow-sm"
                >
                  {isJoining ? "Processing..." : "Leave Group"}
                </button>
              ) : (
                <button
                  onClick={handleJoinGroup}
                  disabled={isJoining}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 font-medium shadow-sm"
                >
                  {isJoining ? "Processing..." : "Join Group"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-[#1E2024] rounded-xl shadow-lg p-6 border border-gray-700">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default GroupDetailPage;
