import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

export const MessageController = {
    sendMessage: async (req, res) => {
        try {
            const { receiverId, message, type = 'text' } = req.body;
            const senderId = req.user._id;

            // Validate receiver exists
            const receiver = await User.findById(receiverId);
            if (!receiver) {
                return res.status(404).json({
                    success: false,
                    error: "Receiver not found"
                });
            }

            const newMessage = new Message({
                receiverId,
                senderId,
                message,
                type,
                read: false
            });
            await newMessage.save();

            // Create notification for receiver
            await new Notification({
                userId: receiverId,
                message: `New message from ${req.user.username}`,
                type: 'message'
            }).save();

            // Populate sender info
            await newMessage.populate('senderId', 'username avatar');

            return res.status(200).json({
                success: true,
                message: 'Message sent successfully',
                data: newMessage
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getMessages: async (req, res) => {
        try {
            const userId = req.user._id;
            const { partnerId, page = 1, limit = 20 } = req.query;

            const query = partnerId ? {
                $or: [
                    { senderId: userId, receiverId: partnerId },
                    { senderId: partnerId, receiverId: userId }
                ],
                deletedBy: { $ne: userId }
            } : {
                $or: [
                    { senderId: userId },
                    { receiverId: userId }
                ],
                deletedBy: { $ne: userId }
            };

            const messages = await Message.find(query)
                .populate('senderId', 'username avatar')
                .populate('receiverId', 'username avatar')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Message.countDocuments(query);

            // Mark messages as read
            await Message.updateMany(
                { receiverId: userId, read: false },
                { $set: { read: true } }
            );

            return res.status(200).json({
                success: true,
                data: messages,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user._id;
            const count = await Message.countDocuments({
                receiverId: userId,
                read: false,
                deletedBy: { $ne: userId }
            });

            return res.status(200).json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const messageId = req.params.id;
            const userId = req.user._id;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    error: "Message not found"
                });
            }

            if (message.receiverId.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    error: "Unauthorized"
                });
            }

            message.read = true;
            await message.save();

            return res.status(200).json({
                success: true,
                message: "Message marked as read"
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteMessage: async (req, res) => {
        try {
            const messageId = req.params.id;
            const userId = req.user._id;

            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({
                    success: false,
                    error: "Message not found"
                });
            }

            // Add user to deletedBy array
            if (!message.deletedBy.includes(userId)) {
                message.deletedBy.push(userId);
                await message.save();
            }

            return res.status(200).json({
                success: true,
                message: "Message deleted successfully"
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

            // Get latest message from each conversation
            const conversations = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: userId },
                            { receiverId: userId }
                        ],
                        deletedBy: { $ne: userId }
                    }
                },
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$senderId", userId] },
                                "$receiverId",
                                "$senderId"
                            ]
                        },
                        message: { $first: "$$ROOT" }
                    }
                },
                {
                    $skip: (page - 1) * limit
                },
                {
                    $limit: limit
                }
            ]);

            // Populate user info
            await Message.populate(conversations, {
                path: 'message.senderId message.receiverId',
                select: 'username avatar'
            });

            const total = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { senderId: userId },
                            { receiverId: userId }
                        ],
                        deletedBy: { $ne: userId }
                    }
                },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$senderId", userId] },
                                "$receiverId",
                                "$senderId"
                            ]
                        }
                    }
                },
                {
                    $count: "total"
                }
            ]);

            return res.status(200).json({
                success: true,
                data: conversations.map(c => c.message),
                pagination: {
                    total: total[0]?.total || 0,
                    page: parseInt(page),
                    totalPages: Math.ceil((total[0]?.total || 0) / limit)
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};