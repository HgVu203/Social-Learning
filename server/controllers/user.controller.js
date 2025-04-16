import mongoose from "mongoose";
import User from "../models/user.model.js";

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
      if (user.points >= 6000) {
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

      // Add badge if provided and not already earned
      if (badge && !user.badges.some((b) => b.name === badge)) {
        user.badges.push({
          name: badge,
          earnedAt: new Date(),
        });
      }

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Points and rank updated successfully",
        data: {
          points: user.points,
          rank: user.rank,
          badges: user.badges,
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

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const userId = req.params.id;
      let user;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId).select(
          "-password -reset_password_token -reset_password_expires"
        );
      } else {
        user = await User.findOne({ username: userId }).select(
          "-password -reset_password_token -reset_password_expires"
        );
      }
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { fullname, phone, address, bio, avatar } = req.body;
      const user = await User.findById(req.user._id);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Xử lý tệp ảnh đại diện từ Cloudinary
      if (req.file) {
        // URL ảnh từ Cloudinary đã được lưu trong req.file.path
        user.avatar = req.file.path;
      } else if (avatar) {
        // Nếu không có file upload nhưng có URL avatar trong body
        user.avatar = avatar;
      }

      user.fullname = fullname || user.fullname;
      user.phone = phone || user.phone;
      user.address = address || user.address;
      user.bio = bio || user.bio;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
