import mongoose from "mongoose";

const FriendshipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index : true
    },
    friendId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index : true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked'],
        default: 'pending'
    }
}, { timestamps: true });   

const Friendship = mongoose.model("Friendship", FriendshipSchema);
export default Friendship