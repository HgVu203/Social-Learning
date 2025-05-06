import { useTheme } from "../../contexts/ThemeContext";
import { motion } from "framer-motion";
import { FiSun, FiMoon } from "react-icons/fi";

const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  // Animation variants
  const toggleVariants = {
    dark: { backgroundColor: "#1a1a1f", rotate: 0 },
    light: { backgroundColor: "#e9ecf1", rotate: 180 },
  };

  const iconVariants = {
    dark: { opacity: 1 },
    light: { opacity: 0 },
  };

  const sunVariants = {
    dark: { opacity: 0 },
    light: { opacity: 1 },
  };

  return (
    <motion.button
      className={`p-2 rounded-full relative cursor-pointer ${className}`}
      onClick={toggleTheme}
      animate={theme}
      variants={toggleVariants}
      initial={false}
      whileTap={{ scale: 0.9 }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-amber-500/80"
          variants={sunVariants}
          initial={false}
          animate={theme}
        >
          <FiSun size={18} />
        </motion.div>
        <motion.div
          className="flex items-center justify-center text-blue-300"
          variants={iconVariants}
          initial={false}
          animate={theme}
        >
          <FiMoon size={18} />
        </motion.div>
      </div>
    </motion.button>
  );
};

export default ThemeToggle;
