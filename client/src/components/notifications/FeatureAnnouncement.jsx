import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FeatureAnnouncement = ({ feature = "ai-assistant" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  // Kiểm tra xem người dùng đã thấy thông báo chưa
  useEffect(() => {
    const checkIfSeen = () => {
      const seen = localStorage.getItem(`feature-seen-${feature}`);
      if (seen) {
        setHasBeenSeen(true);
      } else {
        // Hiển thị thông báo sau 2 giây
        setTimeout(() => {
          setIsVisible(true);
        }, 2000);
      }
    };

    checkIfSeen();
  }, [feature]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Đánh dấu là đã thấy
    localStorage.setItem(`feature-seen-${feature}`, "true");
  };

  // Đóng tự động sau 10 giây
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Trả về null nếu đã xem
  if (hasBeenSeen) return null;

  const getFeatureContent = () => {
    switch (feature) {
      case "ai-assistant":
        return {
          title: "New Feature: AI Assistant",
          description:
            "We've added a new AI assistant to help with your coding challenges. No API key required!",
          icon: "robot",
          color: "purple",
        };
      default:
        return {
          title: "New Feature",
          description: "Check out our latest updates!",
          icon: "sparkles",
          color: "blue",
        };
    }
  };

  const featureContent = getFeatureContent();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-4 right-4 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-${featureContent.color}-500 z-50`}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full bg-${featureContent.color}-100 dark:bg-${featureContent.color}-900 flex items-center justify-center`}
              >
                <svg
                  className={`w-6 h-6 text-${featureContent.color}-500`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {featureContent.icon === "robot" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  )}
                </svg>
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {featureContent.title}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {featureContent.description}
                </p>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-${featureContent.color}-600 hover:bg-${featureContent.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${featureContent.color}-500`}
                    onClick={() => {
                      // Mở hướng dẫn sử dụng
                      window.open("/docs/AI-INTEGRATION.md", "_blank");
                      handleDismiss();
                    }}
                  >
                    Learn more
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    onClick={handleDismiss}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="ml-4 flex-shrink-0 flex">
                <button
                  className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  onClick={handleDismiss}
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeatureAnnouncement;
