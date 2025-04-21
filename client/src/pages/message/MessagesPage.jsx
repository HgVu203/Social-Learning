import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MessagesContainer from "../../components/message/MessagesContainer";
import { useAuth } from "../../contexts/AuthContext";

const MessagesPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL params

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-[var(--color-text-primary)] pb-4"
      >
        Messages
      </motion.h1>
      <div className="w-full h-[calc(100vh-140px)]">
        <MessagesContainer userId={userId} />
      </div>
    </div>
  );
};

export default MessagesPage;
