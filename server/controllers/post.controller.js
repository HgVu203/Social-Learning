import Post from "../models/post.model.js";
import Feedback from "../models/feedback.model.js";
import UserActivity from "../models/user_activity.model.js";
import User from "../models/user.model.js";
import RecommendationService from "../services/recommendation.service.js";
import Friendship from "../models/friendship.model.js";
import { emitCommentEvent } from "../socket.js";

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

        console.log(
          `[Server] Post detail ${post._id} isLiked for user ${userId}: ${isLiked}`
        );
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

      const posts = await Post.find(query)
        .populate("author", "username email avatar fullname")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get likes and comments for each post
      const postsWithCounts = await Promise.all(
        posts.map(async (post) => {
          const [likes, comments] = await Promise.all([
            Feedback.find({
              postId: post._id,
              type: "like",
            }).populate("userId", "username email avatar fullname"),
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
              if (like.userId._id) {
                return like.userId._id.toString() === userId;
              }

              // Trường hợp userId là string hoặc ObjectId
              return like.userId.toString() === userId;
            });

            console.log(
              `[Server] Post ${post._id} isLiked for user ${userId}: ${isLiked}`
            );
          }

          return {
            ...post.toJSON(),
            likes: likes.map((like) => ({
              _id: like._id,
              userId: like.userId._id || like.userId,
              username: like.userId.username,
              fullname: like.userId.fullname,
              avatar: like.userId.avatar,
            })),
            comments: comments,
            likesCount: likes.length,
            commentsCount: comments.length,
            isLiked,
          };
        })
      );

      // Sort by popularity if needed
      if (filter === "popular") {
        postsWithCounts.sort((a, b) => {
          const aScore = a.likesCount * 2 + a.commentsCount;
          const bScore = b.likesCount * 2 + b.commentsCount;
          if (bScore !== aScore) {
            return bScore - aScore;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      }

      const total = await Post.countDocuments(query);

      return res.status(200).json({
        success: true,
        data: postsWithCounts,
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
      const { keyword, tag, author, page = 1, limit = 10 } = req.query;
      const query = { deleted: false };

      if (keyword) {
        query.$or = [
          { title: { $regex: keyword, $options: "i" } },
          { content: { $regex: keyword, $options: "i" } },
        ];
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

      const posts = await Post.find(query)
        .populate("author", "username email fullname")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

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
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
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

      console.log(`[Server] User ${userId} toggling like for post ${postId}`);

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
        // Unlike: Remove the like
        console.log(`[Server] Removing like ${existingLike._id}`);
        await Feedback.deleteOne({
          _id: existingLike._id,
        });
        isLiked = false;
      } else {
        // Like: Create new like
        console.log(`[Server] Creating new like for post ${postId}`);
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

      console.log(`[Server] Response for like toggle:`, {
        success: response.success,
        isLiked: response.isLiked,
        likesCount: response.likesCount,
        userId: response.userId,
      });

      // Track user activity asynchronously
      UserActivity.create({
        userId,
        type: isLiked ? "like_post" : "unlike_post",
        postId,
      }).catch((err) =>
        console.error("[Server] Failed to track activity:", err)
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
      const { comment, parentId } = req.body;
      const postId = req.params.id;
      const userId = req.user._id;

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

      const newFeedback = new Feedback({
        postId,
        userId,
        type: "comment",
        content: comment,
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

      // Emit socket event for real-time comment update
      emitCommentEvent("comment_added", postId, {
        postId,
        comment: formattedComment,
        commentsCount: totalComments,
        postOwnerId,
      });

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

      // Emit socket event for real-time comment update
      emitCommentEvent("comment_deleted", postId, {
        postId,
        commentId,
        commentsCount: totalComments,
        postOwnerId,
      });

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
      const { id: postId, commentId } = req.params;
      const { comment } = req.body;
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

      // Update comment content
      commentDoc.content = comment;
      await commentDoc.save();

      // Populate user info
      await commentDoc.populate("userId", "username email avatar fullname");

      // Format response with user info
      const userInfo = commentDoc.userId || {};
      const formattedComment = {
        _id: commentDoc._id,
        content: commentDoc.content,
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

      // Emit socket event for real-time update
      emitCommentEvent("comment_updated", postId, {
        postId,
        comment: formattedComment,
        postOwnerId,
      });

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

      // Emit socket event with enhanced data for nested comments
      emitCommentEvent("comment_liked", postId, {
        postId,
        comment: formattedComment,
        commentId,
        parentId,
        isNestedComment,
        likesCount: formattedComment.likesCount,
        isLiked: !isLiked,
        postOwnerId,
      });

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

  recommendPosts: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      // 1. Get user's recent activities
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentActivities = await UserActivity.find({
        userId,
        createdAt: { $gte: thirtyDaysAgo },
        postId: { $exists: true },
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "postId",
          select: "title content tags views createdAt",
          match: { deleted: false },
          populate: { path: "author", select: "username" },
        })
        .lean();

      // 2. Build user profile using RecommendationService
      const userProfile =
        RecommendationService.buildUserProfile(recentActivities);

      // 3. Get candidate posts
      const candidatePosts = await Post.find({
        deleted: false,
        _id: {
          $nin: recentActivities.map((a) => a.postId?._id).filter(Boolean),
        },
        tags: { $in: Object.keys(userProfile.tags) },
      })
        .populate("author", "username fullname")
        .populate("likeCount")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // 4. Score and rank posts using RecommendationService
      const recommendedPosts = candidatePosts
        .map((post) => ({
          post,
          scores: RecommendationService.scorePost(userProfile, post),
        }))
        .sort((a, b) => b.scores.final - a.scores.final)
        .slice(0, limit)
        .map(({ post, scores }) => ({
          ...post,
          recommendationScores: scores,
        }));

      return res.status(200).json({
        success: true,
        data: recommendedPosts,
      });
    } catch (error) {
      console.error("Recommendation error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
};
