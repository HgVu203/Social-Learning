import { useEffect, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const Select = ({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  label,
  disabled = false,
  className = "",
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionClick = (optionValue) => {
    if (disabled) return;

    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}

      <div ref={selectRef} className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 border rounded-lg flex items-center justify-between cursor-pointer transition-all
          ${
            error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : isOpen
              ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]"
              : "border-[var(--color-border)] hover:border-[var(--color-primary)]/60"
          } 
          ${
            disabled
              ? "bg-[var(--color-bg-secondary)]/50 cursor-not-allowed opacity-70"
              : "bg-[var(--color-bg-secondary)]"
          }
          text-[var(--color-text-primary)]`}
        >
          <span
            className={
              !selectedOption ? "text-[var(--color-text-tertiary)]" : ""
            }
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <FaChevronDown
            className={`text-[var(--color-text-secondary)] transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
            size={12}
          />
        </div>

        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
            style={{
              width: "100%",
              top: "calc(100% + 5px)",
              left: "0",
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`px-4 py-2.5 cursor-pointer hover:bg-[var(--color-bg-hover)] 
                ${
                  option.value === value
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-text-primary)]"
                }
                ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default Select;
