import Sidebar from "../components/sidebar/Sidebar";
import RightPanel from "../components/sidebar/RightPanel";
import { motion } from "framer-motion";

const MainLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] overflow-hidden">
      <div className="max-w-full mx-auto flex relative">
        {/* Left Sidebar - Fixed position */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-[280px] fixed h-screen border-r border-[var(--color-border)] z-10 bg-[var(--color-bg-primary)]"
        >
          <Sidebar />
        </motion.div>

        {/* Main Content - Add subtle animations */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 min-h-screen border-r border-[var(--color-border)] ml-[280px] mr-[350px] overflow-y-auto bg-[var(--color-bg-primary)]"
        >
          <div className="p-2">{children}</div>
        </motion.main>

        {/* Right Panel - Fixed position */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-[350px] fixed right-0 h-screen z-10 border-l border-[var(--color-border)] bg-[var(--color-bg-primary)]"
        >
          <RightPanel />
        </motion.div>
      </div>
    </div>
  );
};

export default MainLayout;
