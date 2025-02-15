import mongoose from "mongoose";

const GroupChatSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: []
        }
    ],
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: [],
        },
    ],
}, { timestamps: true });

const GroupChat = mongoose.model("GroupChat", GroupChatSchema);
export default GroupChat