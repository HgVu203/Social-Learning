import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  FiEdit,
  FiEye,
  FiFileText,
  FiImage,
  FiCheck,
  FiPlus,
  FiTrash2,
  FiX,
  FiHash,
  FiAlertCircle,
  FiUsers,
  FiTag,
  FiInfo,
  FiUpload,
  FiLoader,
  FiMessageSquare,
} from "react-icons/fi";
import Toast from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import { useGroupQueries } from "../../hooks/queries/useGroupQueries";
import { usePostQueries } from "../../hooks/queries/usePostQueries";
import { SkeletonPostDetail } from "../../components/skeleton";

const CreatePostPage = ({ isEditing = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { postId } = useParams();
  const { user } = useAuth();
  const { createPost, updatePost } = usePostContext();
  const { usePost } = usePostQueries;
  const fileInputRef = useRef(null);

  // Get groupId from query parameters
  const queryParams = new URLSearchParams(location.search);
  const groupId = queryParams.get("groupId");

  // Fetch group information if groupId is present
  const { data: groupData, isLoading: groupLoading } =
    useGroupQueries.useGroup(groupId);
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
          tags: "Maximum 5 tags allowed",
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
      newErrors.title = "Title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "Content must be at least 10 characters";
    }
    if (formData.tags.length === 0) {
      newErrors.tags = "At least one tag is required";
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

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls((prev) => [...prev, reader.result]);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, file],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index) => {
    if (index < existingImages.length) {
      // It's an existing image, mark it for deletion
      const imageUrl = existingImages[index];
      setImagesToDelete((prev) => [...prev, imageUrl]);
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      // It's a new image, just remove it from the array
      const newImagesIndex = index - existingImages.length;
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== newImagesIndex),
      }));
    }
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    handleImageFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setErrors({}); // Clear previous errors
    setIsSubmitting(true);

    try {
      // Create form data for multipart/form-data request
      const postFormData = new FormData();
      postFormData.append("title", formData.title.trim());
      postFormData.append("content", formData.content.trim());

      // Add groupId if posting in a group
      if (groupId) {
        // Check MongoDB ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(groupId);
        if (!isValidObjectId) {
          Toast.error("Invalid group ID format");
          setIsSubmitting(false);
          return;
        }
        postFormData.append("groupId", groupId);
      }

      // Convert tags array to JSON string to ensure it's properly sent as array
      postFormData.append(
        "tags",
        JSON.stringify(formData.tags.map((tag) => tag.toLowerCase().trim()))
      );

      // Add images to delete if editing
      if (isEditing && imagesToDelete.length > 0) {
        postFormData.append("imagesToDelete", JSON.stringify(imagesToDelete));
      }

      // Keep existing images if editing
      if (isEditing && existingImages.length > 0) {
        postFormData.append("existingImages", JSON.stringify(existingImages));
      }

      // Append new images
      if (formData.images.length > 0) {
        formData.images.forEach((image) => {
          postFormData.append("images", image);
        });
      }

      // Call the appropriate mutation based on whether we're creating or updating
      let response;
      if (isEditing) {
        response = await updatePost.mutateAsync({
          postId,
          data: postFormData,
        });
      } else {
        response = await createPost.mutateAsync(postFormData);
      }

      if (response.success) {
        // Clear form and redirect to post detail or home
        setFormData({
          title: "",
          content: "",
          tags: [],
          images: [],
        });
        setImagePreviewUrls([]);
        setExistingImages([]);
        setImagesToDelete([]);

        // Show success message
        Toast.success(
          isEditing
            ? "Post updated successfully!"
            : "Post created successfully!"
        );

        // Redirect to the post or home page
        if (isEditing) {
          navigate(`/post/${postId}`);
        } else if (response.data?._id) {
          navigate(`/post/${response.data._id}`);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      console.error(
        isEditing ? "Error updating post:" : "Error creating post:",
        error
      );

      // Handle validation errors from server
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        Toast.error(
          error.response?.data?.error ||
            (isEditing
              ? "Failed to update post. Please try again."
              : "Failed to create post. Please try again.")
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the preview tab
  const renderPreview = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="markdown-preview px-6 py-4 rounded-lg bg-[var(--color-bg-secondary)] shadow-lg"
    >
      <h1 className="text-3xl font-bold mb-4 text-[var(--color-text-primary)]">
        {formData.title || "Untitled"}
      </h1>
      {formData.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full text-sm font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="prose prose-invert max-w-none text-[var(--color-text-secondary)]">
        <ReactMarkdown>{formData.content || "No content yet."}</ReactMarkdown>
      </div>
      {imagePreviewUrls.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {imagePreviewUrls.map((url, index) => (
            <div
              key={index}
              className="relative rounded-lg overflow-hidden bg-[var(--color-bg-tertiary)] shadow-md"
            >
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="w-full h-48 object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  if (groupLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--color-bg-light)] w-1/3 rounded"></div>
          <div className="h-24 bg-[var(--color-bg-light)] rounded"></div>
          <div className="flex justify-end">
            <div className="h-10 bg-[var(--color-bg-light)] w-24 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle unauthorized user
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <div className="bg-yellow-900/20 border-l-4 border-yellow-600 p-4 rounded-lg text-yellow-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-500">
                Please log in to create a post.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          {isEditing ? "Edit Post" : "Create New Post"}
        </h1>
        {groupId && group && (
          <div className="mt-2 text-[var(--color-text-secondary)]">
            Posting in group: <span className="font-medium">{group.name}</span>
          </div>
        )}
      </div>

      {/* Show loading indicator while fetching post data in edit mode */}
      {isEditing && postLoading ? (
        <div className="max-w-2xl mx-auto py-8">
          <SkeletonPostDetail />
        </div>
      ) : (
        <div className="bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-lg border border-[var(--color-border)]">
          {/* Page Header with tabs navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-[var(--color-border)]">
            {/* Mode Switching Tabs */}
            <div className="flex mb-4 sm:mb-0 rounded-md overflow-hidden border border-[var(--color-border)] shadow-sm">
              <button
                onClick={() => setActiveTab("write")}
                className={`px-4 py-2 flex items-center text-sm font-medium ${
                  activeTab === "write"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                } transition-colors`}
              >
                <FiEdit className="mr-2" />
                Write
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-4 py-2 flex items-center text-sm font-medium ${
                  activeTab === "preview"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
                } transition-colors`}
              >
                <FiEye className="mr-2" />
                Preview
              </button>
            </div>

            {groupId && group && (
              <div className="flex items-center px-3 py-2 bg-[var(--color-primary)]/10 rounded-md">
                <FiUsers className="h-4 w-4 text-[var(--color-primary)] mr-2" />
                <p className="text-sm text-[var(--color-primary)]">
                  Posting in <strong>{group.name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {errors.submit && (
            <div className="mb-6 bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-500">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div>
            {activeTab === "write" ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="title"
                    className="flex items-center text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    <FiMessageSquare className="mr-2" /> Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter an attention-grabbing title..."
                    className={`w-full px-4 py-3 border ${
                      errors.title
                        ? "border-red-500"
                        : "border-[var(--color-border)]"
                    } bg-[var(--color-bg-secondary)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] text-lg`}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500">{errors.title}</p>
                  )}
                </div>

                {/* Tags Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="tagInput"
                    className="flex items-center text-sm font-medium text-[var(--color-text-secondary)]"
                  >
                    <FiHash className="mr-2" /> Tags
                  </label>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tags.map((tag) => (
                      <motion.span
                        key={tag}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </div>

                  <div className="flex items-center">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        id="tagInput"
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagKeyDown}
                        onBlur={addTag}
                        placeholder="Add relevant tags (press Enter or comma to add)"
                        className={`w-full px-4 py-3 pl-4 pr-10 border ${
                          errors.tags
                            ? "border-red-500"
                            : "border-[var(--color-border)]"
                        } bg-[var(--color-bg-secondary)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)]`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-text-tertiary)]">
                        <FiTag className="h-5 w-5" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={addTag}
                      className="ml-2 btn btn-secondary flex items-center"
                    >
                      <FiPlus className="mr-1" /> Add
                    </button>
                  </div>

                  {errors.tags && (
                    <p className="text-sm text-red-500">{errors.tags}</p>
                  )}
                  <p className="text-xs text-[var(--color-text-tertiary)]">
                    Enter up to 5 tags to help others find your post
                  </p>
                </div>

                {/* Content Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label
                      htmlFor="content"
                      className="flex items-center text-sm font-medium text-[var(--color-text-secondary)]"
                    >
                      <FiFileText className="mr-2" /> Content
                    </label>
                    <a
                      href="https://www.markdownguide.org/cheat-sheet/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center"
                    >
                      <FiInfo className="mr-1" />
                      Markdown Supported
                    </a>
                  </div>

                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    rows={12}
                    placeholder="Write your post content using Markdown..."
                    className={`w-full px-4 py-3 border ${
                      errors.content
                        ? "border-red-500"
                        : "border-[var(--color-border)]"
                    } bg-[var(--color-bg-secondary)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] font-mono text-sm leading-relaxed`}
                  ></textarea>

                  {errors.content && (
                    <p className="text-sm text-red-500">{errors.content}</p>
                  )}
                </div>

                {/* Images Upload */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-[var(--color-text-secondary)]">
                    <FiImage className="mr-2" /> Images
                  </label>

                  <div
                    className={`border-2 border-dashed rounded-lg p-6 ${
                      isDragging
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
                    } transition-all duration-200`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {imagePreviewUrls.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {imagePreviewUrls.map((url, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative aspect-video rounded-lg overflow-hidden group shadow-md"
                            >
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index)}
                                  className="p-2 bg-red-600 text-white rounded-full shadow-lg"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {imagePreviewUrls.length < 10 && (
                          <div className="flex justify-center mt-4">
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/*"
                              multiple
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="btn btn-secondary flex items-center"
                            >
                              <FiPlus className="mr-2" />
                              Add More Images
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <FiImage className="w-12 h-12 text-[var(--color-text-tertiary)] mb-3" />
                        <p className="text-sm text-[var(--color-text-tertiary)] text-center mb-4">
                          Drag images here or click to select
                          <br />
                          <span className="text-xs">
                            Max: 5MB per image (up to 10 images)
                          </span>
                        </p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          multiple
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-primary flex items-center"
                        >
                          <FiUpload className="mr-2" />
                          Select Images
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="btn btn-secondary text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary text-sm px-3 py-1.5 flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <FiLoader className="mr-2 animate-spin" />{" "}
                        {isEditing ? "Updating..." : "Publishing..."}
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" />{" "}
                        {isEditing ? "Update Post" : "Publish Post"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="mb-4 text-sm text-[var(--color-text-secondary)] flex items-center">
                  <FiEye className="mr-2" /> Post Preview
                </div>

                {renderPreview()}

                <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => setActiveTab("write")}
                    className="btn btn-primary text-sm px-3 py-1.5 flex items-center"
                  >
                    <FiEdit className="mr-2" /> Continue Editing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;
