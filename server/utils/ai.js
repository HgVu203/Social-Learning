import natural from "natural";
import crypto from "crypto";

// Destructure components from the natural package
const { TfIdf } = natural;
const PorterStemmer = natural.PorterStemmer;
const WordTokenizer = natural.WordTokenizer;

/**
 * Create embedding for text using simple TF-IDF from natural library
 * Completely free, no external API dependencies
 * @param {string} text - Text to create embedding for
 * @returns {Promise<number[]>} - Vector embedding
 */
export const createEmbedding = async (text) => {
  if (!text || typeof text !== "string") {
    console.warn("Invalid text input for embedding, using empty string");
    text = "";
  }

  // Normalize text
  const cleanText = text.replace(/\n/g, " ").trim().toLowerCase();

  // Create 512-dimension vector
  return generateEmbedding(cleanText, 512);
};

/**
 * Create embedding using TF-IDF and simple LSA
 * @param {string} text - Input text
 * @param {number} dimensions - Vector embedding dimensions
 * @returns {number[]} - Normalized vector embedding
 */
const generateEmbedding = (text, dimensions = 512) => {
  try {
    // Tokenize text
    const tokenizer = new WordTokenizer();
    const tokens = tokenizer.tokenize(text);

    if (!tokens || tokens.length === 0) {
      // Return zero vector if no tokens
      return new Array(dimensions).fill(0);
    }

    // Remove short words and apply stemming
    const stems = tokens
      .filter((token) => token && token.length > 2)
      .map((token) => PorterStemmer.stem(token));

    // Calculate TF-IDF for each token
    const tfidf = new TfIdf();
    tfidf.addDocument(stems);

    // Create vector with fixed dimensions using hashing
    const vector = new Array(dimensions).fill(0);

    stems.forEach((token) => {
      if (!token) return;

      // Calculate TF-IDF weight (relatively simple)
      const tokenWeight = tfidf.tfidf(token, 0);

      // Hash token to vector index
      const index = getHashIndex(token, dimensions);

      // Assign weight to corresponding position in vector
      vector[index] += tokenWeight;
    });

    // Normalize vector (L2 norm)
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return zero vector in case of error
    return new Array(dimensions).fill(0);
  }
};

/**
 * Hash string to integer within specific range
 * @param {string} str - String to hash
 * @param {number} max - Maximum value
 * @returns {number} - Index
 */
const getHashIndex = (str, max) => {
  try {
    const hash = crypto.createHash("md5").update(str).digest("hex");
    const numericHash = parseInt(hash.substring(0, 8), 16);
    return numericHash % max;
  } catch (error) {
    // Fallback simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % max;
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vecA - First vector
 * @param {number[]} vecB - Second vector
 * @returns {number} - Similarity (0-1)
 */
export const cosineSimilarity = (vecA, vecB) => {
  try {
    if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
      return 0;
    }

    if (vecA.length !== vecB.length) {
      console.warn("Vectors must have the same dimensions");
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  } catch (error) {
    console.error("Error calculating similarity:", error);
    return 0;
  }
};
