import { createContext, useEffect, useState, useContext } from "react";

// Create Theme Context
const ThemeContext = createContext({
  theme: "dark", // default theme
  setTheme: () => {},
  toggleTheme: () => {},
});

// Theme Provider Component
export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to 'dark'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "dark";
    }
    return "dark";
  });

  // Toggle between dark and light theme
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  // Initialization effect - runs only once when component mounts
  useEffect(() => {
    // Get saved theme or default to dark
    const savedTheme = localStorage.getItem("theme") || "dark";

    // Initialize document class
    const root = window.document.documentElement;

    // Remove any existing theme classes
    root.classList.remove("dark", "light");

    // Add the current theme class
    root.classList.add(savedTheme);

    // Update theme state if needed
    if (theme !== savedTheme) {
      setTheme(savedTheme);
    }

    // Also make sure we have the theme in localStorage
    localStorage.setItem("theme", savedTheme);
  }, []); // Empty dependency array means this runs once on mount

  // Update document class and localStorage when theme changes
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme class
    root.classList.remove("dark", "light");

    // Add current theme class
    root.classList.add(theme);

    // Store theme preference in localStorage
    localStorage.setItem("theme", theme);

    // Log for debugging
    console.log("Theme changed to:", theme);
    console.log("HTML classes:", root.classList.toString());
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
