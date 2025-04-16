import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import defaultAvatar from "../../assets/images/default-avatar.svg";
import { useAuth } from "../../contexts/AuthContext";
import { useUser } from "../../contexts/UserContext";
import { useUserProfile } from "../../hooks/queries/useUserQueries";
import Toast from "../../utils/toast";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateProfile } = useUser();

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

  useEffect(() => {
    // Redirect to login if user is not authenticated
    if (!user) {
      navigate("/login");
      return;
    }

    // Load profile data if available
    if (profile) {
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
  }, [user, navigate, profile]);

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

      // Validate phone field if provided
      if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
        setSubmitError("Phone number must be 10 digits");
        return;
      }

      // Hiển thị trạng thái đang xử lý
      const loadingToastId = Toast.loading("Đang cập nhật...");

      // Đợi cập nhật hoàn tất
      await updateProfile.mutateAsync({
        userId: user._id,
        ...formData,
      });

      // Cập nhật thông báo thành công
      Toast.update(loadingToastId, "Cập nhật thành công", "success");

      // Đợi 1 giây trước khi chuyển trang
      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (error) {
      console.error("Update profile error:", error);
      setSubmitError(error.message || "Failed to update profile");
      Toast.error(error.message || "Failed to update profile");
    }
  };

  if (profileLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-[#16181c] rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
        </div>

        {submitError && (
          <div className="bg-red-900/20 border-l-4 border-red-500 p-4 mx-6 my-4">
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
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-400">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-[#242526] border border-gray-700">
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
                className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 shadow-md hover:bg-blue-700 cursor-pointer"
              >
                <svg
                  className="h-5 w-5"
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
              <h3 className="text-lg font-medium text-white">
                Profile Picture
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Upload a new profile picture. JPG, PNG or GIF, max 2MB.
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="fullname"
              className="block text-sm font-medium text-gray-300"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#242526] border border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#242526] border border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
              placeholder="10-digit phone number"
            />
            <p className="mt-1 text-xs text-gray-400">Format: 10 digits only</p>
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-300"
            >
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#242526] border border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white"
              placeholder="Your address"
            />
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-300"
            >
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows="4"
              value={formData.bio}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#242526] border border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-white resize-none"
              placeholder="Tell us about yourself"
            ></textarea>
            <p className="mt-1 text-xs text-gray-400">
              Brief description for your profile. Max 200 characters.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="px-4 py-2 bg-[#3a3b3c] text-gray-300 rounded-md hover:bg-[#4d4e4f] shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;
