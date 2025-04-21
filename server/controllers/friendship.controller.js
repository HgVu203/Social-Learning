import Friendship from "../models/friendship.model.js";
import Notification from "../models/notification.model.js";

export const FriendshipController = {
  sendFriend: async (req, res) => {
    try {
      const { userId: friendId } = req.body;
      const userId = req.user._id;

      if (userId.toString() === friendId) {
        return res.status(400).json({
          success: false,
          error: "Cannot send friend request to yourself",
        });
      }

      const existingFriendship = await Friendship.findOne({
        $or: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      });

      if (existingFriendship) {
        return res.status(400).json({
          success: false,
          error: "Friend request already exists",
        });
      }

      const newFriendship = new Friendship({
        userId,
        friendId,
        status: "pending",
        initiatedBy: userId,
      });
      await newFriendship.save();

      await new Notification({
        userId: friendId,
        message: `${req.user.username} sent you a friend request`,
        type: "friend_request",
      }).save();

      return res.status(200).json({
        success: true,
        message: "Friend request sent successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  acceptFriend: async (req, res) => {
    try {
      const { requestId: friendId } = req.body;
      const userId = req.user._id;

      const friendship = await Friendship.findOne({
        userId: friendId,
        friendId: userId,
        status: "pending",
      }).populate("userId", "username email avatar fullname");

      if (!friendship) {
        return res.status(400).json({
          success: false,
          error: "Friend request not found",
        });
      }

      friendship.status = "accepted";
      await friendship.save();

      await new Notification({
        userId: friendId,
        message: `${req.user.username} accepted your friend request`,
        type: "friend_accepted",
      }).save();

      return res.status(200).json({
        success: true,
        message: "Friend request accepted successfully",
        data: {
          friendship: {
            _id: friendship._id,
            status: friendship.status,
            createdAt: friendship.createdAt,
            updatedAt: friendship.updatedAt,
          },
          friend: {
            _id: friendship.userId._id,
            username: friendship.userId.username,
            email: friendship.userId.email,
            avatar: friendship.userId.avatar,
            fullname: friendship.userId.fullname,
          },
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  rejectFriend: async (req, res) => {
    try {
      const { requestId: friendId } = req.body;
      const userId = req.user._id;

      const friendship = await Friendship.findOneAndDelete({
        userId: friendId,
        friendId: userId,
        status: "pending",
      }).populate("userId", "username email avatar fullname");

      if (!friendship) {
        return res.status(404).json({
          success: false,
          error: "Friend request not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Friend request rejected successfully",
        data: {
          requestId: friendship._id,
          rejectedUserId: friendship.userId._id,
        },
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

      // Cấu hình để truy vấn với lượng dữ liệu nhỏ nhất
      const projection = { userId: 1, friendId: 1, createdAt: 1 };
      const populateOptions = "username email avatar fullname isOnline";

      // Tối ưu truy vấn để giảm dữ liệu trả về và sử dụng index hiệu quả hơn
      // 1. Sử dụng lean() để tăng tốc độ và giảm dung lượng bộ nhớ
      // 2. Chỉ select những trường cần thiết
      // 3. Sử dụng Promise.all để chạy song song các thao tác độc lập
      const [friendships, total] = await Promise.all([
        Friendship.find(
          {
            $or: [{ userId }, { friendId: userId }],
            status: "accepted",
          },
          projection
        )
          .populate("userId", populateOptions)
          .populate("friendId", populateOptions)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit))
          .lean()
          .exec(), // Thêm exec() để đảm bảo promise được trả về

        Friendship.countDocuments({
          $or: [{ userId }, { friendId: userId }],
          status: "accepted",
        }).lean(),
      ]);

      // Xử lý dữ liệu hiệu quả hơn với map thay vì vòng lặp
      const friends = friendships.map((friendship) => {
        const friend = friendship.userId._id.equals(userId)
          ? friendship.friendId
          : friendship.userId;

        return {
          _id: friend._id,
          username: friend.username,
          email: friend.email,
          avatar: friend.avatar,
          fullname: friend.fullname,
          isOnline: friend.isOnline || false,
          friendshipId: friendship._id,
          createdAt: friendship.createdAt,
        };
      });

      // Trả về dữ liệu với định dạng nhất quán và bao gồm cache headers
      res.set("Cache-Control", "private, max-age=10"); // Cache 10 giây ở client

      // Trả về dữ liệu
      return res.status(200).json({
        success: true,
        data: friends,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        timestamp: new Date().toISOString(), // Thêm timestamp để client biết thời điểm dữ liệu
      });
    } catch (error) {
      console.error("Error getting friends:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getPendingRequests: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user._id;

      // Tối ưu hóa truy vấn giống như getFriends
      const projection = { userId: 1, createdAt: 1 };
      const populateOptions = "username email avatar fullname";

      // Sử dụng Promise.all để chạy song song
      const [requests, total] = await Promise.all([
        Friendship.find(
          {
            friendId: userId,
            status: "pending",
          },
          projection
        )
          .populate("userId", populateOptions)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit))
          .lean()
          .exec(),

        Friendship.countDocuments({
          friendId: userId,
          status: "pending",
        }).lean(),
      ]);

      // Cache header
      res.set("Cache-Control", "private, max-age=10");

      return res.status(200).json({
        success: true,
        data: requests,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getPendingRequests:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  unfriend: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const friendship = await Friendship.findOneAndDelete({
        $or: [
          { userId, friendId: id },
          { userId: id, friendId: userId },
        ],
        status: "accepted",
      });

      if (!friendship) {
        return res.status(404).json({
          success: false,
          error: "Friendship not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Friend removed successfully",
        data: { userId: id },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getFriendshipStatus: async (req, res) => {
    try {
      const targetUserId = req.params.userId;
      const userId = req.user._id;

      if (userId.toString() === targetUserId) {
        return res.status(200).json({
          success: true,
          status: "SELF",
          message: "Cannot befriend yourself",
        });
      }

      const friendship = await Friendship.findOne({
        $or: [
          { userId, friendId: targetUserId },
          { userId: targetUserId, friendId: userId },
        ],
      });

      if (!friendship) {
        return res.status(200).json({
          success: true,
          status: "NOT_FRIEND",
        });
      }

      if (friendship.status === "accepted") {
        return res.status(200).json({
          success: true,
          status: "FRIEND",
          friendshipId: friendship._id,
        });
      }

      if (friendship.status === "pending") {
        if (friendship.initiatedBy.toString() === userId.toString()) {
          // Người dùng hiện tại đã gửi lời mời
          return res.status(200).json({
            success: true,
            status: "PENDING_SENT",
            friendshipId: friendship._id,
          });
        } else {
          // Người dùng hiện tại đã nhận lời mời
          return res.status(200).json({
            success: true,
            status: "PENDING_RECEIVED",
            friendshipId: friendship._id,
          });
        }
      }

      if (friendship.status === "blocked") {
        if (friendship.initiatedBy.toString() === userId.toString()) {
          // Người dùng hiện tại đã chặn người kia
          return res.status(200).json({
            success: true,
            status: "BLOCKED_BY_ME",
            friendshipId: friendship._id,
          });
        } else {
          // Người dùng hiện tại bị người kia chặn
          return res.status(200).json({
            success: true,
            status: "BLOCKED_BY_OTHER",
            friendshipId: friendship._id,
          });
        }
      }
    } catch (error) {
      console.error("Error checking friendship status:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
