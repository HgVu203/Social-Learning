import axios from "axios";

// Using OpenAI API
const API_URL = "https://api.openai.com/v1/chat/completions";

// Get API key from environment
const getApiKey = () => {
  if (import.meta.env && import.meta.env.VITE_OPENAI_API_KEY) {
    console.log("✅ API key available - Using OpenAI to generate challenges");
    return import.meta.env.VITE_OPENAI_API_KEY;
  }

  console.warn(
    "❌ No OpenAI API key found in environment variables, using fallback data"
  );
  return "";
};

// Function to call API with key and exponential backoff for rate limit handling
const callGptApi = async (prompt, maxRetries = 3) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No API key available, skipping API call");
    return null;
  }

  // Retry counter
  let retries = 0;

  // Exponential backoff delay calculation
  const getBackoffDelay = (retry) => Math.min(1000 * Math.pow(2, retry), 10000);

  while (retries <= maxRetries) {
    try {
      console.log(
        `🔄 Calling OpenAI API to generate challenge... (attempt ${
          retries + 1
        }/${maxRetries + 1})`
      );

      const response = await axios.post(
        API_URL,
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          // Increase timeout for potentially slow responses
          timeout: 30000,
        }
      );

      console.log("✅ Successfully received response from OpenAI");
      return response.data.choices[0].message.content;
    } catch (error) {
      // Check if it's a rate limit error (429)
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
            "❌ Maximum retries reached for rate limit (429). Using fallback data."
          );
          return null;
        }
      } else {
        // For other errors, log and return null immediately
        console.error("❌ Error calling GPT API:", error);

        // If we have network issues, try once more after a short delay
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
            return null;
          }
        } else {
          // For all other errors, don't retry
          return null;
        }
      }
    }
  }

  return null;
};

// Export API key status function for UI
export const checkApiKeyStatus = () => {
  const hasKey = !!getApiKey();
  return {
    available: hasKey,
    message: hasKey
      ? "✅ Using OpenAI to generate challenges"
      : "❌ No API key available, using generated samples",
  };
};

