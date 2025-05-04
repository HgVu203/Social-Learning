import express from "express";
import { UserController } from "../controllers/user.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import optionalAuth from "../middleware/optionalAuth.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { userValidationSchema } from "../utils/validator/user.validator.js";
import { userImageUpload } from "../middleware/upload.cloudinary.js";
import trackUserActivity from "../middleware/trackUserActivity.js";

const router = express.Router();

// Public endpoints with optional authentication
router.get("/profile/:id?", optionalAuth, UserController.getUserProfile);
router.get("/leaderboard", UserController.getLeaderboard);

// Protected routes below
router.use(protectedRouter);

// Tìm kiếm người dùng
router.get("/search", UserController.searchUsers);

// Profile update endpoints
router.patch(
  "/update-profile",
  userImageUpload,
  validateRequest(userValidationSchema.updateProfile),
  UserController.updateProfile
);

// For backward compatibility with existing client code
router.patch(
  "/profile",
  userImageUpload,
  validateRequest(userValidationSchema.updateProfile),
  UserController.updateProfile
);

router.post(
  "/update-points",
  validateRequest(userValidationSchema.updatePoints),
  UserController.updatePoints
);

router.get("/profile/", UserController.myProfile);

// Follow/Unfollow endpoint
router.post("/:id/follow", trackUserActivity, UserController.toggleFollow);

export default router;
