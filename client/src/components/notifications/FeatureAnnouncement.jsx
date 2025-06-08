import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiArrowRight } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const FeatureAnnouncement = ({ feature, onDismiss }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  const features = {
    darkMode: {
      title: "feature.darkMode.title",
      description: "feature.darkMode.description",
      icon: "🌙",
      link: "/settings/appearance",
      linkText: "feature.darkMode.try",
    },
    messageReactions: {
      title: "feature.messageReactions.title",
      description: "feature.messageReactions.description",
      icon: "😍",
      link: "/messages",
      linkText: "feature.messageReactions.try",
    },
    voiceMessages: {
      title: "feature.voiceMessages.title",
      description: "feature.voiceMessages.description",
      icon: "🎤",
      link: "/messages",
      linkText: "feature.voiceMessages.try",
    },
    translation: {
      title: "feature.translation.title",
      description: "feature.translation.description",
      icon: "🌍",
      link: "/settings/language",
      linkText: "feature.translation.try",
    },
  };

  const featureData = features[feature];

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for exit animation to complete
    setTimeout(() => {
      if (onDismiss) onDismiss();
      // Save to local storage to prevent showing again
      localStorage.setItem(`announcement_${feature}_dismissed`, "true");
    }, 300);
  };

  // Check if user has previously dismissed this announcement
  useEffect(() => {
    const isDismissed =
      localStorage.getItem(`announcement_${feature}_dismissed`) === "true";
    if (isDismissed) {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }
  }, [feature, onDismiss]);

  if (!featureData || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-16 md:bottom-4 right-4 z-30 max-w-xs"
        >
          <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 relative">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]"
                aria-label={t("common.dismiss")}
              >
                <FiX className="w-4 h-4" />
              </button>

              <div className="flex items-start mb-3">
                <span className="text-2xl mr-3">{featureData.icon}</span>
                <div>
                  <h4 className="font-semibold text-base text-[var(--color-text-primary)]">
                    {t(featureData.title)}
                  </h4>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {t(featureData.description)}
                  </p>
                </div>
              </div>

              <a
                href={featureData.link}
                className="flex items-center justify-center w-full py-2 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors text-white rounded-md text-sm font-medium"
              >
                {t(featureData.linkText)}
                <FiArrowRight className="ml-1" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeatureAnnouncement;
