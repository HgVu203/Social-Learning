import express from "express";
import { messageImageUpload } from "../middleware/upload.cloudinary.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.use(protectedRouter);

// Upload image route
router.post("/image", messageImageUpload, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // Return the image URL from Cloudinary
    return res.status(200).json({
      success: true,
      imageUrl: req.file.path || req.file.secure_url,
    });
  } catch (error) {
    console.error("Error in image upload:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Error uploading image",
    });
  }
});

export default router;
