import express from "express";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Feedback from "../models/feedback.model.js";
import UserActivity from "../models/user_activity.model.js";
import Friendship from "../models/friendship.model.js";
import RecommendationService from "../services/recommendation.service.js";
import similaritySearchService from "../services/similarity-search.service.js";
import NodeCache from "node-cache";
import mongoose from "mongoose";

// Khởi tạo cache cho bài đăng
const postCache = new NodeCache({
  stdTTL: 180, // 3 phút
  checkperiod: 60, // Check cache expiration mỗi 1 phút
  useClones: false, // Tăng hiệu năng bằng cách không clone objects
});

// Cache riêng cho chi tiết bài viết với TTL dài hơn
const postDetailCache = new NodeCache({
  stdTTL: 300, // 5 phút
  checkperiod: 120,
  useClones: false,
});

// Cache cho các bình luận
const commentCache = new NodeCache({
  stdTTL: 120, // 2 phút
  checkperiod: 60,
  useClones: false,
});

export const PostController = {
  createPost: async (req, res) => {
    try {
      const { title, content, tags, groupId } = req.body;
      let images = [];

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: "Title and content are required",
        });
      }

      // Xử lý nhiều ảnh nếu có
      if (req.files && req.files.length > 0) {
        // Trường hợp sử dụng multer array
        images = req.files.map((file) => file.path);
      }

      // Chuyển đổi tags thành mảng nếu cần
      let processTags = [];
      if (tags) {
        try {
          // Thử parse JSON string (cách mới)
          processTags = JSON.parse(tags);
          if (!Array.isArray(processTags)) {
            processTags = [processTags];
          }
        } catch (e) {
          // Nếu không phải JSON, xử lý theo cách cũ
          if (Array.isArray(tags)) {
            processTags = tags;
          } else if (typeof tags === "string") {
            // Nếu tags là string (có thể là một tag đơn hoặc nhiều tag phân cách bởi dấu phẩy)
            processTags = tags.split(",").filter((tag) => tag.trim() !== "");
          } else {
            // Ensure single tag is properly handled
            processTags = [tags].filter((tag) => tag && tag.trim() !== "");
          }
        }
      }

      const newPost = new Post({
        title,
        content,
        tags: processTags.map((tag) => tag.toLowerCase().trim()),
        author: req.user._id,
        images,
        groupId: groupId || null,
      });

      await newPost.save();

      // Populate author info
      await newPost.populate("author", "username email avatar fullname");

      // Get likes and comments count
      const likes = await Feedback.find({
        postId: newPost._id,
        type: "like",
      }).select("userId");
      const comments = await Feedback.find({
        postId: newPost._id,
        type: "comment",
      });

      const postWithCounts = {
        ...newPost.toJSON(),
        likes: likes.map((like) => like.userId),
        comments: comments,
        likesCount: likes.length,
        commentsCount: comments.length,
        isLiked: false, // New post is not liked by creator initially
      };

      // Track user activity
      await UserActivity.create({
        userId: req.user._id,
        type: "create_post",
        postId: newPost._id,
      });

      // Index post for recommendations
      RecommendationService.indexPost(newPost).catch((err) => {
        console.error("Error indexing post for recommendations:", err);
      });

      return res.status(201).json({
        success: true,
        data: postWithCounts,
        message: "Post created successfully",
      });
    } catch (error) {
      console.error("Create post error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred while creating the post",
      });
    }
  },

  getPostById: async (req, res) => {
    console.log(
      `[getPostById] Redirecting to unified API for postId: ${req.params.id}`
    );
    return PostController.unifiedGetPost(req, res);
  },

  updatePost: async (req, res) => {
    try {
      const { title, content, tags } = req.body;
      const post = await Post.findOne({
        _id: req.params.id,
        deleted: false,
      });

      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      if (
        post.author.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      if (title !== undefined) post.title = title;
      if (content !== undefined) post.content = content;
      if (tags !== undefined)
        post.tags = tags.map((tag) => tag.toLowerCase().trim());

      await post.save();
      await post.populate("author", "username email avatar fullname");

      return res.status(200).json({ success: true, data: post });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getPosts: async (req, res) => {
    const startTime = Date.now();
    try {
      const {
        page = 1,
        limit = 10,
        filter = "latest",
        groupId,
        author,
      } = req.query;

      // Tạo cache key dựa trên tham số
      const userId = req.user?._id?.toString() || "guest";
      const cacheKey = `posts_${filter}_${page}_${limit}_${groupId || "home"}_${
        author || "all"
      }_${userId}`;

      // Kiểm tra cache
      const cachedData = postCache.get(cacheKey);

      // Trả về từ cache nếu có
      if (cachedData) {
        return res.status(200).json(cachedData);
      }

      let query = { deleted: false };
      let sortCriteria = {};

      // Nếu có author, lọc bài viết theo author
      if (author) {
        // Kiểm tra xem author có phải là ObjectId hợp lệ không
        if (mongoose.Types.ObjectId.isValid(author)) {
          query.author = new mongoose.Types.ObjectId(author);
        } else {
          // Nếu không phải là ObjectId hợp lệ, có thể là username
          const userByUsername = await User.findOne({
            username: author,
          }).lean();
          if (!userByUsername) {
            return res.status(404).json({
              success: false,
              error: "Author not found",
            });
          }
          query.author = userByUsername._id;
        }

        console.log(`[getPosts] Filtering posts by author: ${author}`);
      }

      // Phân biệt rõ ràng giữa bài đăng cá nhân và bài đăng nhóm
      if (groupId) {
        // Nếu có groupId, chỉ lấy bài đăng của nhóm đó
        query.groupId = mongoose.Types.ObjectId.isValid(groupId)
          ? new mongoose.Types.ObjectId(groupId)
          : groupId;
      } else if (!author) {
        // Nếu không có groupId (feed cá nhân) và không lọc theo author, chỉ lấy bài đăng không thuộc nhóm nào
        query.groupId = null;
      }

      // Xử lý điều kiện sắp xếp dựa trên filter
      if (filter === "popular") {
        // Popular filter: sắp xếp theo số lượt xem (views) cao nhất
        sortCriteria = { views: -1 };
      } else if (filter === "latest") {
        // Latest filter: sắp xếp theo thời gian tạo mới nhất
        sortCriteria = { createdAt: -1 };
      } else if (filter === "following" && req.user) {
        // Following filter: chỉ hiển thị bài viết của bạn bè
        const friendships = await Friendship.find({
          $or: [
            { userId: req.user._id, status: "accepted" },
            { friendId: req.user._id, status: "accepted" },
          ],
        }).lean(); // Sử dụng lean() để tăng tốc

        const friendIds = friendships.map((f) =>
          f.userId.toString() === req.user._id.toString()
            ? f.friendId
            : f.userId
        );

        query.author = { $in: friendIds };
        sortCriteria = { createdAt: -1 }; // Mặc định sắp xếp theo thời gian mới nhất
      } else if (filter === "recommended" && req.user) {
        // Recommended filter: hiển thị bài viết được đề xuất
        const recommendedPosts = await RecommendationService.getRecommendations(
          req.user._id,
          limit * 1
        );

        if (recommendedPosts && recommendedPosts.length > 0) {
          // Nếu có bài được đề xuất, trả về ngay
          const total = recommendedPosts.length;

          const responseData = {
            success: true,
            data: recommendedPosts,
            pagination: {
              total,
              page: parseInt(page),
              totalPages: Math.ceil(total / limit),
            },
            duration: Date.now() - startTime,
          };

          // Cache kết quả
          const cacheTTL = 300; // 5 phút cho recommended posts
          postCache.set(cacheKey, responseData, cacheTTL);

          return res.status(200).json(responseData);
        }
        // Nếu không có bài đề xuất, tiếp tục xử lý bình thường với filter popular
        sortCriteria = { views: -1 }; // Fallback sang popular nếu không có recommend
      } else {
        // Mặc định sắp xếp theo thời gian mới nhất
        sortCriteria = { createdAt: -1 };
      }

      // Dùng aggregate để lấy likesCount, commentsCount cho tất cả post
      let postsAgg = await Post.aggregate([
        { $match: query },
        { $sort: sortCriteria }, // Áp dụng tiêu chí sắp xếp phù hợp
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: "feedbacks",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: { $expr: { $and: [{ $eq: ["$postId", "$$postId"] }] } },
              },
              {
                $group: {
                  _id: "$type",
                  count: { $sum: 1 },
                },
              },
            ],
            as: "feedbackCounts",
          },
        },
        {
          $addFields: {
            likesCount: {
              $ifNull: [
                {
                  $first: {
                    $filter: {
                      input: "$feedbackCounts",
                      as: "fc",
                      cond: { $eq: ["$$fc._id", "like"] },
                    },
                  },
                },
                { count: 0 },
              ],
            },
            commentsCount: {
              $ifNull: [
                {
                  $first: {
                    $filter: {
                      input: "$feedbackCounts",
                      as: "fc",
                      cond: { $eq: ["$$fc._id", "comment"] },
                    },
                  },
                },
                { count: 0 },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            createdAt: 1,
            author: 1,
            views: 1, // Thêm views vào kết quả
            likesCount: "$likesCount.count",
            commentsCount: "$commentsCount.count",
            groupId: 1,
            images: 1,
            tags: 1,
          },
        },
      ]).allowDiskUse(true); // Thêm allowDiskUse để xử lý tập dữ liệu lớn

      // Populate author cho tất cả post
      await Post.populate(postsAgg, {
        path: "author",
        select: "username email avatar fullname",
      });

      // Lọc ra các bài viết có tác giả đã bị xóa
      postsAgg = postsAgg.filter((post) => post.author && post.author._id);

      // Kiểm tra like status cho user hiện tại nếu đăng nhập
      if (req.user) {
        const userId = req.user._id;
        const postIds = postsAgg.map((post) => post._id);

        // Lấy tất cả likes của user hiện tại cho các bài viết
        const userLikes = await Feedback.find({
          postId: { $in: postIds },
          userId: userId,
          type: "like",
        }).lean();

        // Map likes vào postIds để kiểm tra nhanh
        const likedPostIds = userLikes.reduce((map, like) => {
          map[like.postId.toString()] = true;
          return map;
        }, {});

        // Thêm trường isLiked cho mỗi post
        postsAgg.forEach((post) => {
          post.isLiked = !!likedPostIds[post._id.toString()];
        });
      }

      // Truy vấn tổng số records phù hợp với count API (cũng loại bỏ bài post của người dùng bị xóa)
      // Sử dụng lookup để chỉ đếm những bài viết có tác giả tồn tại
      const countResult = await Post.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorInfo",
          },
        },
        {
          $match: {
            authorInfo: { $ne: [] },
          },
        },
        {
          $count: "total",
        },
      ]);

      const total = countResult.length > 0 ? countResult[0].total : 0;

      const responseData = {
        success: true,
        data: postsAgg,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
        duration: Date.now() - startTime,
      };

      // Thiết lập thời gian cache tùy theo loại request
      let cacheTTL = 180; // 3 phút mặc định

      // Bài viết nhóm cập nhật thường xuyên hơn
      if (groupId) {
        cacheTTL = 60; // 1 phút cho group posts
      }

      // Cache kết quả
      postCache.set(cacheKey, responseData, cacheTTL);

      return res.status(200).json(responseData);
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  searchPosts: async (req, res) => {
    try {
      const { q, keyword, tag, author, page = 1, limit = 10 } = req.query;
      const searchQuery = q || keyword;
      let query = { deleted: false };

      if (searchQuery) {
        // Cải thiện tìm kiếm để tìm cả nội dung liên quan
        const searchPattern = searchQuery
          .split(/\s+/)
          .map((word) => (word.length > 3 ? word : null))
          .filter(Boolean);

        if (searchPattern.length > 0) {
          // Sử dụng $text search nếu từ khoá đủ dài
          query.$or = [
            { title: { $regex: searchQuery, $options: "i" } },
            { content: { $regex: searchQuery, $options: "i" } },
            ...searchPattern.map((word) => ({
              tags: { $regex: word, $options: "i" },
            })),
          ];
        } else {
          // Tìm kiếm đơn giản nếu từ khóa ngắn
          query.$or = [
            { title: { $regex: searchQuery, $options: "i" } },
            { content: { $regex: searchQuery, $options: "i" } },
          ];
        }
      }

      if (tag) {
        query.tags = { $in: Array.isArray(tag) ? tag : [tag] };
      }

      if (author) {
        const user = await User.findOne({ username: author });
        if (!user) {
          return res.status(404).json({
            success: false,
            error: "Author not found",
          });
        }
        query.author = user._id;
      }

      try {
        // Lấy danh sách bài viết
        const posts = await Post.find(query)
          .populate("author", "username email fullname avatar")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

        // Lọc ra các bài viết có tác giả đã bị xóa
        const filteredPosts = posts.filter(
          (post) => post.author && post.author._id
        );

        // Lấy thông tin về likes và comments cho mỗi bài viết
        let postsWithDetails = await Promise.all(
          filteredPosts.map(async (post) => {
            try {
              // Get likes and comments for this post
              const [likes, comments] = await Promise.all([
                Feedback.find({
                  postId: post._id,
                  type: "like",
                }).select("userId"),
                Feedback.countDocuments({
                  postId: post._id,
                  type: "comment",
                }),
              ]);

              // Xác định trạng thái isLiked cho người dùng hiện tại
              let isLiked = false;
              if (req.user) {
                const userId = req.user._id.toString();
                isLiked = likes.some((like) => {
                  if (!like.userId) return false;
                  if (typeof like.userId === "object" && like.userId._id) {
                    return like.userId._id.toString() === userId;
                  }
                  return like.userId.toString() === userId;
                });
              }

              // Thêm thông tin chi tiết vào đối tượng bài viết
              return {
                ...post.toJSON(),
                type: "post", // Đánh dấu loại là bài viết
                likes: likes.map((like) => like.userId),
                likesCount: likes.length,
                commentsCount: comments,
                isLiked,
              };
            } catch (error) {
              console.error("Error processing post details:", error);
              // Vẫn trả về bài viết cơ bản nếu xử lý chi tiết thất bại
              return {
                ...post.toJSON(),
                type: "post",
                likes: [],
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
              };
            }
          })
        );

        // Enhance search results with similarity search
        if (searchQuery && searchQuery.length >= 2) {
          postsWithDetails = await similaritySearchService.enhanceSearchResults(
            searchQuery,
            postsWithDetails
          );
        }

        // Đếm tổng số kết quả phù hợp, loại bỏ các bài viết của tác giả đã bị xóa
        const total = await Post.aggregate([
          { $match: query },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "authorInfo",
            },
          },
          {
            $match: {
              authorInfo: { $ne: [] },
            },
          },
          {
            $count: "total",
          },
        ]);

        const totalCount = total.length > 0 ? total[0].total : 0;

        // Nếu không tìm thấy kết quả chính xác, tìm bài viết liên quan
        let relatedPosts = [];
        if (postsWithDetails.length === 0 && searchQuery) {
          try {
            // Use Similarity Search Service to find related content
            relatedPosts = await similaritySearchService.findRelatedContent(
              searchQuery
            );

            // Lọc ra các bài viết có tác giả đã bị xóa từ bài viết liên quan
            relatedPosts = relatedPosts.filter(
              (post) => post.author && post.author._id
            );

            // Fallback: Nếu Similarity Search không có kết quả
            if (relatedPosts.length === 0) {
              // Tìm bài viết dựa trên tags có liên quan
              const relatedQuery = { deleted: false };
              const tagWords = searchQuery
                .split(/\s+/)
                .filter((word) => word.length > 3)
                .map((word) => new RegExp(word, "i"));

              if (tagWords.length > 0) {
                // Tìm bài viết có chứa một trong các từ khóa trong tags
                relatedQuery.tags = { $in: tagWords };

                const relatedTagPosts = await Post.find(relatedQuery)
                  .populate("author", "username email fullname avatar")
                  .sort({ createdAt: -1 })
                  .limit(5);

                // Lọc bỏ bài viết của tác giả đã bị xóa
                const filteredRelatedPosts = relatedTagPosts.filter(
                  (post) => post.author && post.author._id
                );

                relatedPosts = await Promise.all(
                  filteredRelatedPosts.map(async (post) => {
                    const [likes, comments] = await Promise.all([
                      Feedback.find({
                        postId: post._id,
                        type: "like",
                      }).select("userId"),
                      Feedback.countDocuments({
                        postId: post._id,
                        type: "comment",
                      }),
                    ]);

                    return {
                      ...post.toJSON(),
                      type: "post",
                      isRelated: true,
                      likes: likes.map((like) => like.userId),
                      likesCount: likes.length,
                      commentsCount: comments,
                      isLiked: false,
                    };
                  })
                );
              }
            }
          } catch (relatedError) {
            console.error("Error finding related posts:", relatedError);
          }
        }

        return res.status(200).json({
          success: true,
          data: [...postsWithDetails, ...relatedPosts],
          pagination: {
            total: totalCount,
            page: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
          },
        });
      } catch (innerError) {
        console.error("Error in search query execution:", innerError);
        return res.status(500).json({
          success: false,
          error: "Lỗi khi xử lý tìm kiếm. Vui lòng thử lại sau.",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Lỗi máy chủ khi tìm kiếm.",
      });
    }
  },

  deletePost: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      if (
        post.author.toString() !== req.user._id.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ success: false, error: "Unauthorized" });
      }

      post.deleted = true;
      post.deletedAt = new Date();
      await post.save();

      return res
        .status(200)
        .json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  restorePost: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      post.deleted = false;
      post.deletedAt = null;
      post.status = "approved"; // Restore to approved state
      await post.save();

      return res
        .status(200)
        .json({ success: true, message: "Post restored successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  likePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user._id;

      console.log(
        `[likePost] Processing like for post ${postId} by user ${userId}`
      );

      // Find post to verify it exists
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Check if this is a group post
      const isGroupPost = !!post.groupId;
      const groupId = post.groupId;

      if (isGroupPost) {
        console.log(`[likePost] This is a group post for group ${groupId}`);
      }

      // Find existing like
      const existingLike = await Feedback.findOne({
        postId,
        userId,
        type: "like",
      });

      let isLiked = false; // Giá trị sẽ được trả về
      let likesCount = 0; // Số lượng likes mới
      let likes = []; // Mảng likes mới

      // Thực hiện toggle like
      if (existingLike) {
        // Đã like trước đây, giờ sẽ unlike
        console.log(
          `[likePost] Found existing like (${existingLike._id}), removing it`
        );
        await existingLike.deleteOne();
        isLiked = false;

        console.log(`[likePost] User ${userId} unliked post ${postId}`);
      } else {
        // Chưa like, giờ sẽ like
        console.log(`[likePost] No existing like found, creating new like`);
        const newLike = new Feedback({
          postId,
          userId,
          type: "like",
        });

        const savedLike = await newLike.save();
        console.log(`[likePost] Created new like: ${savedLike._id}`);
        isLiked = true;

        console.log(`[likePost] User ${userId} liked post ${postId}`);
      }

      // Lấy danh sách likes mới và đếm - làm điều này sau mỗi thao tác để đảm bảo chính xác
      const newLikes = await Feedback.find({
        postId,
        type: "like",
      }).lean();

      likes = newLikes.map((like) => like.userId);
      likesCount = newLikes.length;

      console.log(
        `[likePost] Current like status - count: ${likesCount}, isLiked: ${isLiked}`
      );

      // In ra một số userId đầu tiên để debug
      if (likes.length > 0) {
        console.log(
          `[likePost] Sample of users who liked: ${likes
            .slice(0, Math.min(3, likes.length))
            .map((id) => id.toString())}`
        );
      }

      // Xóa cache liên quan
      console.log(`[likePost] Clearing cache for post ${postId}`);

      // Use wildcard patterns to match all related cache keys
      const postCacheKeys = postCache
        .keys()
        .filter((key) => key.includes(postId));
      const postDetailCacheKeys = postDetailCache
        .keys()
        .filter((key) => key.includes(postId));
      const commentCacheKeys = commentCache
        .keys()
        .filter((key) => key.includes(postId));

      // Delete matched caches
      postCacheKeys.forEach((key) => postCache.del(key));
      postDetailCacheKeys.forEach((key) => postDetailCache.del(key));
      commentCacheKeys.forEach((key) => commentCache.del(key));

      console.log(
        `[likePost] Cleared ${postCacheKeys.length} post cache entries, ${postDetailCacheKeys.length} detail cache entries, and ${commentCacheKeys.length} comment cache entries`
      );

      // Force invalidate homepage caches to make sure feed is updated
      const homeCacheKeys = postCache
        .keys()
        .filter((key) => key.includes("home"));
      homeCacheKeys.forEach((key) => postCache.del(key));
      console.log(
        `[likePost] Cleared ${homeCacheKeys.length} home feed cache entries`
      );

      // Đặc biệt xóa cache liên quan đến group nếu đây là group post
      if (isGroupPost && groupId) {
        const groupCacheKeys = postCache
          .keys()
          .filter((key) => key.includes(groupId.toString()));

        groupCacheKeys.forEach((key) => postCache.del(key));
        console.log(
          `[likePost] Cleared ${groupCacheKeys.length} group cache entries for group ${groupId}`
        );
      }

      // Phản hồi với thông tin chính xác từ server
      const response = {
        success: true,
        postId,
        isLiked, // Giá trị boolean rõ ràng
        likesCount, // Số lượng like đã cập nhật
        likes, // Mảng userId đã like
        message: isLiked
          ? "Post liked successfully"
          : "Post unliked successfully",
        groupId: isGroupPost ? groupId : null, // Thêm groupId nếu là group post
        isGroupPost, // Đánh dấu rõ là group post
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error(`[likePost] Error processing like:`, error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  addComment: async (req, res) => {
    try {
      console.log(
        "[addComment] Comment request body:",
        JSON.stringify(req.body)
      );

      // Extract comment data with defaults for empty fields
      const { comment = "", parentId = null, image = null } = req.body;

      const postId = req.params.id;
      const userId = req.user._id;

      // Log the actual values we'll be using
      console.log(
        `[addComment] Creating comment with: text="${comment}", image=${
          image ? "present" : "none"
        }, parentId=${parentId || "none"}`
      );

      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Validate parent comment if provided
      let parentComment = null;
      if (parentId) {
        parentComment = await Feedback.findOne({
          _id: parentId,
          postId,
          type: "comment",
        }).populate("userId", "username email avatar fullname");

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            error: "Parent comment not found",
          });
        }

        console.log(
          `[addComment] Found parent comment: ${parentComment._id} by user ${
            parentComment.userId?.username || "unknown"
          }`
        );
      }

      // Validate that either comment or image is provided
      if ((!comment || comment.trim() === "") && !image) {
        return res.status(400).json({
          success: false,
          error: "Comment text or image is required",
        });
      }

      console.log(
        "[addComment] Creating new comment with content:",
        comment,
        "image:",
        image ? "present" : "none"
      );

      const newFeedback = new Feedback({
        postId,
        userId,
        type: "comment",
        content: comment || "", // Ensure empty string if no comment
        image: image || null, // Ensure null if no image
        parentId: parentId || null,
      });
      await newFeedback.save();

      // Populate user info
      await newFeedback.populate("userId", "username email avatar fullname");

      // If user was not found, provide default values (should not normally happen)
      const userInfo = newFeedback.userId || {};

      // Format response
      const formattedComment = {
        _id: newFeedback._id,
        content: newFeedback.content,
        image: newFeedback.image,
        parentId: newFeedback.parentId,
        userId: {
          _id: userInfo._id || userId,
          username: userInfo.username || "user",
          email: userInfo.email || "",
          avatar: userInfo.avatar || "",
          fullname: userInfo.fullname || "User",
        },
        createdAt: newFeedback.createdAt,
        updatedAt: newFeedback.updatedAt,
        likes: [],
        likesCount: 0,
        isLiked: false,
        replies: [], // Thêm mảng replies rỗng để đảm bảo cấu trúc phân cấp
      };

      // Nếu đây là reply, cần thêm thông tin parent
      let parentInfo = null;
      if (parentComment) {
        // Tạo thông tin parent để trả về kèm theo
        const parentUserInfo = parentComment.userId || {};
        parentInfo = {
          _id: parentComment._id,
          content: parentComment.content,
          userId: {
            _id: parentUserInfo._id || parentComment.userId,
            username: parentUserInfo.username || "user",
            avatar: parentUserInfo.avatar || "",
            fullname: parentUserInfo.fullname || "User",
          },
        };

        console.log(
          `[addComment] Attaching parent info for reply: ${formattedComment._id} -> ${parentInfo._id}`
        );

        // Cập nhật trường replies của parent comment
        if (!(parentComment.replies instanceof Array)) {
          parentComment.replies = [];
        }

        // Thêm ID comment mới vào mảng replies của parent
        if (!parentComment.replies.includes(newFeedback._id)) {
          parentComment.replies.push(newFeedback._id);
          await parentComment.save();
          console.log(
            `[addComment] Updated parent comment ${parentComment._id} replies array`
          );
        }
      }

      // Get updated comment count
      const totalComments = await Feedback.countDocuments({
        postId,
        type: "comment",
      });

      // Clear any caches related to this post's comments and engagement
      // This is important to prevent inconsistencies
      const userIdString = userId.toString();

      console.log(`[addComment] Clearing cache for post ${postId}`);

      // Cache keys to invalidate
      const guestCacheKey = `comments_${postId}_guest`;
      const userCacheKey = `comments_${postId}_${userIdString}`;
      const engagementGuestCacheKey = `post_engagement_${postId}_guest`;
      const engagementUserCacheKey = `post_engagement_${postId}_${userIdString}`;
      const postDetailCacheKeys = postDetailCache
        .keys()
        .filter((key) => key.includes(postId));

      console.log(`[addComment] Cache keys to invalidate:
        - ${guestCacheKey}
        - ${userCacheKey}
        - ${engagementGuestCacheKey}
        - ${engagementUserCacheKey}
        - and ${postDetailCacheKeys.length} post detail keys`);

      // Delete from cache
      commentCache.del(guestCacheKey);
      commentCache.del(userCacheKey);
      commentCache.del(engagementGuestCacheKey);
      commentCache.del(engagementUserCacheKey);
      postDetailCacheKeys.forEach((key) => postDetailCache.del(key));

      // Cập nhật lại post detail cache để đảm bảo commentsCount được cập nhật
      const postDetailData = {
        success: true,
        data: {
          ...post.toJSON(),
          commentsCount: totalComments,
        },
      };

      // Lưu vào cache với timestamp mới để tránh dùng cache cũ
      postDetailCache.set(
        `post_unified_${postId}_${userIdString}_${Date.now()}`,
        postDetailData,
        300
      );

      return res.status(200).json({
        success: true,
        data: {
          postId,
          comment: formattedComment,
          parentInfo: parentInfo,
          commentsCount: totalComments,
          isReply: !!parentId,
        },
        message: parentId
          ? "Reply added successfully"
          : "Comment added successfully",
      });
    } catch (error) {
      console.error("[addComment] Error adding comment:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { id: postId, commentId } = req.params;
      const userId = req.user._id;

      // Check if post exists
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Find the comment
      const comment = await Feedback.findOne({
        _id: commentId,
        postId,
        type: "comment",
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check if user is authorized to delete
      if (
        comment.userId.toString() !== userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to delete this comment",
        });
      }

      // Delete the comment
      await comment.deleteOne();

      // Also delete any replies to this comment if it's a parent comment
      if (!comment.parentId) {
        await Feedback.deleteMany({
          postId,
          type: "comment",
          parentId: commentId,
        });
      }

      // Get updated comment count
      const totalComments = await Feedback.countDocuments({
        postId,
        type: "comment",
      });

      // Clear any caches related to this post's comments and engagement
      // This is important to prevent inconsistencies
      const userIdString = userId.toString();
      const guestCacheKey = `comments_${postId}_guest`;
      const userCacheKey = `comments_${postId}_${userIdString}`;
      const engagementGuestCacheKey = `post_engagement_${postId}_guest`;
      const engagementUserCacheKey = `post_engagement_${postId}_${userIdString}`;

      console.log(`Invalidating cache keys for deleted comment: 
        - ${guestCacheKey}
        - ${userCacheKey}
        - ${engagementGuestCacheKey}
        - ${engagementUserCacheKey}`);

      // Delete from cache
      commentCache.del(guestCacheKey);
      commentCache.del(userCacheKey);
      commentCache.del(engagementGuestCacheKey);
      commentCache.del(engagementUserCacheKey);

      // Create a new engagement cache entry with the updated count
      const engagementData = {
        success: true,
        data: {
          commentsCount: totalComments,
          // We don't have the rest of the engagement data here,
          // but commentsCount is what we need to fix
        },
      };

      // Cache for a short time to prevent inconsistencies
      commentCache.set(engagementGuestCacheKey, engagementData, 30);
      commentCache.set(engagementUserCacheKey, engagementData, 30);

      return res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
        data: {
          commentsCount: totalComments,
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

  updateComment: async (req, res) => {
    try {
      console.log("Update comment request body:", JSON.stringify(req.body));

      const { id: postId, commentId } = req.params;
      const { comment = "", image } = req.body;
      const userId = req.user._id;

      // Log the actual values we'll be using
      console.log(
        `Updating comment ${commentId} with: text="${comment}", image=${
          image !== undefined ? (image ? "present" : "removed") : "unchanged"
        }`
      );

      // Check if post exists
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Find the comment
      const commentDoc = await Feedback.findOne({
        _id: commentId,
        postId,
        type: "comment",
      });

      if (!commentDoc) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check if user is authorized to update the comment
      if (
        commentDoc.userId.toString() !== userId.toString() &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          success: false,
          error: "Not authorized to update this comment",
        });
      }

      // Validate that either comment or image is provided
      const willHaveContent =
        comment !== undefined
          ? comment.trim() !== ""
          : commentDoc.content.trim() !== "";
      const willHaveImage =
        image !== undefined ? image !== null : commentDoc.image !== null;

      if (!willHaveContent && !willHaveImage) {
        return res.status(400).json({
          success: false,
          error: "Comment text or image is required",
        });
      }

      // Update comment content and image
      if (comment !== undefined) {
        commentDoc.content = comment;
      }

      if (image !== undefined) {
        commentDoc.image = image;
      }

      await commentDoc.save();

      // Populate user info
      await commentDoc.populate("userId", "username email avatar fullname");

      // Format response with user info
      const userInfo = commentDoc.userId || {};
      const formattedComment = {
        _id: commentDoc._id,
        content: commentDoc.content,
        image: commentDoc.image,
        parentId: commentDoc.parentId,
        userId: {
          _id: userInfo._id || userId,
          username: userInfo.username || "user",
          email: userInfo.email || "",
          avatar: userInfo.avatar || "",
          fullname: userInfo.fullname || "User",
        },
        createdAt: commentDoc.createdAt,
        updatedAt: commentDoc.updatedAt,
        likes: commentDoc.likes || [],
        likesCount: (commentDoc.likes || []).length,
        isLiked: commentDoc.likes?.includes(userId) || false,
      };

      // Get post owner ID
      const postOwnerId = post.author.toString();

      return res.status(200).json({
        success: true,
        data: {
          postId,
          comment: formattedComment,
        },
        message: "Comment updated successfully",
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getComments: async (req, res) => {
    const startTime = Date.now();
    try {
      const postId = req.params.id;
      const userId = req.user?._id?.toString() || "guest";

      // Create cache key
      const cacheKey = `comments_${postId}_${userId}`;

      // Check cache first
      const cachedData = commentCache.get(cacheKey);
      if (cachedData) {
        console.log(
          `Returning cached comments for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(`Fetching comments for post ${postId}`);

      // Check if post exists and is not deleted
      const postExists = await Post.exists({
        _id: postId,
        deleted: false,
      });

      if (!postExists) {
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }

      // Get all comments for this post
      const allComments = await Feedback.find({
        postId: postId,
        type: "comment",
      })
        .populate("userId", "username email avatar fullname")
        .sort({ createdAt: -1 })
        .lean();

      // Process comments into a hierarchical structure
      const commentMap = new Map();
      const rootComments = [];

      // First, index all comments
      allComments.forEach((comment) => {
        // Ensure necessary properties
        comment.replies = [];
        comment.likes = comment.likes || [];
        comment.likesCount = comment.likes.length;

        // Add isLiked if user is logged in
        if (req.user) {
          comment.isLiked = comment.likes.some(
            (likeUserId) => likeUserId.toString() === req.user._id.toString()
          );
        } else {
          comment.isLiked = false;
        }

        commentMap.set(comment._id.toString(), comment);
      });

      // Then, build the tree structure
      allComments.forEach((comment) => {
        if (comment.parentId) {
          // This is a reply
          const parentComment = commentMap.get(comment.parentId.toString());
          if (parentComment) {
            console.log(
              `Adding reply ${comment._id} to parent ${parentComment._id}`
            );
            parentComment.replies.push(comment);
          } else {
            // If parent not found, treat as root comment
            console.warn(
              `Parent comment ${comment.parentId} not found for reply ${comment._id}, treating as root comment`
            );
            rootComments.push(comment);
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      // Sort replies by time (oldest first for natural conversation flow)
      rootComments.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          console.log(
            `Sorting ${comment.replies.length} replies for comment ${comment._id}`
          );
          comment.replies.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        }
      });

      // Log some debug information
      console.log(
        `Found ${rootComments.length} root comments and ${
          allComments.length - rootComments.length
        } replies`
      );

      // Log the first few comments with their replies for debugging
      if (rootComments.length > 0) {
        rootComments.slice(0, 3).forEach((comment) => {
          console.log(
            `Root comment ${comment._id} has ${
              comment.replies?.length || 0
            } replies`
          );
        });
      }

      const responseData = {
        success: true,
        data: {
          comments: rootComments,
          commentsCount: allComments.length,
          topLevelCount: rootComments.length,
        },
        duration: Date.now() - startTime,
      };

      // Cache results for 2 minutes (comments change frequently)
      commentCache.set(cacheKey, responseData, 120);

      // Ensure engagement cache has the same count
      const engagementCacheKey = `post_engagement_${postId}_${userId}`;
      const existingEngagementData = commentCache.get(engagementCacheKey);
      if (existingEngagementData) {
        existingEngagementData.data.commentsCount = allComments.length;
        commentCache.set(engagementCacheKey, existingEngagementData, 120);
      }

      console.log(`Comments fetched in ${Date.now() - startTime}ms`);
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `Error fetching comments (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  likeComment: async (req, res) => {
    try {
      const { id: postId, commentId } = req.params;
      const userId = req.user._id;

      console.log(
        `[likeComment] Processing like for comment: ${commentId} in post: ${postId} by user: ${userId}`
      );

      // Find post to verify it exists
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Find the comment using more robust query to handle nested comments
      const comment = await Feedback.findOne({
        _id: commentId,
        postId,
        type: "comment",
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found",
        });
      }

      // Check if this is a nested comment (has a parent)
      const isNestedComment = !!comment.parentId;
      const parentId = isNestedComment ? comment.parentId.toString() : null;

      if (isNestedComment) {
        console.log(
          `[likeComment] This is a nested comment with parent ID: ${parentId}`
        );

        // Verify parent exists
        const parentComment = await Feedback.findOne({
          _id: parentId,
          postId,
          type: "comment",
        });

        if (!parentComment) {
          console.warn(
            `[likeComment] Parent comment ${parentId} not found for nested comment ${commentId}`
          );
        }
      }

      // Initialize likes array if it doesn't exist
      if (!comment.likes) {
        comment.likes = [];
      }

      // Check if user already liked
      const userIdStr = userId.toString();
      const isLiked = comment.likes.some(
        (like) => like.toString() === userIdStr
      );

      // Toggle like status
      if (isLiked) {
        // Unlike: Remove user ID from likes array
        comment.likes = comment.likes.filter(
          (like) => like.toString() !== userIdStr
        );
        console.log(
          `[likeComment] User ${userId} unliked comment ${commentId}. New count: ${comment.likes.length}`
        );
      } else {
        // Like: Add user ID to likes array
        comment.likes.push(userId);
        console.log(
          `[likeComment] User ${userId} liked comment ${commentId}. New count: ${comment.likes.length}`
        );
      }

      // Save the updated comment
      await comment.save();

      // Xóa cache liên quan đến comment và post này
      console.log(
        `[likeComment] Clearing cache for comment ${commentId} in post ${postId}`
      );

      // Clear comment cache for this post
      const commentCacheKeys = commentCache
        .keys()
        .filter((key) => key.includes(postId));
      commentCacheKeys.forEach((key) => commentCache.del(key));

      // Also invalidate post detail cache as it may contain comment counts
      const postDetailCacheKeys = postDetailCache
        .keys()
        .filter((key) => key.includes(postId));
      postDetailCacheKeys.forEach((key) => postDetailCache.del(key));

      console.log(
        `[likeComment] Cleared ${commentCacheKeys.length} comment cache entries and ${postDetailCacheKeys.length} post detail cache entries`
      );

      return res.status(200).json({
        success: true,
        data: {
          postId,
          commentId,
          parentId,
          isNestedComment,
          likes: comment.likes,
          likesCount: comment.likes.length,
          isLiked: !isLiked, // Trạng thái mới sau khi toggle
        },
        message: isLiked ? "Comment unliked" : "Comment liked",
      });
    } catch (error) {
      console.error("[likeComment] Error liking comment:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getRecommendedPosts: async (req, res) => {
    const startTime = Date.now();
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for recommendations",
        });
      }

      const userId = req.user._id;
      const { limit = 20, page = 1 } = req.query;

      // Tạo cache key
      const cacheKey = `recommended_${userId}_${page}_${limit}`;

      // Kiểm tra cache
      const cachedData = postCache.get(cacheKey);
      if (cachedData) {
        console.log(
          `Returning cached recommendations for ${cacheKey}, took ${
            Date.now() - startTime
          }ms`
        );
        return res.status(200).json(cachedData);
      }

      console.log(
        `Cache miss for recommendations, fetching from recommendation service`
      );
      console.log(
        `Getting recommendations for user ${userId} with limit ${limit} page ${page}`
      );

      // Get personalized recommendations
      try {
        const recommendations = await RecommendationService.getRecommendations(
          userId,
          Number(limit) * 2 // Get more recommendations to support pagination
        );

        console.log(
          `Received ${recommendations.length} recommendations from service`
        );

        if (recommendations.length === 0) {
          console.log("No recommendations found. Returning empty array.");
          const emptyResponse = {
            success: true,
            data: [],
            pagination: {
              total: 0,
              page: parseInt(page),
              totalPages: 0,
            },
            meta: {
              count: 0,
              requestedLimit: Number(limit),
              message: "No recommendations available",
            },
            duration: Date.now() - startTime,
          };

          // Cache empty result with shorter TTL
          postCache.set(cacheKey, emptyResponse, 60); // 1 minute

          return res.status(200).json(emptyResponse);
        }

        // Implement pagination
        const pageInt = parseInt(page);
        const limitInt = parseInt(limit);
        const startIndex = (pageInt - 1) * limitInt;
        const endIndex = startIndex + limitInt;
        const paginatedRecommendations = recommendations.slice(
          startIndex,
          endIndex
        );

        // Optimize: Gather all post IDs for batch processing
        const postIds = paginatedRecommendations.map((post) => post._id);

        // Batch query for likes and comments counts
        const [likesAgg, commentsAgg] = await Promise.all([
          Feedback.aggregate([
            {
              $match: {
                postId: {
                  $in: postIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
                type: "like",
              },
            },
            {
              $group: {
                _id: "$postId",
                count: { $sum: 1 },
                userLiked: {
                  $push: {
                    $cond: [
                      { $eq: ["$userId", new mongoose.Types.ObjectId(userId)] },
                      true,
                      false,
                    ],
                  },
                },
              },
            },
          ]).allowDiskUse(true),

          Feedback.aggregate([
            {
              $match: {
                postId: {
                  $in: postIds.map((id) => new mongoose.Types.ObjectId(id)),
                },
                type: "comment",
              },
            },
            {
              $group: {
                _id: "$postId",
                count: { $sum: 1 },
              },
            },
          ]).allowDiskUse(true),
        ]);

        // Create maps for fast lookup
        const likesMap = {};
        likesAgg.forEach((item) => {
          likesMap[item._id.toString()] = {
            count: item.count,
            userLiked: item.userLiked.includes(true),
          };
        });

        const commentsMap = {};
        commentsAgg.forEach((item) => {
          commentsMap[item._id.toString()] = item.count;
        });

        // Enhance posts with counts
        const enhancedRecommendations = paginatedRecommendations.map((post) => {
          const postId = post._id.toString();
          return {
            ...post,
            likesCount: likesMap[postId]?.count || 0,
            isLiked: likesMap[postId]?.userLiked || false,
            commentsCount: commentsMap[postId] || 0,
          };
        });

        console.log(
          `Returning ${enhancedRecommendations.length} enhanced recommendations`
        );

        // Calculate pagination info
        const totalRecommendations = recommendations.length;
        const totalPages = Math.ceil(totalRecommendations / limitInt);

        const responseData = {
          success: true,
          data: enhancedRecommendations,
          pagination: {
            total: totalRecommendations,
            page: pageInt,
            totalPages: totalPages,
          },
          meta: {
            count: enhancedRecommendations.length,
            requestedLimit: Number(limit),
          },
          duration: Date.now() - startTime,
        };

        // Cache kết quả trong 3 phút
        postCache.set(cacheKey, responseData, 180);

        console.log(`Recommendations fetched in ${Date.now() - startTime}ms`);
        return res.status(200).json(responseData);
      } catch (recommendationError) {
        console.error("Error in recommendation service:", recommendationError);
        return res.status(500).json({
          success: false,
          error:
            recommendationError.message ||
            "Failed to get recommendations from service",
        });
      }
    } catch (error) {
      console.error(
        `Error getting recommended posts (took ${Date.now() - startTime}ms):`,
        error
      );
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to get recommendations",
      });
    }
  },

  // Unified API để lấy thông tin post - thay thế cho 3 API riêng lẻ
  unifiedGetPost: async (req, res) => {
    const startTime = Date.now();
    try {
      const postId = req.params.id;
      const userId = req.user?._id?.toString() || "guest";

      // Thêm debug log để theo dõi các request đến API này
      console.log(
        `[unifiedGetPost] Request for post ${postId} by user ${userId}`
      );

      // Tạo unified cache key
      const cacheKey = `post_unified_${postId}_${userId}_${Date.now()}`;

      // Bỏ việc kiểm tra cache để đảm bảo luôn lấy dữ liệu mới nhất
      // Sử dụng lean() để tăng hiệu năng
      const post = await Post.findOne({
        _id: postId,
        deleted: false,
      })
        .populate("author", "username email avatar fullname")
        .lean();

      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }

      // Kiểm tra xem tác giả bài viết còn tồn tại không
      if (!post.author || !post.author._id) {
        console.log(
          `[unifiedGetPost] Author of post ${postId} has been deleted`
        );
        return res.status(410).json({
          success: false,
          error: "Post author no longer exists",
          code: "AUTHOR_DELETED",
        });
      }

      // Đánh dấu nếu đây là group post
      if (post.groupId) {
        console.log(
          `[unifiedGetPost] This is a group post for group ${post.groupId}`
        );
      }

      // Cập nhật views, thực hiện riêng để không ảnh hưởng tới hiệu suất của truy vấn chính
      Post.updateOne({ _id: postId }, { $inc: { views: 1 } })
        .exec()
        .catch((err) =>
          console.error("[unifiedGetPost] Error updating view count:", err)
        );

      // Tăng views trong object để trả về cho client
      post.views = (post.views || 0) + 1;

      // Tối ưu bằng cách thực hiện các truy vấn song song
      const [likes, comments] = await Promise.all([
        Feedback.find({
          postId: post._id,
          type: "like",
        })
          .select("userId")
          .lean(),

        Feedback.find({
          postId: post._id,
          type: "comment",
          parentId: null, // Chỉ lấy comments cấp cao nhất (không phải replies)
        })
          .populate("userId", "username email avatar fullname")
          .sort({ createdAt: -1 })
          .limit(15) // Giới hạn số lượng comments ban đầu
          .lean(),
      ]);

      console.log(
        `[unifiedGetPost] Found ${likes.length} likes and ${comments.length} comments for post ${postId}`
      );

      // Xác định trạng thái isLiked cho người dùng hiện tại
      let isLiked = false;
      if (req.user) {
        const userId = req.user._id.toString();
        isLiked = likes.some((like) => {
          // Kiểm tra tất cả các trường hợp
          if (!like.userId) return false;

          // Trường hợp userId là object có _id
          if (typeof like.userId === "object" && like.userId._id) {
            return like.userId._id.toString() === userId;
          }

          // Trường hợp userId là string hoặc ObjectId
          return like.userId.toString() === userId;
        });

        console.log(
          `[unifiedGetPost] User ${userId} has liked this post: ${isLiked}`
        );

        // Debug thông tin chi tiết về like trong trường hợp không tìm thấy
        if (!isLiked && likes.length > 0) {
          console.log(
            `[unifiedGetPost] Like check details - current user: ${userId}`
          );
          console.log(
            `[unifiedGetPost] First few likes:`,
            likes.slice(0, Math.min(3, likes.length)).map((like) => {
              if (typeof like.userId === "object")
                return like.userId._id?.toString() || "unknown";
              return like.userId.toString();
            })
          );
        }
      }

      // Đếm số comments tổng cộng (bao gồm cả replies)
      const totalCommentsCount = await Feedback.countDocuments({
        postId: post._id,
        type: "comment",
      });

      // Nếu có comments, lấy thêm likes cho mỗi comment
      let processedComments = [];
      if (comments && comments.length > 0) {
        const commentIds = comments.map((comment) => comment._id);

        // Lấy tất cả likes của các comments
        const commentLikes = await Feedback.find({
          parentId: { $in: commentIds },
          type: "like",
        }).lean();

        // Lấy số replies cho mỗi comment
        const replyCounts = await Feedback.aggregate([
          {
            $match: {
              parentId: { $in: commentIds },
              type: "comment",
            },
          },
          {
            $group: {
              _id: "$parentId",
              count: { $sum: 1 },
            },
          },
        ]);

        // Map reply counts
        const replyCountMap = replyCounts.reduce((map, item) => {
          map[item._id.toString()] = item.count;
          return map;
        }, {});

        // Map comment likes
        const commentLikesMap = {};
        commentLikes.forEach((like) => {
          const commentId = like.parentId.toString();
          if (!commentLikesMap[commentId]) {
            commentLikesMap[commentId] = [];
          }
          commentLikesMap[commentId].push(like.userId);
        });

        // Process comments with likes and reply count information
        processedComments = comments.map((comment) => {
          const commentId = comment._id.toString();
          const likes = commentLikesMap[commentId] || [];
          const replyCount = replyCountMap[commentId] || 0;

          // Check if logged in user liked this comment
          let commentIsLiked = false;
          if (req.user) {
            const userId = req.user._id.toString();
            commentIsLiked = likes.some((like) => {
              if (typeof like === "object" && like._id) {
                return like._id.toString() === userId;
              }
              return like.toString() === userId;
            });
          }

          return {
            ...comment,
            likes,
            likesCount: likes.length,
            isLiked: commentIsLiked,
            replyCount,
          };
        });
      }

      // Create response with combined data
      const postData = {
        ...post,
        likes: likes.map((like) => like.userId),
        comments: processedComments,
        likesCount: likes.length,
        commentsCount: totalCommentsCount,
        isLiked,
      };

      const responseData = {
        success: true,
        data: postData,
        duration: Date.now() - startTime,
      };

      console.log(
        `[unifiedGetPost] Unified post data fetched in ${
          Date.now() - startTime
        }ms with ${likes.length} likes`
      );
      return res.status(200).json(responseData);
    } catch (error) {
      console.error(
        `[unifiedGetPost] Error fetching unified post data (took ${
          Date.now() - startTime
        }ms):`,
        error
      );
      return res.status(500).json({ success: false, error: error.message });
    }
  },
};
