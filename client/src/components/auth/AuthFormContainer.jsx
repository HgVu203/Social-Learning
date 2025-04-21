import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const AuthFormContainer = ({
  children,
  title,
  subtitle,
  logo = true,
  className = "",
  maxWidth = "max-w-md",
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--color-background)]">
      <motion.div
        className={`w-full ${maxWidth} space-y-8 p-8 rounded-xl shadow-lg bg-[var(--color-background-alt)] ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {logo && (
          <div className="flex justify-center">
            <motion.img
              src="/logo.png"
              alt="Logo"
              className="h-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
          </div>
        )}

        {(title || subtitle) && (
          <div className="text-center">
            {title && (
              <motion.h2
                className="text-2xl font-bold text-[var(--color-text-primary)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {title}
              </motion.h2>
            )}

            {subtitle && (
              <motion.p
                className="mt-2 text-sm text-[var(--color-text-secondary)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {Array.isArray(children)
            ? children.map((child, index) => (
                <motion.div key={index} variants={item}>
                  {child}
                </motion.div>
              ))
            : children}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthFormContainer;
