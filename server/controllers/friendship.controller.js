import Friendship from "../models/friendship.model.js";
import Notification from "../models/notification.model.js";

export const FriendshipController = {
    sendFriend: async (req, res) => {
        try {
            const { friendId } = req.body;
            const userId = req.user._id;

            if (userId.toString() === friendId) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot send friend request to yourself'
                });
            }

            const existingFriendship = await Friendship.findOne({
                $or: [
                    { userId, friendId },
                    { userId: friendId, friendId: userId }
                ]
            });

            if (existingFriendship) {
                return res.status(400).json({
                    success: false,
                    error: 'Friend request already exists'
                });
            }

            const newFriendship = new Friendship({
                userId,
                friendId,
                status: 'pending',
                initiatedBy: userId
            });
            await newFriendship.save();

            await new Notification({
                userId: friendId,
                message: `${req.user.username} sent you a friend request`,
                type: 'friend_request'
            }).save();

            return res.status(200).json({
                success: true,
                message: 'Friend request sent successfully'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    acceptFriend: async (req, res) => {
        try {
            const { friendId } = req.body;
            const userId = req.user._id;

            const friendship = await Friendship.findOne({
                userId: friendId,
                friendId: userId,
                status: 'pending'
            });

            if (!friendship) {
                return res.status(400).json({
                    success: false,
                    error: 'Friend not found'
                });
            }

            friendship.status = 'accepted';
            await friendship.save();

            await new Notification({
                userId: friendId,
                message: `${req.user.username} accepted your friend`,
            }).save();

            return res.status(200).json({
                success: true,
                message: 'Friend request accepted successfully'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    rejectFriend: async (req, res) => {
        try {
            const { friendId } = req.body;
            const userId = req.user._id;

            await Friendship.findOneAndDelete({
                userId: friendId,
                friendId: userId,
                status: 'pending'
            });

            return res.status(200).json({
                success: true,
                message: 'Friend rejected successfully'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getFriends: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user._id;

            const friendships = await Friendship.find({
                $or: [{ userId }, { friendId: userId }],
                status: 'accepted'
            })
                .populate('userId', 'username email avatar')
                .populate('friendId', 'username email avatar')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Friendship.countDocuments({
                $or: [{ userId }, { friendId: userId }],
                status: 'accepted'
            });

            const friends = friendships.map(friendship => {
                const friend = friendship.userId._id.equals(userId)
                    ? friendship.friendId
                    : friendship.userId;
                return {
                    _id: friend._id,
                    username: friend.username,
                    email: friend.email,
                    avatar: friend.avatar,
                    friendshipId: friendship._id,
                    createdAt: friendship.createdAt
                };
            });

            return res.status(200).json({
                success: true,
                data: friends,
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

    getPendingRequests: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userId = req.user._id;

            const requests = await Friendship.find({
                friendId: userId,
                status: 'pending'
            })
                .populate('userId', 'username email avatar')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Friendship.countDocuments({
                friendId: userId,
                status: 'pending'
            });

            return res.status(200).json({
                success: true,
                data: requests,
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
    }
};