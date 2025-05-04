import UserActivity from "../models/user_activity.model.js";
import dotenv from "dotenv";
dotenv.config();
const trackUserActivity = async (req, res, next) => {
  try {
    const originalSend = res.json;
    res.json = function (data) {
      // Only track successful activities
      if (res.statusCode === 200 || res.statusCode === 201) {
        const userId = req.user?._id;
        if (userId) {
          let activityType;
          let postId;
          let targetUserId;
          const fullPath = req.baseUrl + req.path;

          // Tạo bài viết
          if (
            req.method === "POST" &&
            req.path === "/" &&
            req.baseUrl === "/api/posts"
          ) {
            activityType = "create_post";
            postId = data.data?._id;
          }
          // Bình luận bài viết
          else if (
            req.method === "POST" &&
            fullPath.includes("/comment") &&
            !fullPath.includes("/like")
          ) {
            activityType = "comment";
            postId = req.params.id;
          }
          // Thích bài viết
          else if (
            req.method === "POST" &&
            fullPath.includes("/like") &&
            !fullPath.includes("/comment")
          ) {
            activityType = "like";
            postId = req.params.id;
          }
          // Follow/Unfollow người dùng
          else if (
            req.method === "POST" &&
            fullPath.includes("/api/users") &&
            fullPath.includes("/follow")
          ) {
            // Xác định follow hay unfollow từ response
            const isFollowing = data.data?.isFollowing;
            activityType = isFollowing ? "follow_user" : "unfollow_user";
            targetUserId = req.params.id;
          }
          // Tìm kiếm
          else if (req.method === "GET" && fullPath.includes("/search")) {
            activityType = "search";
            postId = null;
          }
          // Xem chi tiết bài viết
          else if (
            req.method === "GET" &&
            req.params.id &&
            !fullPath.includes("/comments") &&
            data.success &&
            data.data
          ) {
            activityType = "view_post";
            postId = req.params.id;
          }

          if (activityType) {
            // Ghi log để theo dõi trong quá trình phát triển
            console.log(
              `[Activity Tracking] ${activityType} - User: ${userId} - Path: ${fullPath}`
            );

            new UserActivity({
              userId,
              postId,
              targetUserId,
              type: activityType,
              searchQuery:
                activityType === "search"
                  ? req.query.query || req.query.keyword
                  : undefined,
            })
              .save()
              .catch((err) => {
                console.error(`Error saving activity ${activityType}:`, err);
              });
          }
        }
      }
      originalSend.call(this, data);
    };
    next();
  } catch (error) {
    console.error("Error tracking user activity:", error);
    next();
  }
};

export default trackUserActivity;
