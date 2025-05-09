import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MessagesContainer from "../../components/message/MessagesContainer";
import { useAuth } from "../../contexts/AuthContext";
import { connectSocket } from "../../services/socket";
import { useSocket } from "../../contexts/SocketContext";

const MessagesPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL params
  const socket = useSocket();
  const isConnected = socket?.isConnected;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Đảm bảo kết nối socket khi trang Messages được tải
  useEffect(() => {
    console.log("MessagesPage mounted, establishing socket connection");

    // Kết nối socket ngay khi component mount
    connectSocket();

    // Nếu chưa kết nối, thử kết nối lại sau 1 giây
    if (!isConnected) {
      setTimeout(() => {
        console.log("Initial socket connect failed, trying again");
        if (socket && typeof socket.forceReconnect === "function") {
          socket.forceReconnect();
        } else {
          console.log("forceReconnect not available, using direct reconnect");
          connectSocket();
        }
      }, 1000);
    }

    // Cleanup khi unmount
    return () => {
      console.log("MessagesPage unmounted");
    };
  }, [isConnected, socket]);

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] pb-1 sm:pb-2 md:pb-4"
      >
        Messages
      </motion.h1>
      <div className="w-full h-[calc(100vh-90px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-130px)]">
        <MessagesContainer userId={userId} />
      </div>
    </div>
  );
};

export default MessagesPage;
