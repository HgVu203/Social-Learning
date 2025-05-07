import { useState, useEffect } from "react";
import { generateQuizQuestions } from "../../services/ollamaService.js";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../../services/userService";
import {
  getAchievementBadge,
  getGameIcon,
  getDifficultyInfo,
  getAnimationVariants,
} from "../../utils/gameUtils";
import Confetti from "react-confetti";
import useSound from "use-sound";

const TechQuizPage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState("programming");
  const [showExplanation, setShowExplanation] = useState(false);
  const [pointsAdded, setPointsAdded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [badgeEarned, setBadgeEarned] = useState(null);
  const [quizMode, setQuizMode] = useState("standard"); // "standard", "time", "challenge"
  const [timeLeft, setTimeLeft] = useState(60);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");

  // Sounds
  const [playCorrect] = useSound("/assets/sounds/correct.mp3", { volume: 0.5 });
  const [playWrong] = useSound("/assets/sounds/wrong.mp3", { volume: 0.5 });
  const [playSuccess] = useSound("/assets/sounds/success.mp3", { volume: 0.5 });
  const [playTick] = useSound("/assets/sounds/tick.mp3", { volume: 0.2 });

  const categories = [
    { id: "programming", name: "Programming", icon: "💻" },
    { id: "database", name: "Databases", icon: "🗄️" },
    { id: "networking", name: "Computer Networks", icon: "🌐" },
    { id: "web", name: "Web Technologies", icon: "🔌" },
    { id: "ai", name: "Artificial Intelligence", icon: "🤖" },
    { id: "cybersecurity", name: "Cybersecurity", icon: "🔒" },
    { id: "random", name: "Random Mix", icon: "🎲" },
  ];

  const quizModes = [
    {
      id: "standard",
      name: "Standard",
      description: "Answer a fixed set of questions",
      icon: "📚",
    },
    {
      id: "time",
      name: "Time",
      description: "Answer as many as possible in 60 seconds",
      icon: "⏱️",
    },
    {
      id: "challenge",
      name: "Challenge",
      description: "Harder questions with higher rewards",
      icon: "🏆",
    },
  ];

  const difficulties = [
    { id: "easy", name: "Easy" },
    { id: "medium", name: "Medium" },
    { id: "hard", name: "Hard" },
  ];

  // Get quiz icon
  const quizIcon = getGameIcon("quiz");

  // Animation variants
  const containerVariants = getAnimationVariants("container");
  const itemVariants = getAnimationVariants("item");

  useEffect(() => {
    let timer;
    if (quizMode === "time" && timeLeft > 0 && !quizCompleted && gameActive) {
      timer = window.setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        if (timeLeft <= 10) {
          playTick();
        }
      }, 1000);
    } else if (quizMode === "time" && timeLeft === 0 && !quizCompleted) {
      finishQuiz();
    }
    return () => window.clearTimeout(timer);
  }, [timeLeft, quizCompleted, gameActive, quizMode]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const count = quizMode === "time" ? 30 : 10;

      // If challenge mode is selected, automatically set difficulty to hard
      const difficultyValue = quizMode === "challenge" ? "hard" : difficulty;

      let categoryValue = category;
      if (category === "random") {
        // Choose a random category
        const randomCategories = categories.filter((c) => c.id !== "random");
        categoryValue =
          randomCategories[Math.floor(Math.random() * randomCategories.length)]
            .id;
      }

      // Get user data from API or use default values
      const userData = await userService.getCurrentUser().catch(() => ({
        rank: "Rookie",
        points: 0,
      }));

      const newQuestions = await generateQuizQuestions({
        category: categoryValue,
        count: count,
        userRank: userData.rank || "Rookie",
        points: userData.points || 0,
        level: difficultyValue,
      });

      setQuestions(newQuestions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setScore(0);
      setTotalQuestions(newQuestions.length);
      setQuizCompleted(false);
      setShowExplanation(false);
      setPointsAdded(false);
      setTimeLeft(quizMode === "time" ? 60 : Infinity);
      setStreak(0);
      setHighestStreak(0);
      setQuestionHistory([]);
      setShowHint(false);
      setBadgeEarned(null);
      setShowConfetti(false);
      setGameActive(true);

      return true;
    } catch (error) {
      console.error("Error loading questions:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    await loadQuestions();
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerSelect = (answer) => {
    if (isAnswered) return;

    setSelectedAnswer(answer);
    setIsAnswered(true);

    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    // Lưu lịch sử câu hỏi
    setQuestionHistory((prev) => [
      ...prev,
      {
        question: currentQuestion.question,
        userAnswer: answer,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: correct,
      },
    ]);

    if (correct) {
      playCorrect();
      // Tính điểm với hệ số streak
      const streakMultiplier = Math.min(streak * 0.1, 0.5);
      const difficultyMultiplier = quizMode === "challenge" ? 2 : 1;
      const points = Math.floor(
        10 * (1 + streakMultiplier) * difficultyMultiplier
      );

      setScore(score + points);

      // Tăng streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highestStreak) {
        setHighestStreak(newStreak);
      }
    } else {
      playWrong();
      setStreak(0); // Reset streak khi trả lời sai
    }

    // Tự động chuyển sang câu tiếp theo sau vài giây trong chế độ thời gian
    if (quizMode === "time") {
      setTimeout(
        () => {
          if (currentQuestionIndex < questions.length - 1) {
            handleNextQuestion();
          }
        },
        correct ? 1000 : 1500
      );
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setShowExplanation(false);
      setShowHint(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizCompleted(true);

    // Cập nhật điểm cho người dùng khi hoàn thành quiz
    if (score > 0 && !pointsAdded) {
      try {
        // Tính toán điểm dựa vào số câu trả lời đúng và các nhân tố
        const percentage = Math.round((score / (totalQuestions * 10)) * 100);
        const streakBonus = highestStreak >= 5 ? highestStreak * 2 : 0;
        const modeMultiplier =
          quizMode === "challenge" ? 1.5 : quizMode === "time" ? 1.2 : 1;
        const totalPoints = Math.floor(score * modeMultiplier + streakBonus);

        // Xác định có nên thêm huy hiệu hay không
        const badge = getAchievementBadge(
          percentage,
          "quiz",
          quizMode === "challenge" ? "hard" : "medium"
        );

        // Gọi API cập nhật điểm - không cần kiểm tra xác thực vì đã có ProtectedRoute
        try {
          await userService.updatePoints({
            points: totalPoints,
            badge: badge?.name,
          });

          if (badge) {
            setBadgeEarned(badge);
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

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizCompleted(false);
    setShowExplanation(false);
    setPointsAdded(false);
    setTimeLeft(quizMode === "time" ? 60 : Infinity);
    setStreak(0);
    setHighestStreak(0);
    setQuestionHistory([]);
    setShowHint(false);
    setBadgeEarned(null);
    setShowConfetti(false);
  };

  const changeDifficulty = (newDifficulty) => {
    if (difficulty !== newDifficulty) {
      setDifficulty(newDifficulty);
    }
  };

  const changeCategory = (newCategory) => {
    if (category !== newCategory) {
      setCategory(newCategory);
    }
  };

  const changeQuizMode = (mode) => {
    if (quizMode !== mode) {
      setQuizMode(mode);
      // If challenge mode is selected, automatically set difficulty to hard
      if (mode === "challenge") {
        setDifficulty("hard");
      }
    }
  };

  const toggleHint = () => {
    setShowHint(!showHint);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-[var(--color-text-primary)]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        <p className="ml-4 text-lg font-semibold">Loading questions...</p>
      </div>
    );
  }

  if (!gameActive && !quizCompleted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto"
        >
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Tech Quiz
          </h1>
          <p className="mb-6 text-[var(--color-text-secondary)]">
            Test your knowledge with questions on various technology topics!
          </p>

          <motion.div
            className="mb-6 bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md border border-[var(--color-border)]"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                htmlFor="quizMode"
                className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 text-center"
              >
                Select quiz mode:
              </label>
              <div className="grid grid-cols-1 gap-2">
                {quizModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => changeQuizMode(mode.id)}
                    className={`p-3 cursor-pointer rounded-lg border transition-all ${
                      quizMode === mode.id
                        ? "bg-purple-100 dark:bg-purple-900 border-purple-500"
                        : "bg-[var(--color-bg-tertiary)] border-[var(--color-border)]"
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <span className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white flex items-center justify-center mr-2">
                        {mode.icon}
                      </span>
                      <div>
                        <div className="font-medium text-left">{mode.name}</div>
                        <div className="text-xs text-[var(--color-text-secondary)] text-left">
                          {mode.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {quizMode !== "challenge" && (
              <motion.div className="mb-4" variants={itemVariants}>
                <label
                  htmlFor="difficulty"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-2 text-center"
                >
                  Select difficulty:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map((diff) => {
                    const info = getDifficultyInfo(diff.id);
                    return (
                      <button
                        key={diff.id}
                        onClick={() => changeDifficulty(diff.id)}
                        className={`p-3 cursor-pointer rounded-lg border transition-all ${
                          difficulty === diff.id
                            ? diff.id === "easy"
                              ? "bg-green-100 dark:bg-green-900/30 border-green-500"
                              : diff.id === "medium"
                              ? "bg-orange-100 dark:bg-orange-900/30 border-orange-500"
                              : "bg-red-100 dark:bg-red-900/30 border-red-500"
                            : "bg-[var(--color-bg-tertiary)] border-[var(--color-border)]"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="mb-1">{info.icon}</span>
                          <span className="text-center">{diff.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

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
                    onClick={() => changeCategory(cat.id)}
                    className={`p-2 cursor-pointer rounded-lg border transition-all ${
                      category === cat.id
                        ? "bg-purple-100 dark:bg-purple-900 border-purple-500"
                        : "bg-[var(--color-bg-tertiary)] border-[var(--color-border)]"
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white flex items-center justify-center mr-2">
                        {cat.icon}
                      </span>
                      <span className="text-sm">{cat.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {quizMode === "challenge" && (
              <motion.div
                variants={itemVariants}
                className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg"
              >
                <p className="text-yellow-800 dark:text-yellow-300 text-sm flex items-center">
                  <span className="mr-2">⚠️</span>
                  Challenge mode uses harder questions and automatically sets
                  difficulty to Hard
                </p>
              </motion.div>
            )}
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 focus:outline-none transition-all shadow-lg font-bold text-lg w-full max-w-xs mx-auto"
          >
            Start Quiz
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!currentQuestion && !quizCompleted && gameActive) {
    return (
      <div className="text-center py-8 text-[var(--color-text-primary)]">
        <p className="text-xl font-semibold">No questions found.</p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={loadQuestions}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 focus:outline-none transition-all shadow-md"
        >
          Reload
        </motion.button>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / (totalQuestions * 10)) * 100);
    let message = "";
    let color = "";
    if (percentage >= 90) {
      message = "Excellent! You are truly an expert!";
      color = "text-green-600 dark:text-green-400";
    } else if (percentage >= 70) {
      message = "Very good! You have solid knowledge!";
      color = "text-blue-600 dark:text-blue-400";
    } else if (percentage >= 50) {
      message = "Pretty good! You have a basic understanding.";
      color = "text-yellow-600 dark:text-yellow-400";
    } else {
      message = "Keep learning to improve your knowledge!";
      color = "text-red-600 dark:text-red-400";
    }

    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {showConfetti && (
          <Confetti colors={["#8B5CF6", "#EC4899", "#DDD6FE", "#F9A8D4"]} />
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-[var(--color-bg-secondary)] shadow-lg rounded-xl p-8 text-center border border-[var(--color-border)]"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl mb-4">
              {quizIcon}
            </div>

            <h2 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-600">
              Quiz Completed!
            </h2>

            <div className="max-w-md mx-auto">
              <div className="mb-6 mt-4 flex flex-col items-center">
                <div className="text-3xl font-extrabold mb-2">
                  {score}/{totalQuestions * 10}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-600 h-4 rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className={`text-lg font-medium ${color}`}>{message}</div>
              </div>

              {badgeEarned && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 1,
                  }}
                  className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-xl"
                >
                  <div className="flex items-center justify-center">
                    <span className="text-3xl mr-3">
                      {badgeEarned.icon || "🏆"}
                    </span>
                    <div className="text-left">
                      <h3 className="font-bold text-yellow-800 dark:text-yellow-300">
                        {badgeEarned.name} Badge Earned!
                      </h3>
                      <p className="text-yellow-700 dark:text-yellow-400 text-sm">
                        {badgeEarned.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {streak >= 3 && (
                <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-blue-800 dark:text-blue-300 font-medium">
                    <span className="text-xl">🔥</span> You had a streak of{" "}
                    <span className="font-bold">{highestStreak}</span> correct
                    answers!
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartQuiz}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 focus:outline-none transition-all shadow-md font-medium"
              >
                Play Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  setCategory(
                    categories[Math.floor(Math.random() * categories.length)].id
                  )
                }
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 focus:outline-none transition-all shadow-md font-medium"
              >
                Different Topic
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => (window.location.href = "/game/math-puzzle")}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 focus:outline-none transition-all shadow-md font-medium md:col-span-2"
              >
                Try Math Puzzle
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* History of questions */}
        {questionHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 bg-[var(--color-bg-secondary)] shadow-md rounded-xl p-6 border border-[var(--color-border)]"
          >
            <h3 className="text-lg font-bold mb-4 text-[var(--color-text-primary)]">
              Question History
            </h3>
            <div className="space-y-4">
              {questionHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.isCorrect
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex items-start">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                        item.isCorrect
                          ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                          : "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {item.isCorrect ? "✓" : "✗"}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text-primary)]">
                        {item.question}
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          item.isCorrect
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        Your answer: {item.selectedAnswer}
                      </p>
                      {!item.isCorrect && (
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                          Correct answer: {item.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center mb-6 bg-[var(--color-bg-secondary)] p-4 rounded-xl shadow-md border border-[var(--color-border)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="font-medium text-[var(--color-text-primary)] flex items-center">
            {quizMode === "standard" && (
              <span className="flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white mr-2">
                  {currentQuestionIndex + 1}
                </span>
                <span>of {questions.length}</span>
              </span>
            )}
            {quizMode === "time" && (
              <span className="flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white mr-2">
                  {currentQuestionIndex + 1}
                </span>
              </span>
            )}
            {quizMode === "challenge" && (
              <span className="flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center text-white mr-2">
                  {currentQuestionIndex + 1}
                </span>
                <span>of {questions.length}</span>
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] mt-1 sm:mt-0 sm:ml-4 flex items-center">
            <span className="mr-1">
              {categories.find((c) => c.id === category)?.icon}
            </span>
            <span>
              {categories.find((c) => c.id === category)?.name || category}
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              {
                getDifficultyInfo(
                  quizMode === "challenge" ? "hard" : difficulty
                ).label
              }
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {quizMode === "time" && (
            <div
              className={`px-3 py-1 rounded-full font-medium flex items-center ${
                timeLeft <= 10
                  ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timeLeft}s
            </div>
          )}

          <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full font-medium flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {score}
          </div>

          {streak >= 2 && (
            <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-full font-medium flex items-center">
              <span className="mr-1">🔥</span>
              {streak}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-md border border-[var(--color-border)]"
            >
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full text-sm font-medium">
                    {quizIcon} Quiz Question
                  </div>

                  {quizMode === "challenge" && (
                    <div className="px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full text-sm font-medium flex items-center">
                      <span className="mr-1">🔥</span>
                      Challenge
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-semibold mb-6 text-[var(--color-text-primary)]">
                  {currentQuestion.question}
                </h2>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 text-left rounded-xl border transition-all ${
                        isAnswered && option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : isAnswered &&
                            option === selectedAnswer &&
                            option !== currentQuestion.correctAnswer
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : selectedAnswer === option
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                          : "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:border-purple-500"
                      } disabled:opacity-70`}
                      disabled={isAnswered}
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 flex-shrink-0 rounded-full mr-3 flex items-center justify-center text-white font-medium bg-gradient-to-r from-purple-500 to-pink-600">
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {isAnswered && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className={`mt-6 p-4 rounded-xl ${
                        isCorrect
                          ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                          : "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start">
                        <div
                          className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white mr-3 ${
                            isCorrect ? "bg-green-500" : "bg-red-500"
                          }`}
                        >
                          {isCorrect ? "✓" : "✗"}
                        </div>
                        <div>
                          <p
                            className={`font-medium ${
                              isCorrect
                                ? "text-green-800 dark:text-green-300"
                                : "text-red-800 dark:text-red-300"
                            }`}
                          >
                            {isCorrect
                              ? "Correct!"
                              : `Incorrect. The correct answer is: ${currentQuestion.correctAnswer}`}
                          </p>
                          {showExplanation && currentQuestion.explanation && (
                            <div className="mt-2">
                              <p className="text-[var(--color-text-secondary)] font-medium text-sm">
                                Explanation:
                              </p>
                              <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                                {currentQuestion.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {currentQuestion.explanation && !showExplanation && (
                        <button
                          onClick={() => setShowExplanation(true)}
                          className="mt-3 text-sm underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          Show explanation
                        </button>
                      )}

                      {quizMode !== "time" && (
                        <div className="mt-4 text-center">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleNextQuestion}
                            className={`px-6 py-3 rounded-lg focus:outline-none transition-all font-medium text-white bg-gradient-to-r ${
                              isCorrect
                                ? "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                                : "from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            }`}
                          >
                            {currentQuestionIndex < questions.length - 1
                              ? "Next Question"
                              : "See Results"}
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="md:col-span-1">
          <div className="bg-[var(--color-bg-secondary)] p-4 rounded-xl shadow-md border border-[var(--color-border)] mb-4">
            <h3 className="font-medium mb-3 text-[var(--color-text-primary)]">
              Quiz Stats
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Difficulty:
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {
                    getDifficultyInfo(
                      quizMode === "challenge" ? "hard" : difficulty
                    ).icon
                  }{" "}
                  {
                    getDifficultyInfo(
                      quizMode === "challenge" ? "hard" : difficulty
                    ).label
                  }
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Mode:
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {quizModes.find((m) => m.id === quizMode)?.icon}{" "}
                  {quizModes.find((m) => m.id === quizMode)?.name}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Score:
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {score}/{totalQuestions * 10}
                </span>
              </div>

              {streak > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    Current Streak:
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    🔥 {streak}
                  </span>
                </div>
              )}
            </div>

            {currentQuestion?.hint && (
              <div className="mt-6">
                <button
                  onClick={toggleHint}
                  className="w-full p-3 flex items-center justify-center rounded-lg border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
                >
                  <span className="mr-2">💡</span>
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>

                {showHint && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 text-sm bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                  >
                    {currentQuestion.hint}
                  </motion.div>
                )}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to end this quiz?")) {
                    finishQuiz();
                  }
                }}
                className="w-full p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
              >
                End Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechQuizPage;
