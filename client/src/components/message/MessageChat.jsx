import { useEffect, useRef, useState, useMemo } from "react";
import { format } from "date-fns";
import { BsPersonCircle, BsSend } from "react-icons/bs";
import { FaImage } from "react-icons/fa";
import Avatar from "./../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useMessageContext } from "../../contexts/MessageContext";
import {
  useMessages,
  useMessageMutations,
} from "../../hooks/queries/useMessageQueries";

const MessageChat = () => {
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [messageIdsSent, setMessageIdsSent] = useState(new Set());
  const [page, setPage] = useState(1);

  const { user } = useAuth();
  const { currentConversation } = useMessageContext();

  const { data: messagesData, isLoading: loading } = useMessages(
    currentConversation?._id,
    { page, limit: 20 }
  );

  // Use useMemo for messages to avoid dependency issues
  const messages = useMemo(
    () => messagesData?.messages || [],
    [messagesData?.messages]
  );
  const hasMore = useMemo(
    () => messagesData?.hasMore || false,
    [messagesData?.hasMore]
  );

  const { sendMessage, markAsRead } = useMessageMutations();

  useEffect(() => {
    if (currentConversation) {
      setPage(1);
      setIsFirstLoad(true);
    }
  }, [currentConversation]);

  useEffect(() => {
    // Mark unread messages as read
    messages.forEach((message) => {
      if (!message.read && message.senderId !== user._id) {
        markAsRead.mutate(message._id);
      }
    });
  }, [messages, user._id, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Always scroll to bottom on first load
      if (isFirstLoad) {
        scrollToBottom();
        setIsFirstLoad(false);
      } else {
        // Check if the last message is from the current user or is new
        const lastMessage = messages[messages.length - 1];
        if (
          lastMessage &&
          (lastMessage.senderId === user._id ||
            !messageIdsSent.has(lastMessage._id))
        ) {
          scrollToBottom();

          // Add the message ID to the set of seen messages
          if (lastMessage.senderId !== user._id) {
            setMessageIdsSent((prev) => new Set([...prev, lastMessage._id]));
          }
        }
      }
    }
  }, [messages, isFirstLoad, user._id, messageIdsSent]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    // Load more when scrolled near top
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() && currentConversation) {
      try {
        await sendMessage.mutateAsync({
          receiverId: currentConversation._id,
          message: newMessage.trim(),
          type: "text",
        });

        setNewMessage("");

        // Force scroll to bottom after sending with a small delay to ensure DOM is updated
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    }
  };

  const renderTime = (timestamp) => {
    try {
      return format(new Date(timestamp), "h:mm a");
    } catch (error) {
      console.error("Failed to render time:", error);
      return "";
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="text-6xl mb-4">
          <BsPersonCircle />
        </div>
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center">
        {currentConversation.avatar ? (
          <Avatar
            src={currentConversation.avatar}
            alt={currentConversation.username}
            size="md"
            className="mr-3"
          />
        ) : (
          <BsPersonCircle className="w-10 h-10 text-gray-400 mr-3" />
        )}

        <div>
          <h3 className="font-medium">
            {currentConversation.fullname || currentConversation.username}
          </h3>
          <p className="text-xs text-gray-400">
            {currentConversation.isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadMoreMessages}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message) => {
                const isCurrentUser = message.senderId === user._id;

                return (
                  <div
                    key={message._id}
                    className={`flex ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isCurrentUser
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      <div className="break-words">
                        {message.type === "image" ? (
                          <img
                            src={message.message}
                            alt="Image message"
                            className="max-w-full rounded"
                          />
                        ) : (
                          message.message
                        )}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isCurrentUser ? "text-blue-200" : "text-gray-400"
                        }`}
                      >
                        {renderTime(message.createdAt)}
                        {isCurrentUser && (
                          <span className="ml-2">
                            {message.read ? "Read" : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-700"
      >
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-white"
            title="Send an image"
          >
            <FaImage />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 rounded-full py-2 px-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 text-blue-500 hover:text-blue-400 disabled:text-gray-500"
          >
            <BsSend />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageChat;
