import express from "express";
import { PostController } from "../controllers/post.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import optionalAuth from "../middleware/optionalAuth.js";
import isAdmin from "../middleware/isAdmin.js";
import trackUserActivity from "../middleware/trackUserActivity.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { postValidationSchema } from "../utils/validator/post.validator.js";
import rateLimit from "express-rate-limit";
import { postImageUpload } from "../middleware/upload.cloudinary.js";

const router = express.Router();

// Rate limiters
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: "Too many comments" },
});

const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, error: "Too many posts" },
});

// Public routes with optional authentication
router.get("/", optionalAuth, PostController.getPosts);

router.get("/search", optionalAuth, PostController.searchPosts);

router.get("/recommend", protectedRouter, PostController.recommendPosts);

router.get("/:id", optionalAuth, PostController.getPostById);

router.get("/:id/comments", optionalAuth, PostController.getComments);

// Protected routes
router.use(protectedRouter);

// Post management
router.post(
  "/create-post",
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
  "/:id/comment/:commentId",
  validateRequest(postValidationSchema.comment),
  trackUserActivity,
  PostController.updateComment
);

router.delete(
  "/:id/comment/:commentId",
  trackUserActivity,
  PostController.deleteComment
);

router.post("/:id/like", trackUserActivity, PostController.likePost);

router.post(
  "/:id/comment/:commentId/like",
  trackUserActivity,
  PostController.likeComment
);

export default router;
