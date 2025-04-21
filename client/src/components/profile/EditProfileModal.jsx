import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import { useAuth } from "../../contexts/AuthContext";
import { useUpdateProfile } from "../../hooks/mutations/useUserMutations";
import { useUserProfile } from "../../hooks/queries/useUserQueries";
import { showSuccessToast, showErrorToast } from "../../utils/toast";

const EditProfileModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const { data: profileData, isLoading: profileLoading } = useUserProfile(
    user?._id
  );
  const profile = profileData?.data;

  const [formData, setFormData] = useState({
    fullname: "",
    phone: "",
    address: "",
    bio: "",
    avatar: "",
  });
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // For debugging
  useEffect(() => {
    console.log("Auth user in EditProfileModal:", user);
    console.log("Profile data from query:", profileData);
  }, [user, profileData]);

  useEffect(() => {
    if (profile) {
      console.log("Setting form data from profile:", profile);
      setFormData({
        fullname: profile.fullname || "",
        phone: profile.phone || "",
        address: profile.address || "",
        bio: profile.bio || "",
        avatar: profile.avatar || "",
      });
      setPreviewAvatar(profile.avatar || "");
      setIsLoading(false);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please upload an image file");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setSubmitError("Image size should be less than 2MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewAvatar(reader.result);
      setFormData((prev) => ({
        ...prev,
        avatar: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitError("");

      if (!user || !user._id) {
        setSubmitError("User authentication error. Please log in again.");
        return;
      }

      // Validate phone field if provided
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        setSubmitError("Phone number must be 10 digits");
        return;
      }

      console.log("Submitting profile update:", formData);

      // Don't include userId in the payload - server gets it from the auth token
      const response = await updateProfile.mutateAsync(formData);

      console.log("Profile update response:", response);

      if (response.success) {
        // Immediately close the modal
        onClose();
      } else {
        setSubmitError(response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update profile";
      setSubmitError(errorMessage);
    }
  };

  // Display error if user is not found or not logged in
  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-4 rounded">
          <p className="text-sm text-red-500">
            User not found. Please log in again.
          </p>
        </div>
        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)]"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  if (profileLoading || isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      {submitError && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-4 rounded">
          <p className="text-sm text-red-500">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={defaultAvatar}
                  alt="Default profile"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-[var(--color-primary)] text-white rounded-full p-1.5 shadow-md hover:bg-[var(--color-primary-hover)] cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Upload a new profile picture. JPG, PNG or GIF, max 2MB.
            </p>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label
            htmlFor="fullname"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            className="mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Phone Number
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="10-digit phone number"
            className="mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          />
          <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
            Format: 10 digits only
          </p>
        </div>

        {/* Address */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Your address"
            className="mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-[var(--color-text-secondary)]"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows="3"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself"
            className="mt-1 block w-full border border-[var(--color-border)] rounded-md shadow-sm py-2 px-3 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
          ></textarea>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--color-border)] rounded-md text-[var(--color-text-primary)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditProfileModal;
