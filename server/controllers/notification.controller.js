import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { emitNotificationEvent } from "../socket.js";

export const NotificationController = {
  getNotifications: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await Notification.countDocuments({ userId });
      const unreadCount = await Notification.countDocuments({
        userId,
        read: false,
      });

      return res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          total,
          unreadCount,
          page: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const userId = req.user._id;
      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: "Notification not found",
        });
      }

      notification.read = true;
      await notification.save();

      return res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } }
      );

      return res.status(200).json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user._id;

      const count = await Notification.countDocuments({
        userId,
        read: false,
      });

      return res.status(200).json({
        success: true,
        count,
      });
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const userId = req.user._id;
      const { notificationId } = req.params;

      const notification = await Notification.findOne({
        _id: notificationId,
        userId,
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: "Notification not found",
        });
      }

      await Notification.deleteOne({ _id: notificationId });

      return res.status(200).json({
        success: true,
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  createNotification: async (req, res) => {
    try {
      const { userId, message, type, relatedId, senderId } = req.body;

      // If senderId is provided, fetch the sender's data
      let senderData = null;
      if (senderId) {
        const sender = await User.findById(senderId).select("username avatar");
        if (sender) {
          senderData = {
            _id: sender._id,
            username: sender.username,
            avatar: sender.avatar,
          };
        }
      }

      const newNotification = new Notification({
        userId,
        message,
        type,
        relatedId,
        sender: senderData, // Add sender information to the notification
        read: false,
      });

      await newNotification.save();

      // Emit socket event for real-time notification
      emitNotificationEvent(userId, newNotification);

      return res.status(201).json({
        success: true,
        message: "Notification created successfully",
        data: newNotification,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
