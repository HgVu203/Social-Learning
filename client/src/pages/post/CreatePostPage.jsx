import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  FiTag,
  FiPlus,
  FiX,
  FiAlertCircle,
  FiCheck,
  FiChevronLeft,
  FiImage,
  FiEye,
  FiEdit,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import Toast from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPost } = usePostContext();
  const fileInputRef = useRef(null);

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
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
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

      // Convert tags array to JSON string to ensure it's properly sent as array
      postFormData.append(
        "tags",
        JSON.stringify(formData.tags.map((tag) => tag.toLowerCase().trim()))
      );

      // Append all images - ensure they're uploaded correctly
      if (formData.images.length > 0) {
        formData.images.forEach((image) => {
          postFormData.append("images", image);
        });
      }

      const result = await createPost.mutateAsync(postFormData);

      if (result.success && result.data && result.data._id) {
        // Show success toast and navigate with delay
        Toast.successWithRedirect(
          "Post created successfully!",
          navigate,
          `/post/${result.data._id}`
        );
      } else {
        // Chỉ hiển thị thông báo lỗi qua toast
        Toast.error(result.error || "Unable to create post");
      }
    } catch (error) {
      console.error("Create post error:", error);
      let errorMessage =
        error.message || "An error occurred. Please try again.";

      // Handle specific error cases
      if (errorMessage.includes("Network connection error")) {
        errorMessage =
          "Network connection error. Please check your internet connection.";
      }

      setErrors({
        submit: errorMessage,
      });
      Toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the preview tab
  const renderPreview = () => (
    <div className="markdown-preview px-4 py-3">
      <h1 className="text-3xl font-bold mb-4">
        {formData.title || "Untitled"}
      </h1>
      {formData.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown>{formData.content || "No content yet."}</ReactMarkdown>
      </div>
      {imagePreviewUrls.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {imagePreviewUrls.map((url, index) => (
            <div
              key={index}
              className="relative rounded-lg overflow-hidden bg-gray-800"
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
    </div>
  );

  // Handle unauthorized user
  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <div className="bg-[#1d1f23] border-l-4 border-yellow-600 p-4 text-yellow-500">
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
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-400 hover:text-blue-300 transition"
          >
            <FiChevronLeft className="mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold">Create New Post</h1>
          <div className="w-24"></div> {/* Spacer for alignment */}
        </div>

        {/* Errors Alert */}
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

        {activeTab === "write" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images Upload */}
            <div
              className={`bg-[#121212] shadow-sm rounded-lg overflow-hidden border-2 border-dashed ${
                isDragging
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-700"
              } transition-all duration-200`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    Images
                  </h3>
                  <p className="text-sm text-gray-500">
                    Upload up to 10 images. Drag and drop or click to select.
                    <br />
                    Max size per image: 5MB
                  </p>
                </div>

                {/* Image Grid */}
                {imagePreviewUrls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    {imagePreviewUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-video rounded-lg overflow-hidden group"
                      >
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <FiImage className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-400 text-center mb-4">
                      Drag and drop images here, or click to select
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <FiPlus className="mr-2" />
                      Select Images
                    </button>
                  </div>
                )}

                {/* Add More Button */}
                {imagePreviewUrls.length > 0 &&
                  imagePreviewUrls.length < 10 && (
                    <div className="flex justify-center">
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
                        className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <FiPlus className="mr-2" />
                        Add More Images
                      </button>
                    </div>
                  )}
              </div>
            </div>

            <div className="bg-[#121212] shadow-sm rounded-lg overflow-hidden">
              {/* Title Input */}
              <div className="p-6 border-b border-gray-800">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter an attention-grabbing title..."
                  className={`w-full px-3 py-2 border ${
                    errors.title ? "border-red-500" : "border-gray-700"
                  } bg-[#1a1a1a] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-lg`}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              {/* Tags Input */}
              <div className="p-6 border-b border-gray-800">
                <label
                  htmlFor="tags"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900/30 text-blue-400"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-blue-400 hover:text-blue-300"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </span>
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
                      className={`w-full px-3 py-2 pl-3 pr-10 border ${
                        errors.tags ? "border-red-500" : "border-gray-700"
                      } bg-[#1a1a1a] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      <FiTag className="h-5 w-5" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addTag}
                    className="ml-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 flex items-center"
                  >
                    <FiPlus className="mr-1" /> Add
                  </button>
                </div>
                {errors.tags && (
                  <p className="mt-1 text-sm text-red-500">{errors.tags}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter relevant tags to help others find your post
                </p>
              </div>

              {/* Content Input */}
              <div className="p-6">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Content
                </label>
                <div className="mb-1 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Markdown supported
                  </span>
                  <a
                    href="https://www.markdownguide.org/cheat-sheet/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Markdown Cheatsheet
                  </a>
                </div>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={15}
                  placeholder="Write your post content using Markdown..."
                  className={`w-full px-3 py-2 border ${
                    errors.content ? "border-red-500" : "border-gray-700"
                  } bg-[#1a1a1a] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono text-sm leading-relaxed`}
                ></textarea>
                {errors.content && (
                  <p className="mt-1 text-sm text-red-500">{errors.content}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm ${
                  isSubmitting
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:bg-blue-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center`}
              >
                {isSubmitting ? (
                  <>
                    <FiSave className="mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" /> Create Post
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Preview Tab */
          <div className="mb-6">
            <div className="mb-4 text-sm text-gray-400 flex items-center">
              <FiEye className="mr-1" /> Preview your post
            </div>
            {renderPreview()}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveTab("write")}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center"
              >
                <FiEdit className="mr-2" /> Back to Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
