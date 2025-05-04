import { useState, useEffect, useRef } from "react";
import { generateMathProblems } from "../../services/gptService";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../../services/userService";
import {
  getAnimationVariants,
  formatTime,
  getDifficultyInfo,
  getAchievementBadge,
} from "../../utils/gameUtils";
import Confetti from "react-confetti";
import useSound from "use-sound";

const MathPuzzlePage = () => {
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [level, setLevel] = useState("easy");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameActive, setGameActive] = useState(false);
  const [pointsAdded, setPointsAdded] = useState(false);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameMode, setGameMode] = useState("time"); // "time" or "practice"
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    totalTime: 0,
    averageResponseTime: 0,
  });
  const [challengeMode, setChallengeMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("basic");
  const answerInputRef = useRef(null);

  // Sounds
  const [playCorrect] = useSound("/assets/sounds/correct.mp3", { volume: 0.5 });
  const [playWrong] = useSound("/assets/sounds/wrong.mp3", { volume: 0.5 });
  const [playSuccess] = useSound("/assets/sounds/success.mp3", { volume: 0.5 });
  const [playTick] = useSound("/assets/sounds/tick.mp3", { volume: 0.2 });

  // Timer for response time tracking
  const startTimeRef = useRef(null);

  // Categories of math problems
  const categories = [
    { id: "basic", name: "Basic Arithmetic" },
    { id: "algebra", name: "Algebra" },
    { id: "geometry", name: "Geometry" },
    { id: "statistics", name: "Statistics" },
  ];

  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0 && gameMode === "time") {
      timer = window.setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        if (timeLeft <= 10) {
          playTick();
        }
      }, 1000);
    } else if (timeLeft === 0 && gameActive && gameMode === "time") {
      endGame();
    }
    return () => window.clearTimeout(timer);
  }, [timeLeft, gameActive, gameMode]);

  useEffect(() => {
    if (gameActive && answerInputRef.current) {
      answerInputRef.current.focus();
      startTimeRef.current = Date.now();
    }
  }, [currentProblemIndex, gameActive]);

  const loadProblems = async () => {
    setIsLoading(true);
    try {
      const newProblems = await generateMathProblems({
        count: gameMode === "time" ? 20 : 10,
        level: level,
        category: selectedCategory,
      });

      setProblems(newProblems);
      setCurrentProblemIndex(0);
      setUserAnswer("");
      setFeedback(null);
      setShowExplanation(false);
      return true;
    } catch (error) {
      console.error("Error loading math problems:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    setIsLoading(true);

    // Load problems with current options
    const success = await loadProblems();
    if (success) {
      setScore(0);
      setStreak(0);
      setHighestStreak(0);
      setTimeLeft(gameMode === "time" ? 60 : Infinity);
      setGameActive(true);
      setCurrentProblemIndex(0);
      setUserAnswer("");
      setFeedback(null);
      setShowExplanation(false);
      setPointsAdded(false);
      setStats({
        correct: 0,
        wrong: 0,
        totalTime: 0,
        averageResponseTime: 0,
      });
      startTimeRef.current = Date.now();
    }
  };

  const endGame = async () => {
    setGameActive(false);

    if (score > 0 && !pointsAdded) {
      try {
        // Calculate bonus points based on streak and level
        const levelMultiplier =
          level === "easy" ? 1 : level === "medium" ? 1.5 : 2;
        const streakBonus = highestStreak >= 5 ? highestStreak : 0;
        const totalPoints = Math.floor(score * levelMultiplier + streakBonus);

        // Determine whether to add a badge
        const badge = getAchievementBadge(score, "math", level);

        // Call API to update points - no need for authentication check because ProtectedRoute is in place
        try {
          await userService.updatePoints({
            points: totalPoints,
            badge: badge?.name,
          });

          if (badge) {
            setShowConfetti(true);
            playSuccess();
            setTimeout(() => setShowConfetti(false), 5000);
          }
        } catch (error) {
          console.error("Error updating points:", error);
        }

        setPointsAdded(true);
      } catch (error) {
        console.error("Error calculating points:", error);
      }
    }
  };

  const currentProblem = problems[currentProblemIndex];

  const handleAnswerChange = (e) => {
    setUserAnswer(e.target.value);
  };

  const checkAnswer = () => {
    if (!currentProblem || !gameActive) return;

    const responseTime = (Date.now() - startTimeRef.current) / 1000;
    const correctAnswer = String(currentProblem.correctAnswer);
    const normalizedUserAnswer = userAnswer.trim();
    const isCorrect = normalizedUserAnswer === correctAnswer;

    // Update game stats
    setStats((prev) => {
      const newStats = {
        correct: isCorrect ? prev.correct + 1 : prev.correct,
        wrong: !isCorrect ? prev.wrong + 1 : prev.wrong,
        totalTime: prev.totalTime + responseTime,
        averageResponseTime: 0, // Will be calculated below
      };
      const totalAnswers = newStats.correct + newStats.wrong;
      newStats.averageResponseTime =
        totalAnswers > 0 ? newStats.totalTime / totalAnswers : 0;
      return newStats;
    });

    if (isCorrect) {
      playCorrect();
      setFeedback({
        isCorrect: true,
        message:
          streak >= 2 ? `Correct! ${streak + 1} in a row! 🔥` : "Correct!",
      });

      // Increase points with bonus for streak
      const streakMultiplier = Math.min(streak * 0.1, 0.5);
      const basePoints = level === "easy" ? 10 : level === "medium" ? 15 : 20;
      const pointsWithBonus = Math.floor(basePoints * (1 + streakMultiplier));

      setScore(score + pointsWithBonus);

      // Increase streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highestStreak) {
        setHighestStreak(newStreak);
      }

      // Move to the next question after 1 second
      setTimeout(() => {
        if (currentProblemIndex < problems.length - 1) {
          setCurrentProblemIndex((prevIndex) => prevIndex + 1);
          setUserAnswer("");
          setFeedback(null);
          setShowExplanation(false);
          startTimeRef.current = Date.now();
        } else {
          // End the game if all questions have been completed
          endGame();
        }
      }, 1000);
    } else {
      playWrong();
      setFeedback({
        isCorrect: false,
        message: `Incorrect. The correct answer is: ${correctAnswer}`,
      });
      setShowExplanation(true);
      setStreak(0); // Reset streak when wrong
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  };

  const toggleChallengeMode = () => {
    setChallengeMode(!challengeMode);
    if (!challengeMode) {
      // When challenge mode is turned on, automatically select hard level
      setLevel("hard");
    }
  };

  const difficultyInfo = getDifficultyInfo(level);
  const containerVariants = getAnimationVariants("container");
  const itemVariants = getAnimationVariants("item");
  const popInVariants = getAnimationVariants("popIn");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-[var(--color-text-primary)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
        <p className="ml-4 text-lg font-semibold">Loading math puzzles...</p>
      </div>
    );
  }

  if (gameActive && !currentProblem) {
    return (
      <div className="text-center py-8 text-[var(--color-text-primary)]">
        <p className="text-xl font-semibold">No puzzles found.</p>
        <button
          onClick={loadProblems}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none transition-all shadow-md"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {showConfetti && (
        <Confetti colors={["#10B981", "#059669", "#A7F3D0", "#6EE7B7"]} />
      )}

      {!gameActive ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto"
        >
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-teal-600">
            Math Puzzles
          </h1>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            Challenge your math skills with fun and engaging puzzles!
          </p>

          <motion.div
            className="mb-6 bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-md border border-[var(--color-border)]"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                htmlFor="gameMode"
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 text-center"
              >
                Select game mode:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setGameMode("time")}
                  className={`p-3 cursor-pointer rounded-lg border border-[var(--color-border)] transition-all ${
                    gameMode === "time"
                      ? "bg-green-100 dark:bg-green-900 border-green-500"
                      : "bg-[var(--color-bg-tertiary)]"
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span className="mr-2">⏱️</span>
                    <span>Time Mode</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] text-center">
                    Solve as many as possible in 60 seconds
                  </p>
                </button>
                <button
                  onClick={() => setGameMode("practice")}
                  className={`p-3 cursor-pointer rounded-lg border border-[var(--color-border)] transition-all ${
                    gameMode === "practice"
                      ? "bg-blue-100 dark:bg-blue-900 border-blue-500"
                      : "bg-[var(--color-bg-tertiary)]"
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span>Practice Mode</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] text-center">
                    No time limit, focus on learning
                  </p>
                </button>
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={itemVariants}>
              <label
                htmlFor="category"
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 text-center"
              >
                Choose topic:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-2 cursor-pointer rounded-lg border border-[var(--color-border)] transition-all ${
                      selectedCategory === cat.id
                        ? "bg-green-100 dark:bg-green-900 border-green-500"
                        : "bg-[var(--color-bg-tertiary)]"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className="text-center">{cat.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={itemVariants}>
              <label
                htmlFor="level"
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 text-center"
              >
                Select difficulty:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["easy", "medium", "hard"].map((difficulty) => {
                  const info = getDifficultyInfo(difficulty);
                  return (
                    <button
                      key={difficulty}
                      onClick={() => setLevel(difficulty)}
                      className={`p-3 cursor-pointer rounded-lg border border-[var(--color-border)] transition-all ${
                        level === difficulty
                          ? `bg-${info.color} bg-opacity-20 border-${info.color}`
                          : "bg-[var(--color-bg-tertiary)]"
                      }`}
                      disabled={challengeMode && difficulty !== "hard"}
                    >
                      <div className="flex items-center justify-center mb-1">
                        <span>{info.label}</span>
                      </div>
                      <p className="text-xs text-[var(--color-text-secondary)] text-center">
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-2 mt-4">
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={challengeMode}
                  onChange={toggleChallengeMode}
                  className="form-checkbox rounded text-green-500 focus:ring-green-500 mr-2"
                />
                <span className="text-[var(--color-text-primary)] text-center">
                  Enable challenge mode (for experts only)
                </span>
              </label>
              {challengeMode && (
                <p className="text-xs text-yellow-500 mt-1 text-center">
                  ⚠️ Challenge mode automatically sets difficulty to Hard and
                  uses more complex questions
                </p>
              )}
            </motion.div>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 focus:outline-none transition-all shadow-lg font-bold text-lg w-full max-w-xs mx-auto"
          >
            Start Game
          </motion.button>
        </motion.div>
      ) : (
        <div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex justify-between items-center mb-6 bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--color-border)]"
          >
            <div className="text-lg font-semibold flex items-center">
              <svg
                className="w-6 h-6 mr-2 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
              Score: <span className="text-green-600 ml-1">{score}</span>
              {streak >= 2 && (
                <span className="ml-3 px-2 py-1 bg-orange-500 text-white text-sm rounded-full animate-pulse">
                  Streak: {streak} 🔥
                </span>
              )}
            </div>

            {gameMode === "time" && (
              <div
                className={`text-lg font-semibold ${
                  timeLeft <= 10
                    ? "text-red-500 animate-pulse"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}

            <div className="text-sm">
              <span className="text-[var(--color-text-secondary)]">
                Question {currentProblemIndex + 1}/{problems.length}
              </span>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentProblemIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-md mb-6 border border-[var(--color-border)]"
            >
              <div className="mb-4">
                <div className="flex justify-between">
                  <div>
                    <span
                      className={`px-2 py-1 rounded text-sm text-white bg-gradient-to-r ${difficultyInfo.gradient}`}
                    >
                      {difficultyInfo.icon} {difficultyInfo.label}
                    </span>
                  </div>
                  <div>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                      {selectedCategory}
                    </span>
                    {stats.correct + stats.wrong > 0 && (
                      <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
                        {Math.round(
                          (stats.correct / (stats.correct + stats.wrong)) * 100
                        )}
                        % correct
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-semibold mb-6 text-center text-[var(--color-text-primary)]">
                {currentProblem.question}
              </h2>

              {currentProblem.options ? (
                <div className="space-y-3 mb-6">
                  {currentProblem.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setUserAnswer(option);
                        setTimeout(() => checkAnswer(), 200);
                      }}
                      className={`w-full p-3 text-left rounded-lg border transition-all ${
                        userAnswer === option
                          ? "border-green-500 bg-green-50 dark:bg-green-900"
                          : "border-[var(--color-border)] bg-[var(--color-bg-tertiary)]"
                      } hover:border-green-500`}
                      disabled={feedback !== null}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] flex items-center justify-center mr-3 font-medium">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="flex space-x-4 mb-6">
                  <input
                    ref={answerInputRef}
                    type="text"
                    value={userAnswer}
                    onChange={handleAnswerChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your answer..."
                    className="flex-1 p-3 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                    disabled={feedback !== null}
                    autoFocus
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkAnswer}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 focus:outline-none transition-all shadow-md font-medium disabled:opacity-50"
                    disabled={userAnswer.trim() === "" || feedback !== null}
                  >
                    Check
                  </motion.button>
                </div>
              )}

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    variants={popInVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className={`p-4 rounded-lg ${
                      feedback.isCorrect
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                    }`}
                  >
                    <p className="font-medium">{feedback.message}</p>

                    {feedback.isCorrect ? (
                      <div className="mt-2 text-sm">
                        <p>+ {score} points</p>
                        {streak >= 2 && <p>Streak: {streak}x 🔥</p>}
                      </div>
                    ) : (
                      showExplanation && (
                        <div className="mt-2">
                          <p className="font-medium text-sm">Explanation:</p>
                          <p className="text-sm mt-1">
                            {currentProblem.explanation}
                          </p>
                          <button
                            onClick={() => {
                              setCurrentProblemIndex(
                                (prevIndex) => prevIndex + 1
                              );
                              setUserAnswer("");
                              setFeedback(null);
                              setShowExplanation(false);
                              startTimeRef.current = Date.now();
                            }}
                            className="mt-3 px-4 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded hover:bg-[var(--color-border)] transition-colors text-sm"
                          >
                            Continue
                          </button>
                        </div>
                      )
                    )}

                    {feedback.isCorrect &&
                      currentProblemIndex < problems.length - 1 && (
                        <div className="mt-3 text-center">
                          <button
                            onClick={() => {
                              setCurrentProblemIndex(
                                (prevIndex) => prevIndex + 1
                              );
                              setUserAnswer("");
                              setFeedback(null);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none transition-colors"
                          >
                            Next Question
                          </button>
                        </div>
                      )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-center"
          >
            <button
              onClick={() => endGame()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none transition-colors"
            >
              End Game
            </button>

            {/* Game statistics display */}
            {gameMode === "practice" && stats.correct + stats.wrong > 0 && (
              <div className="mt-6 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] inline-block">
                <h3 className="text-lg font-semibold mb-2">Statistics:</h3>
                <div className="flex space-x-4 text-sm">
                  <div className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                    ✓ Correct: {stats.correct}
                  </div>
                  <div className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                    ✗ Wrong: {stats.wrong}
                  </div>
                  <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                    ⏱️ Average: {stats.averageResponseTime.toFixed(1)}s
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MathPuzzlePage;
