import mongoose from "mongoose";

const GroupPostSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
        index : true
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index : true
    }
    
}, { timestamps: true });

const GroupPost = mongoose.model("GroupPost", GroupPostSchema);
export default GroupPost