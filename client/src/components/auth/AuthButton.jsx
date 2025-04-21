import { motion } from "framer-motion";

const AuthButton = ({
  children,
  type = "button",
  onClick,
  fullWidth = true,
  variant = "primary",
  size = "md",
  disabled = false,
  isLoading = false,
  icon,
  className = "",
  ...props
}) => {
  // Define size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  };

  // Define variant classes
  const variantClasses = {
    primary:
      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white",
    secondary:
      "bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]",
    outline:
      "bg-transparent border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:bg-opacity-10",
    text: "bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:bg-opacity-10",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    ghost:
      "bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]",
  };

  // Apply classes
  const buttonClasses = `
    ${fullWidth ? "w-full" : ""}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    rounded-lg font-medium
    transition-all duration-200
    flex items-center justify-center
    ${
      disabled || isLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
    }
    ${className}
  `;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={buttonClasses}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>{children}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center">
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </span>
      )}
    </motion.button>
  );
};

export default AuthButton;