// Generate sample challenges programmatically if API key is unavailable
const generateSampleChallenge = (language, level) => {
  // Define templates for different languages
  const templates = {
    javascript: {
      easy: {
        title: "Reverse String",
        description: "Write a function to reverse the input string",
        codeTemplate: "function reverseString(str) {\n  // Your code here\n}",
        solution:
          'function reverseString(str) {\n  return str.split("").reverse().join("");\n}',
        hints: [
          "You can convert a string to an array",
          "Consider using the reverse() method",
        ],
      },
      medium: {
        title: "Count Occurrences",
        description:
          "Write a function to count the occurrences of each character in a string",
        codeTemplate:
          "function countOccurrences(str) {\n  // Your code here\n}",
        solution:
          "function countOccurrences(str) {\n  return str.split('').reduce((acc, char) => {\n    acc[char] = (acc[char] || 0) + 1;\n    return acc;\n  }, {});\n}",
        hints: [
          "You can use an object to store the counts",
          "Consider using the reduce method",
        ],
      },
      hard: {
        title: "Implement Binary Search",
        description:
          "Write a function to implement binary search on a sorted array",
        codeTemplate:
          "function binarySearch(arr, target) {\n  // Your code here\n}",
        solution:
          "function binarySearch(arr, target) {\n  let left = 0;\n  let right = arr.length - 1;\n  \n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  \n  return -1;\n}",
        hints: [
          "Binary search works by repeatedly dividing the search interval in half",
          "Keep track of left and right boundaries of your search space",
        ],
      },
    },
    python: {
      easy: {
        title: "Reverse String",
        description: "Write a function to reverse the input string",
        codeTemplate: "def reverse_string(s):\n    # Your code here\n    pass",
        solution: "def reverse_string(s):\n    return s[::-1]",
        hints: [
          "Python has slice notation that can be used to reverse a string",
          "Try using the slice notation with a negative step",
        ],
      },
      medium: {
        title: "Count Words",
        description:
          "Write a function to count the number of words in a string",
        codeTemplate: "def count_words(s):\n    # Your code here\n    pass",
        solution:
          "def count_words(s):\n    if not s.strip():\n        return 0\n    return len(s.split())",
        hints: [
          "Python's split method divides a string into a list of words",
          "Handle empty strings as a special case",
        ],
      },
      hard: {
        title: "Find Longest Substring Without Repeating Characters",
        description:
          "Write a function to find the length of the longest substring without repeating characters",
        codeTemplate:
          "def length_of_longest_substring(s):\n    # Your code here\n    pass",
        solution:
          "def length_of_longest_substring(s):\n    start = max_length = 0\n    used_chars = {}\n    \n    for i, char in enumerate(s):\n        if char in used_chars and start <= used_chars[char]:\n            start = used_chars[char] + 1\n        else:\n            max_length = max(max_length, i - start + 1)\n        \n        used_chars[char] = i\n    \n    return max_length",
        hints: [
          "Use a sliding window approach",
          "Keep track of the position of each character in a dictionary",
        ],
      },
    },
    java: {
      easy: {
        title: "Reverse String",
        description: "Write a function to reverse the input string",
        codeTemplate:
          'public class Solution {\n    public static String reverseString(String str) {\n        // Your code here\n        return "";\n    }\n}',
        solution:
          "public class Solution {\n    public static String reverseString(String str) {\n        return new StringBuilder(str).reverse().toString();\n    }\n}",
        hints: [
          "Java has a StringBuilder class with a reverse method",
          "You could also use a char array and swap elements",
        ],
      },
      medium: {
        title: "Check Palindrome",
        description: "Write a function to check if a string is a palindrome",
        codeTemplate:
          "public class Solution {\n    public static boolean isPalindrome(String str) {\n        // Your code here\n        return false;\n    }\n}",
        solution:
          'public class Solution {\n    public static boolean isPalindrome(String str) {\n        str = str.toLowerCase().replaceAll("[^a-z0-9]", "");\n        int left = 0;\n        int right = str.length() - 1;\n        \n        while (left < right) {\n            if (str.charAt(left) != str.charAt(right)) {\n                return false;\n            }\n            left++;\n            right--;\n        }\n        \n        return true;\n    }\n}',
        hints: [
          "A palindrome reads the same forwards and backwards",
          "Consider sanitizing the input string (remove spaces, punctuation, etc.)",
          "You can use two pointers (left and right) to compare characters",
        ],
      },
      hard: {
        title: "Implement LRU Cache",
        description:
          "Design and implement a data structure for Least Recently Used (LRU) cache",
        codeTemplate:
          "public class LRUCache {\n    // Your code here\n    \n    public LRUCache(int capacity) {\n        // Initialize your data structure\n    }\n    \n    public int get(int key) {\n        // Get value by key\n        return -1;\n    }\n    \n    public void put(int key, int value) {\n        // Set or insert value\n    }\n}",
        solution:
          "import java.util.HashMap;\n\npublic class LRUCache {\n    class Node {\n        int key;\n        int value;\n        Node prev;\n        Node next;\n    }\n    \n    private void addNode(Node node) {\n        node.prev = head;\n        node.next = head.next;\n        head.next.prev = node;\n        head.next = node;\n    }\n    \n    private void removeNode(Node node) {\n        Node prev = node.prev;\n        Node next = node.next;\n        prev.next = next;\n        next.prev = prev;\n    }\n    \n    private void moveToHead(Node node) {\n        removeNode(node);\n        addNode(node);\n    }\n    \n    private Node popTail() {\n        Node res = tail.prev;\n        removeNode(res);\n        return res;\n    }\n    \n    private HashMap<Integer, Node> cache = new HashMap<>();\n    private int capacity;\n    private int count;\n    private Node head, tail;\n    \n    public LRUCache(int capacity) {\n        this.capacity = capacity;\n        this.count = 0;\n        \n        head = new Node();\n        tail = new Node();\n        \n        head.prev = null;\n        head.next = tail;\n        \n        tail.prev = head;\n        tail.next = null;\n    }\n    \n    public int get(int key) {\n        Node node = cache.get(key);\n        if (node == null) {\n            return -1;\n        }\n        moveToHead(node);\n        return node.value;\n    }\n    \n    public void put(int key, int value) {\n        Node node = cache.get(key);\n        \n        if (node == null) {\n            Node newNode = new Node();\n            newNode.key = key;\n            newNode.value = value;\n            \n            cache.put(key, newNode);\n            addNode(newNode);\n            \n            ++count;\n            \n            if (count > capacity) {\n                Node tail = popTail();\n                cache.remove(tail.key);\n                --count;\n            }\n        } else {\n            node.value = value;\n            moveToHead(node);\n        }\n    }\n}",
        hints: [
          "Use a combination of a doubly-linked list and a hash map",
          "The linked list orders elements by access time (most recent at the front)",
          "The hash map provides O(1) access to any key",
        ],
      },
    },
    cpp: {
      easy: {
        title: "Reverse String",
        description: "Write a function to reverse the input string",
        codeTemplate:
          '#include <string>\n\nstd::string reverseString(const std::string& str) {\n    // Your code here\n    return "";\n}',
        solution:
          "#include <string>\n\nstd::string reverseString(const std::string& str) {\n    return std::string(str.rbegin(), str.rend());\n}",
        hints: [
          "C++ strings can be constructed from reverse iterators",
          "Alternatively, you can use a loop to build the reversed string",
        ],
      },
      medium: {
        title: "Find First Non-Repeating Character",
        description:
          "Write a function to find the first non-repeating character in a string",
        codeTemplate:
          "#include <string>\n\nchar firstNonRepeatingChar(const std::string& str) {\n    // Your code here\n    return '\\0';\n}",
        solution:
          "#include <string>\n#include <unordered_map>\n\nchar firstNonRepeatingChar(const std::string& str) {\n    std::unordered_map<char, int> counts;\n    \n    // Count character occurrences\n    for (char c : str) {\n        counts[c]++;\n    }\n    \n    // Find first character with count 1\n    for (char c : str) {\n        if (counts[c] == 1) {\n            return c;\n        }\n    }\n    \n    return '\\0'; // No non-repeating character found\n}",
        hints: [
          "Use a hash map to count character occurrences",
          "Iterate through the string again to find the first character with count 1",
        ],
      },
      hard: {
        title: "Implement a String Compression Algorithm",
        description:
          "Write a function to compress a string using the counts of repeated characters",
        codeTemplate:
          '#include <string>\n\nstd::string compressString(const std::string& str) {\n    // Your code here\n    return "";\n}',
        solution:
          '#include <string>\n\nstd::string compressString(const std::string& str) {\n    if (str.empty()) return "";\n    \n    std::string result;\n    char currentChar = str[0];\n    int count = 1;\n    \n    for (size_t i = 1; i < str.length(); i++) {\n        if (str[i] == currentChar) {\n            count++;\n        } else {\n            result += currentChar + std::to_string(count);\n            currentChar = str[i];\n            count = 1;\n        }\n    }\n    \n    // Add the last character group\n    result += currentChar + std::to_string(count);\n    \n    // Return the original string if compression doesn\'t save space\n    return result.length() < str.length() ? result : str;\n}',
        hints: [
          "Track the current character and its count",
          "When the character changes, append the character and count to the result",
          "Compare the compressed string length with the original",
        ],
      },
    },
  };

  // Generate a unique ID based on current time
  const id =
    "generated-" +
    Date.now().toString(36) +
    Math.random().toString(36).substr(2, 5);

  // Get template based on language and level
  const template = templates[language]?.[level] || templates.javascript.easy;

  return {
    id: id,
    language: language,
    level: level,
    title: template.title,
    description: template.description,
    codeTemplate: template.codeTemplate,
    solution: template.solution,
    hints: template.hints,
  };
};

