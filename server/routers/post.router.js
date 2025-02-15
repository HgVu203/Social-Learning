import express from "express";
import { PostController } from "../controllers/post.controller.js";
import passport from "passport";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

router.post("/", passport.authenticate('jwt', { session: false }), PostController.createPost);
router.get("/", PostController.getPosts);
router.get("/:id", PostController.getPostById);
router.put("/:id", passport.authenticate('jwt', { session: false }), PostController.updatePost);
router.delete("/:id", passport.authenticate('jwt', { session: false }), PostController.deletePost);

export default router;