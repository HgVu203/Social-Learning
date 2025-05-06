import axios from "axios";

/**
 * AI Service - Using OpenAI API for AI features
 */

const API_URL = "https://api.openai.com/v1/chat/completions";

// Get API key from environment
const getApiKey = () => {
  if (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
    console.log("✅ API key available - Using OpenAI API");
    return import.meta.env.VITE_OPENAI_API_KEY;
  }

  console.warn(
    "❌ No OpenAI API key found in environment variables, using fallback responses"
  );
  return "";
};

// Simple memory cache for responses
const responseCache = new Map();

// Cache time to live (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Generate a cache key from prompt and options
const generateCacheKey = (prompt, options) => {
  // Create a simpler options object with only relevant fields for caching
  const cacheOptions = {
    model: options.model || "gpt-3.5-turbo",
    max_tokens: options.max_tokens || 1000,
    temperature: options.temperature || 0.7,
  };

  // Combine prompt and options into a cache key
  return JSON.stringify({ prompt, options: cacheOptions });
};

// Generate AI response with OpenAI API
export const generateAIResponse = async (prompt, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No API key available, using fallback responses");
    return getLocalFallbackResponse(prompt);
  }

  // Skip cache if explicitly requested
  if (!options.skipCache) {
    // Check cache first
    const cacheKey = generateCacheKey(prompt, options);
    const cachedItem = responseCache.get(cacheKey);

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      console.log("✅ Using cached OpenAI response");
      return cachedItem.data;
    }
  }

  // Maximum number of retries for rate limit errors
  const maxRetries = options.maxRetries || 3;
  let retries = 0;

  // Exponential backoff delay calculation
  const getBackoffDelay = (retry) => Math.min(1000 * Math.pow(2, retry), 15000);

  while (retries <= maxRetries) {
    try {
      console.log(
        `🔄 Generating OpenAI response... (attempt ${retries + 1}/${
          maxRetries + 1
        })`
      );

      const response = await axios.post(
        API_URL,
        {
          model: options.model || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log("✅ Successfully received OpenAI response");
      const responseContent = response.data.choices[0].message.content;

      // Store in cache if caching is not disabled
      if (!options.skipCache) {
        const cacheKey = generateCacheKey(prompt, options);
        responseCache.set(cacheKey, {
          data: responseContent,
          timestamp: Date.now(),
        });
      }

      return responseContent;
    } catch (error) {
      // Handle rate limit errors (429)
      if (error.response && error.response.status === 429) {
        retries++;

        if (retries <= maxRetries) {
          // Calculate delay with exponential backoff
          const delay = getBackoffDelay(retries);
          console.warn(
            `⚠️ Rate limit exceeded (429). Retrying in ${delay}ms... (attempt ${retries}/${maxRetries})`
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(
            "❌ Maximum retries reached for rate limit (429). Using fallback response."
          );
          return getLocalFallbackResponse(prompt);
        }
      } else {
        // For other errors, log and use fallback
        console.error("❌ Error calling OpenAI API:", error);

        // For network errors, try once more after a short delay
        if (
          error.code === "ECONNABORTED" ||
          error.code === "ERR_NETWORK" ||
          !error.response
        ) {
          retries++;
          if (retries <= 1) {
            // Only retry once for network errors
            console.warn("⚠️ Network error. Retrying once after 2s...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            return getLocalFallbackResponse(prompt);
          }
        } else {
          // For all other errors, don't retry
          return getLocalFallbackResponse(prompt);
        }
      }
    }
  }

  return getLocalFallbackResponse(prompt);
};

// Generate fallback response when AI is unavailable
const getLocalFallbackResponse = (prompt) => {
  // Analyze prompt content to provide appropriate response
  if (prompt.includes("code")) {
    return "I recommend breaking down the problem and solving it step by step. Review your logic and data structures.";
  }

  if (prompt.includes("error")) {
    return "This error might be due to incorrect syntax or variable scope issues. Check your brackets and variable names carefully.";
  }

  return "I cannot connect to the AI service at the moment. Please try again later or search StackOverflow for help with your issue.";
};

// Check AI service status
export const checkAIStatus = async () => {
  const hasKey = !!getApiKey();

  return {
    available: hasKey,
    message: hasKey
      ? "✅ OpenAI API available with API key"
      : "❌ OpenAI API unavailable, will use local fallback responses",
  };
};

// Generate code hint based on description
export const generateCodeHint = async (description, language) => {
  const prompt = `Give a short hint (under 100 words) on how to solve this problem in ${language}: "${description}"`;
  return generateAIResponse(prompt);
};

// Generate AI assistant response for code help
export const generateAIAssistant = async (code, errorMessage, language) => {
  const prompt = `Here's my ${language} code: 

${code}

${
  errorMessage
    ? `I'm getting this error: ${errorMessage}`
    : "I need suggestions to improve this code."
}

Please provide a concise hint (under 150 words).`;

  return generateAIResponse(prompt);
};

export default {
  generateAIResponse,
  checkAIStatus,
  generateCodeHint,
  generateAIAssistant,
};
