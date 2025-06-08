import { createContext, useState, useContext, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Create context
const LanguageContext = createContext();

// Create a custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");

  // Change language handler
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    localStorage.setItem("language", lng);
  };

  // Initialize language from localStorage or browser preferences
  useEffect(() => {
    const storedLanguage = localStorage.getItem("language");
    if (storedLanguage) {
      changeLanguage(storedLanguage);
    }
  }, []);

  // Update state when i18n language changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  // Context value
  const value = {
    currentLanguage,
    changeLanguage,
    languages: ["en", "vi"], // Supported languages
    languageNames: {
      en: "English",
      vi: "Tiếng Việt",
    },
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
