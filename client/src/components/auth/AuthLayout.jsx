import { motion } from "framer-motion";

/**
 * A consistent layout component for all authentication pages
 */
const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full"
      >
        <div className="card shadow-lg border border-[var(--color-border)] p-8 overflow-hidden">
          {/* Decorative gradient top border */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-light)]"></div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-center mb-6"
          >
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[var(--color-text-secondary)]">{subtitle}</p>
            )}
          </motion.div>

          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
