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

// Function to call API with key
const callGptApi = async (prompt) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("No API key available, skipping API call");
    return null;
  }

  try {
    console.log("🔄 Calling OpenAI API to generate challenge...");
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
      }
    );
    console.log("✅ Successfully received response from OpenAI");
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error calling GPT API:", error);
    return null;
  }
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

// Generate code challenges - now with dynamic generation based on user rank
export const generateCodeChallenges = async (params) => {
  const language = params?.language || "javascript";
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;

  // Try to use AI to generate challenges
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const difficultyByRank = {
        Rookie: "easy",
        Bronze: "easy",
        Silver: "easy to medium",
        Gold: "medium",
        Platinum: "medium to hard",
        Diamond: "hard",
        Master: "very hard",
      };

      const recommendedDifficulty = difficultyByRank[userRank] || "medium";

      // Create enhanced prompt to generate better challenges
      const enhancedPrompt = `As an expert coding challenge creator, generate a detailed ${level} level coding challenge for a ${language} programmer with rank ${userRank} (${points} points).

      Consider the following:
      1. The challenge should match ${level} difficulty, but also be appropriate for ${userRank} rank (recommended difficulty: ${recommendedDifficulty})
      2. Include a real-world context or practical application for the problem
      3. The challenge should test algorithmic thinking, not just syntax knowledge
      4. Provide clear inputs/outputs examples
      5. Include edge cases in your description
      6. The code template should have proper function signature and parameter documentation
      7. The solution should be optimal and well-commented
      8. Hints should be progressive - first hint subtle, second more direct

      Return the result in this exact JSON format without any explanations outside this structure:
      {
        "id": "unique-id-${Date.now()}",
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
      }`;

      const response = await callGptApi(enhancedPrompt);
      if (response) {
        try {
          const challenge = JSON.parse(response);
          // Wrap in array to match expected format
          return [challenge];
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
  const challengeCount = 3;
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

// Generate math problems - using local data instead of API to avoid rate limiting
export const generateMathProblems = async (params) => {
  const level = params?.level || "easy";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;

  // Try to use AI to generate problems
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const prompt = `Generate a math problem for a user with ${userRank} rank (${points} points).
      The problem should be ${level} difficulty.
      
      Return the result in this exact JSON format without any extra text:
      {
        "id": "unique-id",
        "level": "${level}",
        "question": "The detailed math problem",
        "correctAnswer": "The answer to the problem",
        "explanation": "A detailed explanation of how to solve the problem"
      }`;

      const response = await callGptApi(prompt);
      if (response) {
        try {
          const problem = JSON.parse(response);
          return [problem];
        } catch (parseError) {
          console.error("Error parsing GPT response:", parseError);
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

// Generate quiz questions - using local data instead of API to avoid rate limiting
export const generateQuizQuestions = async (params) => {
  const category = params?.category || "programming";
  const userRank = params?.userRank || "Rookie";
  const points = params?.points || 0;

  // Try to use AI to generate questions
  const apiKey = getApiKey();

  if (apiKey) {
    try {
      const prompt = `Generate a quiz question about ${category} for a user with ${userRank} rank (${points} points).
      
      Return the result in this exact JSON format without any extra text:
      {
        "id": "unique-id",
        "category": "${category}",
        "question": "The quiz question",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": "The correct option exactly as it appears in the options array",
        "explanation": "An explanation of why this answer is correct"
      }`;

      const response = await callGptApi(prompt);
      if (response) {
        try {
          const question = JSON.parse(response);
          return [question];
        } catch (parseError) {
          console.error("Error parsing GPT response:", parseError);
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
