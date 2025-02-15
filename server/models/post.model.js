import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    tags: [
        {
            type: String,
            default: []
        }
    ],
    deleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Post = mongoose.model("Post", PostSchema);
export default Post;