import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌ Cloudinary configuration is incomplete");
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return true;
  } catch (error) {
    console.error("❌ Error configuring Cloudinary:", error);
    return false;
  }
};

const isCloudinaryConfigured = configureCloudinary();

const createCloudinaryStorage = (folder) => {
  if (!isCloudinaryConfigured) {
    return multer.memoryStorage();
  }

  try {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder,
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
        transformation: [{ width: 1000, crop: "limit" }],
        public_id: (req, file) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          return file.fieldname + "-" + uniqueSuffix;
        },
      },
      filename: (req, file, cb) => cb(null, file.originalname),
    });
  } catch (error) {
    console.error(`Error creating storage for ${folder}:`, error);
    return multer.memoryStorage();
  }
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Just accept image file (jpeg, jpg, png, gif)"), false);
  }
};

const multerConfig = {
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
};

export const userImageUpload = multer({
  storage: createCloudinaryStorage("users"),
  ...multerConfig,
}).single("avatar");

export const groupImageUpload = (req, res, next) => {
  if (!isCloudinaryConfigured) {
    return next();
  }

  if (!req.headers["content-type"]?.includes("multipart/form-data")) {
    return next();
  }

  const upload = multer({
    storage: createCloudinaryStorage("groups"),
    ...multerConfig,
  }).fields([{ name: "coverImage", maxCount: 1 }]);

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "Image size should be less than 5MB"
              : `Image upload error: ${err.code} - ${err.message}`,
        });
      }

      if (
        err.message?.includes("Cloudinary") ||
        err.message?.includes("cloud")
      ) {
        return next();
      }

      return res.status(400).json({
        success: false,
        error: err.message || "Error uploading image",
      });
    }
    next();
  });
};

export const postImageUpload = (req, res, next) => {
  const upload = multer({
    storage: createCloudinaryStorage("posts"),
    ...multerConfig,
  }).array("images", 10);

  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "Image size should be less than 5MB"
              : `Image upload error: ${err.code}`,
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || "Error uploading image",
      });
    }
    next();
  });
};

export const messageImageUpload = multer({
  storage: createCloudinaryStorage("messages"),
  ...multerConfig,
}).single("image");

export const uploadToCloudinary = async (imagePath, folder = "general") => {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary not configured properly");
  }

  try {
    return await cloudinary.uploader.upload(imagePath, {
      folder,
      resource_type: "auto",
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

export const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary not configured properly");
  }

  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
};

export default {
  userImageUpload,
  groupImageUpload,
  postImageUpload,
  messageImageUpload,
  uploadToCloudinary,
  deleteFromCloudinary,
};
