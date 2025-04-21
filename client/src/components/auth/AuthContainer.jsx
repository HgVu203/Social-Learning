import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const AuthContainer = ({
  children,
  title,
  subtitle,
  backTo,
  backLabel = "Back",
  footerText,
  footerLink,
  footerLinkText,
  isLoading,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--color-background)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-6 sm:p-8 bg-white rounded-xl shadow-lg"
      >
        {backTo && (
          <Link
            to={backTo}
            className="inline-flex items-center text-sm text-[var(--color-primary)] mb-6 hover:underline"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {backLabel}
          </Link>
        )}

        {title && (
          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.h1>
        )}

        {subtitle && (
          <motion.p
            className="text-[var(--color-text-secondary)] mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {subtitle}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`${isLoading ? "opacity-70 pointer-events-none" : ""}`}
        >
          {children}
        </motion.div>

        {(footerText || footerLink) && (
          <motion.div
            className="mt-8 text-center text-sm text-[var(--color-text-secondary)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {footerText}{" "}
            {footerLink && (
              <Link
                to={footerLink}
                className="text-[var(--color-primary)] hover:underline font-medium"
              >
                {footerLinkText}
              </Link>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default AuthContainer;
