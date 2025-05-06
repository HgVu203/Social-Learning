import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protectedRouter);
router.use(isAdmin);

// User Management Routes
router.get("/users", AdminController.getAllUsers);
router.patch("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);
router.patch("/users/:id/status", AdminController.toggleUserStatus);
router.patch("/users/:id/points", AdminController.updateUserPoints);

// Content Management Routes
router.get("/posts", AdminController.getAllPosts);
router.patch("/posts/:id", AdminController.updatePost);
router.patch("/posts/:id/status", AdminController.updatePostStatus);
router.delete("/posts/:id", AdminController.deletePost);
router.patch("/posts/:id/restore", AdminController.restorePost);

// Group Management Routes
router.get("/groups", AdminController.getAllGroups);
router.patch("/groups/:id", AdminController.updateGroup);
router.delete("/groups/:id", AdminController.deleteGroup);

// Dashboard Statistics
router.get("/stats", AdminController.getDashboardStats);

export default router;
