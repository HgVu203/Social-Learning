import express from "express";
import { PostController } from "../controllers/post.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import isAdmin from "../middleware/isAdmin.js";
import trackUserActivity from "../middleware/trackUserActivity.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { validateQuery } from "../middleware/validateQuery.js";
import { postValidationSchema } from "../utils/validator/post.validator.js";
import { queryValidationSchema } from "../utils/validator/query.validator.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Rate limiters
const commentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: { success: false, error: 'Too many comments' }
});

const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { success: false, error: 'Too many posts' }
});

// Public routes
router.get("/",
    validateQuery(queryValidationSchema.pagination),
    PostController.getPosts
);

router.get("/search",
    validateQuery(queryValidationSchema.search),
    PostController.searchPosts
);

router.get("/recommend",
    protectedRouter,
    PostController.recommendPosts
);

router.get("/:id", PostController.getPostById);
router.get("/:id/comments", PostController.getComments);

// Protected routes
router.use(protectedRouter);

// Post management
router.post("/",
    postLimiter,
    validateRequest(postValidationSchema.create),
    trackUserActivity,
    PostController.createPost
);

router.patch("/:id",
    validateRequest(postValidationSchema.update),
    PostController.updatePost
);

router.delete("/:id",
    PostController.deletePost
);

router.patch("/:id/restore",
    isAdmin,
    PostController.restorePost
);

// Interactions
router.post("/:id/comment",
    commentLimiter,
    validateRequest(postValidationSchema.comment),
    trackUserActivity,
    PostController.addComment
);

router.post("/:id/like",
    trackUserActivity,
    PostController.likePost
);

export default router;