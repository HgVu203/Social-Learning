import mongoose from "mongoose";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import UserActivity from "../models/user_activity.model.js";
import RecommendationService from "../services/recommendation.service.js";

export const UserController = {
  updatePoints: async (req, res) => {
    try {
      const { points, badge } = req.body;
      const userId = req.user._id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Update points
      user.points += Number(points);

      // Update rank based on points thresholds
      if (user.points >= 9000) {
        user.rank = "Legend"; // Huyền Thoại
      } else if (user.points >= 7500) {
        user.rank = "Grandmaster"; // Đại Cao Thủ
      } else if (user.points >= 6000) {
        user.rank = "Master"; // Cao Thủ
      } else if (user.points >= 5000) {
        user.rank = "Diamond"; // Kim Cương
      } else if (user.points >= 4000) {
        user.rank = "Platinum"; // Bạch Kim
      } else if (user.points >= 3000) {
        user.rank = "Gold"; // Vàng
      } else if (user.points >= 2000) {
        user.rank = "Silver"; // Bạc
      } else if (user.points >= 1000) {
        user.rank = "Bronze"; // Đồng
      } else {
        user.rank = "Rookie"; // Tân Thủ
      }

      // Gán badge mới nếu được cung cấp
      if (badge) {
        // Kiểm tra badge có hợp lệ không
        const validBadges = [
          "gold",
          "silver",
          "bronze",
          "star",
          "expert",
          "contributor",
          "influencer",
          "teacher",
          "innovator",
          "veteran",
        ];

        if (validBadges.includes(badge)) {
          user.badge = {
            name: badge,
            earnedAt: new Date(),
          };
        }
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Points and rank updated successfully",
        data: {
          points: user.points,
          rank: user.rank,
          badge: user.badge,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getLeaderboard: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const users = await User.find()
        .select("username fullname points rank badges")
        .sort({ points: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments();

      return res.status(200).json({
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  myProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select(
        "-password -reset_password_token -reset_password_expires"
      );

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Get followers count
      const followersCount = await Follow.countDocuments({
        following: user._id,
      });

      // Convert to plain object so we can add properties
      const userObject = user.toObject();
      userObject.isFollowing = false; // Can't follow yourself
      userObject.followersCount = followersCount;

      return res.status(200).json({
        success: true,
        data: userObject,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUserId = req.user?._id;

      let user;

      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId)
          .select("-password -reset_password_token -reset_password_expires")
          .populate({
            path: "posts",
            match: { deleted: false },
            populate: { path: "author", select: "username fullname avatar" },
          });
      } else {
        user = await User.findOne({ username: userId })
          .select("-password -reset_password_token -reset_password_expires")
          .populate({
            path: "posts",
            match: { deleted: false },
            populate: { path: "author", select: "username fullname avatar" },
          });
      }

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Check if current user is following this profile
      let isFollowing = false;

      // Kiểm tra có đăng nhập hay không
      if (!currentUserId) {
        // User not logged in, isFollowing remains false
      }
      // Kiểm tra có phải profile của chính mình không
      else if (currentUserId.toString() === user._id.toString()) {
        // User viewing own profile, isFollowing remains false
      }
      // Kiểm tra follow status
      else {
        // Tìm kiếm trong bảng Follow
        const followExists = await Follow.findOne({
          follower: currentUserId,
          following: user._id,
        });

        isFollowing = !!followExists;
      }

      // Get followers count
      const followersCount = await Follow.countDocuments({
        following: user._id,
      });

      // Get following count
      const followingCount = await Follow.countDocuments({
        follower: user._id,
      });

      // Convert to plain object so we can add properties
      const userObject = user.toObject();
      userObject.isFollowing = isFollowing;
      userObject.followersCount = followersCount;
      userObject.followingCount = followingCount;

      return res.status(200).json({
        success: true,
        data: userObject,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { fullname, phone, address, bio, avatar } = req.body;
      const userId = req.user._id;

      console.log("Update profile request for user:", userId);
      console.log("Request body:", req.body);

      const user = await User.findById(userId);

      if (!user) {
        console.error("User not found with ID:", userId);
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update fields only if they exist in the request
      if (fullname !== undefined) user.fullname = fullname;
      if (phone !== undefined) user.phone = phone;
      if (address !== undefined) user.address = address;
      if (bio !== undefined) user.bio = bio;

      // Xử lý tệp ảnh đại diện từ Cloudinary
      if (req.file) {
        // URL ảnh từ Cloudinary đã được lưu trong req.file.path
        user.avatar = req.file.path;
        console.log("Updated avatar from file upload:", req.file.path);
      } else if (avatar) {
        // Nếu không có file upload nhưng có URL avatar trong body
        user.avatar = avatar;
        console.log("Updated avatar from request body");
      }

      await user.save();
      console.log("Profile updated successfully for user:", userId);

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Error updating user profile:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
        details: error.stack,
      });
    }
  },

  searchUsers: async (req, res) => {
    try {
      const { query = "", page = 1, limit = 10 } = req.query;
      const userId = req.user?._id;

      if (!query || query.trim().length < 2) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            totalPages: 0,
          },
        });
      }

      // Import AI search service
      const { AISearchService } = await import(
        "../services/ai-search.service.js"
      );
      const aiSearchService = new AISearchService();

      // Tạo điều kiện tìm kiếm (username hoặc fullname chứa query)
      const searchCondition = {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullname: { $regex: query, $options: "i" } },
          { bio: { $regex: query, $options: "i" } }, // Add bio search
        ],
      };

      // Nếu đã đăng nhập, không hiển thị bản thân người dùng trong kết quả tìm kiếm
      if (userId) {
        searchCondition._id = { $ne: userId };
      }

      // Thực hiện tìm kiếm
      const users = await User.find(searchCondition)
        .select("username fullname avatar bio")
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Mark the type as 'user' for frontend consistency
      let usersWithType = users.map((user) => ({
        ...user.toJSON(),
        type: "user",
      }));

      // Use AI to enhance search results if there are results
      if (usersWithType.length > 0) {
        usersWithType = await aiSearchService.enhanceSearchResults(
          query,
          usersWithType
        );
      }

      // If no results found, try finding related users with similar interests
      if (usersWithType.length === 0) {
        // Try to find users with similar names or usernames (fuzzy matching)
        const fuzzyQuery = query
          .split(/\s+/)
          .filter((word) => word.length >= 3);

        if (fuzzyQuery.length > 0) {
          const fuzzyConditions = [];

          // For each part of the query, look for partial matches
          fuzzyQuery.forEach((part) => {
            fuzzyConditions.push(
              { username: { $regex: part, $options: "i" } },
              { fullname: { $regex: part, $options: "i" } }
            );
          });

          // Find users with any of the fuzzy conditions
          const similarUsers = await User.find({
            $or: fuzzyConditions,
            _id: userId ? { $ne: userId } : { $exists: true },
          })
            .select("username fullname avatar bio")
            .limit(limit * 1);

          usersWithType = similarUsers.map((user) => ({
            ...user.toJSON(),
            type: "user",
            isSimilarMatch: true,
          }));
        }
      }

      const total = await User.countDocuments(searchCondition);

      return res.status(200).json({
        success: true,
        data: usersWithType,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error searching users:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  toggleFollow: async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user._id;

      // Kiểm tra ID có hợp lệ không
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID",
        });
      }

      // Không thể tự follow chính mình
      if (targetUserId === currentUserId.toString()) {
        return res.status(400).json({
          success: false,
          error: "You cannot follow yourself",
        });
      }

      // Kiểm tra user có tồn tại không
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Kiểm tra xem đã follow chưa
      const existingFollow = await Follow.findOne({
        follower: currentUserId,
        following: targetUserId,
      });

      let isFollowing;

      // Toggle follow/unfollow
      if (existingFollow) {
        // Unfollow: Xóa relationship
        await Follow.deleteOne({
          _id: existingFollow._id,
        });
        isFollowing = false;
      } else {
        // Follow: Tạo relationship mới
        await Follow.create({
          follower: currentUserId,
          following: targetUserId,
        });
        isFollowing = true;
      }

      // Lấy số lượng followers mới của target user
      const followersCount = await Follow.countDocuments({
        following: targetUserId,
      });

      // Đếm số người đang follow của current user
      const followingCount = await Follow.countDocuments({
        follower: currentUserId,
      });

      // Prepare response
      const response = {
        success: true,
        message: isFollowing
          ? `You are now following ${targetUser.username}`
          : `You have unfollowed ${targetUser.username}`,
        data: {
          isFollowing,
          followersCount,
          followingCount,
          userId: targetUserId,
        },
      };

      // Không cần track activity ở đây nữa, vì đã có middleware trackUserActivity
      // Đồng thời invalidate cache recommendation
      RecommendationService.invalidateUserRecommendations(currentUserId).catch(
        (err) => {
          console.error("[Server] Failed to invalidate recommendations:", err);
        }
      );

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },
};
