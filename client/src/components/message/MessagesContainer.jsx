import MessageList from "./MessageList";
import MessageChat from "./MessageChat";

const MessagesContainer = () => {
  return (
    <div className="h-full bg-black rounded-lg overflow-hidden shadow-xl border border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-3 h-full">
        <div className="md:col-span-1 h-full border-r border-gray-700">
          <MessageList />
        </div>
        <div className="md:col-span-2 h-full">
          <MessageChat />
        </div>
      </div>
    </div>
  );
};

export default MessagesContainer;
