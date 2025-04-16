import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MessagesContainer from "../../components/message/MessagesContainer";
import { useAuth } from "../../contexts/AuthContext";

const MessagesPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="w-full h-full flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="flex-1">
        <MessagesContainer />
      </div>
    </div>
  );
};

export default MessagesPage;
