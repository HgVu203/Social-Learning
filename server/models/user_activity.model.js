import mongoose from "mongoose";

const UserActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "create_post",
        "comment",
        "like",
        "view_post",
        "search",
        "follow_user",
        "unfollow_user",
      ],
      required: true,
    },
    searchQuery: {
      type: String,
      required: false,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Index để tăng tốc truy vấn
UserActivitySchema.index({ userId: 1, createdAt: -1 });
UserActivitySchema.index({ userId: 1, type: 1 });
UserActivitySchema.index({ postId: 1, type: 1 });

const UserActivity = mongoose.model("UserActivity", UserActivitySchema);
export default UserActivity;
