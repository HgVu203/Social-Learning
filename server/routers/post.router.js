import express from "express";
import { PostController } from "../controllers/post.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import optionalAuth from "../middleware/optionalAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import trackUserActivity from "../middleware/trackUserActivity.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { postValidationSchema } from "../utils/validator/post.validator.js";
import rateLimit from "express-rate-limit";
import {
  postImageUpload,
  messageImageUpload,
} from "../middleware/upload.cloudinary.js";

const router = express.Router();

// Rate limiters
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: "Too many comments" },
});

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { success: false, error: "Too many posts" },
});

// *** EXACT PATH ROUTES (NOT PARAMETERIZED) ***
// These must come BEFORE any routes with parameters like :id

// Public routes with optional auth
router.get("/", optionalAuth, PostController.getPosts);
router.get("/search", optionalAuth, PostController.searchPosts);

// Protected exact paths - CRITICAL: these must be BEFORE parameterized routes
router.use("/recommended", protectedRouter);
router.get("/recommended", PostController.getRecommendedPosts);

// Specific routes - best practice to put specific routes before parameterized routes
// *** PARAMETERIZED ROUTES ***
// Public routes with optional auth
router.get(
  "/:id",
  optionalAuth,
  trackUserActivity,
  PostController.unifiedGetPost
);
router.get("/:id/comments", optionalAuth, PostController.getComments);

// All remaining routes require authentication
router.use(protectedRouter);

// Post management
router.post(
  "/",
  postLimiter,
  postImageUpload,
  validateRequest(postValidationSchema.create),
  trackUserActivity,
  PostController.createPost
);

router.patch(
  "/:id",
  validateRequest(postValidationSchema.update),
  PostController.updatePost
);

router.delete("/:id", PostController.deletePost);

router.patch("/:id/restore", isAdmin, PostController.restorePost);

// Interactions
router.post(
  "/:id/comment",
  commentLimiter,
  validateRequest(postValidationSchema.comment),
  trackUserActivity,
  PostController.addComment
);

router.put(
  "/:id/comments/:commentId",
  validateRequest(postValidationSchema.addComment),
  trackUserActivity,
  PostController.updateComment
);

router.delete(
  "/:id/comments/:commentId",
  trackUserActivity,
  PostController.deleteComment
);

router.post("/:id/like", trackUserActivity, PostController.likePost);

router.post(
  "/:id/comments/:commentId/like",
  trackUserActivity,
  PostController.likeComment
);

// Post comment routes
router.post(
  "/:id/comments",
  commentLimiter,
  validateRequest(postValidationSchema.addComment),
  trackUserActivity,
  PostController.addComment
);
router.patch(
  "/:id/comments/:commentId",
  validateRequest(postValidationSchema.updateComment),
  PostController.updateComment
);
router.delete("/:id/comments/:commentId", PostController.deleteComment);

export default router;
