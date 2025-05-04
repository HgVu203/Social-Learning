import React from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { motion } from "framer-motion";

interface GameCardProps {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  path: string;
  color?: string;
  icon?: string;
  bgStyle?: string;
}

const GameCard: React.FC<GameCardProps> = ({
  id,
  title,
  imageUrl,
  path,
  color = "from-blue-500 to-indigo-600",
  icon = "🎮",
  bgStyle,
}) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex flex-col rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-full border border-[var(--color-border)] overflow-hidden"
      onClick={() => navigate(path)}
    >
      <div
        className={`relative h-48 overflow-hidden rounded-t-xl text-white shadow-md`}
        style={{
          background:
            bgStyle ||
            `linear-gradient(to right, var(--color-primary), var(--color-primary-dark))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-6xl">
          {icon}
        </div>
      </div>
      <div className="p-6 flex-grow flex items-center justify-center">
        <h5 className="block font-sans text-xl font-semibold leading-snug tracking-normal text-[var(--color-text-primary)] antialiased text-center">
          {title}
        </h5>
      </div>
      <div className="p-6 pt-0">
        <button
          className={`select-none rounded-lg bg-gradient-to-r ${color} py-3 px-6 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none w-full`}
          type="button"
        >
          Play Now
        </button>
      </div>
    </motion.div>
  );
};

export default GameCard;
