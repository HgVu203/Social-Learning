import { useState, useEffect } from "react";
import { generateQuizQuestions } from "../../services/gptService.js";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { userService } from "../../services/userService";
import {
  getAnimationVariants,
  getAchievementBadge,
} from "../../utils/gameUtils";
import Confetti from "react-confetti";
import useSound from "use-sound";

const TechQuizPage = () => {
  const { theme } = useTheme();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  // Animation variants
  const popInVariants = getAnimationVariants("popIn");

  useEffect(() => {
    loadQuestions();
  }, [category, quizMode]);

  useEffect(() => {
    let timer;
    if (quizMode === "time" && timeLeft > 0 && !quizCompleted && !isLoading) {
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
  }, [timeLeft, quizCompleted, isLoading, quizMode]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const count = quizMode === "time" ? 30 : 10;
      const difficulty = quizMode === "challenge" ? "hard" : "medium";

      let categoryValue = category;
      if (category === "random") {
        // Chọn ngẫu nhiên một danh mục
        const randomCategories = categories.filter((c) => c.id !== "random");
        categoryValue =
          randomCategories[Math.floor(Math.random() * randomCategories.length)]
            .id;
      }

      const newQuestions = await generateQuizQuestions(
        count,
        categoryValue,
        difficulty
      );
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
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setIsLoading(false);
    }
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

  const changeCategory = async (newCategory) => {
    if (category !== newCategory) {
      setCategory(newCategory);
    }
  };

  const changeQuizMode = (mode) => {
    if (quizMode !== mode) {
      setQuizMode(mode);
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

  if (!currentQuestion && !quizCompleted) {
    return (
      <div className="text-center py-8 text-[var(--color-text-primary)]">
        <p className="text-xl font-semibold">No questions found.</p>
        <button
          onClick={loadQuestions}
          className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 focus:outline-none transition-all shadow-md"
        >
          Reload
        </button>
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
          className="bg-[var(--color-bg-secondary)] shadow-lg rounded-lg p-8 text-center border border-[var(--color-border)]"
        >
          <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
            Tech Quiz Results
          </h1>

          {badgeEarned && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg p-3 max-w-md mx-auto mb-6 border border-purple-200 dark:border-purple-800/30"
            >
              <div className="text-lg font-bold mb-1">🏆 Badge Earned!</div>
              <div className="font-medium">{badgeEarned.name}</div>
              <div className="text-sm">{badgeEarned.description}</div>
            </motion.div>
          )}

          <div className="mb-6">
            <div className="w-48 h-48 mx-auto relative">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#eee"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeDasharray={`${percentage}, 100`}
                />
                <defs>
                  <linearGradient id="gradient">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <text
                  x="18"
                  y="18.5"
                  className="text-5xl font-bold"
                  textAnchor="middle"
                  fill={theme === "dark" ? "#fff" : "#333"}
                >
                  {percentage}%
                </text>
              </svg>
            </div>
            <p className="text-xl font-semibold mt-4 text-[var(--color-text-primary)]">
              Score: {score} / {totalQuestions * 10}
            </p>
            <p className={`${color} mt-2 font-medium text-lg`}>{message}</p>

            {highestStreak >= 3 && (
              <p className="mt-2 text-orange-500 dark:text-orange-400">
                🔥 Highest streak: {highestStreak}
              </p>
            )}
          </div>

          {/* Thống kê câu hỏi */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
              Answer Statistics
            </h2>
            <div className="flex justify-center space-x-6">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {questionHistory.filter((q) => q.isCorrect).length}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Correct
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {questionHistory.filter((q) => !q.isCorrect).length}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Incorrect
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {questionHistory.length}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)]">
                  Total
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

        {/* History of questions */}
        {questionHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 bg-[var(--color-bg-secondary)] shadow-lg rounded-lg p-6 border border-[var(--color-border)]"
          >
            <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
              Question History
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {questionHistory.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.isCorrect
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
                  }`}
                >
                  <div className="font-medium text-sm">{item.question}</div>
                  <div className="mt-2 text-xs">
                    <span className="font-medium">Your answer:</span>{" "}
                    {item.userAnswer}
                  </div>
                  {!item.isCorrect && (
                    <div className="mt-1 text-xs">
                      <span className="font-medium">Correct answer:</span>{" "}
                      {item.correctAnswer}
                    </div>
                  )}
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
        className="flex justify-between items-center mb-6 bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--color-border)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="font-medium text-[var(--color-text-primary)]">
            {quizMode === "standard" && (
              <span>
                Question {currentQuestionIndex + 1}/{questions.length}
              </span>
            )}
            {quizMode === "time" && (
              <span>Question {currentQuestionIndex + 1}</span>
            )}
            {quizMode === "challenge" && (
              <span>
                Challenge {currentQuestionIndex + 1}/{questions.length}
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] mt-1 sm:mt-0 sm:ml-4">
            Topic: {categories.find((c) => c.id === category)?.name || category}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {quizMode === "time" && (
            <div
              className={`font-medium ${
                timeLeft <= 10
                  ? "text-red-500 animate-pulse"
                  : "text-[var(--color-text-primary)]"
              }`}
            >
              ⏱️ {timeLeft}s
            </div>
          )}

          <div className="font-semibold text-[var(--color-text-primary)] flex items-center">
            <svg
              className="w-5 h-5 mr-1 text-purple-500"
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
            {score}
          </div>

          {streak >= 2 && (
            <div className="px-2 py-1 bg-orange-500 text-white text-xs rounded-full animate-pulse">
              {streak}🔥
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
              className="bg-[var(--color-bg-secondary)] p-6 rounded-lg shadow-md border border-[var(--color-border)]"
            >
              <div className="mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full text-sm font-medium">
                    #{currentQuestionIndex + 1}
                  </div>

                  {quizMode === "challenge" && (
                    <div className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
                      🔥 Challenge
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-semibold mb-4 text-[var(--color-text-primary)]">
                  {currentQuestion.question}
                </h2>

                {!showHint && !isAnswered && (
                  <button
                    onClick={toggleHint}
                    className="text-purple-600 hover:text-purple-800 text-sm flex items-center mb-4"
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    Need hint?
                  </button>
                )}

                {showHint && !isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 mb-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg text-sm"
                  >
                    <div className="font-medium mb-1">💡 Hint:</div>
                    <p>
                      Think about{" "}
                      {category === "programming"
                        ? "basic programming principles"
                        : category === "database"
                        ? "database concepts"
                        : category === "networking"
                        ? "network protocols"
                        : category === "web"
                        ? "modern web technologies"
                        : category === "ai"
                        ? "AI algorithms and machine learning"
                        : "security-related concepts"}
                      .
                    </p>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 text-left rounded-lg border transition-all ${
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-medium ${
                            isAnswered &&
                            option === currentQuestion.correctAnswer
                              ? "bg-green-500 text-white"
                              : isAnswered && option === selectedAnswer
                              ? "bg-red-500 text-white"
                              : "bg-[var(--color-bg-primary)] border border-[var(--color-border)]"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span>{option}</span>

                        {isAnswered &&
                          option === currentQuestion.correctAnswer && (
                            <svg
                              className="w-5 h-5 ml-auto text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          )}

                        {isAnswered &&
                          option === selectedAnswer &&
                          option !== currentQuestion.correctAnswer && (
                            <svg
                              className="w-5 h-5 ml-auto text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {isAnswered && (
                <AnimatePresence>
                  <motion.div
                    variants={popInVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className={`p-4 rounded-lg mt-4 ${
                      isCorrect
                        ? "bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/30"
                        : "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/30"
                    }`}
                  >
                    <div className="font-medium">
                      {isCorrect ? (
                        <span>
                          ✓ Correct
                          {streak > 1 ? ` (${streak} in a row!)` : ""}
                        </span>
                      ) : (
                        <span>
                          ✗ Wrong! Correct answer:{" "}
                          {currentQuestion.correctAnswer}
                        </span>
                      )}
                    </div>

                    {(showExplanation || !isCorrect) && (
                      <div className="mt-2 text-sm">
                        <div className="font-medium">Explanation:</div>
                        <p>{currentQuestion.explanation}</p>
                      </div>
                    )}

                    {isCorrect && !showExplanation && (
                      <button
                        onClick={() => setShowExplanation(true)}
                        className="mt-2 text-sm underline"
                      >
                        View explanation
                      </button>
                    )}

                    {quizMode !== "time" && (
                      <div className="mt-4 text-center">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleNextQuestion}
                          className={`px-4 py-2 ${
                            isCorrect
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)]"
                          } rounded-lg focus:outline-none transition-colors`}
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
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="md:col-span-1">
          <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg shadow-md border border-[var(--color-border)] mb-4">
            <h3 className="font-medium mb-3 text-[var(--color-text-primary)]">
              Quiz Mode
            </h3>

            <div className="space-y-2">
              {quizModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() =>
                    quizCompleted ? changeQuizMode(mode.id) : null
                  }
                  className={`w-full p-2 text-left rounded-lg border ${
                    quizMode === mode.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                      : "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                  } text-sm ${
                    quizCompleted ? "" : "opacity-70 cursor-not-allowed"
                  }`}
                  disabled={!quizCompleted}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{mode.icon}</span>
                    <span>{mode.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <h3 className="font-medium mb-3 mt-6 text-[var(--color-text-primary)]">
              Topic
            </h3>

            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() =>
                    quizCompleted ? changeCategory(cat.id) : null
                  }
                  className={`w-full p-2 text-left rounded-lg border ${
                    category === cat.id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                      : "border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]"
                  } text-sm ${
                    quizCompleted ? "" : "opacity-70 cursor-not-allowed"
                  }`}
                  disabled={!quizCompleted}
                >
                  <div className="flex items-center">
                    <span className="mr-2">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                confirm("Are you sure you want to quit the current quiz?") &&
                finishQuiz()
              }
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none transition-colors"
            >
              End Quiz
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechQuizPage;
