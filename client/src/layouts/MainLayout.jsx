import { useState, useEffect } from "react";
import Sidebar from "../components/sidebar/Sidebar";
import RightPanel from "../components/sidebar/RightPanel";
import { motion, AnimatePresence } from "framer-motion";
import MobileNavbar from "../components/mobile/MobileNavbar";
import { useMediaQuery } from "../hooks/useMediaQuery";

const MainLayout = ({ children }) => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px)");

  // Close mobile sidebar when switching to desktop view
  useEffect(() => {
    if (isDesktop) {
      setShowMobileSidebar(false);
    }
  }, [isDesktop]);

  const toggleMobileSidebar = () => {
    setShowMobileSidebar(!showMobileSidebar);
  };

  // Prevent body scrolling when mobile sidebar is open
  useEffect(() => {
    if (showMobileSidebar && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showMobileSidebar, isDesktop]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] overflow-hidden">
      <div className="max-w-full mx-auto flex relative">
        {/* Left Sidebar - Only visible on desktop or when toggled on mobile */}
        <AnimatePresence>
          {(isDesktop || showMobileSidebar) && (
            <motion.div
              initial={{ x: showMobileSidebar ? -280 : -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -280, opacity: 0 }}
              transition={{
                duration: showMobileSidebar ? 0.25 : 0.3,
                ease: "easeInOut",
              }}
              className={`${
                isDesktop ? "w-[280px] fixed" : "w-[280px] fixed z-40"
              } h-screen border-r border-[var(--color-border)] bg-[var(--color-bg-primary)]`}
            >
              <Sidebar onClose={() => setShowMobileSidebar(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay for mobile sidebar */}
        <AnimatePresence>
          {showMobileSidebar && !isDesktop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-30 backdrop-blur-sm"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`flex-1 min-h-screen bg-[var(--color-bg-primary)] ${
            isDesktop
              ? "ml-[280px] mr-[350px] border-r border-[var(--color-border)]"
              : isTablet
              ? "ml-0 mr-0 w-full"
              : "ml-0 mr-0 w-full"
          } overflow-y-auto ${!isDesktop ? "pb-20" : ""}`}
        >
          <div className={`${!isDesktop ? "px-3 py-2 mt-14" : "p-2"}`}>
            {children}
          </div>
        </motion.main>

        {/* Right Panel - Only visible on desktop */}
        {isDesktop && (
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-[350px] fixed right-0 h-screen z-10 border-l border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-hidden"
          >
            <RightPanel />
          </motion.div>
        )}
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      {!isDesktop && <MobileNavbar onMenuClick={toggleMobileSidebar} />}
    </div>
  );
};

export default MainLayout;
