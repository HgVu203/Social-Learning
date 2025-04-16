import multer from "multer";
import path from "path";
import fs from "fs";

// Đảm bảo thư mục tồn tại
const createDirIfNotExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Cấu hình lưu trữ
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads";
    const entityType = req.baseUrl.split("/").pop(); // Lấy loại thực thể từ URL (group, user, etc.)
    const targetDir = path.join(uploadDir, entityType);

    createDirIfNotExists(targetDir);
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Bộ lọc tệp
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận tệp hình ảnh (jpeg, jpg, png, gif)"), false);
  }
};

// Tạo middleware upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Giới hạn 2MB
  },
  fileFilter: fileFilter,
});

// Middleware cho upload ảnh nhóm
export const groupImageUpload = upload.fields([
  { name: "avatarImage", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

// Middleware cho upload ảnh người dùng
export const userImageUpload = upload.single("avatar");

// Middleware cho upload hình ảnh bài đăng
export const postImageUpload = upload.array("images", 10);

export default upload;
