import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Cấu hình Cloudinary
const configureCloudinary = () => {
  // Kiểm tra biến môi trường Cloudinary
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Log thông tin cấu hình (không hiển thị giá trị đầy đủ)
  console.log("Cloudinary configuration check:");
  console.log(`- Cloud name: ${cloudName ? "Defined" : "MISSING"}`);
  console.log(`- API key: ${apiKey ? "Defined" : "MISSING"}`);
  console.log(`- API secret: ${apiSecret ? "Defined" : "MISSING"}`);

  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "❌ Cloudinary configuration is incomplete. File uploads will fail."
    );
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log("✅ Cloudinary configured successfully");
    return true;
  } catch (error) {
    console.error("❌ Error configuring Cloudinary:", error);
    return false;
  }
};

// Thực hiện cấu hình khi module được import
const isCloudinaryConfigured = configureCloudinary();

// Tạo storage cho từng loại đối tượng
const createCloudinaryStorage = (folder) => {
  // Kiểm tra lại cấu hình Cloudinary trước khi tạo storage
  if (!isCloudinaryConfigured) {
    console.error(
      `Cannot create storage for ${folder}. Cloudinary not properly configured.`
    );
    // Trả về storage tạm thời nếu Cloudinary không khả dụng
    // Lưu ý: Điều này sẽ làm lộ lỗi sớm hơn thay vì chờ đến lúc tải lên
    const memoryStorage = multer.memoryStorage();
    return memoryStorage;
  }

  try {
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: folder,
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
        transformation: [{ width: 1000, crop: "limit" }],
        // Tùy chọn: thêm public_id để đặt tên cho file
        public_id: (req, file) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          return file.fieldname + "-" + uniqueSuffix;
        },
      },
      filename: function (req, file, cb) {
        cb(null, file.originalname);
      },
    });
  } catch (error) {
    console.error(`Error creating Cloudinary storage for ${folder}:`, error);
    // Fallback to memory storage
    const memoryStorage = multer.memoryStorage();
    return memoryStorage;
  }
};

// Bộ lọc file
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh (jpeg, jpg, png, gif)"), false);
  }
};

// Middleware cho upload ảnh người dùng
export const userImageUpload = multer({
  storage: createCloudinaryStorage("users"),
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("avatar");

// Middleware cho upload ảnh nhóm
export const groupImageUpload = (req, res, next) => {
  console.log("Starting group image upload middleware");

  try {
    // Check if cloudinary is configured
    if (!isCloudinaryConfigured) {
      console.warn(
        "⚠️ Cloudinary not configured. Proceeding without file upload capability."
      );
      // Continue without file upload capability
      next();
      return;
    }

    // Log request information
    console.log(
      `Request for group upload - method: ${req.method}, contentType: ${req.headers["content-type"]}`
    );

    // Check if this is even a multipart request
    if (!req.headers["content-type"]?.includes("multipart/form-data")) {
      console.log("Not a multipart request, skipping file processing");
      next();
      return;
    }

    const upload = multer({
      storage: createCloudinaryStorage("groups"),
      fileFilter: fileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }).fields([{ name: "coverImage", maxCount: 1 }]);

    upload(req, res, (err) => {
      if (err) {
        console.error("Group image upload error:", err);

        if (err instanceof multer.MulterError) {
          // Multer error (file size, field name, etc)
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              success: false,
              error: "Image size should be less than 2MB",
            });
          } else {
            return res.status(400).json({
              success: false,
              error: `Image upload error: ${err.code}`,
            });
          }
        } else {
          // Check for Cloudinary errors
          if (err.message && err.message.includes("Cloudinary")) {
            console.error("Cloudinary specific error:", err.message);
            // Still allow request to continue without file
            console.warn(
              "Continuing without file upload due to Cloudinary error"
            );
            next();
            return;
          }

          // Other errors
          return res.status(400).json({
            success: false,
            error: err.message || "Error uploading image",
          });
        }
      }

      console.log("Group image upload processing complete");
      if (req.files && Object.keys(req.files).length > 0) {
        console.log("Files received:", Object.keys(req.files));
        // Log file details for debugging but not the full file content
        Object.entries(req.files).forEach(([fieldName, files]) => {
          files.forEach((file, index) => {
            console.log(`File [${fieldName}][${index}]:`, {
              originalname: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              path: file.path || "N/A",
              secure_url: file.secure_url || "N/A",
            });
          });
        });
      } else {
        console.log("No files received in the request");
      }

      // Continue with request
      next();
    });
  } catch (error) {
    console.error("Unhandled exception in groupImageUpload middleware:", error);
    // Don't return an error, continue processing without file
    console.warn("Continuing without file upload due to unhandled error");
    next();
  }
};

// Middleware cho upload hình ảnh bài đăng
export const postImageUpload = (req, res, next) => {
  // Initialize multer with Cloudinary storage
  const upload = multer({
    storage: createCloudinaryStorage("posts"),
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  }).array("images", 10);

  // Execute multer middleware
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        // A Multer-specific error
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            error: "Kích thước file quá lớn (tối đa 5MB)",
          });
        } else {
          return res.status(400).json({
            success: false,
            error: `Lỗi khi upload ảnh: ${err.code}`,
          });
        }
      } else {
        // General error
        return res.status(400).json({
          success: false,
          error: err.message || "Lỗi khi upload ảnh",
        });
      }
    }

    next();
  });
};

// Helper function để upload trực tiếp (không qua middleware)
export const uploadToCloudinary = async (imagePath, folder = "general") => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: folder,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Lỗi khi upload lên Cloudinary:", error);
    throw error;
  }
};

// Helper function để xóa ảnh trên Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa ảnh từ Cloudinary:", error);
    return false;
  }
};

export default {
  userImageUpload,
  groupImageUpload,
  postImageUpload,
  uploadToCloudinary,
  deleteFromCloudinary,
};
