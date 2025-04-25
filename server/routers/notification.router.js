import express from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import protectedRouter from "../middleware/protectedRouter.js";

const router = express.Router();

// Apply authentication middleware to all notification routes
router.use(protectedRouter);

// Get all notifications for the current user
router.get("/", NotificationController.getNotifications);

// Get unread notification count
router.get("/unread-count", NotificationController.getUnreadCount);

// Create a new notification
router.post("/", NotificationController.createNotification);

// Mark a specific notification as read
router.patch("/:notificationId/read", NotificationController.markAsRead);

// Mark all notifications as read
router.patch("/read-all", NotificationController.markAllAsRead);

// Delete a notification
router.delete("/:notificationId", NotificationController.deleteNotification);

export default router;
