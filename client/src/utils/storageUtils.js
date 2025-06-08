// In-memory fallback cache
const memoryCache = new Map();

/**
 * Safely stores data in localStorage with fallback to memory cache
 * @param {string} key - Storage key
 * @param {any} data - Data to store (will be JSON stringified)
 * @param {number} [maxSize=500000] - Maximum size in bytes for localStorage
 * @returns {boolean} Success status
 */
export const safeSetItem = (key, data, maxSize = 500000) => {
  try {
    const serialized = JSON.stringify(data);

    // Check if data exceeds size limit
    if (serialized.length > maxSize) {
      console.warn(
        `Data for ${key} exceeds size limit (${serialized.length} bytes), storing in memory only`
      );
      memoryCache.set(key, data);
      return true;
    }

    // Try storing in localStorage
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Storage error for ${key}:`, error);

    // Fall back to in-memory cache on quota error
    if (
      error.name === "QuotaExceededError" ||
      error.code === 22 ||
      error.code === 1014
    ) {
      console.log(`Using memory fallback for ${key} due to quota error`);
      try {
        // Clear some localStorage items to make space
        clearOldCache();

        // Store in memory cache as fallback
        memoryCache.set(key, data);
        return true;
      } catch (fallbackError) {
        console.error(`Memory fallback failed:`, fallbackError);
      }
    }
    return false;
  }
};

/**
 * Safely retrieves data from localStorage with fallback to memory cache
 * @param {string} key - Storage key
 * @returns {any} Retrieved data or null
 */
export const safeGetItem = (key) => {
  try {
    const item = localStorage.getItem(key);

    if (item !== null) {
      return JSON.parse(item);
    }

    // Check memory cache if localStorage doesn't have the item
    if (memoryCache.has(key)) {
      console.log(`Retrieved ${key} from memory cache`);
      return memoryCache.get(key);
    }

    return null;
  } catch (error) {
    console.error(`Error retrieving ${key}:`, error);

    // Try memory cache on error
    if (memoryCache.has(key)) {
      console.log(`Retrieved ${key} from memory cache after error`);
      return memoryCache.get(key);
    }

    return null;
  }
};

/**
 * Clears old cache entries to free up space
 * @param {string} [pattern='-comments-cache'] - Pattern to match keys to clear
 * @param {number} [count=3] - Number of items to clear
 */
export const clearOldCache = (pattern = "-comments-cache", count = 3) => {
  try {
    // Find all matching cache keys
    const cacheKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        cacheKeys.push(key);
      }
    }

    // Clear oldest entries (we don't have timestamp, so just remove random ones)
    cacheKeys.slice(0, count).forEach((key) => {
      console.log(`Clearing cache item ${key} to free space`);
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error(`Error clearing old cache:`, error);
  }
};

/**
 * Simplified and safe version of comment data for storage
 * @param {Array} comments - Original comments array
 * @param {number} [limit=5] - Maximum number of comments to include
 * @returns {Array} Simplified comments
 */
export const simplifyCommentsForStorage = (comments, limit = 5) => {
  if (!Array.isArray(comments) || comments.length === 0) return [];

  // Limit the number of comments to reduce storage size
  const limitedComments = comments.slice(0, limit);

  return limitedComments.map((comment) => {
    const simplified = {
      _id: comment._id,
      content: comment.content
        ? comment.content.length > 100
          ? comment.content.substring(0, 100)
          : comment.content
        : "",
      createdAt: comment.createdAt,
    };

    // Add minimal user info
    if (comment.userId || comment.author) {
      const user = comment.userId || comment.author;
      simplified.userId = {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
      };
    }

    // Include only basic reply info if available
    if (
      comment.replies &&
      Array.isArray(comment.replies) &&
      comment.replies.length > 0
    ) {
      simplified.replies = [{ count: comment.replies.length }];
    }

    return simplified;
  });
};
