import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import RightPanel from "../components/sidebar/RightPanel";
import { motion, AnimatePresence } from "framer-motion";
import MobileNavbar from "../components/mobile/MobileNavbar";
import { useMediaQuery } from "../hooks/useMediaQuery";

const MainLayout = () => {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

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
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Sử dụng CSS Grid layout để tự động co dãn theo tỉ lệ màn hình */}
      <div
        className={`
        ${
          isDesktop
            ? "grid grid-cols-[minmax(220px,0.9fr)_minmax(500px,2.2fr)_minmax(280px,1fr)] h-screen overflow-hidden"
            : "block"
        }
        min-h-screen w-full
      `}
      >
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
              className={`
                h-screen border-r border-[var(--color-border)] bg-[var(--color-bg-primary)] overflow-y-auto
                ${
                  isDesktop ? "sticky top-0 col-span-1" : "fixed w-[280px] z-40"
                }
              `}
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
        <div
          className={`
            h-screen bg-[var(--color-bg-primary)] overflow-y-auto
            ${
              isDesktop
                ? "border-r border-[var(--color-border)] col-span-1"
                : "w-full"
            }
            ${!isDesktop ? "pb-16" : ""}
          `}
        >
          <div className={`${!isDesktop ? "px-2 py-1 mt-2" : "p-2"}`}>
            <Outlet />
          </div>
        </div>

        {/* Right Panel - Only visible on desktop */}
        {isDesktop && (
          <div className="col-span-1 border-l border-[var(--color-border)] bg-[var(--color-bg-primary)] h-screen overflow-y-auto sticky top-0">
            <RightPanel />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      {!isDesktop && <MobileNavbar onMenuClick={toggleMobileSidebar} />}
    </div>
  );
};

export default MainLayout;