// Simple memory cache for responses
const responseCache = new Map();

// Cache time to live (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Generate a cache key based on params
const generateCacheKey = (fnName, params) => {
  return `${fnName}-${JSON.stringify(params)}`;
};

// Generate code challenges - now with dynamic generation based on user rank
export const generateCodeChallenges = async (params) => {
  const language = params?.language || "javascript";
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;
  const count = params?.count || 3; // Number of challenges to generate

  // Check cache first unless explicitly skipped
  if (!params?.skipCache) {
    const cacheKey = generateCacheKey("codeChallenges", {
      language,
      level,
      userRank,
      points,
      count,
    });
    const cachedItem = responseCache.get(cacheKey);

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      console.log("✅ Using cached code challenges");
      return cachedItem.data;
    }
  }

  // Try to use AI to generate challenges
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const difficultyByRank = {
        Rookie: "easy",
        Bronze: "easy to medium",
        Silver: "medium",
        Gold: "medium to hard",
        Platinum: "hard",
        Diamond: "very hard",
        Master: "extremely challenging",
      };

      const recommendedDifficulty = difficultyByRank[userRank] || "medium";

      // Generate multiple challenges in a batch for efficiency
      const enhancedPrompt = `As an expert coding challenge creator, generate ${count} detailed ${level} level coding challenges for a ${language} programmer with rank ${userRank} (${points} points).

      Adapt the difficulty based on these factors:
      1. Base difficulty: ${level}
      2. User rank: ${userRank} (recommended difficulty: ${recommendedDifficulty})
      3. User points: ${points} points (higher points = more sophisticated challenges)

      For each challenge, consider the following:
      1. Include a real-world context or practical application for the problem
      2. The challenge should test algorithmic thinking and problem-solving skills
      3. Provide clear inputs/outputs examples
      4. Include edge cases in your description
      5. The code template should have proper function signature and parameter documentation
      6. The solution should be optimal and well-commented
      7. Hints should be progressive - first hint subtle, second more direct, third most helpful

      Return the result as an array of ${count} challenge objects in this exact JSON format:
      [
        {
          "id": "challenge-${Date.now()}-1",
          "language": "${language}",
          "level": "${level}",
          "title": "Challenge Title",
          "description": "Detailed description including problem context, requirements, examples of inputs/outputs, and any constraints",
          "codeTemplate": "// Function signature and parameters with documentation\n// Input: [describe input]\n// Output: [describe expected output]",
          "solution": "// Complete working solution with comments explaining key steps",
          "hints": [
            "First subtle hint that guides thinking direction",
            "More direct hint about approach or data structure to use",
            "Specific technical advice for implementation"
          ]
        },
        {
          "id": "challenge-${Date.now()}-2",
          "language": "${language}",
          "level": "${level}",
          "title": "Different Challenge Title",
          "description": "...",
          "codeTemplate": "...",
          "solution": "...",
          "hints": ["...", "...", "..."]
        }
        // And so on for the requested number of challenges
      ]`;

      const response = await callGptApi(enhancedPrompt);
      if (response) {
        try {
          const parsedChallenges = JSON.parse(response);
          if (Array.isArray(parsedChallenges)) {
            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("codeChallenges", {
                language,
                level,
                userRank,
                points,
                count,
              });
              responseCache.set(cacheKey, {
                data: parsedChallenges,
                timestamp: Date.now(),
              });
            }

            return parsedChallenges;
          } else {
            // If response is not an array, wrap it
            const result = [parsedChallenges];

            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("codeChallenges", {
                language,
                level,
                userRank,
                points,
                count,
              });
              responseCache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
              });
            }

            return result;
          }
        } catch (parseError) {
          console.error("Error parsing GPT response:", parseError);
        }
      }
    } catch (error) {
      console.error("Error generating dynamic challenges:", error);
    }
  }

  console.log(
    `Using programmatically generated sample for ${language} challenges (level: ${level})`
  );

  // If API call fails or no API key, generate a sample challenge programmatically
  const challengeCount = params?.count || 3;
  const challenges = [];

  for (let i = 0; i < challengeCount; i++) {
    challenges.push(generateSampleChallenge(language, level));
  }

  // Shuffle the challenges to randomize them
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  return shuffleArray(challenges);
};

