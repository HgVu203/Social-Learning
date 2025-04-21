import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiImage, FiUpload, FiX } from "react-icons/fi";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { useGroup } from "../../contexts/GroupContext";

const CreateGroupPage = () => {
  const { createGroup } = useGroup();
  const navigate = useNavigate();

  // Prevent any incorrect API calls when this component mounts
  useEffect(() => {
    // No need to fetch any data when creating a new group
    console.log("Create group page mounted");
    return () => {
      console.log("Create group page unmounted");
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPrivate: false,
    coverImage: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
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

    // Update form data
    setFormData({
      ...formData,
      coverImage: file,
    });

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({
      ...formData,
      coverImage: null,
    });
    setCoverPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || formData.name.trim().length < 3) {
      showErrorToast("Group name must be at least 3 characters");
      return;
    }

    try {
      setIsSubmitting(true);

      // Create form data object for file upload
      const groupFormData = new FormData();
      groupFormData.append("name", formData.name.trim());
      groupFormData.append("description", formData.description?.trim() || "");

      // Convert boolean to string value explicitly
      groupFormData.append("isPrivate", String(formData.isPrivate));

      // Add coverImage only if it exists
      if (formData.coverImage) {
        groupFormData.append("coverImage", formData.coverImage);
      }

      console.log("Submitting group with data:", {
        name: formData.name,
        description: formData.description,
        isPrivate: formData.isPrivate,
        isPrivateType: typeof formData.isPrivate,
        hasCoverImage: !!formData.coverImage,
      });

      const response = await createGroup.mutateAsync(groupFormData);
      console.log("Create group response:", response);

      if (response && response.data) {
        showSuccessToast("Group created successfully!");
        navigate(`/groups/${response.data._id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
      showErrorToast(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to create group. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">
        Create New Group
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image Upload */}
        <div className="relative bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            Group Cover Image
          </h3>

          <div
            className={`h-56 rounded-lg flex items-center justify-center ${
              coverPreview
                ? ""
                : "border-2 border-dashed border-[var(--color-border)]"
            }`}
            style={
              coverPreview
                ? {
                    backgroundImage: `url(${coverPreview})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}
            }
          >
            {!coverPreview && (
              <div className="text-center">
                <FiImage className="mx-auto text-[var(--color-text-tertiary)] text-3xl mb-2" />
                <p className="text-[var(--color-text-tertiary)]">
                  Cover Image (Optional)
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  Recommended size: 820 x 312 pixels
                </p>
              </div>
            )}

            {coverPreview && (
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-12 right-6 bg-[var(--color-bg-tertiary)] bg-opacity-50 text-[var(--color-text-primary)] p-2 rounded-full hover:bg-opacity-70"
              >
                <FiX />
              </button>
            )}
          </div>

          <input
            type="file"
            id="coverImage"
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <label
            htmlFor="coverImage"
            className="absolute bottom-6 right-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-md px-4 py-2 text-sm font-medium flex items-center cursor-pointer text-white transition-colors"
          >
            <FiUpload className="mr-2" />
            {coverPreview ? "Change Cover" : "Add Cover Image"}
          </label>
        </div>

        {/* Group Info */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            Group Information
          </h3>

          {/* Group Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
            >
              Group Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter group name"
              className="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Group Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe what your group is about"
              className="w-full px-4 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              className="h-4 w-4 text-[var(--color-primary)] border-[var(--color-border)] rounded focus:ring-[var(--color-primary)] bg-[var(--color-bg-tertiary)]"
            />
            <label
              htmlFor="isPrivate"
              className="ml-2 block text-[var(--color-text-secondary)] text-sm"
            >
              Private Group (Only members can see posts)
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/groups")}
            className="px-6 py-2.5 mr-2 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroupPage;
