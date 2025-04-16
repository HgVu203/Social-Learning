import { createContext, useContext, useState } from "react";

const MessageContext = createContext({
  currentConversation: null,
  setCurrentConversation: () => {},
  clearMessages: () => {},
});

export const MessageProvider = ({ children }) => {
  const [currentConversation, setCurrentConversation] = useState(null);

  const clearMessages = () => {
    // This function is just a placeholder for the actual query invalidation
    // The real work happens in the component that uses the MessageContext
  };

  const value = {
    currentConversation,
    setCurrentConversation,
    clearMessages,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

export const useMessageContext = () => useContext(MessageContext);

export default MessageContext;
