import axios from "axios";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

/**
 * AI Search Service - Enhances search functionality using AI models
 * Uses either public API or local embeddings based on configuration
 */
export class AISearchService {
  /**
   * Initialize the AI search service
   */
  constructor() {
    // Free tier AI API endpoint (replace with actual free AI API when implementing)
    this.apiEndpoint =
      process.env.AI_API_ENDPOINT || "https://api.openai.com/v1/embeddings";
    this.apiKey = process.env.AI_API_KEY || "";
    this.modelName = process.env.AI_MODEL_NAME || "text-embedding-ada-002";
    this.useLocalFallback =
      !this.apiKey || process.env.USE_LOCAL_FALLBACK === "true";
  }

  /**
   * Get embeddings for a query
   * @param {string} query - The user's search query
   * @returns {Promise<Array<number>|null>} - The query embeddings or null if failed
   */
  async getQueryEmbedding(query) {
    if (this.useLocalFallback) {
      return this.getLocalEmbedding(query);
    }

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: this.modelName,
          input: query,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error("Error getting AI embeddings:", error.message);
      // Fall back to local embedding on error
      return this.getLocalEmbedding(query);
    }
  }

  /**
   * Local embedding fallback using keyword extraction
   * @param {string} query - The user's search query
   * @returns {Object} - Simplified representation of important keywords
   */
  getLocalEmbedding(query) {
    // Extract important keywords and create a simple representation
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isStopWord(word));

    return {
      keywords,
      original: query,
    };
  }

  /**
   * Check if a word is a stop word (common words with little semantic value)
   * @param {string} word - Word to check
   * @returns {boolean} - True if it's a stop word
   */
  isStopWord(word) {
    const stopWords = [
      "the",
      "and",
      "that",
      "have",
      "this",
      "with",
      "from",
      "they",
      "will",
      "would",
      "there",
      "their",
      "what",
      "about",
      "which",
    ];
    return stopWords.includes(word.toLowerCase());
  }

  /**
   * Enhance search results using AI
   * @param {string} query - Original search query
   * @param {Array} basicResults - Basic search results
   * @returns {Promise<Array>} - Enhanced and ranked search results
   */
  async enhanceSearchResults(query, basicResults) {
    try {
      if (
        !query ||
        query.trim().length < 3 ||
        !basicResults ||
        basicResults.length === 0
      ) {
        return basicResults;
      }

      // Get embeddings or keyword representation
      const queryRepresentation = await this.getQueryEmbedding(query);

      if (!queryRepresentation) {
        return basicResults;
      }

      // Process based on whether we're using real embeddings or keyword fallback
      if (Array.isArray(queryRepresentation)) {
        // With real embeddings, we would do vector similarity
        // This is a placeholder for the actual implementation
        return basicResults;
      } else {
        // Using keyword fallback approach
        return this.rankResultsByKeywordRelevance(
          queryRepresentation,
          basicResults
        );
      }
    } catch (error) {
      console.error("Error enhancing search results with AI:", error);
      return basicResults;
    }
  }

  /**
   * Rank results by keyword relevance
   * @param {Object} queryRepresentation - Keywords and original query
   * @param {Array} results - Search results to rank
   * @returns {Array} - Ranked results
   */
  rankResultsByKeywordRelevance(queryRepresentation, results) {
    const { keywords, original } = queryRepresentation;

    if (!keywords.length) return results;

    return results
      .map((result) => {
        let score = 0;

        // Calculate relevance score based on content type
        if (result.type === "group") {
          // For groups, check name, description and tags
          const groupText = [result.name || "", result.description || ""]
            .join(" ")
            .toLowerCase();

          // Direct phrase match gets high score
          if (groupText.includes(original.toLowerCase())) {
            score += 10;
          }

          // Individual keyword matches in name and description
          keywords.forEach((keyword) => {
            const regex = new RegExp(keyword, "gi");
            const matches = groupText.match(regex);
            if (matches) {
              score += matches.length;
            }

            // Check name with higher weight (most important field)
            if (result.name && result.name.toLowerCase().includes(keyword)) {
              score += 5;
            }

            // Check tags (higher weight)
            if (result.tags && Array.isArray(result.tags)) {
              const tagMatches = result.tags.filter((tag) =>
                tag.toLowerCase().includes(keyword)
              ).length;
              score += tagMatches * 3;
            }
          });
        } else {
          // Original implementation for posts and other content types
          const content = (
            (result.content || "") +
            " " +
            (result.title || "")
          ).toLowerCase();

          // Direct phrase match gets high score
          if (content.includes(original.toLowerCase())) {
            score += 10;
          }

          // Individual keyword matches
          keywords.forEach((keyword) => {
            const regex = new RegExp(keyword, "gi");
            const matches = content.match(regex);
            if (matches) {
              score += matches.length;
            }

            // Check tags (higher weight)
            if (result.tags && Array.isArray(result.tags)) {
              const tagMatches = result.tags.filter((tag) =>
                tag.toLowerCase().includes(keyword)
              ).length;
              score += tagMatches * 2;
            }
          });
        }

        return {
          ...result,
          relevanceScore: score,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get semantically related search terms based on the query
   * @param {string} query - Original search query
   * @returns {Promise<Array<string>>} - Related search terms
   */
  async getRelatedSearchTerms(query) {
    if (this.useLocalFallback || !query || query.length < 3) {
      return this.getLocalRelatedTerms(query);
    }

    try {
      // In a real implementation, this would call an AI API
      // For now, we'll use the fallback method
      return this.getLocalRelatedTerms(query);
    } catch (error) {
      console.error("Error getting related search terms:", error);
      return this.getLocalRelatedTerms(query);
    }
  }

  /**
   * Generate related terms locally without AI
   * @param {string} query - Original query
   * @returns {Array<string>} - Related terms
   */
  async getLocalRelatedTerms(query) {
    if (!query || query.length < 3) return [];

    // Extract main keyword
    const mainKeyword =
      query.split(/\s+/).find((word) => word.length > 3) || query;

    try {
      // Find posts with similar tags
      const relatedPosts = await Post.find({
        tags: { $regex: mainKeyword, $options: "i" },
      })
        .limit(5)
        .select("tags");

      // Extract related tags
      const relatedTags = new Set();
      relatedPosts.forEach((post) => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach((tag) => {
            if (tag && tag.toLowerCase() !== mainKeyword.toLowerCase()) {
              relatedTags.add(tag);
            }
          });
        }
      });

      return [...relatedTags].slice(0, 5);
    } catch (error) {
      console.error("Error finding related terms:", error);
      return [];
    }
  }

  /**
   * Use AI to find relevant content when exact matches aren't found
   * @param {string} query - Search query
   * @returns {Promise<Array>} - Related content
   */
  async findRelatedContent(query) {
    if (!query || query.length < 3) return [];

    try {
      const queryRepresentation = await this.getQueryEmbedding(query);

      if (!queryRepresentation) {
        return [];
      }

      // For keyword-based approach
      if (!Array.isArray(queryRepresentation)) {
        const { keywords } = queryRepresentation;

        if (!keywords.length) return [];

        // Find posts with any of the keywords in title, content or tags
        const relatedQuery = {
          deleted: false,
          $or: [
            ...keywords.map((keyword) => ({
              title: { $regex: keyword, $options: "i" },
            })),
            ...keywords.map((keyword) => ({
              content: { $regex: keyword, $options: "i" },
            })),
            ...keywords.map((keyword) => ({
              tags: { $regex: keyword, $options: "i" },
            })),
          ],
        };

        const relatedPosts = await Post.find(relatedQuery)
          .populate("author", "username email fullname avatar")
          .sort({ createdAt: -1 })
          .limit(5);

        return relatedPosts.map((post) => ({
          ...post.toJSON(),
          type: "post",
          isRelated: true,
        }));
      }

      // This would be where embedding-based similarity search would happen
      return [];
    } catch (error) {
      console.error("Error finding related content:", error);
      return [];
    }
  }
}

// Create and export singleton instance
const aiSearchService = new AISearchService();
export default aiSearchService;
