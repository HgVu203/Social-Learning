import { useState, useEffect } from "react";

/**
 * Custom hook that returns whether a media query is matched
 * @param {string} query - Media query to match
 * @returns {boolean} Whether the media query is matched
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define listener function
    const handleChange = (event) => {
      setMatches(event.matches);
    };

    // Add listener
    mediaQuery.addEventListener("change", handleChange);

    // Clean up
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
};
