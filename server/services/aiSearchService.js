import axios from "axios";
import { env } from "../config/environment.js";
import logger from "../utils/logger.js";

/**
 * Service for AI-powered search capabilities
 */
class AISearchService {
  constructor() {
    this.apiEndpoint = env.AI_API_ENDPOINT;
    this.apiKey = env.AI_API_KEY;
    this.modelName = env.AI_MODEL_NAME;
    this.useLocalFallback = env.USE_LOCAL_FALLBACK === "true";
  }

  /**
   * Enhance search query with AI to understand user intent
   * @param {string} query - The original search query
   * @returns {Promise<{enhancedQuery: string, semanticTokens: Array<string>}>}
   */
  async enhanceSearchQuery(query) {
    try {
      // Check if AI search is enabled
      if (!env.ENABLE_AI_SEARCH) {
        return { enhancedQuery: query, semanticTokens: [] };
      }

      // Try using external AI API
      if (this.apiEndpoint && this.apiKey) {
        const response = await axios.post(
          this.apiEndpoint,
          {
            model: this.modelName,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that extracts search intent and key concepts from user queries.",
              },
              {
                role: "user",
                content: `Extract the main search intent and key concepts from this query: "${query}". 
                          Return a JSON with two fields: enhancedQuery (an improved version of the query) and 
                          semanticTokens (an array of relevant keywords and synonyms).`,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Parse the response to get the AI-enhanced query
        if (
          response.data &&
          response.data.choices &&
          response.data.choices[0]
        ) {
          try {
            const content = response.data.choices[0].message.content;
            const parsedContent = JSON.parse(content);
            return {
              enhancedQuery: parsedContent.enhancedQuery || query,
              semanticTokens: parsedContent.semanticTokens || [],
            };
          } catch (parseError) {
            logger.warn("Failed to parse AI response content", parseError);
          }
        }
      }

      // Fallback to local processing if external API fails or is not configured
      if (this.useLocalFallback) {
        return this.localQueryEnhancement(query);
      }

      // Return original query if all else fails
      return { enhancedQuery: query, semanticTokens: [] };
    } catch (error) {
      logger.error("AI search enhancement failed", error);
      return { enhancedQuery: query, semanticTokens: [] };
    }
  }

  /**
   * Fallback method for enhancing queries locally without external AI
   * @param {string} query - The original search query
   * @returns {{enhancedQuery: string, semanticTokens: Array<string>}}
   */
  localQueryEnhancement(query) {
    // Simple local enhancement by extracting keywords and removing filler words
    const fillerWords = [
      "the",
      "a",
      "an",
      "of",
      "in",
      "on",
      "at",
      "to",
      "for",
      "with",
      "by",
      "about",
      "like",
      "and",
      "or",
      "but",
    ];

    // Extract words, convert to lowercase, and filter out filler words
    const tokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !fillerWords.includes(word));

    // Return the original query and extracted tokens
    return {
      enhancedQuery: query,
      semanticTokens: [...new Set(tokens)],
    };
  }

  /**
   * Ranks search results based on relevance to the enhanced query
   * @param {Array} results - Original search results
   * @param {string} enhancedQuery - AI enhanced query
   * @param {Array<string>} semanticTokens - Semantic tokens from AI
   * @returns {Array} - Ranked results
   */
  rankSearchResults(results, enhancedQuery, semanticTokens) {
    if (!results || results.length === 0 || !enhancedQuery) {
      return results;
    }

    return results
      .map((result) => {
        // Calculate relevance score based on token matches
        let score = 0;
        const textToMatch = [
          result.title || "",
          result.content || "",
          result.description || "",
          result.username || "",
          result.name || "",
          ...(result.tags || []),
        ]
          .join(" ")
          .toLowerCase();

        // Score based on semantic tokens
        semanticTokens.forEach((token) => {
          if (textToMatch.includes(token.toLowerCase())) {
            score += 1;
          }
        });

        // Score based on exact query matches
        if (textToMatch.includes(enhancedQuery.toLowerCase())) {
          score += 3;
        }

        return {
          ...result,
          relevanceScore: score,
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export default new AISearchService();
