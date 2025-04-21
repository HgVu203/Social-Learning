import { motion } from "framer-motion";

const FormInput = ({
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  placeholder,
  icon,
  ...props
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      {label && (
        <label
          htmlFor={name}
          className="block mb-2 text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)]">
            {icon}
          </div>
        )}

        <input
          type={type}
          name={name}
          id={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full p-3 ${
            icon ? "pl-10" : "pl-3"
          } border rounded-md bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] 
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-transparent
          transition-all duration-200 ${
            error ? "border-red-500 focus:ring-red-200" : ""
          }`}
          {...props}
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </motion.div>
  );
};

export default FormInput;
