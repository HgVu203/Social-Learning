import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";

import {
  FiEdit,
  FiEye,
  FiFileText,
  FiImage,
  FiCheck,
  FiTrash2,
  FiX,
  FiInfo,
  FiUpload,
  FiLoader,
  FiUsers,
  FiArrowLeft,
} from "react-icons/fi";
import Toast from "../../utils/toast";
import { usePostContext } from "../../contexts/PostContext";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";
import { usePostQueries } from "../../hooks/queries/usePostQueries";
import { SkeletonPostDetail } from "../../components/skeleton";
import { useTranslation } from "react-i18next";

const CreatePostPage = ({ isEditing = false }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const { createPost, updatePost } = usePostContext();
  const { usePost } = usePostQueries;
  const fileInputRef = useRef(null);

  // Get groupId from query parameters
  const queryParams = new URLSearchParams(location.search);
  const groupId = queryParams.get("groupId");

  // Fetch group information if groupId is present
  const { data: groupData } = useGroupQueries.useGroup(groupId);
  const group = groupData?.data;

  // Fetch post data if in editing mode
  const { data: postData, isLoading: postLoading } = usePost(
    isEditing ? postId : null
  );
  const post = postData?.data;

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: [],
    images: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("write"); // 'write' or 'preview'
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  // Load post data when editing
  useEffect(() => {
    if (isEditing && post) {
      setFormData({
        title: post.title || "",
        content: post.content || "",
        tags: post.tags || [],
        images: [], // We'll handle existing images separately
      });

      // Handle existing images
      if (post.images && post.images.length > 0) {
        setExistingImages(post.images);
        setImagePreviewUrls(post.images);
      } else if (post.image) {
        setExistingImages([post.image]);
        setImagePreviewUrls([post.image]);
      }
    }
  }, [isEditing, post]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput) {
      e.preventDefault();
      removeLastTag();
    }
  };

  const addTag = () => {
    const newTag = tagInput.trim().toLowerCase();

    if (newTag && !formData.tags.includes(newTag)) {
      if (formData.tags.length >= 5) {
        setErrors((prev) => ({
          ...prev,
          tags: t("post.maxTagsAllowed"),
        }));
        return;
      }
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setTagInput("");
      if (errors.tags) {
        setErrors((prev) => ({
          ...prev,
          tags: null,
        }));
      }
    }
  };

  const removeLastTag = () => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.slice(0, -1),
    }));
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = t("post.titleRequired");
    } else if (formData.title.trim().length < 3) {
      newErrors.title = t("post.titleMinLength");
    }
    if (!formData.content.trim()) {
      newErrors.content = t("post.contentRequired");
    } else if (formData.content.trim().length < 10) {
      newErrors.content = t("post.contentMinLength");
    }
    if (formData.tags.length === 0) {
      newErrors.tags = t("post.tagsRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle image upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/")
    );
    handleImageFiles(files);
  };

  const handleRemoveImage = (index) => {
    // Handle removal of images
    if (index < existingImages.length) {
      const imageToDelete = existingImages[index];
      setImagesToDelete((prev) => [...prev, imageToDelete]);
    }

    setImagePreviewUrls((prev) =>
      prev.filter((_, prevIndex) => prevIndex !== index)
    );

    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter(
        (_, prevIndex) => prevIndex + existingImages.length !== index
      ),
    }));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    handleImageFiles(files);
  };

  const handleImageFiles = (files) => {
    const validFiles = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        Toast.error(`Image ${file.name} is too large. Maximum size is 5MB`);
        return false;
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/i)) {
        Toast.error(`File ${file.name} is not a supported image format`);
        return false;
      }
      return true;
    });

    if (formData.images.length + validFiles.length > 10) {
      Toast.error("Maximum 10 images allowed");
      return;
    }

    // Create preview URLs for new images
    const newImageUrls = validFiles.map((file) => URL.createObjectURL(file));

    setImagePreviewUrls((prev) => [...prev, ...newImageUrls]);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...validFiles],
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    let success = false;

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", formData.content);
      formDataToSend.append("tags", JSON.stringify(formData.tags));

      if (groupId) {
        formDataToSend.append("groupId", groupId);
      }

      // Add images to FormData
      formData.images.forEach((image) => {
        formDataToSend.append("images", image);
      });

      // Add list of images to delete
      if (isEditing && imagesToDelete.length > 0) {
        formDataToSend.append("imagesToDelete", JSON.stringify(imagesToDelete));
      }

      let response;
      if (isEditing) {
        formDataToSend.append("postId", postId);
        response = await updatePost.mutateAsync(formDataToSend);
      } else {
        response = await createPost.mutateAsync(formDataToSend);
      }

      if (response.success) {
        Toast.success(
          isEditing ? "Post updated successfully" : "Post created successfully"
        );
        success = true;

        // Redirect logic based on post type
        if (isEditing) {
          // For edited posts, go to post detail page
          navigate(`/post/${postId}`);
        } else if (groupId && response.data?._id) {
          // For new group posts, return to group page
          navigate(`/groups/${groupId}`);
        } else if (response.data?._id) {
          // For new personal posts, go to post detail
          navigate(`/post/${response.data._id}`);
        } else {
          navigate(-1);
        }
      } else {
        Toast.error(
          response.message ||
            (isEditing ? "Failed to update post" : "Failed to create post")
        );
        setErrors((prev) => ({
          ...prev,
          submit: response.message || "An error occurred",
        }));
      }
    } catch (error) {
      console.error("Error submitting post:", error);
      Toast.error("An error occurred. Please try again.");
      setErrors((prev) => ({
        ...prev,
        submit: "An error occurred. Please try again.",
      }));
    } finally {
      setIsSubmitting(false);

      // Clean up image object URLs if submission failed
      if (!success) {
        imagePreviewUrls.forEach((url) => {
          if (url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      }
    }
  };

  return (
    <div
      className={`container mx-auto px-4 py-8 max-w-4xl ${
        isDragging
          ? "bg-[var(--color-primary-light)] opacity-90 transition-colors"
          : ""
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
        {isEditing ? t("post.editPost") : t("post.createNewPost")}
      </h1>

      {/* Group information banner */}
      {groupId && group && !isEditing && (
        <div className="mb-6 bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border)] flex items-center">
          <FiUsers
            className="text-[var(--color-primary)] mr-2 flex-shrink-0"
            size={24}
          />
          <div className="flex-grow">
            <div className="flex items-center">
              <span className="font-medium text-[var(--color-text-primary)]">
                {t("post.creatingPostInGroup")}
              </span>
              <span className="ml-2 font-bold text-[var(--color-text-primary)]">
                {group.name}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {group.isPrivate ? t("group.private") : t("group.public")} ·
              {group.membersCount || 0} {t("group.member")}
            </p>
          </div>
          <Link
            to={`/groups/${groupId}`}
            className="text-[var(--color-primary)] hover:underline text-sm ml-auto flex items-center"
            title={t("common.back")}
          >
            <FiArrowLeft size={18} />
          </Link>
        </div>
      )}

      {/* Post type indicator */}
      <div className="mb-6 text-sm text-[var(--color-text-secondary)] flex items-center">
        <div
          className={`px-3 py-1 rounded-full ${
            groupId
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          }`}
        >
          {groupId ? t("group.post") : t("post.personalPost")}
        </div>
        <div className="ml-2">
          {groupId ? t("post.visibleInGroup") : t("post.visibleInFeed")}
        </div>
      </div>

      {isEditing && postLoading ? (
        <SkeletonPostDetail />
      ) : (
        <div className="card p-6 rounded-xl shadow-md">
          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-6">
            <button
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                activeTab === "write"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
              }`}
              onClick={() => setActiveTab("write")}
            >
              <FiEdit />
              <span>{t("post.write")}</span>
            </button>
            <button
              className={`px-4 py-2 rounded-md flex items-center space-x-2 ${
                activeTab === "preview"
                  ? "bg-[var(--color-primary)] text-white"
                  : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
              }`}
              onClick={() => setActiveTab("preview")}
            >
              <FiEye />
              <span>{t("post.preview")}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div className="mb-4">
              <label
                htmlFor="title"
                className="flex items-center text-[var(--color-text-secondary)] mb-2"
              >
                <FiFileText className="mr-2" />
                {t("post.title")}
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={t("post.titlePlaceholder")}
                className="w-full p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Tags */}
            <div className="mb-4">
              <label
                htmlFor="tags"
                className="flex items-center text-[var(--color-text-secondary)] mb-2"
              >
                <FiFileText className="mr-2" />
                {t("post.tags")}
              </label>
              <div
                className={`flex flex-wrap items-center p-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-primary)] ${
                  errors.tags ? "border-red-500" : ""
                }`}
              >
                {formData.tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center bg-[var(--color-primary-light)] text-[var(--color-text-primary)] px-2 py-1 rounded-md m-1"
                  >
                    <span className="mr-1">#{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-[var(--color-text-primary)]"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                  id="tagInput"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagKeyDown}
                  onBlur={addTag}
                  placeholder={
                    formData.tags.length === 0 ? t("post.tagsPlaceholder") : ""
                  }
                  className="flex-grow p-2 outline-none bg-transparent text-[var(--color-text-primary)]"
                />
              </div>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
                {t("post.tagsHelp")}
              </p>
              {errors.tags && (
                <p className="text-red-500 text-sm mt-1">{errors.tags}</p>
              )}
            </div>

            {/* Content */}
            {activeTab === "write" ? (
              <div className="mb-4">
                <label
                  htmlFor="content"
                  className="flex items-center text-[var(--color-text-secondary)] mb-2"
                >
                  <FiFileText className="mr-2" />
                  {t("post.content")}
                  <span className="ml-auto text-[var(--color-primary)] text-sm flex items-center">
                    <FiInfo className="mr-1" />
                    {t("post.markdownSupported")}
                  </span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder={t("post.contentPlaceholder")}
                  className="w-full p-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] min-h-[300px]"
                ></textarea>
                {errors.content && (
                  <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <div className="flex items-center text-[var(--color-text-secondary)] mb-2">
                  <FiEye className="mr-2" />
                  {t("post.preview")}
                </div>
                <div className="w-full p-4 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] min-h-[300px] prose prose-sm prose-[var(--color-text-primary)] max-w-none">
                  {formData.content ? (
                    <ReactMarkdown className="prose dark:prose-invert prose-a:text-[var(--color-primary)] max-w-none">
                      {formData.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-[var(--color-text-tertiary)]">
                      {t("post.previewEmpty")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Image Upload */}
            <div className="mb-6">
              <label
                htmlFor="images"
                className="flex items-center text-[var(--color-text-secondary)] mb-2"
              >
                <FiImage className="mr-2" />
                {t("post.images")}
              </label>
              <div className="border-2 border-dashed border-[var(--color-border)] rounded-md p-4 text-center">
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="btn btn-primary btn-sm"
                >
                  <FiUpload className="mr-2" />
                  {t("post.uploadImages")}
                </button>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-2">
                  {t("post.dragAndDrop")}
                </p>
              </div>

              {/* Image Previews */}
              {imagePreviewUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative border border-[var(--color-border)] rounded-md overflow-hidden"
                    >
                      <img
                        src={url}
                        alt={`Preview ${index}`}
                        className="w-full h-24 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn btn-secondary mr-2"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary flex items-center"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    {t("common.submitting")}
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" />
                    {isEditing ? t("post.updatePost") : t("post.publishPost")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;
