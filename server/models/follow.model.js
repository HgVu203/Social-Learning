import mongoose from "mongoose";

const FollowSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /* Các trường bổ sung có thể được thêm vào trong tương lai như:
    - status: để hỗ trợ các tính năng như "requested", "accepted", "blocked"
    - notification: để kiểm soát thông báo
    */
  },
  { timestamps: true }
);

// Tạo index cho cặp follower-following để đảm bảo không có duplicate
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.model("Follow", FollowSchema);
export default Follow;
