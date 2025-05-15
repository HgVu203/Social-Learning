import express from "express";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Feedback from "../models/feedback.model.js";
import UserActivity from "../models/user_activity.model.js";
import Friendship from "../models/friendship.model.js";
import RecommendationService from "../services/recommendation.service.js";

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
    try {
      const post = await Post.findOne({
        _id: req.params.id,
        deleted: false,
      })
        .populate("author", "username email avatar fullname")
        .populate("likeCount")
        .populate("commentCount");

      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }
      post.views += 1;
      await post.save();

      // Get likes and comments for this post
      const [likes, comments] = await Promise.all([
        Feedback.find({
          postId: post._id,
          type: "like",
        }).select("userId"),
        Feedback.find({
          postId: post._id,
          type: "comment",
        })
          .populate("userId", "username email avatar fullname")
          .sort({ createdAt: -1 }),
      ]);

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
      }

      // Create response with additional data
      const postData = {
        ...post.toJSON(),
        likes: likes.map((like) => like.userId),
        comments: comments,
        likesCount: likes.length,
        commentsCount: comments.length,
        isLiked,
      };

      return res.status(200).json({ success: true, data: postData });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
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
    try {
      const { page = 1, limit = 10, filter = "latest", groupId } = req.query;
      let query = { deleted: false };

      // Thêm điều kiện lọc theo groupId nếu có
      if (groupId) {
        query.groupId = groupId;
      }

      // Handle Following filter
      if (filter === "following" && req.user) {
        const friendships = await Friendship.find({
          $or: [
            { userId: req.user._id, status: "accepted" },
            { friendId: req.user._id, status: "accepted" },
          ],
        });

        const friendIds = friendships.map((f) =>
          f.userId.toString() === req.user._id.toString()
            ? f.friendId
            : f.userId
        );

        query.author = { $in: friendIds };
      }

      // Handle Recommended filter
      let recommendedPosts = [];
      if (filter === "recommended" && req.user) {
        const RecommendationService = (
          await import("../services/recommendation.service.js")
        ).default;
        recommendedPosts = await RecommendationService.getRecommendations(
          req.user._id,
          limit * 1
        );

        if (recommendedPosts && recommendedPosts.length > 0) {
          // Nếu có bài được đề xuất, trả về ngay
          const total = recommendedPosts.length;

          return res.status(200).json({
            success: true,
            data: recommendedPosts,
            pagination: {
              total,
              page: parseInt(page),
              totalPages: Math.ceil(total / limit),
            },
          });
        }
        // Nếu không có bài đề xuất, tiếp tục xử lý bình thường
      }

      // Dùng aggregate để lấy likesCount, commentsCount cho tất cả post
      const postsAgg = await Post.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
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
            likesCount: "$likesCount.count",
            commentsCount: "$commentsCount.count",
            groupId: 1,
          },
        },
      ]);

      // Populate author cho tất cả post
      await Post.populate(postsAgg, {
        path: "author",
        select: "username email avatar fullname",
      });

      const total = await Post.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: postsAgg,
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
        // Import AISearchService
        const { AISearchService } = await import(
          "../services/ai-search.service.js"
        );
        const aiSearchService = new AISearchService();

        // Lấy danh sách bài viết
        const posts = await Post.find(query)
          .populate("author", "username email fullname avatar")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

        // Lấy thông tin về likes và comments cho mỗi bài viết
        let postsWithDetails = await Promise.all(
          posts.map(async (post) => {
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

        // Enhance search results with AI
        if (searchQuery && searchQuery.length >= 2) {
          postsWithDetails = await aiSearchService.enhanceSearchResults(
            searchQuery,
            postsWithDetails
          );
        }

        const total = await Post.countDocuments(query);

        // Nếu không tìm thấy kết quả chính xác, tìm bài viết liên quan
        let relatedPosts = [];
        if (postsWithDetails.length === 0 && searchQuery) {
          try {
            // Use AI Search Service to find related content
            relatedPosts = await aiSearchService.findRelatedContent(
              searchQuery
            );

            // Fallback: Nếu AI search không có kết quả
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

                relatedPosts = await Promise.all(
                  relatedTagPosts.map(async (post) => {
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
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit),
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

      // Check if post exists
      const post = await Post.findOne({
        _id: postId,
        deleted: false,
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Check if already liked
      const existingLike = await Feedback.findOne({
        postId,
        userId,
        type: "like",
      });

      let isLiked;

      // Toggle like status
      if (existingLike) {
        await Feedback.deleteOne({
          _id: existingLike._id,
        });
        isLiked = false;
      } else {
        await Feedback.create({
          postId,
          userId,
          type: "like",
        });
        isLiked = true;
      }

      // Get all likes for this post with full info
      const likes = await Feedback.find({
        postId,
        type: "like",
      })
        .select("userId")
        .lean();

      const likesCount = likes.length;

      // Ensure we return a consistent format for likes
      const formattedLikes = likes.map((like) => like.userId);

      // Prepare response
      const response = {
        success: true,
        message: isLiked
          ? "Post liked successfully"
          : "Post unliked successfully",
        likesCount,
        isLiked,
        likes: formattedLikes,
        userId: userId.toString(),
      };

      // Track user activity asynchronously
      UserActivity.create({
        userId,
        type: isLiked ? "like_post" : "unlike_post",
        postId,
      }).catch((err) =>
        console.error("[Server] Failed to track activity:", err)
      );

      // Invalidate recommendation cache for this user
      RecommendationService.invalidateUserRecommendations(userId).catch(
        (err) => {
          console.error("[Server] Failed to invalidate recommendations:", err);
        }
      );

      return res.status(200).json(response);
    } catch (error) {
      console.error("[Server] Error toggling post like:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  addComment: async (req, res) => {
    try {
      console.log("Comment request body:", JSON.stringify(req.body));

      // Extract comment data with defaults for empty fields
      const { comment = "", parentId = null, image = null } = req.body;

      const postId = req.params.id;
      const userId = req.user._id;

      // Log the actual values we'll be using
      console.log(
        `Creating comment with: text="${comment}", image=${
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
      if (parentId) {
        const parentComment = await Feedback.findOne({
          _id: parentId,
          postId,
          type: "comment",
        });

        if (!parentComment) {
          return res.status(404).json({
            success: false,
            error: "Parent comment not found",
          });
        }
      }

      // Validate that either comment or image is provided
      if ((!comment || comment.trim() === "") && !image) {
        return res.status(400).json({
          success: false,
          error: "Comment text or image is required",
        });
      }

      console.log(
        "Creating new comment with content:",
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
      };

      // Get updated comment count
      const totalComments = await Feedback.countDocuments({
        postId,
        type: "comment",
      });

      // Get post owner ID
      const postOwnerId = post.author.toString();

      return res.status(200).json({
        success: true,
        data: {
          postId,
          comment: formattedComment,
          commentsCount: totalComments,
        },
        message: "Comment added successfully",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
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

      // Get updated comment count
      const totalComments = await Feedback.countDocuments({
        postId,
        type: "comment",
      });

      // Get post owner ID
      const postOwnerId = post.author.toString();

      return res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
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
    try {
      const postId = req.params.id;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.user?._id;

      // Check if post exists and is not deleted
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted",
        });
      }

      // Get all comments for the post
      const comments = await Feedback.find({
        postId,
        type: "comment",
      })
        .populate("userId", "username email avatar fullname")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      // Group comments by parent to create a tree structure
      const commentsByParent = {};
      const topLevelComments = [];

      // First pass: organize comments by their parentId
      comments.forEach((comment) => {
        // Format comment
        const formattedComment = {
          _id: comment._id,
          content: comment.content,
          image: comment.image,
          parentId: comment.parentId,
          userId: comment.userId || {
            _id: "deleted",
            username: "deleted",
            email: "",
            avatar: "",
            fullname: "Deleted User",
          },
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          likes: comment.likes || [],
          likesCount: (comment.likes || []).length,
          isLiked: userId
            ? (comment.likes || []).some(
                (like) => like.toString() === userId.toString()
              )
            : false,
          replies: [],
        };

        // Store in lookup table
        commentsByParent[comment._id] = formattedComment;

        // Top-level comments have no parentId
        if (!comment.parentId) {
          topLevelComments.push(formattedComment);
        }
      });

      // Second pass: attach replies to parents
      comments.forEach((comment) => {
        if (comment.parentId && commentsByParent[comment.parentId]) {
          commentsByParent[comment.parentId].replies.push(
            commentsByParent[comment._id]
          );
        }
      });

      // Get total comments count
      const total = await Feedback.countDocuments({ postId, type: "comment" });

      return res.status(200).json({
        success: true,
        data: {
          comments: topLevelComments,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching comments:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  likeComment: async (req, res) => {
    try {
      const { id: postId, commentId } = req.params;
      const userId = req.user._id;

      console.log(
        `Processing like for comment: ${commentId} in post: ${postId}`
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
        console.log(`This is a nested comment with parent ID: ${parentId}`);

        // Verify parent exists
        const parentComment = await Feedback.findOne({
          _id: parentId,
          postId,
          type: "comment",
        });

        if (!parentComment) {
          console.warn(
            `Parent comment ${parentId} not found for nested comment ${commentId}`
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
      } else {
        // Like: Add user ID to likes array
        comment.likes.push(userId);
      }

      // Save the updated comment
      await comment.save();

      // Populate user info for the response
      await comment.populate("userId", "username email avatar fullname");

      // Format the comment for response
      const userInfo = comment.userId || {};
      const formattedComment = {
        _id: comment._id,
        content: comment.content,
        image: comment.image,
        parentId: comment.parentId,
        userId: {
          _id: userInfo._id || userId,
          username: userInfo.username || "user",
          email: userInfo.email || "",
          avatar: userInfo.avatar || "",
          fullname: userInfo.fullname || "User",
        },
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        likes: comment.likes || [],
        likesCount: (comment.likes || []).length,
        isLiked: !isLiked, // Toggle the previous state
      };

      // Get post owner ID
      const postOwnerId = post.author.toString();

      return res.status(200).json({
        success: true,
        data: {
          postId,
          commentId,
          parentId,
          isNestedComment,
          likes: comment.likes,
          likesCount: comment.likes.length,
          isLiked: !isLiked,
        },
        message: isLiked ? "Comment unliked" : "Comment liked",
      });
    } catch (error) {
      console.error("Error liking comment:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  getRecommendedPosts: async (req, res) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          error: "Authentication required for recommendations",
        });
      }

      const userId = req.user._id;
      const { limit = 20, page = 1 } = req.query;
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
          return res.status(200).json({
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
          });
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

        // Add additional post metadata if needed
        const enhancedRecommendations = await Promise.all(
          paginatedRecommendations.map(async (post) => {
            // Check if user has liked the post
            const isLiked = await Feedback.exists({
              postId: post._id,
              userId,
              type: "like",
            });

            // Get comments count
            const commentsCount = await Feedback.countDocuments({
              postId: post._id,
              type: "comment",
            });

            // Get likes count
            const likesCount = await Feedback.countDocuments({
              postId: post._id,
              type: "like",
            });

            return {
              ...post,
              isLiked: !!isLiked,
              commentsCount,
              likesCount,
            };
          })
        );

        console.log(
          `Returning ${enhancedRecommendations.length} enhanced recommendations`
        );

        // Calculate pagination info
        const totalRecommendations = recommendations.length;
        const totalPages = Math.ceil(totalRecommendations / limitInt);

        return res.status(200).json({
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
        });
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
      console.error("Error getting recommended posts:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to get recommendations",
      });
    }
  },
};
