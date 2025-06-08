import { useEffect } from "react";
import GameCard from "../../components/common/GameCard";
import { motion } from "framer-motion";
import {
  checkGameImages,
  getGameBackground,
  getGameColorScheme,
  getGameIcon,
} from "../../utils/gameUtils";
import { useTranslation } from "react-i18next";

const GamesPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    // Check if game images exist and log a message if needed
    checkGameImages();
  }, []);

  const games = [
    {
      id: "code-challenge",
      title: t("game.codingChallenge"),
      path: "/game/code-challenge",
      imageUrl: "/assets/games/code-challenge.jpg",
      color: getGameColorScheme("code"),
      icon: getGameIcon("code"),
      bgStyle: getGameBackground("code"),
    },
    {
      id: "math-puzzle",
      title: t("game.mathPuzzles"),
      path: "/game/math-puzzle",
      imageUrl: "/assets/games/math-puzzle.jpg",
      color: getGameColorScheme("math"),
      icon: getGameIcon("math"),
      bgStyle: getGameBackground("math"),
    },
    {
      id: "tech-quiz",
      title: t("game.techQuiz"),
      path: "/game/tech-quiz",
      imageUrl: "/assets/games/tech-quiz.jpg",
      color: getGameColorScheme("quiz"),
      icon: getGameIcon("quiz"),
      bgStyle: getGameBackground("quiz"),
    },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <motion.h1
          className="text-4xl font-extrabold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          {t("game.title")}
        </motion.h1>
        <motion.p
          className="text-center text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {t("game.description")}
        </motion.p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            variants={item}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              type: "spring",
              stiffness: 100,
            }}
          >
            <GameCard
              id={game.id}
              title={game.title}
              imageUrl={game.imageUrl}
              path={game.path}
              color={game.color}
              icon={game.icon}
              bgStyle={game.bgStyle}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default GamesPage;
