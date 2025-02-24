import Post from "../models/post.model.js";
import Feedback from "../models/feedback.model.js";
import UserActivity from "../models/user_activity.model.js";

export const PostController = {
    createPost: async (req, res) => {
        try {
            const { title, content, tags } = req.body;

            // Validate input
            if (!title || !content) {
                return res.status(400).json({
                    success: false,
                    error: "Title and content are required"
                });
            }

            const newPost = new Post({
                title,
                content,
                author: req.user._id,
                tags: tags?.map(tag => tag.toLowerCase().trim()) || []
            });
            await newPost.save();

            // Populate author info
            await newPost.populate('author', 'username email');

            return res.status(201).json({ success: true, data: newPost });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getPostById: async (req, res) => {
        try {
            const post = await Post.findOne({
                _id: req.params.id,
                deleted: false
            })
                .populate('author', 'username email avatar')
                .populate('likeCount')
                .populate('commentCount');

            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" });
            }

            // Increment view count
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
                deleted: false
            });

            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" });
            }

            // Check ownership
            if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }

            // Update fields if provided
            if (title !== undefined) post.title = title;
            if (content !== undefined) post.content = content;
            if (tags !== undefined) post.tags = tags.map(tag => tag.toLowerCase().trim());

            await post.save();
            await post.populate('author', 'username email avatar');

            return res.status(200).json({ success: true, data: post });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getPosts: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                order = 'desc',
                tag,
                author
            } = req.query;

            const query = { deleted: false };

            if (tag) {
                query.tags = tag;
            }

            if (author) {
                query.author = author;
            }

            const posts = await Post.find(query)
                .populate('author', 'username email avatar')
                .populate('likeCount')
                .populate('commentCount')
                .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Post.countDocuments(query);

            return res.status(200).json({
                success: true,
                data: posts,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
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
                return res.status(404).json({ success: false, error: "Post not found" });
            }

            // Only admin or post author can delete
            if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }

            post.deleted = true;
            post.deletedAt = new Date();
            await post.save();

            return res.status(200).json({ success: true, message: "Post deleted successfully" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    restorePost: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" });
            }

            post.deleted = false;
            post.deletedAt = null;
            await post.save();

            return res.status(200).json({ success: true, message: "Post restored successfully" });
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
                return res.status(404).json({ success: false, error: "Post not found or deleted" });
            }


            let feedback = await Feedback.findOne({ postId, userId });

            if (feedback) {
                if (feedback.type === 'like') {
                    await Feedback.findByIdAndDelete(feedback._id);
                    return res.status(200).json({
                        success: true,
                        message: 'Post unliked successfully'
                    });
                } else {
                    feedback.type = 'like';
                    await feedback.save();
                }
            } else {
                feedback = new Feedback({
                    postId,
                    userId,
                    type: 'like'
                });
                await feedback.save();
            }


            return res.status(200).json({
                success: true,
                message: 'Post liked successfully'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    addComment: async (req, res) => {
        try {
            const { content } = req.body;
            const postId = req.params.id;
            const userId = req.user._id;

            const post = await Post.findOne({ _id: postId, deleted: false });
            if (!post) {
                return res.status(404).json({
                    success: false,
                    error: "Post not found or deleted"
                });
            }

            const newFeedback = new Feedback({
                postId,
                userId,
                type: 'comment',
                content
            });
            await newFeedback.save();

            // Track user activity
            await new UserActivity({
                userId,
                postId,
                type: 'comment'
            }).save();

            // Populate user info
            await newFeedback.populate('userId', 'username email avatar');

            return res.status(200).json({
                success: true,
                message: 'Comment added successfully',
                data: newFeedback
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
            const { page = 1, limit = 10 } = req.query;

            const comments = await Feedback.find({
                postId,
                type: 'comment',
                deletedBy: { $size: 0 }
            })
                .populate('userId', 'username email avatar')
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await Feedback.countDocuments({
                postId,
                type: 'comment',
                deletedBy: { $size: 0 }
            });

            return res.status(200).json({
                success: true,
                data: comments,
                pagination: {
                    total,
                    page: parseInt(page),
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    searchPosts: async (req, res) => {
        try {
            const { keyword, tag, author, page = 1, limit = 10 } = req.query;
            const query = { deleted: false }; // Chỉ tìm các bài chưa bị xóa

            if (keyword) {
                query.$or = [
                    { title: { $regex: keyword, $options: 'i' } },
                    { content: { $regex: keyword, $options: 'i' } }
                ];
            }

            if (tag) {
                query.tags = { $in: Array.isArray(tag) ? tag : [tag] }; // Hỗ trợ tìm nhiều tag
            }

            if (author) {
                const user = await User.findOne({ username: author });
                if (user) {
                    query.author = user._id;
                }
            }

            const posts = await Post.find(query)
                .populate('author', 'username email')
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
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    recommendPosts: async (req, res) => {
        try {
            const userId = req.user._id;
            const { limit = 10 } = req.query;

            // Lấy hoạt động gần đây của người dùng
            const recentActivities = await UserActivity.find({ userId })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('postId');

            // Lấy tất cả tags từ các bài viết đã tương tác
            const interactedTags = recentActivities
                .map(activity => activity.postId?.tags || [])
                .flat();

            // Đếm số lần xuất hiện của mỗi tag
            const tagCounts = interactedTags.reduce((acc, tag) => {
                acc[tag] = (acc[tag] || 0) + 1;
                return acc;
            }, {});

            // Sắp xếp tags theo số lần xuất hiện
            const popularTags = Object.entries(tagCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([tag]) => tag);

            // Tìm các bài viết có tags tương tự
            const recommendedPosts = await Post.find({
                tags: { $in: popularTags },
                _id: { $nin: recentActivities.map(a => a.postId?._id) },
                deleted: false
            })
                .populate('author', 'username email')
                .sort({ createdAt: -1 })
                .limit(limit * 1);

            return res.status(200).json({
                success: true,
                data: recommendedPosts
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};