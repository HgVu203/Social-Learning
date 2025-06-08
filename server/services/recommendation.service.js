import { createEmbedding, cosineSimilarity } from "./text-embedding.service.js";
import UserActivity from "../models/user_activity.model.js";
import Post from "../models/post.model.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Get current path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories for vector embeddings
const VECTORS_DIR = path.join(__dirname, "../data/vectors");
// Directory for cache
const CACHE_DIR = path.join(__dirname, "../data/cache");

// Cache expiration time (1 hour)
const CACHE_TTL = 60 * 60 * 1000;

// Recommendation service using local storage
const RecommendationService = {
  // Initialize services (called during application startup)
  initialize: async () => {
    // Ensure data directories exist
    await RecommendationService.ensureDirectories();
  },

  // Ensure storage directories exist
  ensureDirectories: async () => {
    try {
      await fs.mkdir(VECTORS_DIR, { recursive: true });
      await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  },

  // Create embedding and store for post when created
  indexPost: async (post) => {
    try {
      // Create text from post content
      const postText = `${post.title} ${post.content} ${post.tags.join(" ")}`;
      // Create vector embedding
      const embedding = await createEmbedding(postText);

      // Save vector embedding
      const postData = {
        id: post._id.toString(),
        embedding,
        metadata: {
          title: post.title,
          authorId: post.author.toString(),
          tags: post.tags,
          createdAt: post.createdAt.toISOString(),
        },
      };

      // Save to file
      const filePath = path.join(VECTORS_DIR, `${post._id.toString()}.json`);
      await fs.writeFile(filePath, JSON.stringify(postData));
    } catch (error) {
      console.error("Error saving post vector:", error);
    }
  },

  // Get user interests based on activity
  getUserInterests: async (userId) => {
    const cacheKey = `user-interests-${userId}`;

    // Check cache
    const cachedData = await RecommendationService.getFromCache(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Analyze user activity
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Lấy hoạt động liên quan đến bài viết
    const recentPostActivities = await UserActivity.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      postId: { $exists: true },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "postId",
        select: "title content tags views author createdAt",
        match: { deleted: false },
      })
      .lean();

    // 2. Lấy hoạt động follow người dùng
    const followActivities = await UserActivity.find({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
      type: "follow_user",
    })
      .sort({ createdAt: -1 })
      .lean();

    // Extract and weight interests
    const tagWeights = {};
    const interactedPostIds = new Set();
    const authorInteractions = {};

    // Xử lý hoạt động liên quan đến bài viết
    recentPostActivities.forEach((activity) => {
      if (!activity.postId) return;

      // Track interacted posts
      interactedPostIds.add(activity.postId._id.toString());

      // Weight based on interaction type and time
      const daysAgo =
        (Date.now() - new Date(activity.createdAt)) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysAgo / 7); // Weight decreases over time

      const typeWeights = {
        view_post: 1,
        like: 3,
        comment: 2,
        create_post: 4,
      };

      const weight = (typeWeights[activity.type] || 1) * recencyWeight;

      // Aggregate weights for tags
      activity.postId.tags.forEach((tag) => {
        tagWeights[tag] = (tagWeights[tag] || 0) + weight;
      });

      // Track author interactions
      const authorId = activity.postId.author.toString();
      authorInteractions[authorId] =
        (authorInteractions[authorId] || 0) + weight;
    });

    // Xử lý hoạt động follow người dùng - thêm trọng số cho tác giả
    followActivities.forEach((activity) => {
      if (!activity.targetUserId) return;

      const daysAgo =
        (Date.now() - new Date(activity.createdAt)) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.exp(-daysAgo / 14); // Giảm chậm hơn (14 ngày)

      // Thêm trọng số cao cho người dùng được follow (5)
      const followWeight = 5 * recencyWeight;

      // Thêm vào authorInteractions
      const targetUserId = activity.targetUserId.toString();
      authorInteractions[targetUserId] =
        (authorInteractions[targetUserId] || 0) + followWeight;
    });

    // Compile results
    const interests = {
      tags: tagWeights,
      authors: authorInteractions,
      interactedPostIds: Array.from(interactedPostIds),
    };

    // Save to cache
    await RecommendationService.saveToCache(cacheKey, interests);

    return interests;
  },

  // Semantic search based on vectors
  getSemanticRecommendations: async (userId, limit = 10) => {
    try {
      // Get user interests
      const interests = await RecommendationService.getUserInterests(userId);

      // Create vector from interests
      const interestsText = Object.entries(interests.tags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag)
        .join(" ");

      const userEmbedding = await createEmbedding(interestsText);

      // Read all saved vectors
      const files = await fs.readdir(VECTORS_DIR);
      const postVectors = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        // Get postId from filename
        const postId = file.replace(".json", "");

        // Skip posts user has interacted with
        if (interests.interactedPostIds.includes(postId)) continue;

        // Read vector data
        const filePath = path.join(VECTORS_DIR, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const postData = JSON.parse(fileContent);

        // Calculate similarity with user interests vector
        const similarity = cosineSimilarity(userEmbedding, postData.embedding);

        postVectors.push({
          postId,
          score: similarity,
          metadata: postData.metadata,
        });
      }

      // Sort by similarity and return results
      return postVectors.sort((a, b) => b.score - a.score).slice(0, limit);
    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  },

  // Fallback recommendation method based on tags
  getFallbackRecommendations: async (userId, limit = 10) => {
    const interests = await RecommendationService.getUserInterests(userId);

    // Get top tags
    const topTags = Object.entries(interests.tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // Get posts with matching tags
    const recommendedPosts = await Post.find({
      deleted: false,
      _id: { $nin: interests.interactedPostIds },
      tags: { $in: topTags },
    })
      .populate("author", "username fullname avatar")
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();

    // Score posts
    const scoredPosts = recommendedPosts.map((post) => {
      // Calculate tag relevance
      const tagRelevance =
        post.tags.reduce((score, tag) => {
          return score + (interests.tags[tag] || 0);
        }, 0) / post.tags.length;

      // Calculate author affinity
      const authorId = post.author._id.toString();
      const authorAffinity = interests.authors[authorId] || 0;

      // Calculate recency score
      const daysOld =
        (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-daysOld / 30); // 30 days

      // Calculate popularity score
      const views = post.views || 0;
      const likes = post.likeCount || 0;
      const popularityScore = Math.min((views + likes * 2) / 1000, 1);

      // Calculate final score
      const score =
        tagRelevance * 0.4 +
        authorAffinity * 0.2 +
        recencyScore * 0.2 +
        popularityScore * 0.2;

      return {
        ...post,
        recommendationScore: score,
      };
    });

    // Sort by score and return results
    return scoredPosts
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  },

  // Main recommendation method combining approaches
  getRecommendations: async (userId, limit = 10) => {
    const cacheKey = `recommendations-${userId}-${limit}`;

    // Check cache
    const cachedRecommendations = await RecommendationService.getFromCache(
      cacheKey
    );
    if (cachedRecommendations) {
      return cachedRecommendations;
    }

    let recommendations = [];

    // Try semantic approach first
    const semanticResults =
      await RecommendationService.getSemanticRecommendations(userId, limit);

    if (semanticResults.length > 0) {
      // Get full post details
      const postIds = semanticResults.map((result) => result.postId);
      const posts = await Post.find({ _id: { $in: postIds }, deleted: false })
        .populate("author", "username fullname avatar")
        .lean();

      // Map scores and organize results
      recommendations = postIds
        .map((id) => {
          const post = posts.find((p) => p._id.toString() === id);
          const semanticResult = semanticResults.find((r) => r.postId === id);

          if (!post) return null;

          return {
            ...post,
            recommendationScore: semanticResult.score,
            recommendationType: "semantic",
          };
        })
        .filter(Boolean);
    }

    // Use fallback method if needed
    if (recommendations.length < limit) {
      const fallbackCount = limit - recommendations.length;
      const fallbackRecommendations =
        await RecommendationService.getFallbackRecommendations(
          userId,
          fallbackCount
        );

      // Mark fallback recommendations
      fallbackRecommendations.forEach((post) => {
        post.recommendationType = "content";
      });

      recommendations = recommendations.concat(fallbackRecommendations);
    }

    // Save results to cache
    await RecommendationService.saveToCache(cacheKey, recommendations);

    return recommendations;
  },

  // Invalidate user cache when they interact with content
  invalidateUserRecommendations: async (userId) => {
    const interestsCacheKey = `user-interests-${userId}`;
    const recommendationsCachePattern = `recommendations-${userId}-`;

    try {
      // Delete interests cache
      await RecommendationService.removeFromCache(interestsCacheKey);

      // Delete recommendations cache
      const cacheFiles = await fs.readdir(CACHE_DIR);
      for (const file of cacheFiles) {
        if (file.startsWith(recommendationsCachePattern)) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  },

  // Cache helper functions
  getFromCache: async (key) => {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    try {
      // Check if file exists
      const stats = await fs.stat(filePath);
      const fileAge = Date.now() - stats.mtime.getTime();

      // Check if cache is still valid
      if (fileAge < CACHE_TTL) {
        const content = await fs.readFile(filePath, "utf-8");
        return JSON.parse(content);
      } else {
        // Cache expired, delete file
        await fs.unlink(filePath);
      }
    } catch (error) {
      // File doesn't exist or other error
      return null;
    }
    return null;
  },

  saveToCache: async (key, data) => {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    try {
      await fs.writeFile(filePath, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving cache for ${key}:`, error);
    }
  },

  removeFromCache: async (key) => {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore error if file doesn't exist
      if (error.code !== "ENOENT") {
        console.error(`Error removing cache for ${key}:`, error);
      }
    }
  },
};

export default RecommendationService;
