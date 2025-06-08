import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { emitMessageEvent, isUserOnline } from "../socket.js";

export const MessageController = {
  sendMessage: async (req, res) => {
    try {
      const { receiverId, message, type, tempId } = req.body;
      const senderId = req.user._id;

      // Validate receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({
          success: false,
          error: "Receiver not found",
        });
      }

      const newMessage = new Message({
        receiverId,
        senderId,
        message,
        type: type || "text",
        read: false,
        // Lưu tempId từ client để có thể map lại khi gửi response
        clientTempId: tempId,
      });
      await newMessage.save();

      // Create notification for receiver
      await new Notification({
        userId: receiverId,
        message: `New message from ${req.user.username}`,
        type: "message",
        relatedId: newMessage._id,
        read: false,
      }).save();

      // Fully populate sender and receiver info to avoid references
      const populatedMessage = await Message.findById(newMessage._id)
        .populate("senderId", "username fullname avatar isOnline")
        .populate("receiverId", "username fullname avatar isOnline");

      if (!populatedMessage) {
        console.error("Failed to populate message after saving");
        return res.status(500).json({
          success: false,
          error: "Failed to process message after saving",
        });
      }

      // Convert to plain object to ensure all data is included
      const messageObject = populatedMessage.toObject();

      // Add tempId nếu client gửi lên để dễ map giữa client và server
      if (tempId) {
        messageObject.tempId = tempId;
      }

      // Add trạng thái online của người nhận
      messageObject.receiverOnline = isUserOnline(receiverId);

      // Log the message object for debugging
      console.log(
        "Prepared message for socket emit:",
        JSON.stringify(messageObject)
      );

      // Emit socket event for real-time updates
      emitMessageEvent("message_sent", messageObject);

      return res.status(200).json({
        success: true,
        message: "Message sent successfully",
        data: messageObject,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getMessages: async (req, res) => {
    try {
      const userId = req.user._id;
      const { partnerId, page = 1, limit = 20, lastSeen } = req.query;

      if (!partnerId) {
        return res.status(400).json({
          success: false,
          error: "Partner ID is required",
        });
      }

      const query = {
        $or: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId },
        ],
        deletedBy: { $ne: userId },
      };

      // Thêm tùy chọn chỉ lấy tin nhắn mới từ lastSeen
      if (lastSeen) {
        try {
          const lastSeenDate = new Date(parseInt(lastSeen));
          if (!isNaN(lastSeenDate.getTime())) {
            query.createdAt = { $gt: lastSeenDate };
          }
        } catch (error) {
          console.warn("Invalid lastSeen parameter:", lastSeen);
        }
      }

      const messages = await Message.find(query)
        .populate("senderId", "username fullname avatar isOnline")
        .populate("receiverId", "username fullname avatar isOnline")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await Message.countDocuments(query);
      const hasMore = Number(page) * Number(limit) < total;

      // Automatically mark unread messages as read when fetched
      const unreadMessages = messages.filter(
        (msg) =>
          msg.receiverId._id.toString() === userId.toString() && !msg.read
      );

      if (unreadMessages.length > 0) {
        // Get IDs of unread messages
        const unreadIds = unreadMessages.map((msg) => msg._id);

        // Mark all these messages as read
        await Message.updateMany(
          { _id: { $in: unreadIds } },
          { $set: { read: true, readAt: new Date() } }
        );

        // Update read status in the result messages
        for (const message of messages) {
          if (unreadIds.includes(message._id)) {
            message.read = true;
            message.readAt = new Date();
          }
        }

        // Emit read events for socket clients
        for (const message of unreadMessages) {
          // Create a copy of the message with updated read status
          const updatedMessage = {
            ...message.toObject(),
            read: true,
            readAt: new Date(),
          };

          // Emit message_read event
          emitMessageEvent("message_read", updatedMessage);
        }
      }

      return res.status(200).json({
        success: true,
        data: messages,
        hasMore,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getConversations: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20 } = req.query;

      // Optimized aggregation pipeline to get all conversations with the last message
      const messagesQuery = [
        // Match messages where the current user is either sender or receiver
        {
          $match: {
            $or: [{ senderId: userId }, { receiverId: userId }],
            deletedBy: { $ne: userId },
          },
        },
        // Sort by creation date (descending)
        { $sort: { createdAt: -1 } },
        // Group by conversation partner
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$senderId", userId] },
                "$receiverId",
                "$senderId",
              ],
            },
            lastMessage: { $first: "$$ROOT" },
            messages: { $push: "$$ROOT" },
          },
        },
        // Lookup user details for the conversation partner
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        // Unwind the user array (should only be one user)
        { $unwind: "$user" },
        // Count unread messages
        {
          $lookup: {
            from: "messages",
            let: { partnerId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$senderId", "$$partnerId"] },
                      { $eq: ["$receiverId", userId] },
                      { $eq: ["$read", false] },
                      { $ne: [{ $in: [userId, "$deletedBy"] }, true] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "unreadMessages",
          },
        },
        // Sort by lastMessage.createdAt descending (most recent first)
        { $sort: { "lastMessage.createdAt": -1 } },
        // Skip and limit for pagination
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) },
        // Project the final result
        {
          $project: {
            _id: "$_id",
            participant: {
              _id: "$user._id",
              username: "$user.username",
              fullname: "$user.fullname",
              profilePicture: "$user.avatar",
              isOnline: "$user.isOnline",
            },
            lastMessage: {
              _id: "$lastMessage._id",
              content: "$lastMessage.message",
              type: "$lastMessage.type",
              sender: "$lastMessage.senderId",
              receiver: "$lastMessage.receiverId",
              read: "$lastMessage.read",
              createdAt: "$lastMessage.createdAt",
            },
            unreadCount: {
              $ifNull: [{ $arrayElemAt: ["$unreadMessages.count", 0] }, 0],
            },
          },
        },
      ];

      const conversations = await Message.aggregate(messagesQuery);

      // Add online status
      for (const conversation of conversations) {
        conversation.participant.isOnline = isUserOnline(
          conversation.participant._id.toString()
        );
      }

      // Calculate total conversations
      const totalCountPipeline = [
        {
          $match: {
            $or: [{ senderId: userId }, { receiverId: userId }],
            deletedBy: { $ne: userId },
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$senderId", userId] },
                "$receiverId",
                "$senderId",
              ],
            },
          },
        },
        { $count: "total" },
      ];

      const totalResult = await Message.aggregate(totalCountPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;

      return res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Error in getConversations:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user._id;

      const unreadCount = await Message.countDocuments({
        receiverId: userId,
        read: false,
        deletedBy: { $ne: userId },
      });

      return res.status(200).json({
        success: true,
        count: unreadCount,
      });
    } catch (error) {
      console.error("Error in getUnreadCount:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      // Find and update message
      const message = await Message.findOneAndUpdate(
        {
          _id: id,
          receiverId: userId,
          read: false,
        },
        {
          $set: { read: true, readAt: new Date() },
        },
        { new: true, runValidators: true }
      )
        .populate("senderId", "username fullname avatar isOnline")
        .populate("receiverId", "username fullname avatar isOnline");

      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found or already read",
        });
      }

      // Emit socket event for message read
      emitMessageEvent("message_read", message);

      return res.status(200).json({
        success: true,
        message: "Message marked as read",
        data: message,
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user._id;
      const { partnerId } = req.body;

      if (!partnerId) {
        return res.status(400).json({
          success: false,
          error: "Partner ID is required",
        });
      }

      // Find all unread messages from the given user
      const unreadMessages = await Message.find({
        senderId: partnerId,
        receiverId: userId,
        read: false,
      }).populate("senderId", "username fullname avatar isOnline");

      if (unreadMessages.length === 0) {
        return res.status(200).json({
          success: true,
          message: "No unread messages found",
          count: 0,
        });
      }

      // Update all messages to read
      await Message.updateMany(
        {
          senderId: partnerId,
          receiverId: userId,
          read: false,
        },
        {
          $set: { read: true, readAt: new Date() },
        }
      );

      // Emit read events for socket
      for (const message of unreadMessages) {
        emitMessageEvent("message_read", {
          ...message.toObject(),
          read: true,
          readAt: new Date(),
        });
      }

      return res.status(200).json({
        success: true,
        message: "All messages marked as read",
        count: unreadMessages.length,
      });
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;

      // Find message and verify ownership
      const message = await Message.findOne({
        _id: id,
        $or: [{ senderId: userId }, { receiverId: userId }],
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found or you don't have permission to delete",
        });
      }

      // Add user to deletedBy array
      if (!message.deletedBy.includes(userId)) {
        message.deletedBy.push(userId);
        await message.save();
      }

      return res.status(200).json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
