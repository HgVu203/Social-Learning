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
          const fullPath = req.baseUrl + req.path;
          if (req.method === "POST" && fullPath.includes("/create-post")) {
            activityType = "create_post";
            postId = data.data?._id;
          } else if (req.method === "POST" && fullPath.includes("/comment")) {
            activityType = "comment";
            postId = req.params.id;
          } else if (req.method === "POST" && fullPath.includes("post/like")) {
            activityType = "like";
            postId = req.params.id;
          } else if (req.method === "GET" && fullPath.includes("post/search")) {
            activityType = "search";
            postId = null;
          }

          if (activityType) {
            console.log(`Tracking activity: ${activityType}`); // Debug log
            new UserActivity({
              userId,
              postId,
              type: activityType,
              searchQuery:
                activityType === "search" ? req.query.keyword : undefined,
            }).save();
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
