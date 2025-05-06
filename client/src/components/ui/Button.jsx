const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  className = "",
  icon,
  iconPosition = "left",
  fullWidth = false,
  isLoading = false,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center border font-medium rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-transparent focus:ring-[var(--color-primary)]/50",
    secondary:
      "bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-tertiary)]/80 text-[var(--color-text-primary)] border-[var(--color-border)] focus:ring-[var(--color-primary)]/30",
    outline:
      "bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-primary)] border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30",
    danger:
      "bg-red-500 hover:bg-red-600 text-white border-transparent focus:ring-red-500/50",
    success:
      "bg-green-500 hover:bg-green-600 text-white border-transparent focus:ring-green-500/50",
    warning:
      "bg-amber-500 hover:bg-amber-600 text-white border-transparent focus:ring-amber-500/50",
    ghost:
      "bg-transparent hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border-transparent",
  };

  const sizeStyles = {
    sm: "text-xs px-2.5 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
    xl: "text-lg px-6 py-3",
  };

  const disabledStyles = disabled ? "opacity-60 cursor-not-allowed" : "";
  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${disabledStyles}
        ${widthStyles}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
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
          Loading...
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <span className="mr-2">{icon}</span>
          )}
          {children}
          {icon && iconPosition === "right" && (
            <span className="ml-2">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;
