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
        "view",
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

const UserActivity = mongoose.model("UserActivity", UserActivitySchema);
export default UserActivity;
