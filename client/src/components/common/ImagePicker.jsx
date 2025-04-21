import { useState, useRef } from "react";
import { FaTimes, FaUpload } from "react-icons/fa";
import { uploadImage } from "../../services/uploadService";
import LoadingSpinner from "./LoadingSpinner";

const ImagePicker = ({ onSelectImage, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files[0]) return;

    try {
      setLoading(true);
      const imageUrl = await uploadImage(fileInputRef.current.files[0]);
      onSelectImage(imageUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Send Image</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <FaTimes />
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 mb-4 flex flex-col items-center justify-center min-h-[200px]">
          {previewUrl ? (
            <div className="w-full">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[300px] mx-auto rounded-lg"
              />
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="mt-2 text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <>
              <FaUpload className="text-4xl text-gray-400 mb-2" />
              <p className="text-gray-400 mb-2">Click to select an image</p>
              <p className="text-gray-500 text-sm">
                Supported formats: JPG, PNG, GIF
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={
              previewUrl
                ? "hidden"
                : "absolute inset-0 opacity-0 cursor-pointer"
            }
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!previewUrl || loading}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 transition flex items-center"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Uploading...</span>
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePicker;
