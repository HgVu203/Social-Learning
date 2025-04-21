import { motion } from "framer-motion";

const AuthForm = ({
  children,
  onSubmit,
  title,
  subtitle,
  className = "",
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

      <form onSubmit={onSubmit} className={`space-y-4 ${className}`} {...props}>
        {children}
      </form>
    </motion.div>
  );
};

export default AuthForm;
