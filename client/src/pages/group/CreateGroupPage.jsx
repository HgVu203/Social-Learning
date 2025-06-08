import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiImage, FiUpload, FiX } from "react-icons/fi";
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { useGroup } from "../../contexts/GroupContext";
import { useTranslation } from "react-i18next";

const CreateGroupPage = () => {
  const { t } = useTranslation();
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
      showErrorToast(t("errors.fileTooLarge", { size: "2MB" }));
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
      showErrorToast(t("group.groupNameMinLength"));
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
        showSuccessToast(t("group.createdSuccessfully"));
        navigate(`/groups/${response.data._id}`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("Failed to create group:", err);
      showErrorToast(
        err?.response?.data?.error || err?.message || t("group.failedToCreate")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">
        {t("group.createNewGroup")}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image Upload */}
        <div className="relative bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            {t("group.groupCoverImage")}
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
                <FiImage className="mx-auto text-[var(--color-text-secondary)] text-3xl mb-2" />
                <p className="text-[var(--color-text-secondary)]">
                  {t("group.coverImageOptional")}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {t("group.recommendedSize")}
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
            {coverPreview ? t("group.changeCover") : t("group.addCoverImage")}
          </label>
        </div>

        {/* Group Info */}
        <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] p-4">
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
            {t("group.groupInformation")}
          </h3>

          {/* Group Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-[var(--color-text-primary)] font-medium mb-2"
            >
              {t("group.groupName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("group.groupNamePlaceholder")}
              className="w-full p-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] focus:outline-none transition-colors"
              required
              minLength={3}
            />
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {t("group.groupNameMinLength")}
            </p>
          </div>

          {/* Group Description */}
          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-[var(--color-text-primary)] font-medium mb-2"
            >
              {t("group.description")}
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t("group.descriptionPlaceholder")}
              rows={4}
              className="w-full p-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] focus:outline-none transition-colors"
            ></textarea>
          </div>

          {/* Privacy Setting */}
          <div className="mt-6">
            <h4 className="text-[var(--color-text-primary)] font-medium mb-2">
              {t("group.groupPrivacy")}
            </h4>

            <div className="flex items-start mb-2">
              <div className="flex items-center h-5">
                <input
                  id="isPrivate"
                  name="isPrivate"
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] focus:ring-[var(--color-primary)] text-[var(--color-primary)]"
                />
              </div>
              <div className="ml-3">
                <label
                  htmlFor="isPrivate"
                  className="text-[var(--color-text-primary)] font-medium"
                >
                  {t("group.isPrivate")}
                </label>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {formData.isPrivate
                    ? t("group.privateDescription")
                    : t("group.publicDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.name.trim()}
          className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          {isSubmitting ? t("group.creatingGroup") : t("group.createButton")}
        </button>
      </form>
    </div>
  );
};

export default CreateGroupPage;
