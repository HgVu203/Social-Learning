import mongoose from "mongoose";

const UserActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index : true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index : true
    },
    type: {
        type: String,
        enum: ['like', 'comment', 'share', 'search', 'read'],
        required: true
    }
}, { timestamps: true });

const UserActivity = mongoose.model("UserActivity", UserActivitySchema);
export default UserActivity