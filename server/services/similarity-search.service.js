import { createEmbedding, cosineSimilarity } from "./text-embedding.service.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

/**
 * Similarity Search Service - Enhances search functionality using vector similarity
 * Uses local text embeddings for similarity search without external API dependencies
 */
export class SimilaritySearchService {
  /**
   * Initialize the similarity search service
   */
  constructor() {
    // Sử dụng local embeddings
    this.similarityThreshold = 0.6; // Ngưỡng độ tương đồng (0-1)
    this.maxTopResults = 10; // Số lượng kết quả tối đa cho kết quả liên quan
  }

  /**
   * Get embeddings for a query
   * @param {string} query - The user's search query
   * @returns {Promise<number[]>} - The query embeddings
   */
  async getQueryEmbedding(query) {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return null;
    }

    try {
      // Sử dụng hàm createEmbedding từ text-embedding.service.js
      return await createEmbedding(query);
    } catch (error) {
      console.error("Error creating embedding for query:", error);
      return null;
    }
  }

  /**
   * Enhance search results using vector similarity
   * @param {string} query - Original search query
   * @param {Array} basicResults - Basic search results
   * @returns {Promise<Array>} - Enhanced and ranked search results
   */
  async enhanceSearchResults(query, basicResults) {
    try {
      if (
        !query ||
        query.trim().length < 2 ||
        !basicResults ||
        basicResults.length === 0
      ) {
        return basicResults;
      }

      // Tạo embedding cho query
      const queryEmbedding = await this.getQueryEmbedding(query);

      if (!queryEmbedding) {
        return basicResults;
      }

      // Tạo embeddings cho từng kết quả
      const resultsWithEmbeddings = await Promise.all(
        basicResults.map(async (result) => {
          try {
            // Tạo nội dung để tạo embedding dựa trên loại đối tượng
            let content = "";
            if (result.type === "post") {
              content = `${result.title || ""} ${result.content || ""} ${(
                result.tags || []
              ).join(" ")}`;
            } else if (result.type === "user") {
              content = `${result.username || ""} ${result.fullname || ""} ${
                result.bio || ""
              }`;
            } else if (result.type === "group") {
              content = `${result.name || ""} ${result.description || ""} ${(
                result.tags || []
              ).join(" ")}`;
            }

            // Tạo embedding cho nội dung
            const embedding = await createEmbedding(content);

            // Tính độ tương đồng cosine
            const similarity = cosineSimilarity(queryEmbedding, embedding);

            return {
              ...result,
              similarity,
              relevanceScore: similarity * 10, // Chuyển đổi sang thang điểm dễ hiểu (0-10)
            };
          } catch (error) {
            console.error(`Error processing result for similarity:`, error);
            return result; // Trả về kết quả gốc nếu có lỗi
          }
        })
      );

      // Sắp xếp lại kết quả dựa trên độ tương đồng
      return resultsWithEmbeddings.sort(
        (a, b) => (b.similarity || 0) - (a.similarity || 0)
      );
    } catch (error) {
      console.error("Error enhancing search results:", error);
      return basicResults;
    }
  }

  /**
   * Tìm nội dung liên quan dựa trên query
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Related content
   */
  async findRelatedContent(query) {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }

      // Tạo embedding cho query
      const queryEmbedding = await this.getQueryEmbedding(query);

      if (!queryEmbedding) {
        return [];
      }

      // Lấy danh sách bài viết gần đây không bị xóa
      const recentPosts = await Post.find({ deleted: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("author", "username fullname avatar")
        .lean();

      if (recentPosts.length === 0) {
        return [];
      }

      // Tạo embeddings và tính độ tương đồng cho từng bài viết
      const postsWithSimilarity = await Promise.all(
        recentPosts.map(async (post) => {
          try {
            // Tạo nội dung để tạo embedding
            const content = `${post.title || ""} ${post.content || ""} ${(
              post.tags || []
            ).join(" ")}`;

            // Tạo embedding cho nội dung
            const embedding = await createEmbedding(content);

            // Tính độ tương đồng cosine
            const similarity = cosineSimilarity(queryEmbedding, embedding);

            return {
              ...post,
              similarity,
              isRelated: true,
              type: "post",
            };
          } catch (error) {
            console.error(`Error processing post for similarity:`, error);
            return { ...post, similarity: 0, isRelated: true, type: "post" };
          }
        })
      );

      // Lọc kết quả có độ tương đồng cao và sắp xếp theo độ tương đồng
      return postsWithSimilarity
        .filter((post) => post.similarity >= this.similarityThreshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, this.maxTopResults);
    } catch (error) {
      console.error("Error finding related content:", error);
      return [];
    }
  }

  /**
   * Lấy các từ khóa tìm kiếm liên quan
   * @param {string} query - Search query
   * @returns {Promise<Array<string>>} - Related search terms
   */
  async getRelatedSearchTerms(query) {
    try {
      if (!query || query.trim().length < 3) {
        return [];
      }

      // Tách từ khóa từ query
      const keywords = query
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 3);

      if (keywords.length === 0) {
        return [];
      }

      // Tìm bài viết có từ khóa tương tự
      const tags = await Post.aggregate([
        { $match: { deleted: false } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]);

      // Tạo embedding cho query
      const queryEmbedding = await this.getQueryEmbedding(query);

      if (!queryEmbedding || !tags || tags.length === 0) {
        return keywords;
      }

      // Tính độ tương đồng cho từng tag
      const tagsWithSimilarity = await Promise.all(
        tags.map(async (tag) => {
          try {
            const embedding = await createEmbedding(tag._id);
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            return { tag: tag._id, count: tag.count, similarity };
          } catch (error) {
            return { tag: tag._id, count: tag.count, similarity: 0 };
          }
        })
      );

      // Lọc và sắp xếp các tag liên quan
      return tagsWithSimilarity
        .filter((item) => item.similarity > 0.4) // Lọc các tag có độ tương đồng cao
        .sort((a, b) => b.similarity - a.similarity) // Sắp xếp theo độ tương đồng
        .slice(0, 5) // Lấy tối đa 5 từ khóa
        .map((item) => item.tag); // Chỉ trả về tag
    } catch (error) {
      console.error("Error getting related search terms:", error);
      return [];
    }
  }
}

// Tạo và xuất một instance
const similaritySearchService = new SimilaritySearchService();
export default similaritySearchService;