// Generate math problems - using dynamic generation based on user rank and level
export const generateMathProblems = async (params) => {
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;
  const count = params?.count || 3; // Number of problems to generate
  const category = params?.category || "general";

  // Check cache first unless explicitly skipped
  if (!params?.skipCache) {
    const cacheKey = generateCacheKey("mathProblems", {
      level,
      userRank,
      points,
      count,
      category,
    });
    const cachedItem = responseCache.get(cacheKey);

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      console.log("✅ Using cached math problems");
      return cachedItem.data;
    }
  }

  // Try to use AI to generate problems
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const difficultyByRank = {
        Rookie: "basic",
        Bronze: "elementary",
        Silver: "intermediate",
        Gold: "advanced",
        Platinum: "challenging",
        Diamond: "expert",
        Master: "competition level",
      };

      const mathDomain = {
        easy: "arithmetic, basic algebra, simple geometry",
        medium: "intermediate algebra, geometry, basic probability, statistics",
        hard: "advanced algebra, calculus concepts, complex probability, combinatorics",
      };

      const recommendedDifficulty =
        difficultyByRank[userRank] || "intermediate";
      const domainFocus = mathDomain[level] || mathDomain.medium;

      const prompt = `Generate ${count} math problems for a user with ${userRank} rank (${points} points).
      The problems should be ${level} difficulty (${recommendedDifficulty} level).
      
      Focus on these mathematical domains: ${domainFocus}
      
      For each problem:
      1. Make it clear and concise
      2. Include step-by-step solution in the explanation
      3. Ensure the problem is appropriate for the user's rank and points
      4. For higher ranks, incorporate more advanced concepts
      
      Return the result as an array of ${count} problem objects in this exact JSON format:
      [
        {
          "id": "math-${Date.now()}-1",
          "level": "${level}",
          "question": "The detailed math problem with clear wording",
          "correctAnswer": "The answer to the problem (exact format needed for checking)",
          "explanation": "A detailed step-by-step explanation of how to solve the problem"
        },
        {
          "id": "math-${Date.now()}-2",
          "level": "${level}",
          "question": "Different math problem",
          "correctAnswer": "...",
          "explanation": "..."
        }
        // And so on for the requested number of problems
      ]`;

      const response = await callGptApi(prompt);
      if (response) {
        try {
          const parsedProblems = JSON.parse(response);
          if (Array.isArray(parsedProblems)) {
            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("mathProblems", {
                level,
                userRank,
                points,
                count,
                category,
              });
              responseCache.set(cacheKey, {
                data: parsedProblems,
                timestamp: Date.now(),
              });
            }

            return parsedProblems;
          } else {
            // If response is not an array, wrap it
            const result = [parsedProblems];

            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("mathProblems", {
                level,
                userRank,
                points,
                count,
                category,
              });
              responseCache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
              });
            }

            return result;
          }
        } catch (parseError) {
          console.error(
            "Error parsing GPT response for math problems:",
            parseError
          );
        }
      }
    } catch (error) {
      console.error("Error generating dynamic math problems:", error);
    }
  }

  console.log(
    `Using programmatically generated sample for math problems (level: ${level})`
  );

  // If API call fails or no API key, generate sample math problems
  const problems = [
    {
      id: "math-" + Date.now().toString(36),
      level: level,
      question:
        level === "easy"
          ? "Calculate the sum of numbers from 1 to 100?"
          : level === "medium"
          ? "If a rectangle has a length of 12 cm and a width of 8 cm, what is its area?"
          : "Solve for x: 3x² - 6x - 24 = 0",
      correctAnswer:
        level === "easy"
          ? "5050"
          : level === "medium"
          ? "96"
          : "x = -2 or x = 4",
      explanation:
        level === "easy"
          ? "Use the formula for sum of arithmetic sequence: S = n*(a1 + an)/2 = 100*(1 + 100)/2 = 5050"
          : level === "medium"
          ? "The area of a rectangle is length × width = 12 × 8 = 96 square cm"
          : "Using the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a where a=3, b=-6, c=-24. This gives x = (-(-6) ± √((-6)² - 4×3×(-24))) / 2×3 = (6 ± √(36 + 288)) / 6 = (6 ± √324) / 6 = (6 ± 18) / 6 = either 4 or -2",
    },
  ];

  return problems;
};

