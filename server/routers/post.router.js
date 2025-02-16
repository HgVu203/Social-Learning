import express from "express";
import { PostController } from "../controllers/post.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.post("/", protectedRouter, PostController.createPost);
router.get("/", protectedRouter, PostController.getPosts);
router.get("/:id", protectedRouter, PostController.getPostById);
router.put("/:id", protectedRouter, PostController.updatePost);
router.delete("/:id", protectedRouter, PostController.deletePost);

export default router;