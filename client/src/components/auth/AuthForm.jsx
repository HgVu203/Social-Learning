import { motion } from "framer-motion";
import { FiAlertCircle } from "react-icons/fi";

const AuthForm = ({
  children,
  onSubmit,
  title,
  subtitle,
  className = "",
  error,
  clearError,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md px-6 py-8 mx-auto bg-[var(--color-bg-secondary)] rounded-lg shadow-md border border-[var(--color-border)]"
    >
      {title && (
        <h1 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-1">
          {title}
        </h1>
      )}

      {subtitle && (
        <p className="text-center text-[var(--color-text-secondary)] mb-6">
          {subtitle}
        </p>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-start"
        >
          <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="flex-grow text-sm font-medium">{error}</div>
          {clearError && (
            <button
              type="button"
              className="ml-2 text-red-500 hover:text-red-700 transition-colors duration-200"
              onClick={clearError}
              aria-label="Dismiss"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </motion.div>
      )}

      <form onSubmit={onSubmit} className={`space-y-4 ${className}`} {...props}>
        {children}
      </form>
    </motion.div>
  );
};

export default AuthForm;
