/**
 * Game utility functions
 */

/**
 * Checks if game images exist and logs a helpful message if they don't
 * @returns {Promise<boolean>} True if all required images exist
 */
export const checkGameImages = async () => {
  const requiredImages = [
    "/assets/games/code-bg.jpg",
    "/assets/games/math-bg.jpg",
    "/assets/games/quiz-bg.jpg",
  ];

  let allImagesExist = true;

  for (const imagePath of requiredImages) {
    try {
      const response = await fetch(imagePath, { method: "HEAD" });
      if (!response.ok || response.headers.get("Content-Length") === "0") {
        console.warn(`Missing or empty game image: ${imagePath}`);
        allImagesExist = false;
      }
    } catch (error) {
      console.warn(`Error checking game image ${imagePath}:`, error);
      allImagesExist = false;
    }
  }

  if (!allImagesExist) {
    console.info(
      "Some game background images are missing. Please check the README.md file in the public/assets/games directory for instructions on adding images."
    );
  }

  return allImagesExist;
};

/**
 * Helper function to get appropriate game icon based on game type
 * @param {string} gameType - Type of game
 * @returns {string} Icon emoji
 */
export const getGameIcon = (gameType) => {
  const icons = {
    code: "💻",
    math: "🧮",
    quiz: "🎮",
    default: "🎯",
  };

  return icons[gameType] || icons.default;
};

/**
 * Helper function to get appropriate color scheme based on game type
 * @param {string} gameType - Type of game
 * @returns {string} Tailwind CSS gradient classes
 */
export const getGameColorScheme = (gameType) => {
  const colors = {
    code: "from-blue-500 to-indigo-600",
    math: "from-green-500 to-teal-600",
    quiz: "from-purple-500 to-pink-600",
    default: "from-gray-500 to-gray-700",
  };

  return colors[gameType] || colors.default;
};

/**
 * Gets game background style with gradient overlay
 * @param {string} gameType - Type of game
 * @returns {string} CSS background style with gradient
 */
export const getGameBackground = (gameType) => {
  const backgrounds = {
    code: "linear-gradient(rgba(59, 130, 246, 0.8), rgba(67, 56, 202, 0.8)), url('/assets/games/code-bg.jpg')",
    math: "linear-gradient(rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8)), url('/assets/games/math-bg.jpg')",
    quiz: "linear-gradient(rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8)), url('/assets/games/quiz-bg.jpg')",
    default:
      "linear-gradient(to right, var(--color-primary), var(--color-primary-dark))",
  };

  return backgrounds[gameType] || backgrounds.default;
};

/**
 * Provides animation variants for framer-motion animations
 * @param {string} type - Type of animation
 * @returns {Object} Animation variant configs
 */
export const getAnimationVariants = (type) => {
  const variants = {
    popIn: {
      hidden: { opacity: 0, scale: 0.8 },
      show: {
        opacity: 1,
        scale: 1,
        transition: {
          type: "spring",
          duration: 0.5,
        },
      },
      exit: {
        opacity: 0,
        scale: 0.8,
        transition: {
          duration: 0.3,
        },
      },
    },
    slideIn: {
      hidden: { opacity: 0, x: -50 },
      show: {
        opacity: 1,
        x: 0,
        transition: {
          type: "spring",
          duration: 0.5,
        },
      },
      exit: {
        opacity: 0,
        x: 50,
        transition: {
          duration: 0.3,
        },
      },
    },
    fadeIn: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          duration: 0.5,
        },
      },
      exit: {
        opacity: 0,
        transition: {
          duration: 0.3,
        },
      },
    },
  };

  return variants[type] || variants.popIn;
};

/**
 * Get difficulty level information
 * @param {string} level - Difficulty level
 * @returns {Object} Difficulty information
 */
export const getDifficultyInfo = (level) => {
  const info = {
    easy: {
      label: "Easy",
      icon: "🟢",
      gradient: "from-green-500 to-green-600",
      pointMultiplier: 1,
    },
    medium: {
      label: "Medium",
      icon: "🟠",
      gradient: "from-orange-500 to-yellow-600",
      pointMultiplier: 2,
    },
    hard: {
      label: "Hard",
      icon: "🔴",
      gradient: "from-red-500 to-red-600",
      pointMultiplier: 3,
    },
  };

  return info[level] || info.medium;
};

/**
 * Get achievement badge based on score, game type and difficulty
 * @param {number} score - Score or percentage
 * @param {string} gameType - Type of game
 * @param {string} difficulty - Difficulty level
 * @returns {Object|null} Badge information or null if no badge earned
 */
export const getAchievementBadge = (score, gameType, difficulty = "medium") => {
  // Badge requirements based on game type
  const thresholds = {
    math: {
      easy: 70,
      medium: 60,
      hard: 50,
    },
    code: {
      easy: 80,
      medium: 70,
      hard: 60,
    },
    quiz: {
      easy: 80,
      medium: 70,
      hard: 60,
    },
  };

  const gameThresholds = thresholds[gameType] || thresholds.math;
  const difficultyThreshold =
    gameThresholds[difficulty] || gameThresholds.medium;

  // Don't award badge if below threshold
  if (score < difficultyThreshold) return null;

  // Badge list
  const badges = {
    math: [
      {
        name: "Mathematician",
        description: "Excellently completed math challenges",
        threshold: 90,
        icon: "🧮",
      },
      {
        name: "Math Master",
        description: "Achieved high score in math puzzles",
        threshold: 75,
        icon: "📊",
      },
      {
        name: "Problem Solver",
        description: "Completed math challenge successfully",
        threshold: difficultyThreshold,
        icon: "🔢",
      },
    ],
    code: [
      {
        name: "Coding Genius",
        description: "Brilliantly solved programming challenges",
        threshold: 90,
        icon: "💻",
      },
      {
        name: "Code Master",
        description: "Mastered programming skills",
        threshold: 75,
        icon: "⌨️",
      },
      {
        name: "Developer",
        description: "Completed programming challenges",
        threshold: difficultyThreshold,
        icon: "🖥️",
      },
    ],
    quiz: [
      {
        name: "Tech Expert",
        description: "Demonstrated deep technology knowledge",
        threshold: 90,
        icon: "🧠",
      },
      {
        name: "Computer Scientist",
        description: "Solid understanding of technology",
        threshold: 75,
        icon: "🔬",
      },
      {
        name: "Tech Enthusiast",
        description: "Basic understanding of technology",
        threshold: difficultyThreshold,
        icon: "📱",
      },
    ],
  };

  // Get badge list for game type
  const gameBadges = badges[gameType] || badges.math;

  // Find highest badge earned
  for (const badge of gameBadges) {
    if (score >= badge.threshold) {
      return badge;
    }
  }

  return null;
};

/**
 * Format time in seconds to mm:ss format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};
