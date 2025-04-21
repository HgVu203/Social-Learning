import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const AuthFormLayout = ({
  title,
  subtitle,
  children,
  footer,
  logo = true,
  backLink,
  maxWidth = "max-w-md",
}) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[var(--color-background)]">
      <motion.div
        className={`w-full ${maxWidth} p-6 bg-white rounded-xl shadow-lg`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {backLink && (
          <motion.div className="mb-6" variants={itemVariants}>
            <Link
              to={backLink}
              className="flex items-center text-[var(--color-primary)] hover:underline"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Link>
          </motion.div>
        )}

        {logo && (
          <motion.div
            className="flex justify-center mb-6"
            variants={itemVariants}
          >
            <img src="/logo.png" alt="Logo" className="h-16" />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-2">
            {title}
          </h1>
          {subtitle && (
            <p className="text-center text-[var(--color-text-secondary)] mb-6">
              {subtitle}
            </p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-4">
          {children}
        </motion.div>

        {footer && (
          <motion.div
            variants={itemVariants}
            className="mt-6 text-center text-[var(--color-text-secondary)]"
          >
            {footer}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthFormLayout;
