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
router.get("/users/:id/details", AdminController.getUserDetails);
router.patch("/users/:id", AdminController.updateUser);
router.delete("/users/:id", AdminController.deleteUser);
router.patch("/users/:id/status", AdminController.toggleUserStatus);
router.patch("/users/:id/points", AdminController.updateUserPoints);
router.post("/cache/users/clear", AdminController.clearUsersCache);

// Content Management Routes
router.get("/posts", AdminController.getAllPosts);
router.get("/posts/:id/details", AdminController.getPostDetails);
router.patch("/posts/:id", AdminController.updatePost);
router.patch("/posts/:id/status", AdminController.updatePostStatus);
router.delete("/posts/:id", AdminController.deletePost);
router.patch("/posts/:id/restore", AdminController.restorePost);

// Group Management Routes
router.get("/groups", AdminController.getAllGroups);
router.get("/groups/:id/details", AdminController.getGroupDetails);
router.patch("/groups/:id", AdminController.updateGroup);
router.delete("/groups/:id", AdminController.deleteGroup);

// Dashboard Statistics
router.get("/stats", AdminController.getDashboardStats);
router.get("/stats/basic", AdminController.getDashboardBasicStats);
router.get("/stats/user-growth", AdminController.getUserGrowthData);
router.get("/stats/post-growth", AdminController.getPostGrowthData);
router.get("/stats/recent-activity", AdminController.getRecentActivity);
router.post("/cache/stats/clear", AdminController.clearDashboardStatsCache);

// Cache Management - Combined route to clear all caches
router.post("/cache/clear-all", async (req, res) => {
  try {
    // Gọi các hàm xóa cache
    await AdminController.clearUsersCache(req, res);
    await AdminController.clearDashboardStatsCache(req, res);

    return res.status(200).json({
      success: true,
      message: "All admin caches cleared successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post("/cache/posts/clear", AdminController.clearPostsCache);
router.post("/cache/groups/clear", AdminController.clearGroupsCache);
router.post("/cache/stats/clear", AdminController.clearDashboardStatsCache);
router.post("/cache/clear-all", AdminController.clearAllCache);

export default router;
