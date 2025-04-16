import { useEffect, useState } from "react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { BsPersonCircle } from "react-icons/bs";
import { MdMessage } from "react-icons/md";
import Avatar from "./../common/Avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useConversations } from "../../hooks/queries/useMessageQueries";
import { useFriends } from "../../hooks/queries/useFriendQueries";
import { useMessageContext } from "../../contexts/MessageContext";

const MessageList = () => {
  const [activeTab, setActiveTab] = useState("chats"); // "chats" or "friends"
  const { user } = useAuth();

  const { data: conversationsData, isLoading: messageLoading } =
    useConversations({ page: 1, limit: 20 });
  const conversations = conversationsData?.conversations || [];

  const { data: friendsData, isLoading: friendsLoading } = useFriends();
  const friends = friendsData?.friends || [];

  const { currentConversation, setCurrentConversation, clearMessages } =
    useMessageContext();

  useEffect(() => {
    const intervalId = setInterval(() => {
      // No need to dispatch, React Query will handle refetching
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  const handleSelectConversation = (conversation) => {
    const partnerId =
      conversation.message?.senderId === user._id
        ? conversation.message.receiverId
        : conversation.message.senderId;

    const partner =
      conversation.senderId?._id === user._id
        ? conversation.receiverId
        : conversation.senderId;

    if (currentConversation?._id !== partnerId) {
      clearMessages();
      setCurrentConversation({ ...partner, _id: partnerId });
    }
  };

  const startNewChat = (friend) => {
    if (currentConversation?._id !== friend._id) {
      clearMessages();
      setCurrentConversation({ ...friend, _id: friend._id });
      setActiveTab("chats");
    }
  };

  const renderTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isToday(date)) {
        return format(date, "h:mm a");
      } else if (isYesterday(date)) {
        return "Yesterday";
      } else {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (error) {
      console.error(error);
      return "";
    }
  };

  const renderMessagePreview = (message, isCurrentUser) => {
    if (message.type === "image") {
      return isCurrentUser ? "You: Sent an image" : "Sent an image";
    } else {
      const preview =
        message.message.length > 30
          ? `${message.message.substring(0, 30)}...`
          : message.message;
      return isCurrentUser ? `You: ${preview}` : preview;
    }
  };

  if (
    (messageLoading && conversations.length === 0) ||
    (friendsLoading && friends.length === 0)
  ) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header with Tabs */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <MdMessage className="mr-2" />
          Messages
        </h2>
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
              activeTab === "chats"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => setActiveTab("friends")}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm ${
              activeTab === "friends"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            People
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {activeTab === "chats" ? (
          // Conversations List
          conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <p>No conversations yet</p>
              <p className="text-sm mt-2">
                Switch to "People" tab to start a new conversation
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {conversations.map((conversation) => {
                const isCurrentUser =
                  conversation.message.senderId === user._id;
                const partner = isCurrentUser
                  ? conversation.receiverId
                  : conversation.senderId;

                if (!partner || !partner._id) return null;

                const isActive = currentConversation?._id === partner._id;

                return (
                  <li
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors ${
                      isActive ? "bg-gray-800" : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {partner.avatar ? (
                          <Avatar
                            src={partner.avatar}
                            alt={partner.username}
                            size="md"
                          />
                        ) : (
                          <BsPersonCircle className="w-10 h-10 text-gray-400" />
                        )}

                        {partner.isOnline && (
                          <span className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {partner.fullname || partner.username}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {renderMessagePreview(
                            conversation.message,
                            isCurrentUser
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-400">
                          {renderTime(conversation.message.createdAt)}
                        </div>

                        {!conversation.message.read && !isCurrentUser && (
                          <span className="mt-1 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : // Friends List
        friends.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No friends yet</div>
        ) : (
          <ul className="divide-y divide-gray-700">
            {friends.map((friend) => {
              const isActive = currentConversation?._id === friend._id;

              return (
                <li
                  key={friend._id}
                  onClick={() => startNewChat(friend)}
                  className={`px-4 py-3 hover:bg-gray-800 cursor-pointer flex items-center space-x-3 transition-colors ${
                    isActive ? "bg-gray-800" : ""
                  }`}
                >
                  <div className="relative">
                    {friend.avatar ? (
                      <Avatar
                        src={friend.avatar}
                        alt={friend.username}
                        size="md"
                      />
                    ) : (
                      <BsPersonCircle className="w-10 h-10 text-gray-400" />
                    )}

                    {friend.isOnline && (
                      <span className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="font-medium">
                      {friend.fullname || friend.username}
                    </p>
                    <p className="text-sm text-gray-400">
                      {friend.isOnline ? "Active Now" : "Offline"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MessageList;
