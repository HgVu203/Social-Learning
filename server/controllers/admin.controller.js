import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Group from "../models/group.model.js";
import Follow from "../models/follow.model.js";
import UserActivity from "../models/user_activity.model.js";

export const AdminController = {
  // User Management
  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "" } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      // Add search functionality
      if (search) {
        query = {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { fullname: { $regex: search, $options: "i" } },
          ],
        };
      }

      const users = await User.find(query)
        .select(
          "-password -reset_password_token -reset_password_expires -emailVerificationToken -emailVerificationExpires"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      // Get additional stats for each user
      const usersWithStats = await Promise.all(
        users.map(async (user) => {
          const userData = user.toObject();

          // Get post count
          userData.postCount = await Post.countDocuments({
            author: user._id,
            deleted: false,
          });

          // Get followers count
          userData.followersCount = await Follow.countDocuments({
            following: user._id,
          });

          // Get activity count
          userData.activityCount = await UserActivity.countDocuments({
            userId: user._id,
          });

          return userData;
        })
      );

      return res.status(200).json({
        success: true,
        data: usersWithStats,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin getAllUsers error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, fullname, role, status } = req.body;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (fullname) user.fullname = fullname;
      if (role) user.role = role;
      if (status) user.status = status;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Admin updateUser error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Delete user
      await User.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Admin deleteUser error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  toggleUserStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["active", "inactive", "banned"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Status must be one of: active, inactive, banned",
        });
      }

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update status
      user.status = status;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "User status updated successfully",
        data: user,
      });
    } catch (error) {
      console.error("Admin toggleUserStatus error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateUserPoints: async (req, res) => {
    try {
      const { id } = req.params;
      const { points, badge } = req.body;

      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Update points
      if (points !== undefined) {
        user.points = Math.max(0, user.points + Number(points));

        // Update rank based on points thresholds
        if (user.points >= 6000) {
          user.rank = "Master";
        } else if (user.points >= 5000) {
          user.rank = "Diamond";
        } else if (user.points >= 4000) {
          user.rank = "Platinum";
        } else if (user.points >= 3000) {
          user.rank = "Gold";
        } else if (user.points >= 2000) {
          user.rank = "Silver";
        } else if (user.points >= 1000) {
          user.rank = "Bronze";
        } else {
          user.rank = "Rookie";
        }
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
        message: "User points updated successfully",
        data: {
          _id: user._id,
          points: user.points,
          rank: user.rank,
          badges: user.badges,
        },
      });
    } catch (error) {
      console.error("Admin updateUserPoints error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Content Management
  getAllPosts: async (req, res) => {
    try {
      const { page = 1, limit = 10, status = "" } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      // Filter by deleted status
      if (status === "deleted") {
        query.deleted = true;
      } else if (status === "active") {
        query.deleted = false;
        query.status = "approved";
      } else if (status === "featured") {
        query.deleted = false;
        query.status = "featured";
      } else if (status === "blocked") {
        query.deleted = false;
        query.status = "blocked";
      } else if (status === "pending") {
        query.deleted = false;
        query.status = "pending";
      }

      const posts = await Post.find(query)
        .populate("author", "username fullname email avatar")
        .populate("likeCount")
        .populate("commentCount")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Post.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: posts,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin getAllPosts error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updatePost: async (req, res) => {
    try {
      const { id } = req.params;
      const { content, tags, status } = req.body;

      // Check if post exists
      const post = await Post.findById(id);
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Update fields
      if (content !== undefined) post.content = content;
      if (tags !== undefined) post.tags = tags;
      if (status !== undefined) {
        post.status = status;

        // If status is set to deleted, also update the deleted flag
        if (status === "deleted") {
          post.deleted = true;
          post.deletedAt = new Date();
        } else if (post.deleted) {
          // If post was previously deleted and is now being restored
          post.deleted = false;
          post.deletedAt = null;
        }
      }

      await post.save();

      return res.status(200).json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error) {
      console.error("Admin updatePost error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deletePost: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if post exists
      const post = await Post.findById(id);
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Soft delete post
      post.deleted = true;
      post.deletedAt = new Date();
      post.status = "deleted";
      await post.save();

      return res.status(200).json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      console.error("Admin deletePost error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  restorePost: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`[Admin] Restoring post ${id}`);

      // Check if post exists
      const post = await Post.findById(id);
      if (!post) {
        console.error(`[Admin] Post not found for restore: ${id}`);
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Restore post
      post.deleted = false;
      post.deletedAt = null;
      post.status = "approved"; // Restore to approved state

      await post.save();
      console.log(`[Admin] Post ${id} restored successfully`);

      return res.status(200).json({
        success: true,
        message: "Post restored successfully",
        data: post,
      });
    } catch (error) {
      console.error(`[Admin] Error restoring post:`, error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updatePostStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log(`[Admin] Updating post ${id} to status: ${status}`);
      console.log(`[Admin] Request body:`, req.body);

      if (
        !["approved", "featured", "blocked", "deleted", "pending"].includes(
          status
        )
      ) {
        console.error(`[Admin] Invalid status requested: ${status}`);
        return res.status(400).json({
          success: false,
          error:
            "Status must be one of: approved, featured, blocked, deleted, pending",
        });
      }

      // Check if post exists
      const post = await Post.findById(id);
      if (!post) {
        console.error(`[Admin] Post not found for status update: ${id}`);
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      console.log(
        `[Admin] Current post status: ${post.status}, changing to: ${status}`
      );
      console.log(`[Admin] Current post data:`, JSON.stringify(post));

      // Update status
      post.status = status;

      // Update deleted status accordingly
      if (status === "deleted") {
        post.deleted = true;
        post.deletedAt = new Date();
      } else {
        post.deleted = false;
        post.deletedAt = null;
      }

      await post.save();

      // Kiểm tra post sau khi lưu
      const updatedPost = await Post.findById(id);
      console.log(
        `[Admin] Post ${id} after save - status: ${updatedPost.status}`
      );
      console.log(
        `[Admin] Post ${id} after save - data:`,
        JSON.stringify(updatedPost)
      );

      // Kiểm tra xem status đã được cập nhật thành công hay chưa
      if (updatedPost.status !== status) {
        console.error(
          `[Admin] Failed to update post status! Expected: ${status}, Actual: ${updatedPost.status}`
        );
      }

      console.log(
        `[Admin] Post ${id} status updated successfully to ${status}`
      );

      // Send the full updated post in response
      const responseData = {
        success: true,
        message: "Post status updated successfully",
        data: updatedPost,
      };

      console.log(`[Admin] Sending response:`, JSON.stringify(responseData));
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(`[Admin] Error updating post status:`, error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Group Management
  getAllGroups: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const groups = await Group.find()
        .populate("members.user", "username fullname email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Add membersCount property to each group for the client
      const groupsWithMemberCount = groups.map((group) => {
        const groupObj = group.toObject({ virtuals: true });
        groupObj.membersCount = group.members.length;
        return groupObj;
      });

      const total = await Group.countDocuments();

      return res.status(200).json({
        success: true,
        data: groupsWithMemberCount,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Admin getAllGroups error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  updateGroup: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, status, privacy } = req.body;

      // Check if group exists
      const group = await Group.findById(id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Update fields
      if (name) group.name = name;
      if (description) group.description = description;
      if (
        status &&
        ["active", "inactive", "featured", "pending", "blocked"].includes(
          status
        )
      ) {
        group.status = status;
      }
      if (privacy) {
        // Convert privacy string to isPrivate boolean
        group.isPrivate = privacy === "private";
      }

      await group.save();

      return res.status(200).json({
        success: true,
        message: "Group updated successfully",
        data: group,
      });
    } catch (error) {
      console.error("Admin updateGroup error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  deleteGroup: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if group exists
      const group = await Group.findById(id);
      if (!group) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Delete group
      await Group.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Group deleted successfully",
      });
    } catch (error) {
      console.error("Admin deleteGroup error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // Dashboard Statistics
  getDashboardStats: async (req, res) => {
    try {
      console.log("Admin getDashboardStats - Starting to fetch data");

      // Total users
      const totalUsers = await User.countDocuments();

      // Active users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeUsersToday = await User.countDocuments({
        lastLogin: { $gte: today },
      });

      // Calculate growth data for the last 7 days
      const growthData = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          date.setHours(0, 0, 0, 0);
          const nextDate = new Date(date);
          nextDate.setDate(nextDate.getDate() + 1);

          // Get user registrations for this day
          const newUsers = await User.countDocuments({
            createdAt: {
              $gte: date,
              $lt: nextDate,
            },
          });

          // Get new posts for this day
          const newPosts = await Post.countDocuments({
            createdAt: {
              $gte: date,
              $lt: nextDate,
            },
            deleted: false,
          });

          return {
            date: date.toISOString(),
            newUsers,
            newPosts,
          };
        })
      );

      console.log(
        "Growth data calculated:",
        JSON.stringify(growthData, null, 2)
      );

      // Calculate percent changes
      const previousWeekUsers = await User.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });

      const currentWeekUsers = await User.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });

      const userPercentChange =
        previousWeekUsers === 0
          ? currentWeekUsers > 0
            ? 100
            : 0
          : Math.round(
              ((currentWeekUsers - previousWeekUsers) / previousWeekUsers) * 100
            );

      // Total posts and active posts
      const totalPosts = await Post.countDocuments();
      const activePosts = await Post.countDocuments({ deleted: false });

      // Calculate post percent change
      const previousWeekPosts = await Post.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        deleted: false,
      });

      const currentWeekPosts = await Post.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        deleted: false,
      });

      const postPercentChange =
        previousWeekPosts === 0
          ? currentWeekPosts > 0
            ? 100
            : 0
          : Math.round(
              ((currentWeekPosts - previousWeekPosts) / previousWeekPosts) * 100
            );

      // User statistics
      const userStats = {
        totalUsers,
        activeUsersToday,
        percentChange: userPercentChange,
        recentGrowth: growthData.map((day) => day.newUsers),
        usersByStatus: {
          active: await User.countDocuments({ status: "active" }),
          inactive: await User.countDocuments({ status: "inactive" }),
          banned: await User.countDocuments({ status: "banned" }),
        },
        usersByRank: {
          rookie: await User.countDocuments({ rank: "Rookie" }),
          bronze: await User.countDocuments({ rank: "Bronze" }),
          silver: await User.countDocuments({ rank: "Silver" }),
          gold: await User.countDocuments({ rank: "Gold" }),
          platinum: await User.countDocuments({ rank: "Platinum" }),
          diamond: await User.countDocuments({ rank: "Diamond" }),
          master: await User.countDocuments({ rank: "Master" }),
        },
      };

      // Post statistics
      const postStats = {
        totalPosts,
        activePosts,
        percentChange: postPercentChange,
        deletedPosts: totalPosts - activePosts,
        recentGrowth: growthData.map((day) => day.newPosts),
        postsByStatus: {
          approved: await Post.countDocuments({
            status: "approved",
            deleted: false,
          }),
          pending: await Post.countDocuments({
            status: "pending",
            deleted: false,
          }),
          featured: await Post.countDocuments({
            status: "featured",
            deleted: false,
          }),
          blocked: await Post.countDocuments({
            status: "blocked",
            deleted: false,
          }),
        },
      };

      // Total groups
      const totalGroups = await Group.countDocuments();
      const groupStats = {
        totalGroups,
        groupsByPrivacy: {
          public: await Group.countDocuments({ isPrivate: false }),
          private: await Group.countDocuments({ isPrivate: true }),
        },
      };

      // Recent activity
      const recentActivity = await Promise.all([
        // Recent user registrations
        ...(await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("username fullname email avatar createdAt")
          .lean()
          .then((users) =>
            users.map((user) => ({
              type: "user_registered",
              action: "New user registered",
              user: user.username,
              userDetails: {
                fullname: user.fullname,
                avatar: user.avatar,
              },
              timestamp: user.createdAt,
            }))
          )),

        // Recent posts
        ...(await Post.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("author", "username fullname avatar")
          .lean()
          .then((posts) =>
            posts.map((post) => ({
              type: "post_created",
              action: "New post created",
              user: post.author.username,
              userDetails: {
                fullname: post.author.fullname,
                avatar: post.author.avatar,
              },
              timestamp: post.createdAt,
            }))
          )),

        // Recent groups
        ...(await Group.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("createdBy", "username fullname avatar")
          .lean()
          .then((groups) =>
            groups.map((group) => ({
              type: "group_created",
              action: "New group created",
              user: group.createdBy?.username || "Unknown",
              userDetails: {
                fullname: group.createdBy?.fullname,
                avatar: group.createdBy?.avatar,
              },
              groupName: group.name,
              timestamp: group.createdAt,
            }))
          )),
      ]);

      // Sort all activities by timestamp
      recentActivity.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const responseData = {
        success: true,
        data: {
          userStats,
          postStats,
          groupStats,
          recentActivity: recentActivity.slice(0, 10), // Get most recent 10 activities
          system: {
            uptime: "99.9%",
            memory: "42%",
            responseTime: "120ms",
          },
        },
      };

      console.log(
        "Admin getDashboardStats - Final response:",
        JSON.stringify(responseData, null, 2)
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getDashboardStats error:", error);
      return res.status(500).json({
        success: false,
        error:
          error.message ||
          "Internal server error while fetching dashboard stats",
      });
    }
  },
};
