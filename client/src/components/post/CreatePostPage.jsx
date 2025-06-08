import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { TagIcon } from "@heroicons/react/24/outline";
import {
  showSuccessToast,
  showErrorToast,
  showSuccessWithDelay,
} from "../../utils/toast";
import { useAuth } from "../../contexts/AuthContext";
import { usePostContext } from "../../contexts/PostContext";
import { useTranslation } from "react-i18next";

const CreatePostPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createPost } = usePostContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState("write"); // 'write' or 'preview'

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

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Content is required";
    }
    if (formData.tags.length === 0) {
      newErrors.tags = "At least one tag is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setErrors({}); // Clear previous errors
    setIsSubmitting(true);

    try {
      const postData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        tags: formData.tags.map((tag) => tag.toLowerCase().trim()),
      };

      const result = await createPost.mutateAsync(postData);

      if (result.success && result.data && result.data._id) {
        // Show success toast
        showSuccessToast(t("post.createSuccess"));
        // Navigate to the new post
        navigate(`/post/${result.data._id}`);
      } else {
        setErrors({
          submit:
            result.error ||
            "Failed to create post: Invalid response from server",
        });
      }
    } catch (error) {
      console.error("Create post error:", error);
      let errorMessage =
        error.message || "An unexpected error occurred. Please try again.";

      // Handle specific error cases
      if (errorMessage.includes("Network connection error")) {
        errorMessage =
          "Unable to connect to server. Please check your internet connection and try again.";
      } else if (errorMessage.includes("Please login")) {
        errorMessage =
          "Your session has expired. Please login again to create a post.";
        // Save form data to localStorage
        localStorage.setItem("draftPost", JSON.stringify(formData));
        // Redirect to login page
        setTimeout(() => navigate("/login"), 2000);
      }

      setErrors({
        submit: errorMessage,
      });
      showErrorToast(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load draft post if exists
  useEffect(() => {
    const draftPost = localStorage.getItem("draftPost");
    if (draftPost) {
      try {
        const parsedDraft = JSON.parse(draftPost);
        setFormData(parsedDraft);
        localStorage.removeItem("draftPost"); // Clear draft after loading
        showSuccessWithDelay("Draft loaded successfully", "info");
      } catch (error) {
        console.error("Error loading draft:", error);
        localStorage.removeItem("draftPost");
      }
    }
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const autosaveInterval = setInterval(() => {
      if (formData.title || formData.content || formData.tags.length > 0) {
        localStorage.setItem("draftPost", JSON.stringify(formData));
      }
    }, 30000);

    return () => clearInterval(autosaveInterval);
  }, [formData]);

  const renderPreview = () => (
    <div className="p-6 space-y-6 bg-[#1d1f23] rounded-lg shadow-sm">
      <div className="prose max-w-none prose-invert">
        <h1 className="text-3xl font-bold text-white">
          {formData.title || "No title yet"}
        </h1>
        <div className="flex flex-wrap gap-2 my-4">
          {formData.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-sm bg-blue-800/30 text-blue-400 rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-6 prose-sm sm:prose lg:prose-lg prose-invert">
          <ReactMarkdown>{formData.content || "No content yet"}</ReactMarkdown>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-4">
        <div className="bg-[#1d1f23] border-l-4 border-yellow-600 p-4 text-yellow-500">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
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
    <div className="min-h-screen bg-[#16181c] py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Errors Alert */}
        {errors.submit && (
          <div className="mb-6 bg-red-900/20 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-500">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Create New Post</h1>
          <button
            onClick={() =>
              setActiveTab(activeTab === "write" ? "preview" : "write")
            }
            className="flex items-center text-sm px-3 py-1.5 bg-[#1d1f23] rounded-md text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            {activeTab === "write" ? "Preview" : "Edit"}
          </button>
        </div>

        {activeTab === "write" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#1d1f23] shadow-sm rounded-lg overflow-hidden">
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
                  placeholder="Enter post title"
                  className={`w-full px-3 py-2 border ${
                    errors.title ? "border-red-500" : "border-gray-700"
                  } bg-[#16181c] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}
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
                  Tags (maximum 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center bg-blue-800/30 text-blue-400 rounded-full px-3 py-1 text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-blue-400 hover:text-blue-300"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
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
                      placeholder="Add tag (press Enter or comma to add)"
                      className={`w-full px-3 py-2 border ${
                        errors.tags ? "border-red-500" : "border-gray-700"
                      } bg-[#16181c] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                      <TagIcon className="h-5 w-5" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addTag}
                    className="ml-2 px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                {errors.tags && (
                  <p className="mt-1 text-sm text-red-500">{errors.tags}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Enter related tags to help others find your post
                </p>
              </div>

              {/* Content Input */}
              <div className="p-6">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Content (Markdown supported)
                </label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={12}
                  placeholder="Write post content here..."
                  className={`w-full px-3 py-2 border ${
                    errors.content ? "border-red-500" : "border-gray-700"
                  } bg-[#16181c] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}
                ></textarea>
                {errors.content && (
                  <p className="mt-1 text-sm text-red-500">{errors.content}</p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  <p className="font-medium mb-1">Markdown hints:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <p># Title 1</p>
                    <p>**Bold**</p>
                    <p>* List item</p>
                    <p>[Link](url)</p>
                    <p>![Alt text](url image)</p>
                    <p>`code`</p>
                  </div>
                </div>
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
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {isSubmitting ? "Creating..." : "Create Post"}
              </button>
            </div>
          </form>
        ) : (
          /* Preview Tab */
          <div className="mb-6">
            <div className="mb-4 text-sm text-gray-400">Preview your post</div>
            {renderPreview()}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveTab("write")}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostPage;
