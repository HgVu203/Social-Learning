import Post from "../models/post.model.js";
import Feedback from "../models/feedback.model.js";
import UserActivity from "../models/user_activity.model.js";
import User from "../models/user.model.js";
import RecommendationService from "../services/recommendation.service.js";

export const PostController = {
  createPost: async (req, res) => {
    try {
      const { title, content, tags } = req.body;

      // Validate required fields
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: "Title and content are required"
        });
      }

      const newPost = new Post({
        title,
        content,
        tags: tags ? tags.map(tag => tag.toLowerCase().trim()) : [],
        author: req.user._id,
      });

      await newPost.save();

      // Populate author info
      await newPost.populate("author", "username email avatar");

      // Get likes and comments count
      const likes = await Feedback.find({ postId: newPost._id, type: "like" }).select('userId');
      const comments = await Feedback.find({ postId: newPost._id, type: "comment" });

      const postWithCounts = {
        ...newPost.toJSON(),
        likes: likes.map(like => like.userId),
        comments: comments,
        likesCount: likes.length,
        commentsCount: comments.length,
        isLiked: false // New post is not liked by creator initially
      };

      // Track user activity
      await UserActivity.create({
        userId: req.user._id,
        activityType: 'post_create',
        postId: newPost._id
      });

      return res.status(201).json({
        success: true,
        data: postWithCounts,
        message: "Post created successfully"
      });
    } catch (error) {
      console.error('Create post error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || "An error occurred while creating the post"
      });
    }
  },

  getPostById: async (req, res) => {
    try {
      const post = await Post.findOne({
        _id: req.params.id,
        deleted: false,
      })
        .populate("author", "username email avatar")
        .populate("likeCount")
        .populate("commentCount");

      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found" });
      }
      post.views += 1;
      await post.save();

      return res.status(200).json({ success: true, data: post });
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
      await post.populate("author", "username email avatar");

      return res.status(200).json({ success: true, data: post });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  getPosts: async (req, res) => {
    try {
      const { page = 1, limit = 10, filter = 'latest' } = req.query;
      let query = { deleted: false };
      let sort = { createdAt: -1 }; // Default sort by latest

      // Apply filters
      if (filter === 'popular') {
        sort = { likesCount: -1, commentsCount: -1, createdAt: -1 };
      } else if (filter === 'following' && req.user) {
        const user = await User.findById(req.user._id).populate('following');
        const followingIds = user.following.map(u => u._id);
        query.author = { $in: followingIds };
      }

      const posts = await Post.find(query)
        .populate("author", "username email avatar")
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Get likes and comments for each post
      const postsWithCounts = await Promise.all(posts.map(async (post) => {
        const likes = await Feedback.find({ postId: post._id, type: "like" }).select('userId');
        const comments = await Feedback.find({ postId: post._id, type: "comment" })
          .populate("userId", "username email avatar")
          .sort({ createdAt: -1 });

        return {
          ...post.toJSON(),
          likes: likes.map(like => like.userId),
          comments: comments,
          likesCount: likes.length,
          commentsCount: comments.length,
          isLiked: req.user ? likes.some(like => like.userId.toString() === req.user._id.toString()) : false
        };
      }));

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
        .populate("author", "username email")
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

      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res
          .status(404)
          .json({ success: false, error: "Post not found or deleted" });
      }

      let feedback = await Feedback.findOne({ postId, userId });

      if (feedback) {
        if (feedback.type === "like") {
          await Feedback.findByIdAndDelete(feedback._id);
          
          // Get updated likes
          const likes = await Feedback.find({ postId, type: "like" }).select('userId');
          
          return res.status(200).json({
            success: true,
            message: "Post unliked successfully",
            likes: likes.map(like => like.userId)
          });
        } else {
          feedback.type = "like";
          await feedback.save();
        }
      } else {
        feedback = new Feedback({
          postId,
          userId,
          type: "like",
        });
        await feedback.save();
      }

      // Get updated likes
      const likes = await Feedback.find({ postId, type: "like" }).select('userId');

      return res.status(200).json({
        success: true,
        message: "Post liked successfully",
        likes: likes.map(like => like.userId)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  unlikePost: async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user._id;

      const feedback = await Feedback.findOneAndDelete({ 
        postId, 
        userId,
        type: "like" 
      });

      if (!feedback) {
        return res.status(404).json({ 
          success: false, 
          error: "Like not found" 
        });
      }

      // Get updated likes
      const likes = await Feedback.find({ postId, type: "like" }).select('userId');

      return res.status(200).json({
        success: true,
        message: "Post unliked successfully",
        likes: likes.map(like => like.userId)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
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
          type: "comment" 
        });
        
        if (!parentComment) {
          return res.status(404).json({
            success: false,
            error: "Parent comment not found"
          });
        }
      }

      const newFeedback = new Feedback({
        postId,
        userId,
        type: "comment",
        content: comment,
        parentId: parentId || null
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
          username: userInfo.username || 'user',
          email: userInfo.email || '',
          avatar: userInfo.avatar || '',
          fullname: userInfo.fullname || 'User'
        },
        createdAt: newFeedback.createdAt,
        updatedAt: newFeedback.updatedAt
      };

      // Get updated comment count
      const totalComments = await Feedback.countDocuments({
        postId,
        type: "comment"
      });

      return res.status(200).json({
        success: true,
        data: {
          postId,
          comment: formattedComment,
          commentsCount: totalComments
        },
        message: "Comment added successfully"
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
          error: "Post not found or deleted"
        });
      }

      // Find the comment
      const comment = await Feedback.findOne({
        _id: commentId,
        postId,
        type: "comment"
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: "Comment not found"
        });
      }

      // Check if user is authorized to delete
      if (comment.userId.toString() !== userId.toString() && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "Not authorized to delete this comment"
        });
      }

      // Delete the comment
      await comment.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Comment deleted successfully"
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  getComments: async (req, res) => {
    try {
      const postId = req.params.id;
      const { page = 1, limit = 50 } = req.query; // Increased limit to get more comments at once

      // Check if post exists
      const post = await Post.findOne({ _id: postId, deleted: false });
      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found or deleted"
        });
      }

      // Fetch comments with full user information
      const comments = await Feedback.find({
        postId,
        type: "comment",
      })
        .populate("userId", "username email avatar fullname")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      // Logging for debugging
      if (comments.some(c => !c.userId)) {
        console.warn('Some comments have missing userId:', 
          comments.filter(c => !c.userId).map(c => c._id));
      }

      // Format comments and handle missing user data
      const formattedComments = comments.map(comment => {
        // If userId is null or undefined, provide default values
        const userId = comment.userId || {};
        
        return {
          _id: comment._id,
          content: comment.content,
          parentId: comment.parentId,
          userId: {
            _id: userId._id || 'deleted-user',
            username: userId.username || 'deleteduser',
            email: userId.email || '',
            avatar: userId.avatar || '',
            fullname: userId.fullname || 'Deleted User'
          },
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt
        };
      });

      const total = await Feedback.countDocuments({
        postId,
        type: "comment",
      });

      return res.status(200).json({
        success: true,
        data: formattedComments,
        pagination: {
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
        .populate("author", "username")
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
