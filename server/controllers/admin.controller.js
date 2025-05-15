import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Group from "../models/group.model.js";
import Follow from "../models/follow.model.js";
import UserActivity from "../models/user_activity.model.js";
import NodeCache from "node-cache";
import Feedback from "../models/feedback.model.js";

// Khởi tạo cache với ttl 5 phút
const adminCache = new NodeCache({ stdTTL: 300 });

export const AdminController = {
  // User Management
  getAllUsers: async (req, res) => {
    try {
      console.log("Admin getAllUsers - Starting...");
      const startTime = Date.now();
      const { page = 1, limit = 5, search = "" } = req.query;
      const skip = (page - 1) * limit;

      // Tạo cache key dựa trên tham số
      const cacheKey = `admin_users_${page}_${limit}_${search}`;
      const cachedData = adminCache.get(cacheKey);

      // Trả về data từ cache nếu có
      if (cachedData) {
        console.log(
          `Admin getAllUsers - Returning cached data for ${cacheKey}`
        );
        return res.status(200).json(cachedData);
      }

      // Build search query
      let matchStage = {};
      if (search) {
        matchStage = {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { fullname: { $regex: search, $options: "i" } },
          ],
        };
      }

      // Thực hiện đồng thời hai truy vấn để tăng hiệu năng
      const [usersWithStats, total] = await Promise.all([
        // Lấy users với pagination
        User.aggregate([
          // Match users based on search query
          { $match: matchStage },
          // Sort by creation date
          { $sort: { createdAt: -1 } },
          // Skip and limit for pagination
          { $skip: skip },
          { $limit: parseInt(limit) },
          // Lookup posts for each user
          {
            $lookup: {
              from: "posts",
              let: { userId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$author", "$$userId"] },
                        { $eq: ["$deleted", false] },
                      ],
                    },
                  },
                },
                { $count: "count" },
              ],
              as: "postData",
            },
          },
          // Lookup followers for each user
          {
            $lookup: {
              from: "follows",
              let: { userId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$following", "$$userId"] },
                  },
                },
                { $count: "count" },
              ],
              as: "followerData",
            },
          },
          // Lookup activity for each user
          {
            $lookup: {
              from: "useractivities", // Ensure this is the correct collection name
              let: { userId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$userId", "$$userId"] },
                  },
                },
                { $count: "count" },
              ],
              as: "activityData",
            },
          },
          // Project final shape of data - Chỉ lấy các trường cần thiết
          {
            $project: {
              _id: 1,
              username: 1,
              email: 1,
              fullname: 1,
              avatar: 1,
              role: 1,
              status: 1,
              createdAt: 1,
              lastLogin: 1,
              points: 1,
              rank: 1,
              badge: 1,
              postCount: {
                $ifNull: [{ $arrayElemAt: ["$postData.count", 0] }, 0],
              },
              followersCount: {
                $ifNull: [{ $arrayElemAt: ["$followerData.count", 0] }, 0],
              },
              activityCount: {
                $ifNull: [{ $arrayElemAt: ["$activityData.count", 0] }, 0],
              },
            },
          },
        ]),

        // Đếm tổng số để phân trang
        User.countDocuments(matchStage),
      ]);

      const responseData = {
        success: true,
        data: usersWithStats,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache trước khi trả về (TTL 2 phút)
      adminCache.set(cacheKey, responseData, 120);

      console.log(
        `Admin getAllUsers - Completed in ${Date.now() - startTime}ms`
      );

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getAllUsers error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // API mới: Lấy chi tiết user với dữ liệu đầy đủ
  getUserDetails: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Admin getUserDetails for user ${id}`);

      // Kiểm tra cache
      const cacheKey = `admin_user_details_${id}`;
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log(`Returning cached user details for ${id}`);
        return res.status(200).json(cachedData);
      }

      // Thực hiện truy vấn chi tiết user
      const userDetails = await User.findById(id)
        .select("-password") // Loại bỏ password từ kết quả
        .lean();

      if (!userDetails) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      // Lấy các thông tin liên quan (posts, followers, following, activity)
      const [posts, followers, following, activities] = await Promise.all([
        Post.find({ author: id, deleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        Follow.find({ following: id })
          .populate("follower", "username fullname avatar")
          .limit(5)
          .lean(),

        Follow.find({ follower: id })
          .populate("following", "username fullname avatar")
          .limit(5)
          .lean(),

        UserActivity.find({ userId: id })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      const responseData = {
        success: true,
        data: {
          ...userDetails,
          recentPosts: posts,
          followers: followers.map((f) => f.follower),
          following: following.map((f) => f.following),
          recentActivity: activities,
        },
      };

      // Lưu vào cache (TTL 5 phút)
      adminCache.set(cacheKey, responseData, 300);

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getUserDetails error:", error);
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
        if (user.points >= 9000) {
          user.rank = "Legend";
        } else if (user.points >= 7500) {
          user.rank = "Grandmaster";
        } else if (user.points >= 6000) {
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

        console.log(
          `[Admin Badge Update] Processing badge request for user ${id}:`,
          badge
        );

        if (typeof badge === "string" && validBadges.includes(badge)) {
          console.log(
            `[Admin Badge Update] Setting badge '${badge}' for user ${id}`
          );
          user.badge = {
            name: badge,
            earnedAt: new Date(),
          };
        } else if (badge.name && validBadges.includes(badge.name)) {
          console.log(
            `[Admin Badge Update] Setting badge object with name '${badge.name}' for user ${id}`
          );
          user.badge = {
            name: badge.name,
            earnedAt: new Date(),
          };
        } else {
          console.log(
            `[Admin Badge Update] Invalid badge format or value:`,
            badge
          );
        }
      }

      await user.save();

      // Log the user after save to verify the badge was saved
      const savedUser = await User.findById(id);
      console.log(`[Admin Badge Update] User ${id} after save:`, {
        badge: savedUser.badge,
        points: savedUser.points,
      });

      return res.status(200).json({
        success: true,
        message: "User points updated successfully",
        data: {
          _id: user._id,
          points: user.points,
          rank: user.rank,
          badge: user.badge,
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
      console.log("Admin getAllPosts - Starting...");
      const startTime = Date.now();

      const { page = 1, limit = 10, status = "" } = req.query;
      const skip = (page - 1) * limit;

      // Kiểm tra cache trước
      const cacheKey = `admin_posts_${page}_${limit}_${status}`;
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log(
          `Admin getAllPosts - Returning cached data for ${cacheKey}`
        );
        return res.status(200).json(cachedData);
      }

      // Xây dựng match query dựa trên status
      let matchQuery = {};
      if (status === "deleted") {
        matchQuery.deleted = true;
      } else if (status === "active") {
        matchQuery.deleted = false;
        matchQuery.status = "approved";
      } else if (status === "featured") {
        matchQuery.deleted = false;
        matchQuery.status = "featured";
      } else if (status === "blocked") {
        matchQuery.deleted = false;
        matchQuery.status = "blocked";
      } else if (status === "pending") {
        matchQuery.deleted = false;
        matchQuery.status = "pending";
      }

      // Sử dụng aggregation pipeline thay vì find + populate
      const posts = await Post.aggregate([
        // Match theo điều kiện status/deleted
        { $match: matchQuery },

        // Lookup author
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorDetails",
            pipeline: [
              {
                $project: {
                  username: 1,
                  fullname: 1,
                  email: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },

        // Unwind author array to object
        {
          $unwind: "$authorDetails",
        },

        // Lookup likes count
        {
          $lookup: {
            from: "feedbacks",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$postId", "$$postId"] },
                      { $eq: ["$type", "like"] },
                    ],
                  },
                },
              },
              { $count: "count" },
            ],
            as: "likesData",
          },
        },

        // Lookup comments count
        {
          $lookup: {
            from: "feedbacks",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$postId", "$$postId"] },
                },
              },
              { $count: "count" },
            ],
            as: "commentsData",
          },
        },

        // Project final data structure
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            status: 1,
            deleted: 1,
            createdAt: 1,
            updatedAt: 1,
            deletedAt: 1,
            tags: 1,
            views: 1,
            author: "$authorDetails",
            likeCount: {
              $ifNull: [{ $arrayElemAt: ["$likesData.count", 0] }, 0],
            },
            commentCount: {
              $ifNull: [{ $arrayElemAt: ["$commentsData.count", 0] }, 0],
            },
          },
        },

        // Sort by newest
        { $sort: { createdAt: -1 } },

        // Pagination
        { $skip: skip },
        { $limit: parseInt(limit) },
      ]);

      // Lấy tổng số bài viết cho phân trang
      const total = await Post.countDocuments(matchQuery);

      const responseData = {
        success: true,
        data: posts,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache (TTL 2 phút)
      adminCache.set(cacheKey, responseData, 120);

      console.log(
        `Admin getAllPosts - Completed in ${Date.now() - startTime}ms`
      );

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getAllPosts error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // API mới: Lấy chi tiết post với dữ liệu đầy đủ
  getPostDetails: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Admin getPostDetails for post ${id}`);

      // Kiểm tra cache
      const cacheKey = `admin_post_details_${id}`;
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log(`Returning cached post details for ${id}`);
        return res.status(200).json(cachedData);
      }

      // Thực hiện truy vấn chi tiết post
      const postDetails = await Post.findById(id)
        .populate("author", "username fullname avatar email")
        .lean();

      if (!postDetails) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Lấy các thông tin liên quan (likes, comments)
      const [likes, comments] = await Promise.all([
        Feedback.find({ postId: id, type: "like" })
          .populate("userId", "username fullname avatar")
          .limit(10)
          .lean(),

        Feedback.find({ postId: id, type: { $ne: "like" } })
          .populate("userId", "username fullname avatar")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

      const responseData = {
        success: true,
        data: {
          ...postDetails,
          likes: likes.map((like) => ({
            userId: like.userId._id,
            username: like.userId.username,
            fullname: like.userId.fullname,
            avatar: like.userId.avatar,
            createdAt: like.createdAt,
          })),
          comments: comments,
        },
      };

      // Lưu vào cache (TTL 5 phút)
      adminCache.set(cacheKey, responseData, 300);

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getPostDetails error:", error);
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
      console.log("Admin getAllGroups - Starting...");
      const startTime = Date.now();

      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      // Kiểm tra cache
      const cacheKey = `admin_groups_${page}_${limit}`;
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log(
          `Admin getAllGroups - Returning cached data for ${cacheKey}`
        );
        return res.status(200).json(cachedData);
      }

      const groups = await Group.aggregate([
        // Stage 1: Match only non-deleted groups and apply pagination
        {
          $match: {}, // Match all groups
        },
        // Stage 2: Skip and limit for pagination
        {
          $skip: parseInt(skip),
        },
        {
          $limit: parseInt(limit),
        },
        // Stage 3: Lookup creator details
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creatorDetails",
          },
        },
        // Stage 4: Unwind creator details safely
        {
          $unwind: {
            path: "$creatorDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Stage 5: Lookup member details
        {
          $lookup: {
            from: "users",
            localField: "members.user",
            foreignField: "_id",
            as: "membersDetails",
          },
        },
        // Stage 6: Add membersCount field
        {
          $addFields: {
            // Kiểm tra members tồn tại trước khi sử dụng $size
            membersCount: {
              $cond: {
                if: { $isArray: "$members" },
                then: { $size: "$members" },
                else: 0,
              },
            },
          },
        },
        // Stage 7: Project final structure
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            status: 1,
            isPrivate: 1,
            membersCount: 1,
            createdAt: 1,
            updatedAt: 1,
            createdBy: "$creatorDetails",
            members: {
              $cond: {
                if: { $isArray: "$members" },
                then: {
                  $map: {
                    input: {
                      $slice: [{ $ifNull: ["$members", []] }, 0, 10],
                    },
                    as: "member",
                    in: {
                      user: "$$member.user",
                      role: "$$member.role",
                      joinedAt: "$$member.joinedAt",
                      details: {
                        $arrayElemAt: [
                          { $ifNull: ["$membersDetails", []] },
                          {
                            $cond: {
                              if: { $isArray: "$membersDetails" },
                              then: {
                                $indexOfArray: [
                                  { $ifNull: ["$membersDetails._id", []] },
                                  "$$member.user",
                                ],
                              },
                              else: -1,
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                else: [],
              },
            },
          },
        },
      ]);

      const total = await Group.countDocuments();

      const responseData = {
        success: true,
        data: groups,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache (TTL 2 phút)
      adminCache.set(cacheKey, responseData, 120);

      console.log(
        `Admin getAllGroups - Completed in ${Date.now() - startTime}ms`
      );

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getAllGroups error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  // API mới: Lấy chi tiết group với dữ liệu đầy đủ
  getGroupDetails: async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Admin getGroupDetails for group ${id}`);

      // Kiểm tra cache
      const cacheKey = `admin_group_details_${id}`;
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log(`Returning cached group details for ${id}`);
        return res.status(200).json(cachedData);
      }

      // Thực hiện truy vấn chi tiết group
      const groupDetails = await Group.findById(id)
        .populate("createdBy", "username fullname avatar email")
        .lean();

      if (!groupDetails) {
        return res
          .status(404)
          .json({ success: false, error: "Group not found" });
      }

      // Lấy danh sách đầy đủ thành viên
      const memberUserIds = groupDetails.members.map((member) => member.user);
      const memberDetails = await User.find({ _id: { $in: memberUserIds } })
        .select("username fullname avatar email")
        .lean();

      // Map member details vào members
      const membersWithDetails = groupDetails.members.map((member) => {
        const userDetails = memberDetails.find(
          (u) => u._id.toString() === member.user.toString()
        );
        return {
          ...member,
          userDetails,
        };
      });

      // Lấy các bài post gần đây trong group
      const recentPosts = await Post.find({ group: id, deleted: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("author", "username fullname avatar")
        .lean();

      const responseData = {
        success: true,
        data: {
          ...groupDetails,
          members: membersWithDetails,
          recentPosts,
        },
      };

      // Lưu vào cache (TTL 5 phút)
      adminCache.set(cacheKey, responseData, 300);

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getGroupDetails error:", error);
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

  // Dashboard Statistics - Tách thành các API riêng
  getDashboardBasicStats: async (req, res) => {
    try {
      console.log("Admin getDashboardBasicStats - Starting...");
      const startTime = Date.now();

      // Kiểm tra cache trước
      const cacheKey = "dashboard_basic_stats";
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log("Admin getDashboardBasicStats - Trả về dữ liệu từ cache");
        return res.status(200).json(cachedData);
      }

      // Tính toán các ngày cần lấy dữ liệu
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // Tối ưu bằng cách chạy song song các truy vấn độc lập cho dữ liệu cơ bản
      const [userAggregateStats, postAggregateStats, groupAggregateStats] =
        await Promise.all([
          // 1. User aggregate stats (total, status, rank)
          User.aggregate([
            {
              $facet: {
                totalUsers: [{ $count: "count" }],
                activeUsersToday: [
                  { $match: { lastLogin: { $gte: today } } },
                  { $count: "count" },
                ],
                activeStatus: [
                  { $match: { status: "active" } },
                  { $count: "count" },
                ],
                currentWeekUsers: [
                  { $match: { createdAt: { $gte: oneWeekAgo } } },
                  { $count: "count" },
                ],
                previousWeekUsers: [
                  {
                    $match: {
                      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
                    },
                  },
                  { $count: "count" },
                ],
              },
            },
          ]),

          // 2. Post aggregate stats (total, active, by status)
          Post.aggregate([
            {
              $facet: {
                totalPosts: [{ $count: "count" }],
                activePosts: [
                  { $match: { deleted: false } },
                  { $count: "count" },
                ],
                currentWeekPosts: [
                  {
                    $match: { createdAt: { $gte: oneWeekAgo }, deleted: false },
                  },
                  { $count: "count" },
                ],
                previousWeekPosts: [
                  {
                    $match: {
                      createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo },
                      deleted: false,
                    },
                  },
                  { $count: "count" },
                ],
              },
            },
          ]),

          // 3. Group aggregate stats (total, by privacy)
          Group.aggregate([
            {
              $facet: {
                totalGroups: [{ $count: "count" }],
              },
            },
          ]),
        ]);

      // Xử lý dữ liệu user stats
      const userAggResults = userAggregateStats[0];
      const totalUsers = userAggResults.totalUsers[0]?.count || 0;
      const activeUsersToday = userAggResults.activeUsersToday[0]?.count || 0;
      const activeStatusCount = userAggResults.activeStatus[0]?.count || 0;

      // Tính toán % tăng trưởng user
      const currentWeekUsers = userAggResults.currentWeekUsers[0]?.count || 0;
      const previousWeekUsers = userAggResults.previousWeekUsers[0]?.count || 0;

      // Điều chỉnh tính toán phần trăm tăng trưởng, giới hạn giá trị giảm tối đa là -100%
      let userPercentChange;
      if (previousWeekUsers === 0) {
        userPercentChange = currentWeekUsers > 0 ? 100 : 0;
      } else {
        // Giới hạn phần trăm giảm không quá -30%
        const rawPercent =
          ((currentWeekUsers - previousWeekUsers) / previousWeekUsers) * 100;
        userPercentChange = Math.max(
          -30,
          Math.min(100, Math.round(rawPercent))
        );
      }

      // Xử lý dữ liệu post stats
      const postAggResults = postAggregateStats[0];
      const totalPosts = postAggResults.totalPosts[0]?.count || 0;
      const activePosts = postAggResults.activePosts[0]?.count || 0;

      // Tính toán % tăng trưởng post
      const currentWeekPosts = postAggResults.currentWeekPosts[0]?.count || 0;
      const previousWeekPosts = postAggResults.previousWeekPosts[0]?.count || 0;

      // Điều chỉnh tính toán phần trăm tăng trưởng
      let postPercentChange;
      if (previousWeekPosts === 0) {
        postPercentChange = currentWeekPosts > 0 ? 100 : 0;
      } else {
        // Giới hạn phần trăm giảm không quá -30%
        const rawPercent =
          ((currentWeekPosts - previousWeekPosts) / previousWeekPosts) * 100;
        postPercentChange = Math.max(
          -30,
          Math.min(100, Math.round(rawPercent))
        );
      }

      // Xử lý dữ liệu group stats
      const groupAggResults = groupAggregateStats[0];
      const totalGroups = groupAggResults.totalGroups[0]?.count || 0;

      // Đóng gói dữ liệu để trả về
      const responseData = {
        success: true,
        data: {
          userStats: {
            totalUsers,
            activeUsersToday,
            activeStatusCount,
            percentChange: userPercentChange,
          },
          postStats: {
            totalPosts,
            activePosts,
            percentChange: postPercentChange,
            deletedPosts: totalPosts - activePosts,
          },
          groupStats: {
            totalGroups,
          },
          system: {
            responseTime: Math.round(Date.now() - startTime) + "ms",
          },
        },
      };

      // Lưu vào cache trong 10 phút
      adminCache.set(cacheKey, responseData, 600);

      console.log(
        `Admin getDashboardBasicStats - Completed in ${
          Date.now() - startTime
        }ms`
      );

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getDashboardBasicStats error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API riêng cho user growth chart
  getUserGrowthData: async (req, res) => {
    try {
      console.log("Admin getUserGrowthData - Starting...");
      const startTime = Date.now();

      // Kiểm tra cache trước
      const cacheKey = "user_growth_data";
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log("Admin getUserGrowthData - Trả về dữ liệu từ cache");
        return res.status(200).json(cachedData);
      }

      // Tính toán các ngày cần lấy dữ liệu
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Danh sách các ngày trong 7 ngày qua để dùng cho aggregation
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push(date);
      }

      // Lấy dữ liệu tăng trưởng user theo ngày
      const userGrowthData = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Xử lý dữ liệu tăng trưởng - tạo map ngày -> số lượng
      const userGrowthMap = new Map();
      userGrowthData.forEach((data) => {
        userGrowthMap.set(data._id, data.count);
      });

      // Tạo mảng tăng trưởng theo từng ngày
      const growthData = last7Days.map((date) => {
        const dateStr = date.toISOString().split("T")[0];
        return {
          date: dateStr,
          newUsers: userGrowthMap.get(dateStr) || 0,
        };
      });

      const responseData = {
        success: true,
        data: {
          labels: growthData.map((d) => d.date),
          growth: growthData.map((d) => d.newUsers),
        },
      };

      // Lưu vào cache trong 30 phút
      adminCache.set(cacheKey, responseData, 1800);

      console.log(
        `Admin getUserGrowthData - Completed in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getUserGrowthData error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API riêng cho post growth chart
  getPostGrowthData: async (req, res) => {
    try {
      console.log("Admin getPostGrowthData - Starting...");
      const startTime = Date.now();

      // Kiểm tra cache trước
      const cacheKey = "post_growth_data";
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log("Admin getPostGrowthData - Trả về dữ liệu từ cache");
        return res.status(200).json(cachedData);
      }

      // Tính toán các ngày cần lấy dữ liệu
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Danh sách các ngày trong 7 ngày qua
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        last7Days.push(date);
      }

      // Lấy dữ liệu tăng trưởng bài viết theo ngày
      const postGrowthData = await Post.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
            deleted: false,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Xử lý dữ liệu - tạo map ngày -> số lượng
      const postGrowthMap = new Map();
      postGrowthData.forEach((data) => {
        postGrowthMap.set(data._id, data.count);
      });

      // Tạo mảng tăng trưởng theo từng ngày
      const growthData = last7Days.map((date) => {
        const dateStr = date.toISOString().split("T")[0];
        return {
          date: dateStr,
          newPosts: postGrowthMap.get(dateStr) || 0,
        };
      });

      const responseData = {
        success: true,
        data: {
          labels: growthData.map((d) => d.date),
          growth: growthData.map((d) => d.newPosts),
        },
      };

      // Lưu vào cache trong 30 phút
      adminCache.set(cacheKey, responseData, 1800);

      console.log(
        `Admin getPostGrowthData - Completed in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getPostGrowthData error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API riêng cho recent activity
  getRecentActivity: async (req, res) => {
    try {
      console.log("Admin getRecentActivity - Starting...");
      const startTime = Date.now();

      // Kiểm tra cache trước
      const cacheKey = "recent_activity";
      const cachedData = adminCache.get(cacheKey);

      if (cachedData) {
        console.log("Admin getRecentActivity - Trả về dữ liệu từ cache");
        return res.status(200).json(cachedData);
      }

      // Lấy dữ liệu hoạt động gần đây
      const [recentUsers, recentPosts, recentGroups] = await Promise.all([
        User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select("username fullname email avatar createdAt")
          .lean(),

        Post.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("author", "username fullname avatar")
          .lean(),

        Group.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("createdBy", "username fullname avatar")
          .lean(),
      ]);

      // Xử lý recent activity
      const recentActivity = [
        // Recent user registrations
        ...recentUsers.map((user) => ({
          type: "user_registered",
          action: "New user registered",
          user: user.username,
          userDetails: {
            fullname: user.fullname,
            avatar: user.avatar,
          },
          timestamp: user.createdAt,
        })),

        // Recent posts
        ...recentPosts.map((post) => ({
          type: "post_created",
          action: "New post created",
          user: post.author?.username || "Unknown",
          userDetails: {
            fullname: post.author?.fullname,
            avatar: post.author?.avatar,
          },
          timestamp: post.createdAt,
        })),

        // Recent groups
        ...recentGroups.map((group) => ({
          type: "group_created",
          action: "New group created",
          user: group.createdBy?.username || "Unknown",
          userDetails: {
            fullname: group.createdBy?.fullname,
            avatar: group.createdBy?.avatar,
          },
          groupName: group.name,
          timestamp: group.createdAt,
        })),
      ];

      // Sort all activities by timestamp
      recentActivity.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const responseData = {
        success: true,
        data: recentActivity.slice(0, 10), // Get most recent 10 activities
      };

      // Lưu vào cache trong 5 phút
      adminCache.set(cacheKey, responseData, 300);

      console.log(
        `Admin getRecentActivity - Completed in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Admin getRecentActivity error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API gốc vẫn giữ để compatibility
  getDashboardStats: async (req, res) => {
    try {
      console.log("Admin getDashboardStats - Redirecting to new APIs");
      // Chỉ trả về dữ liệu cơ bản, buộc client phải gọi các API riêng lẻ khác
      return await AdminController.getDashboardBasicStats(req, res);
    } catch (error) {
      console.error("Admin getDashboardStats error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // Thêm method để xóa cache khi cần thiết
  clearDashboardStatsCache: async (req, res) => {
    adminCache.del("dashboard_stats");
    return res.status(200).json({
      success: true,
      message: "Dashboard stats cache cleared",
    });
  },

  // Thêm method để xóa cache users khi có update
  clearUsersCache: async (req, res) => {
    try {
      // Xóa tất cả các keys bắt đầu bằng "admin_users_" và "admin_user_details_"
      const keys = adminCache.keys();
      const userCacheKeys = keys.filter(
        (key) =>
          key.startsWith("admin_users_") ||
          key.startsWith("admin_user_details_")
      );

      console.log(`Clearing ${userCacheKeys.length} user cache keys`);
      userCacheKeys.forEach((key) => adminCache.del(key));

      return res.status(200).json({
        success: true,
        message: `Users cache cleared (${userCacheKeys.length} keys)`,
      });
    } catch (error) {
      console.error("Error clearing users cache:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Thêm method để xóa cache posts khi có update
  clearPostsCache: async (req, res) => {
    try {
      // Xóa tất cả các keys bắt đầu bằng "admin_posts_" và "admin_post_details_"
      const keys = adminCache.keys();
      const postCacheKeys = keys.filter(
        (key) =>
          key.startsWith("admin_posts_") ||
          key.startsWith("admin_post_details_")
      );

      console.log(`Clearing ${postCacheKeys.length} post cache keys`);
      postCacheKeys.forEach((key) => adminCache.del(key));

      return res.status(200).json({
        success: true,
        message: `Posts cache cleared (${postCacheKeys.length} keys)`,
      });
    } catch (error) {
      console.error("Error clearing posts cache:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Thêm method để xóa cache groups khi có update
  clearGroupsCache: async (req, res) => {
    try {
      // Xóa tất cả các keys bắt đầu bằng "admin_groups_" và "admin_group_details_"
      const keys = adminCache.keys();
      const groupCacheKeys = keys.filter(
        (key) =>
          key.startsWith("admin_groups_") ||
          key.startsWith("admin_group_details_")
      );

      console.log(`Clearing ${groupCacheKeys.length} group cache keys`);
      groupCacheKeys.forEach((key) => adminCache.del(key));

      return res.status(200).json({
        success: true,
        message: `Groups cache cleared (${groupCacheKeys.length} keys)`,
      });
    } catch (error) {
      console.error("Error clearing groups cache:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // Cache Management - Combined route to clear all caches
  clearAllCache: async (req, res) => {
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
  },
};
