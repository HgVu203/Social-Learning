import axiosService from "./axiosService";

/**
 * Upload an image file to the server
 * @param {File} file The image file to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadImage = async (file) => {
  try {
    // Validate file
    if (!file) {
      throw new Error("No file provided");
    }

    // Check file type
    const validImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
    ];
    if (!validImageTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPG, PNG, and GIF are allowed.");
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File is too large. Maximum size is 5MB.");
    }

    // Create form data
    const formData = new FormData();
    formData.append("image", file);

    console.log(
      "Uploading image:",
      file.name,
      file.type,
      `${(file.size / 1024 / 1024).toFixed(2)}MB`
    );

    // Upload image with progress tracking
    const response = await axiosService.post("/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    });

    console.log("Upload response:", response.data);

    // Check response
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.error || "Failed to upload image");
    }

    // Return the image URL
    return response.data.imageUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export default {
  uploadImage,
};
