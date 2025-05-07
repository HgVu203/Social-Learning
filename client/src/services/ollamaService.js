import axios from "axios";

// Ollama API settings
const OLLAMA_API_URL = "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || "llama3";

// Cache for responses to avoid unnecessary API calls
const responseCache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Check if Ollama is available (set in environment)
const isOllamaAvailable = () => {
  return import.meta.env.VITE_OLLAMA_AVAILABLE === "true";
};

// Function to call Ollama API with exponential backoff for error handling
const callOllamaApi = async (prompt, maxRetries = 2) => {
  if (!isOllamaAvailable()) {
    console.log("Ollama integration disabled, skipping API call");
    return null;
  }

  // Retry counter
  let retries = 0;

  // Exponential backoff delay calculation
  const getBackoffDelay = (retry) => Math.min(1000 * Math.pow(2, retry), 5000);

  while (retries <= maxRetries) {
    try {
      console.log(
        `🔄 Calling Ollama API... (attempt ${retries + 1}/${maxRetries + 1})`
      );

      const response = await axios.post(
        `${OLLAMA_API_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          // Increase timeout for potentially slow responses on local machine
          timeout: 60000,
        }
      );

      console.log("✅ Successfully received response from Ollama");
      return response.data.response;
    } catch (error) {
      retries++;

      if (retries <= maxRetries) {
        // Calculate delay with exponential backoff
        const delay = getBackoffDelay(retries);
        console.warn(
          `⚠️ Error calling Ollama API. Retrying in ${delay}ms... (attempt ${retries}/${maxRetries})`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          "❌ Maximum retries reached. Using fallback data.",
          error
        );
        return null;
      }
    }
  }

  return null;
};

// Generate a unique cache key based on function name and parameters
const generateCacheKey = (fnName, params) => {
  return `${fnName}-${JSON.stringify(params)}`;
};

// Export Ollama status function for UI
export const checkOllamaStatus = async () => {
  if (!isOllamaAvailable()) {
    return {
      available: false,
      message: "❌ Ollama integration disabled, using generated samples",
    };
  }

  try {
    // Simple health check to Ollama server
    await axios.get(`${OLLAMA_API_URL}`, { timeout: 3000 });
    return {
      available: true,
      message: `✅ Using Ollama with ${OLLAMA_MODEL} model`,
      model: OLLAMA_MODEL,
    };
  } catch (error) {
    console.error("❌ Failed to connect to Ollama server:", error);
    return {
      available: false,
      message: "❌ Ollama server not reachable, using generated samples",
    };
  }
};

// Sample challenges (same as in gptService.js for fallback)
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
    // Add more languages as needed...
  };

  const langTemplates = templates[language] || templates.javascript;
  return langTemplates[level] || langTemplates.medium;
};

// Generate code challenges - using dynamic generation based on user rank/level/points
export const generateCodeChallenges = async (params) => {
  const language = params?.language || "javascript";
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;
  const count = params?.count || 1;

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

  // Try to use Ollama to generate challenges
  if (isOllamaAvailable()) {
    try {
      const difficultyByRank = {
        Rookie: "beginner-friendly",
        Bronze: "introductory",
        Silver: "intermediate",
        Gold: "advanced",
        Platinum: "challenging",
        Diamond: "expert",
        Master: "professional level",
      };

      const pointsDescription =
        points < 500
          ? "very basic concepts"
          : points < 1000
          ? "fundamental concepts"
          : points < 2500
          ? "intermediate concepts"
          : points < 5000
          ? "advanced concepts"
          : "expert-level concepts";

      const recommendedDifficulty =
        difficultyByRank[userRank] || "intermediate";

      // Create a detailed prompt with instructions for Ollama
      const prompt = `Generate ${count} coding challenge${
        count > 1 ? "s" : ""
      } in ${language} that is ${level} difficulty (${recommendedDifficulty} level) for a user with ${userRank} rank (${points} points).

The challenge should:
1. Be appropriate for the user's rank and skill level (${pointsDescription})
2. Have clear instructions and requirements
3. Include starter code that sets up the challenge
4. Include a working solution
5. Have 2-3 helpful hints that guide without giving away the solution

${
  level === "easy"
    ? "Focus on fundamental concepts, single functions, and straightforward algorithms."
    : level === "medium"
    ? "Focus on more complex algorithms, data structures, and multi-part problems."
    : "Focus on advanced concepts, optimization challenges, and complex implementations."
}

Adjust the difficulty based on both the user rank (${userRank}) and points (${points}).

Return the result as ${count > 1 ? "an array of" : "a"} challenge object${
        count > 1 ? "s" : ""
      } in this exact JSON format:
${count > 1 ? "[" : ""}
  {
    "title": "Clear, concise title of the challenge",
    "description": "Detailed instructions for the challenge",
    "codeTemplate": "// Starter code with function signature\\nfunction example(param) {\\n  // Your code here\\n}",
    "solution": "// Complete solution code\\nfunction example(param) {\\n  // Implementation\\n  return result;\\n}",
    "hints": [
      "First hint that guides without giving away the solution",
      "Second hint that builds on the first hint"
    ],
    "difficulty": "${level}"
  }${count > 1 ? "," : ""}
${count > 1 ? "  // Additional challenge objects...\n]" : ""}`;

      const response = await callOllamaApi(prompt);

      if (response) {
        try {
          // Find JSON in the response - Ollama might include extra text
          const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const parsedChallenges = JSON.parse(jsonStr);

            // Handle both single object and array responses
            const challenges = Array.isArray(parsedChallenges)
              ? parsedChallenges
              : [parsedChallenges];

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
                data: challenges,
                timestamp: Date.now(),
              });
            }

            return challenges;
          }
        } catch (parseError) {
          console.error(
            "Error parsing Ollama response for code challenges:",
            parseError
          );
        }
      }
    } catch (error) {
      console.error("Error generating dynamic code challenges:", error);
    }
  }

  console.log(
    `Using programmatically generated sample for code challenges (language: ${language}, level: ${level})`
  );

  // If Ollama call fails or is unavailable, generate sample code challenges
  const sampleChallenge = generateSampleChallenge(language, level);
  return [sampleChallenge];
};

// Generate math problems - using dynamic generation based on rank, level, and points
export const generateMathProblems = async (params) => {
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;
  const count = params?.count || 3;
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

  // Try to use Ollama to generate problems
  if (isOllamaAvailable()) {
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

      // Points will affect the problem difficulty within the same level
      const pointsBasedDifficulty =
        points < 500
          ? "very basic concepts"
          : points < 1000
          ? "fundamental concepts"
          : points < 2500
          ? "standard concepts"
          : points < 5000
          ? "advanced applications"
          : "expert-level applications";

      const prompt = `Generate ${count} math problem${
        count > 1 ? "s" : ""
      } for a user with ${userRank} rank (${points} points).
      
The problem should be ${level} difficulty (${recommendedDifficulty} level) and consider the user's points (${pointsBasedDifficulty}).

Focus on these mathematical domains: ${domainFocus}

For each problem:
1. Make it clear and concise
2. Include step-by-step solution in the explanation
3. Ensure the problem is appropriate for the user's rank and points
4. For higher ranks, incorporate more advanced concepts
5. The difficulty should increase with higher points, even within the same rank

Return the result as ${count > 1 ? "an array of" : "a"} problem object${
        count > 1 ? "s" : ""
      } in this exact JSON format:
${count > 1 ? "[" : ""}
  {
    "id": "math-${Date.now()}-1",
    "level": "${level}",
    "question": "The detailed math problem with clear wording",
    "correctAnswer": "The answer to the problem (exact format needed for checking)",
    "explanation": "A detailed step-by-step explanation of how to solve the problem",
    "points": ${Math.floor(100 + points * 0.05)}, 
    "category": "${category}"
  }${count > 1 ? "," : ""}
${count > 1 ? "  // Additional problem objects...\n]" : ""}`;

      const response = await callOllamaApi(prompt);

      if (response) {
        try {
          // Find JSON in the response - Ollama might include extra text
          const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);

          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const parsedProblems = JSON.parse(jsonStr);

            // Handle both single object and array responses
            const problems = Array.isArray(parsedProblems)
              ? parsedProblems
              : [parsedProblems];

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
                data: problems,
                timestamp: Date.now(),
              });
            }

            return problems;
          }
        } catch (parseError) {
          console.error(
            "Error parsing Ollama response for math problems:",
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

  // If Ollama call fails or is unavailable, generate sample math problems
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
      points: Math.floor(100 + points * 0.05),
      category: category,
    },
  ];

  return problems;
};

// Generate quiz questions - using dynamic generation based on rank, level, and points
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

  // Generate quiz questions using Ollama if available
  if (isOllamaAvailable()) {
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

      // Points will affect the question difficulty within the same rank
      const pointsBasedDifficulty =
        points < 500
          ? "very basic concepts"
          : points < 1000
          ? "fundamental concepts"
          : points < 2500
          ? "standard concepts"
          : points < 5000
          ? "advanced applications"
          : "expert-level concepts";

      const recommendedDifficulty =
        difficultyByRank[userRank] || "intermediate knowledge";

      const prompt = `Generate ${count} quiz questions about ${category} for a user with ${userRank} rank (${points} points).

The questions should be tailored to ${recommendedDifficulty} difficulty (${pointsBasedDifficulty}) and consider:
1. The user's rank (${userRank}) and points (${points}) to determine complexity
2. The specific category (${category}) to focus the content
3. Including questions that test practical knowledge and theoretical understanding
4. Each question should have exactly 4 options with only one correct answer
5. For higher ranks (Gold+), include more nuanced questions that test deeper understanding
6. The difficulty should increase with higher points, even within the same rank

Return the result as an array of ${count} question objects in this exact JSON format:
[
  {
    "id": "quiz-${Date.now()}-1",
    "category": "${category}",
    "level": "${level}",
    "question": "Clear, specific quiz question",
    "options": [
      "First option",
      "Second option",
      "Third option",
      "Fourth option"
    ],
    "correctAnswer": 0,
    "points": ${Math.floor(50 + points * 0.02)}
  },
  {
    "id": "quiz-${Date.now()}-2",
    "category": "${category}",
    "level": "${level}",
    "question": "Different quiz question",
    "options": [
      "First option",
      "Second option",
      "Third option",
      "Fourth option"
    ],
    "correctAnswer": 2,
    "points": ${Math.floor(50 + points * 0.02)}
  }
  // And so on for the requested number of questions
]`;

      const response = await callOllamaApi(prompt);

      if (response) {
        try {
          // Find JSON in the response - Ollama might include extra text
          const jsonMatch = response.match(/\[[\s\S]*\]/);

          if (jsonMatch) {
            const jsonStr = jsonMatch[0];
            const parsedQuestions = JSON.parse(jsonStr);

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
            }
          }
        } catch (parseError) {
          console.error(
            "Error parsing Ollama response for quiz questions:",
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

  // If Ollama call fails or is unavailable, generate sample quiz questions
  const categoryQuestions = {
    programming: {
      question: "What type of language is JavaScript?",
      options: ["Compiled", "Interpreted", "Assembled", "Machine language"],
      correctAnswer: 1,
    },
    database: {
      question: "Which of the following is a NoSQL database?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"],
      correctAnswer: 2,
    },
    networking: {
      question: "Which protocol is used for secure web browsing?",
      options: ["HTTP", "FTP", "HTTPS", "SMTP"],
      correctAnswer: 2,
    },
    frontend: {
      question: "Which of these is a JavaScript framework?",
      options: ["Django", "Flask", "Spring", "React"],
      correctAnswer: 3,
    },
    ai: {
      question: "What does CNN stand for in deep learning?",
      options: [
        "Computer Neural Network",
        "Convolutional Neural Network",
        "Complete Neural Network",
        "Cognitive Neural Network",
      ],
      correctAnswer: 1,
    },
  };

  // Get the appropriate question or default to programming
  const questionTemplate =
    categoryQuestions[category] || categoryQuestions.programming;

  const question = {
    id: "quiz-" + Date.now().toString(36),
    category: category,
    level: level,
    ...questionTemplate,
    points: Math.floor(50 + points * 0.02),
  };

  return [question];
};