// Generate quiz questions - using dynamic generation based on user rank
export const generateQuizQuestions = async (params) => {
  const count = params?.count || 10;
  const category = params?.category || "general";
  const level = params?.level || "medium";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;

  // Check cache first unless explicitly skipped
  if (!params?.skipCache) {
    const cacheKey = generateCacheKey("quizQuestions", {
      count,
      category,
      level,
      userRank,
      points,
    });
    const cachedItem = responseCache.get(cacheKey);

    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      console.log("✅ Using cached quiz questions");
      return cachedItem.data;
    }
  }

  // Generate quiz questions using AI if available
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const difficultyByRank = {
        Rookie: "basic knowledge",
        Bronze: "beginner-friendly",
        Silver: "intermediate knowledge",
        Gold: "advanced concepts",
        Platinum: "expert level",
        Diamond: "specialist knowledge",
        Master: "professional level",
      };

      const recommendedDifficulty =
        difficultyByRank[userRank] || "intermediate knowledge";

      const prompt = `Generate ${count} quiz questions about ${category} for a user with ${userRank} rank (${points} points).
      
      The questions should be tailored to ${recommendedDifficulty} and consider:
      1. Progressive difficulty based on rank
      2. Covering both fundamentals and advanced topics appropriate to the rank
      3. Including questions that test practical knowledge and theoretical understanding
      4. Each question should have exactly 4 options with only one correct answer
      5. For higher ranks (Gold+), include more nuanced questions that test deeper understanding
      
      Return the result as an array of ${count} question objects in this exact JSON format:
      [
        {
          "id": "quiz-${Date.now()}-1",
          "category": "${category}",
          "question": "Clear, specific quiz question",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": "The correct option exactly as it appears in the options array",
          "explanation": "A thorough explanation of why this answer is correct and why others are incorrect"
        },
        {
          "id": "quiz-${Date.now()}-2",
          "category": "${category}",
          "question": "Different quiz question",
          "options": ["...", "...", "...", "..."],
          "correctAnswer": "...",
          "explanation": "..."
        }
        // And so on for the requested number of questions
      ]`;

      const response = await callGptApi(prompt);
      if (response) {
        try {
          const parsedQuestions = JSON.parse(response);
          if (Array.isArray(parsedQuestions)) {
            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("quizQuestions", {
                count,
                category,
                level,
                userRank,
                points,
              });
              responseCache.set(cacheKey, {
                data: parsedQuestions,
                timestamp: Date.now(),
              });
            }

            return parsedQuestions;
          } else {
            // If response is not an array, wrap it
            const result = [parsedQuestions];

            // Cache the result if not explicitly skipped
            if (!params?.skipCache) {
              const cacheKey = generateCacheKey("quizQuestions", {
                count,
                category,
                level,
                userRank,
                points,
              });
              responseCache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
              });
            }

            return result;
          }
        } catch (parseError) {
          console.error(
            "Error parsing GPT response for quiz questions:",
            parseError
          );
        }
      }
    } catch (error) {
      console.error("Error generating dynamic quiz questions:", error);
    }
  }

  console.log(
    `Using programmatically generated sample for quiz questions (category: ${category})`
  );

  // If API call fails or no API key, generate sample quiz questions
  const categoryQuestions = {
    programming: {
      question: "What type of language is JavaScript?",
      options: ["Compiled", "Interpreted", "Both", "None"],
      correctAnswer: "Interpreted",
      explanation:
        "JavaScript is primarily an interpreted language although modern browsers use JIT compilation.",
    },
    database: {
      question: "Which of the following is a NoSQL database?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
      correctAnswer: "MongoDB",
      explanation:
        "MongoDB is a document-oriented NoSQL database used for high volume data storage.",
    },
    networking: {
      question: "Which protocol is used for secure web browsing?",
      options: ["HTTP", "HTTPS", "FTP", "SMTP"],
      correctAnswer: "HTTPS",
      explanation:
        "HTTPS (Hypertext Transfer Protocol Secure) is used for secure communication over a computer network.",
    },
    web: {
      question: "Which of these is a JavaScript framework?",
      options: ["Django", "Flask", "Laravel", "React"],
      correctAnswer: "React",
      explanation:
        "React is a JavaScript library for building user interfaces, particularly single-page applications.",
    },
    ai: {
      question: "What does CNN stand for in deep learning?",
      options: [
        "Computer Neural Network",
        "Convolutional Neural Network",
        "Computed Neuron Network",
        "Connected Neural Nodes",
      ],
      correctAnswer: "Convolutional Neural Network",
      explanation:
        "Convolutional Neural Networks are deep learning algorithms particularly useful for processing structured grid data like images.",
    },
  };

  // Get the appropriate question or default to programming
  const questionTemplate =
    categoryQuestions[category] || categoryQuestions.programming;

  const question = {
    id: "quiz-" + Date.now().toString(36),
    category: category,
    ...questionTemplate,
  };

  return [question];
};
