// Script to create indexes for better query performance
// Run with: node scripts/create-indexes.js

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Follow from "../models/follow.model.js";
import UserActivity from "../models/user_activity.model.js";
import Group from "../models/group.model.js";

// Lấy đường dẫn của file hiện tại
const __filename = fileURLToPath(import.meta.url);
// Lấy đường dẫn của thư mục chứa file hiện tại
const __dirname = dirname(__filename);
// Đường dẫn đến file .env
const envPath = join(__dirname, "..", ".env");

// Kiểm tra nếu file .env tồn tại và load
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log("No .env file found, loading from process.env");
  dotenv.config();
}

// Lấy MONGODB_URL từ biến môi trường
const mongoUri = process.env.MONGODB_URL;
if (!mongoUri) {
  console.error("MONGODB_URL environment variable is missing");
  console.log("Available env vars:", Object.keys(process.env));
  process.exit(1);
}

console.log(`Connecting to MongoDB at: ${mongoUri.substring(0, 20)}...`);

// Connect to MongoDB
mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB for index creation"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

async function createIndexes() {
  console.log("Starting index creation...");

  try {
    // Helper function để tạo index an toàn
    async function safeCreateIndex(collection, indexSpec, options = {}) {
      try {
        await collection.createIndex(indexSpec, options);
        console.log(`Created index successfully: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        // Bỏ qua lỗi nếu index đã tồn tại
        if (
          error.code === 85 ||
          (error.message && error.message.includes("already exists"))
        ) {
          console.log(
            `Index already exists (skipping): ${JSON.stringify(indexSpec)}`
          );
        } else {
          console.error(
            `Error creating index ${JSON.stringify(indexSpec)}: ${
              error.message
            }`
          );
        }
      }
    }

    // User collection indexes
    console.log("Creating User indexes...");
    await safeCreateIndex(User.collection, { username: 1 }, { unique: true });
    await safeCreateIndex(User.collection, { email: 1 }, { unique: true });
    await safeCreateIndex(User.collection, { fullname: "text", bio: "text" });
    await safeCreateIndex(User.collection, { points: -1 }); // For leaderboard
    await safeCreateIndex(User.collection, { lastLogin: -1 }); // For active users
    await safeCreateIndex(User.collection, { rank: 1 }); // For rank-based queries

    // Follow collection indexes
    console.log("Creating Follow indexes...");
    await safeCreateIndex(
      Follow.collection,
      { follower: 1, following: 1 },
      { unique: true }
    );
    await safeCreateIndex(Follow.collection, { follower: 1 }); // For who a user follows
    await safeCreateIndex(Follow.collection, { following: 1 }); // For followers of a user

    // Post collection indexes
    console.log("Creating Post indexes...");
    await safeCreateIndex(Post.collection, { author: 1, deleted: 1 }); // For user's posts
    await safeCreateIndex(Post.collection, { createdAt: -1 }); // For timeline
    await safeCreateIndex(Post.collection, { "likes.userId": 1 }); // For liked posts
    await safeCreateIndex(Post.collection, { content: "text", tags: "text" }); // For search
    await safeCreateIndex(Post.collection, { deleted: 1 }); // Separate index for deleted status
    await safeCreateIndex(Post.collection, { views: -1, deleted: 1 }); // For popular posts
    await safeCreateIndex(Post.collection, { groupId: 1, deleted: 1 }); // For group posts
    await safeCreateIndex(Post.collection, { title: "text" }); // For title search
    await safeCreateIndex(Post.collection, { tags: 1, deleted: 1 }); // For tag-based filtering

    // UserActivity collection indexes
    console.log("Creating UserActivity indexes...");
    await safeCreateIndex(UserActivity.collection, { userId: 1 }); // For user's activities
    await safeCreateIndex(UserActivity.collection, { createdAt: -1 }); // For recent activities
    await safeCreateIndex(UserActivity.collection, { type: 1 }); // For activity type filters

    // Group collection indexes
    console.log("Creating Group indexes...");
    await safeCreateIndex(Group.collection, {
      name: "text",
      description: "text",
    }); // For search
    await safeCreateIndex(Group.collection, { "members.user": 1 }); // For user's groups
    await safeCreateIndex(Group.collection, { "members.role": 1 }); // For admin/mod queries
    await safeCreateIndex(Group.collection, { createdBy: 1 }); // For groups created by a user
    await safeCreateIndex(Group.collection, { isPrivate: 1 }); // For public/private filter
    await safeCreateIndex(Group.collection, { tags: 1 }); // For tag-based filtering
    await safeCreateIndex(Group.collection, { createdAt: -1 }); // For sorting by creation date
    await safeCreateIndex(Group.collection, { name: 1 }); // For name-based sorting and lookup

    // Feedback collection indexes (for comments and likes)
    console.log("Creating Feedback indexes...");
    await safeCreateIndex(mongoose.connection.collection("feedbacks"), {
      postId: 1,
      type: 1,
    }); // For finding all comments or likes for a post
    await safeCreateIndex(mongoose.connection.collection("feedbacks"), {
      userId: 1,
      type: 1,
    }); // For finding user's comments or likes
    await safeCreateIndex(mongoose.connection.collection("feedbacks"), {
      parentId: 1,
      type: 1,
    }); // For finding replies to a comment
    await safeCreateIndex(mongoose.connection.collection("feedbacks"), {
      commentId: 1,
      type: 1,
    }); // For finding likes on comments

    console.log("All indexes created successfully!");
  } catch (error) {
    console.error("Error creating indexes:", error);
  } finally {
    mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Execute index creation
createIndexes();
