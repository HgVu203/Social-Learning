import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: [
        "comment",
        "like",
        "friend_request",
        "message",
        "group_invite",
        "announcement",
        "system",
      ],
      default: "system",
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
    sender: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      username: String,
      avatar: String,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
