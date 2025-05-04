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

// Generate AI response with OpenAI API
export const generateAIResponse = async (prompt, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No API key available, using fallback responses");
    return getLocalFallbackResponse(prompt);
  }

  try {
    console.log(`🔄 Generating OpenAI response...`);

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
      }
    );

    console.log("✅ Successfully received OpenAI response");
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error calling OpenAI API:", error);
    return getLocalFallbackResponse(prompt);
  }
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
