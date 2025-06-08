import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
import { FaLanguage } from "react-icons/fa";

/**
 * Language toggle component for the admin panel
 * Allows switching between English and Vietnamese
 */
const LanguageToggle = ({ className = "" }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FaLanguage className="text-lg text-[var(--color-primary)]" />
      <div className="flex space-x-2">
        <button
          onClick={() => changeLanguage("en")}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            currentLanguage === "en"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
          }`}
        >
          {t("settings.english")}
        </button>
        <button
          onClick={() => changeLanguage("vi")}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            currentLanguage === "vi"
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
          }`}
        >
          {t("settings.vietnamese")}
        </button>
      </div>
    </div>
  );
};

export default LanguageToggle;
