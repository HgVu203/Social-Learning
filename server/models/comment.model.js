import mongoose from "mongoose";

const CommentShema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['like', 'dislike', 'report']
    },
    comment: {
        type: String
    }

}, { timestamps: true });

const Comment = mongoose.model("Comment", CommentShema);
export default Comment
