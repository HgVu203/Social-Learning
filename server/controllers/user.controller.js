import mongoose from "mongoose";
import User from "../models/user.model.js";
import Follow from "../models/follow.model.js";
import UserActivity from "../models/user_activity.model.js";
import RecommendationService from "../services/recommendation.service.js";
import similaritySearchService from "../services/similarity-search.service.js";
import NodeCache from "node-cache";
import Post from "../models/post.model.js";

// Khởi tạo cache với TTL và check period tối ưu hơn tương tự admin
const userCache = new NodeCache({
  stdTTL: 120, // Giảm TTL xuống 2 phút như admin
  checkperiod: 60, // Check cache expiration every 1 minute
  useClones: false, // Tăng hiệu năng bằng cách không clone objects
});

// Tạo cache riêng cho profile với TTL ngắn hơn như admin
const profileCache = new NodeCache({
  stdTTL: 300, // Giảm xuống 5 phút thay vì 30 phút
  checkperiod: 60,
  useClones: false,
});

// Định nghĩa các trường cần thiết cho profile để giảm kích thước response
const PROFILE_FIELDS = {
  password: 0,
  reset_password_token: 0,
  reset_password_expires: 0,
  // Các trường khác không cần thiết có thể thêm vào đây
};

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

      // Xóa cache liên quan đến user
      userCache.del(`my_profile_${userId}`);
      profileCache.del(`my_profile_${userId}`);

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

      // Tạo cache key dựa trên tham số
      const cacheKey = `leaderboard_${page}_${limit}`;
      const cachedData = userCache.get(cacheKey);

      // Trả về data từ cache nếu có
      if (cachedData) {
        console.log(`Returning cached leaderboard data for ${cacheKey}`);
        return res.status(200).json(cachedData);
      }

      // Thực hiện đồng thời hai truy vấn để tăng hiệu năng (tương tự admin)
      const [users, total] = await Promise.all([
        User.find()
          .select("username fullname avatar points rank badge")
          .sort({ points: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit)
          .lean(),

        User.countDocuments(),
      ]);

      const responseData = {
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache (TTL 2 phút như admin)
      userCache.set(cacheKey, responseData, 120);

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  myProfile: async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.user._id;
      const { page = 1, limit = 5, includePosts = true } = req.query;

      // Tạo cache key dựa trên user ID và tham số
      const cacheKey = `my_profile_${userId}_p${page}_l${limit}_posts${includePosts}`;
      const cachedData = profileCache.get(cacheKey);

      // Trả về data từ cache nếu có
      if (cachedData) {
        console.log(
          `Returning cached profile data for user ${userId}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(`Cache miss for user ${userId}, fetching from database`);

      // Thực hiện các truy vấn song song để tối ưu hiệu suất
      const [userProfile, followers, following, postCount, userPosts] =
        await Promise.all([
          // Lấy thông tin người dùng
          User.findById(userId).select(PROFILE_FIELDS).lean(),

          // Đếm followers
          Follow.countDocuments({ following: userId }),

          // Đếm following
          Follow.countDocuments({ follower: userId }),

          // Đếm posts
          Post.countDocuments({ author: userId, deleted: false }),

          // Lấy bài viết nếu có yêu cầu
          includePosts === "true" || includePosts === true
            ? Post.find({ author: userId, deleted: false })
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .populate("author", "username fullname avatar rank badge")
                .lean()
            : Promise.resolve([]),
        ]);

      if (!userProfile) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Chuẩn bị dữ liệu trả về
      const responseData = {
        success: true,
        data: {
          ...userProfile,
          followersCount: followers,
          followingCount: following,
          postsCount: postCount,
          posts: userPosts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: postCount,
            totalPages: Math.ceil(postCount / limit),
          },
        },
      };

      // Lưu vào cache (giảm xuống 5 phút)
      profileCache.set(cacheKey, responseData, 300);

      console.log(
        `Profile data fetched and cached for user ${userId}, took ${
          Date.now() - startTime
        }ms`
      );

      return res.status(200).json(responseData);
    } catch (error) {
      console.error("Error getting user profile:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getUserProfile: async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.id;
      const currentUserId = req.user?._id;
      const { page = 1, limit = 5, includePosts = true } = req.query;

      console.log(
        `[getUserProfile] Request: userId=${userId}, currentUserId=${currentUserId}, page=${page}, limit=${limit}`
      );

      // Tạo cache key dựa trên user ID, current user ID và tham số
      const cacheKey = `user_profile_${userId}_${
        currentUserId || "guest"
      }_p${page}_l${limit}_posts${includePosts}`;
      const cachedData = profileCache.get(cacheKey);

      // Trả về data từ cache nếu có
      if (cachedData) {
        console.log(
          `[getUserProfile] Returning cached user profile for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(
        `[getUserProfile] Cache miss for profile ${userId}, fetching from database`
      );

      // Check valid ObjectId or username
      const matchQuery = mongoose.Types.ObjectId.isValid(userId)
        ? { _id: new mongoose.Types.ObjectId(userId) }
        : { username: userId };

      // Tối ưu: Chỉ lấy dữ liệu cần thiết trước
      const basicUserData = await User.findOne(matchQuery)
        .select("-password -reset_password_token -reset_password_expires")
        .lean();

      if (!basicUserData) {
        console.log(
          `[getUserProfile] User ${userId} not found, took ${
            Date.now() - startTime
          }ms`
        );
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const userObjectId = basicUserData._id;

      // Kiểm tra follow status trước khi thực hiện các truy vấn khác
      let isFollowing = false;
      if (
        currentUserId &&
        currentUserId.toString() !== userObjectId.toString()
      ) {
        console.log(
          `[getUserProfile] Checking follow status: currentUser=${currentUserId}, targetUser=${userObjectId}`
        );

        // Tìm bản ghi follow cụ thể
        const followRecord = await Follow.findOne({
          follower: currentUserId,
          following: userObjectId,
        }).lean();

        isFollowing = !!followRecord;
        console.log(
          `[getUserProfile] Found follow record: ${!!followRecord}, isFollowing=${isFollowing}`
        );
      }

      // Thực hiện các truy vấn song song để tối ưu hiệu suất
      const [followersCount, followingCount, userPosts, postCount] =
        await Promise.all([
          // Đếm followers
          Follow.countDocuments({ following: userObjectId }),

          // Đếm following
          Follow.countDocuments({ follower: userObjectId }),

          // Lấy bài viết nếu có yêu cầu
          includePosts === "true" || includePosts === true
            ? Post.find({ author: userObjectId, deleted: false })
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .populate("author", "username fullname avatar rank badge")
                .lean()
            : Promise.resolve([]),

          // Đếm tổng số bài viết
          Post.countDocuments({ author: userObjectId, deleted: false }),
        ]);

      // Debug follow status
      console.log(
        `[getUserProfile] Follow Status Check - currentUser: ${currentUserId}, targetUser: ${userId}, isFollowing: ${isFollowing}`
      );

      // Force double check follow status nếu cần
      if (
        currentUserId &&
        mongoose.Types.ObjectId.isValid(userId) &&
        currentUserId.toString() !== userId
      ) {
        const doubleCheck = await Follow.findOne({
          follower: currentUserId,
          following: userObjectId,
        }).lean();

        // Log mọi trường hợp để debug
        console.log(
          `[getUserProfile] Double check follow - Found record: ${!!doubleCheck}, current isFollowing: ${isFollowing}`
        );

        // Cập nhật isFollowing nếu có mâu thuẫn
        if (!!doubleCheck !== isFollowing) {
          console.warn(
            `[getUserProfile] Follow Mismatch - Database shows follow=${!!doubleCheck} but isFollowing=${isFollowing}`
          );
          isFollowing = !!doubleCheck;
          console.warn(
            `[getUserProfile] Corrected isFollowing to ${isFollowing}`
          );
        }
      }

      // Thêm dữ liệu bổ sung
      const userData = {
        ...basicUserData,
        isFollowing,
        followersCount,
        followingCount,
        posts: userPosts,
        postsCount: postCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: postCount,
          totalPages: Math.ceil(postCount / limit),
        },
      };

      const responseData = {
        success: true,
        data: userData,
      };

      // Lưu vào cache (TTL 5 phút)
      profileCache.set(cacheKey, responseData, 300);

      console.log(
        `[getUserProfile] Profile data for ${userId} fetched and cached, took ${
          Date.now() - startTime
        }ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error getting user profile (took ${Date.now() - startTime}ms):`,
        error
      );
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

      // Xóa cache để đảm bảo dữ liệu mới được load lại
      const userCacheKeys = [
        `my_profile_${userId}`,
        `profile_${userId}`,
        `user_${userId}`,
      ];

      // Xóa tất cả cache có chứa userId
      userCache.keys().forEach((key) => {
        if (key.includes(userId.toString())) {
          console.log(`Clearing cache for key: ${key}`);
          userCache.del(key);
        }
      });

      profileCache.keys().forEach((key) => {
        if (key.includes(userId.toString())) {
          console.log(`Clearing profile cache for key: ${key}`);
          profileCache.del(key);
        }
      });

      console.log(`Cleared all cache for user ${userId}`);

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
    const startTime = Date.now();
    try {
      const { query = "", page = 1, limit = 10 } = req.query;
      const userId = req.user?._id;

      // Tạo cache key dựa trên tham số tìm kiếm
      const cacheKey = `search_users_${query}_${page}_${limit}_${
        userId || "guest"
      }`;
      const cachedData = userCache.get(cacheKey);

      // Trả về data từ cache nếu có
      if (cachedData) {
        console.log(
          `Returning cached search results for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

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

      console.log(`Performing user search for query: "${query}"`);

      // Tối ưu điều kiện tìm kiếm
      const searchCondition = {
        $or: [
          { username: { $regex: query, $options: "i" } },
          { fullname: { $regex: query, $options: "i" } },
          { bio: { $regex: query, $options: "i" } },
        ],
      };

      // Không hiển thị bản thân người dùng trong kết quả tìm kiếm nếu đã đăng nhập
      if (userId) {
        searchCondition._id = { $ne: new mongoose.Types.ObjectId(userId) };
      }

      // Giới hạn trường trả về để tăng tốc
      const projectionFields = {
        username: 1,
        fullname: 1,
        avatar: 1,
        bio: 1,
        rank: 1,
        badge: 1,
      };

      // Thực hiện tìm kiếm và đếm tổng số song song với timeout
      let usersPromise = User.find(searchCondition)
        .select(projectionFields)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()
        .maxTimeMS(5000); // Timeout 5s để tránh query quá lâu

      let countPromise = User.countDocuments(searchCondition).maxTimeMS(3000); // Timeout 3s cho count query

      // Thực hiện song song
      const [users, total] = await Promise.all([usersPromise, countPromise]);

      // Mark the type as 'user' for frontend consistency
      let usersWithType = users.map((user) => ({
        ...user,
        type: "user",
      }));

      // Nâng cao kết quả tìm kiếm với Similarity Search
      try {
        if (query) {
          usersWithType = await similaritySearchService.enhanceSearchResults(
            query,
            usersWithType
          );
        }
      } catch (aiError) {
        console.error("Similarity search error:", aiError);
      }

      // Nếu không có kết quả, tìm kiếm fuzzy
      if (usersWithType.length === 0) {
        // Tách query thành các phần để tìm kiếm từng phần
        const fuzzyQuery = query
          .split(/\s+/)
          .filter((word) => word.length >= 3);

        if (fuzzyQuery.length > 0) {
          console.log(
            `No exact matches, trying fuzzy search with: ${fuzzyQuery.join(
              ", "
            )}`
          );

          const fuzzyConditions = [];
          fuzzyQuery.forEach((part) => {
            fuzzyConditions.push(
              { username: { $regex: part, $options: "i" } },
              { fullname: { $regex: part, $options: "i" } }
            );
          });

          // Tìm kiếm fuzzy với limit và projection để tăng tốc
          const similarUsers = await User.find({
            $or: fuzzyConditions,
            _id: userId
              ? { $ne: new mongoose.Types.ObjectId(userId) }
              : { $exists: true },
          })
            .select(projectionFields)
            .limit(limit * 1)
            .lean()
            .maxTimeMS(3000);

          usersWithType = similarUsers.map((user) => ({
            ...user,
            type: "user",
            isSimilarMatch: true,
          }));

          console.log(`Found ${usersWithType.length} similar matches`);
        }
      }

      const responseData = {
        success: true,
        data: usersWithType,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache với TTL tùy thuộc vào kết quả
      // Kết quả nhiều -> cache lâu hơn vì dữ liệu ổn định hơn
      const cacheTTL = usersWithType.length > 5 ? 180 : 60;
      userCache.set(cacheKey, responseData, cacheTTL);

      console.log(
        `Search completed with ${usersWithType.length} results, took ${
          Date.now() - startTime
        }ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error searching users (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // API riêng biệt để follow user
  followUser: async (req, res) => {
    console.log("[Server] followUser API called");
    const startTime = Date.now();
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

      console.log(
        `[Server] Checking if user ${currentUserId} already follows ${targetUserId}`
      );
      // Kiểm tra xem đã follow chưa
      const existingFollow = await Follow.findOne({
        follower: currentUserId,
        following: targetUserId,
      });

      // Nếu đã follow rồi, trả về success và thông báo
      if (existingFollow) {
        console.log(
          `[Server] User ${currentUserId} already follows ${targetUserId}`
        );
        // Lấy số lượng followers mới của target user
        const followersCount = await Follow.countDocuments({
          following: targetUserId,
        });

        // Đếm số người đang follow của current user
        const followingCount = await Follow.countDocuments({
          follower: currentUserId,
        });

        return res.status(200).json({
          success: true,
          message: `You are already following ${targetUser.username}`,
          data: {
            isFollowing: true,
            followersCount,
            followingCount,
            userId: targetUserId,
          },
        });
      }

      console.log(
        `[Server] Creating follow relationship: ${currentUserId} -> ${targetUserId}`
      );
      // Follow: Tạo relationship mới với xử lý lỗi duplicate key
      try {
        await Follow.create({
          follower: currentUserId,
          following: targetUserId,
        });
        console.log(`[Server] Follow relationship created successfully`);
      } catch (followErr) {
        console.error(
          "[Server] Error creating follow relationship:",
          followErr
        );
        // Xử lý lỗi duplicate key - tức là đã có follow nhưng không tìm thấy lúc đầu
        if (followErr.code === 11000) {
          console.log(`[Server] Duplicate key error - follow already exists`);
          // Không cần làm gì nữa vì đã có follow rồi
        } else {
          // Lỗi khác, ném ra để xử lý ở catch bên ngoài
          throw followErr;
        }
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
        message: `You are now following ${targetUser.username}`,
        data: {
          isFollowing: true,
          followersCount,
          followingCount,
          userId: targetUserId,
        },
      };

      // Invalidate cache recommendation
      RecommendationService.invalidateUserRecommendations(currentUserId).catch(
        (err) => {
          console.error("[Server] Failed to invalidate recommendations:", err);
        }
      );

      // Xóa cache liên quan đến user profiles
      try {
        // Xóa cache trong db nếu sử dụng Redis hoặc lưu cache server-side
        const cacheKeysToRemove = [
          `user:${targetUserId}`,
          `user:${currentUserId}`,
        ];
        console.log(`[Server] Cache keys to remove: ${cacheKeysToRemove}`);
      } catch (cacheErr) {
        console.error("[Server] Error clearing cache:", cacheErr);
      }

      console.log(
        `[Server] followUser completed in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(response);
    } catch (error) {
      console.error("[Server] Follow user error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API riêng biệt để unfollow user
  unfollowUser: async (req, res) => {
    console.log("[Server] unfollowUser API called");
    const startTime = Date.now();
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

      // Kiểm tra user có tồn tại không
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log(
        `[Server] Checking if user ${currentUserId} follows ${targetUserId}`
      );
      // Kiểm tra xem đã follow chưa
      const existingFollow = await Follow.findOne({
        follower: currentUserId,
        following: targetUserId,
      });

      // Nếu chưa follow, trả về success và thông báo
      if (!existingFollow) {
        console.log(
          `[Server] User ${currentUserId} doesn't follow ${targetUserId}`
        );
        // Lấy số lượng followers mới của target user
        const followersCount = await Follow.countDocuments({
          following: targetUserId,
        });

        // Đếm số người đang follow của current user
        const followingCount = await Follow.countDocuments({
          follower: currentUserId,
        });

        return res.status(200).json({
          success: true,
          message: `You were not following ${targetUser.username}`,
          data: {
            isFollowing: false,
            followersCount,
            followingCount,
            userId: targetUserId,
          },
        });
      }

      console.log(
        `[Server] Deleting follow relationship: ${currentUserId} -> ${targetUserId}`
      );
      // Unfollow: Xóa relationship
      await Follow.deleteOne({
        _id: existingFollow._id,
      });
      console.log(`[Server] Follow relationship deleted successfully`);

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
        message: `You have unfollowed ${targetUser.username}`,
        data: {
          isFollowing: false,
          followersCount,
          followingCount,
          userId: targetUserId,
        },
      };

      // Invalidate cache recommendation
      RecommendationService.invalidateUserRecommendations(currentUserId).catch(
        (err) => {
          console.error("[Server] Failed to invalidate recommendations:", err);
        }
      );

      // Xóa cache liên quan đến user profiles
      try {
        // Xóa cache trong db nếu sử dụng Redis hoặc lưu cache server-side
        const cacheKeysToRemove = [
          `user:${targetUserId}`,
          `user:${currentUserId}`,
        ];
        console.log(`[Server] Cache keys to remove: ${cacheKeysToRemove}`);
      } catch (cacheErr) {
        console.error("[Server] Error clearing cache:", cacheErr);
      }

      console.log(
        `[Server] unfollowUser completed in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(response);
    } catch (error) {
      console.error("[Server] Unfollow user error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API cũ được giữ lại nhưng chỉ để chuyển hướng đến API mới
  toggleFollow: async (req, res) => {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user._id;

      // Kiểm tra xem đã follow chưa
      const existingFollow = await Follow.findOne({
        follower: currentUserId,
        following: targetUserId,
      });

      if (existingFollow) {
        // Gọi API unfollow
        return UserController.unfollowUser(req, res);
      } else {
        // Gọi API follow
        return UserController.followUser(req, res);
      }
    } catch (error) {
      console.error("Toggle follow error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  },

  // API mới: Chỉ lấy thông tin cơ bản của user
  getUserBasicInfo: async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.id || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Tạo cache key
      const cacheKey = `user_basic_${userId}`;
      const cachedData = profileCache.get(cacheKey);

      if (cachedData) {
        console.log(
          `Returning cached basic data for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(
        `Cache miss for basic info ${userId}, fetching from database`
      );

      // Kiểm tra nếu là ObjectId hay username
      const matchQuery = mongoose.Types.ObjectId.isValid(userId)
        ? { _id: new mongoose.Types.ObjectId(userId) }
        : { username: userId };

      // Lấy thông tin cơ bản, không bao gồm posts
      const basicFields = {
        username: 1,
        fullname: 1,
        email: 1,
        avatar: 1,
        bio: 1,
        phone: 1,
        address: 1,
        points: 1,
        rank: 1,
        badge: 1,
        createdAt: 1,
        lastLogin: 1,
      };

      const userData = await User.findOne(matchQuery)
        .select(basicFields)
        .lean();

      if (!userData) {
        console.log(
          `User ${userId} not found, took ${Date.now() - startTime}ms`
        );
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const responseData = {
        success: true,
        data: userData,
      };

      // Lưu vào cache (10 phút)
      profileCache.set(cacheKey, responseData, 600);

      console.log(
        `Basic profile for ${userId} fetched in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error getting basic user info (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // API mới: Chỉ lấy thông tin thống kê followers/following
  getUserStats: async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.id || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Tạo cache key
      const cacheKey = `user_stats_${userId}`;
      const cachedData = profileCache.get(cacheKey);

      if (cachedData) {
        console.log(
          `Returning cached stats for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(
        `Cache miss for user stats ${userId}, fetching from database`
      );

      // Kiểm tra user tồn tại
      const userExists = await User.exists(
        mongoose.Types.ObjectId.isValid(userId)
          ? { _id: new mongoose.Types.ObjectId(userId) }
          : { username: userId }
      );

      if (!userExists) {
        console.log(
          `User ${userId} not found, took ${Date.now() - startTime}ms`
        );
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      const userObjectId = userExists._id;

      // Kiểm tra follow status và đếm follower/following song song
      const [followersCount, followingCount, postsCount] = await Promise.all([
        // Đếm followers
        Follow.countDocuments({ following: userObjectId }),

        // Đếm following
        Follow.countDocuments({ follower: userObjectId }),

        // Đếm số lượng posts
        Post.countDocuments({
          author: userObjectId,
          deleted: false,
        }),
      ]);

      // Check if current user is following this user
      let isFollowing = false;
      const currentUserId = req.user?._id;

      if (currentUserId && userId !== currentUserId.toString()) {
        const followExists = await Follow.findOne({
          follower: currentUserId,
          following: userObjectId,
        }).lean();

        isFollowing = !!followExists;
      }

      const responseData = {
        success: true,
        data: {
          userId: userObjectId,
          followersCount,
          followingCount,
          postsCount,
          isFollowing,
        },
      };

      // Lưu vào cache (5 phút)
      profileCache.set(cacheKey, responseData, 300);

      console.log(
        `User stats for ${userId} fetched in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error getting user stats (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // API mới: Chỉ lấy bài viết của user với phân trang
  getUserPosts: async (req, res) => {
    const startTime = Date.now();
    try {
      const userId = req.params.id || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      const { page = 1, limit = 5 } = req.query;

      // Tạo cache key
      const cacheKey = `user_posts_${userId}_${page}_${limit}`;
      const cachedData = userCache.get(cacheKey);

      if (cachedData) {
        console.log(
          `Returning cached posts for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(
        `Cache miss for user posts ${userId}, fetching from database`
      );

      // Kiểm tra user tồn tại
      const userQuery = mongoose.Types.ObjectId.isValid(userId)
        ? { _id: new mongoose.Types.ObjectId(userId) }
        : { username: userId };

      const user = await User.findOne(userQuery).select("_id username").lean();

      if (!user) {
        console.log(
          `User ${userId} not found, took ${Date.now() - startTime}ms`
        );
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Tìm bài viết của user với phân trang
      const [posts, total] = await Promise.all([
        Post.find({
          author: user._id,
          deleted: false,
        })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(Number(limit))
          .populate("author", "username fullname avatar")
          .lean(),

        Post.countDocuments({
          author: user._id,
          deleted: false,
        }),
      ]);

      const responseData = {
        success: true,
        data: posts,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      };

      // Lưu vào cache (2 phút)
      userCache.set(cacheKey, responseData, 120);

      console.log(
        `User posts for ${userId} fetched in ${Date.now() - startTime}ms`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error getting user posts (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  // API mới: Lấy danh sách người theo dõi (followers) của một user
  getUserFollowers: async (req, res) => {
    const startTime = Date.now();
    try {
      // Lấy ID từ params, mặc định là user hiện tại
      const userId = req.params.id || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Parse tham số phân trang
      const { page = 1, limit = 20 } = req.query;
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);

      console.log(
        `[getUserFollowers] Request: userId=${userId}, page=${pageInt}, limit=${limitInt}`
      );

      // Kiểm tra xem user có tồn tại không
      const targetUser = await User.findById(userId)
        .select("_id username")
        .lean();
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Lấy tất cả follower IDs của target user
      const follows = await Follow.find({
        following: targetUser._id,
      })
        .sort({ createdAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean();

      // Lấy thông tin chi tiết của các followers
      const followerIds = follows.map((follow) => follow.follower);

      // Lấy thông tin cơ bản của followers
      const followers = await User.find({
        _id: { $in: followerIds },
      })
        .select("_id username fullname avatar bio rank badge")
        .lean();

      // Map followers với thông tin follow
      const mappedFollowers = followers.map((follower) => {
        const follow = follows.find(
          (f) => f.follower.toString() === follower._id.toString()
        );

        return {
          ...follower,
          followedAt: follow?.createdAt || null,
        };
      });

      // Đếm tổng số followers
      const total = await Follow.countDocuments({ following: targetUser._id });

      const response = {
        success: true,
        data: mappedFollowers,
        pagination: {
          total,
          page: pageInt,
          limit: limitInt,
          totalPages: Math.ceil(total / limitInt),
        },
      };

      console.log(
        `[getUserFollowers] Found ${mappedFollowers.length} followers, took ${
          Date.now() - startTime
        }ms`
      );
      return res.status(200).json(response);
    } catch (error) {
      console.error(`[getUserFollowers] Error: ${error.message}`, error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred while fetching followers",
      });
    }
  },

  // API mới: Lấy danh sách người mà user đang theo dõi (following)
  getUserFollowing: async (req, res) => {
    const startTime = Date.now();
    try {
      // Lấy ID từ params, mặc định là user hiện tại
      const userId = req.params.id || (req.user && req.user._id);
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "User ID is required",
        });
      }

      // Parse tham số phân trang
      const { page = 1, limit = 20 } = req.query;
      const pageInt = parseInt(page);
      const limitInt = parseInt(limit);

      console.log(
        `[getUserFollowing] Request: userId=${userId}, page=${pageInt}, limit=${limitInt}`
      );

      // Kiểm tra xem user có tồn tại không
      const targetUser = await User.findById(userId)
        .select("_id username")
        .lean();
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Lấy tất cả following relationships của target user
      const follows = await Follow.find({
        follower: targetUser._id,
      })
        .sort({ createdAt: -1 })
        .skip((pageInt - 1) * limitInt)
        .limit(limitInt)
        .lean();

      // Lấy IDs của người đang follow
      const followingIds = follows.map((follow) => follow.following);

      // Lấy thông tin chi tiết của các following users
      const followingUsers = await User.find({
        _id: { $in: followingIds },
      })
        .select("_id username fullname avatar bio rank badge")
        .lean();

      // Map following users với thông tin follow
      const mappedFollowing = followingUsers.map((user) => {
        const follow = follows.find(
          (f) => f.following.toString() === user._id.toString()
        );

        return {
          ...user,
          followedAt: follow?.createdAt || null,
        };
      });

      // Đếm tổng số following
      const total = await Follow.countDocuments({ follower: targetUser._id });

      const response = {
        success: true,
        data: mappedFollowing,
        pagination: {
          total,
          page: pageInt,
          limit: limitInt,
          totalPages: Math.ceil(total / limitInt),
        },
      };

      console.log(
        `[getUserFollowing] Found ${mappedFollowing.length} following, took ${
          Date.now() - startTime
        }ms`
      );
      return res.status(200).json(response);
    } catch (error) {
      console.error(`[getUserFollowing] Error: ${error.message}`, error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred while fetching following",
      });
    }
  },
};
