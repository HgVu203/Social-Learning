import Post from "../models/post.model.js";

export const PostController = {
    createPost: async (req, res) => {
        try {
            const { title, content, tags } = req.body;
            const newPost = new Post({
                title,
                content,
                author: req.user._id,
                tags
            });
            await newPost.save();
            return res.status(201).json({ success: true, data: newPost });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getPosts: async (req, res) => {
        try {
            const posts = await Post.find().populate('author', 'username email');
            return res.status(200).json({ success: true, data: posts });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    getPostById: async (req, res) => {
        try {
            const post = await Post.findById(req.params.id).populate('author', 'username email');
            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" });
            }
            return res.status(200).json({ success: true, data: post });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    updatePost: async (req, res) => {
        try {
            const { title, content, tags } = req.body;
            const post = await Post.findById(req.params.id);
            if (!post) {
                return res.status(404).json({ success: false, error: "Post not found" });
            }
            if (post.author.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }
            post.title = title;
            post.content = content;
            post.tags = tags;
            await post.save();
            return res.status(200).json({ success: true, data: post });
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
            if (post.author.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, error: "Unauthorized" });
            }
            await post.remove();
            return res.status(200).json({ success: true, message: "Post deleted successfully" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
};