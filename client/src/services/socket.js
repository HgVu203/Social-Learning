/**
 * Connect to the socket server
 * @returns {boolean} Whether the connection was successful
 */
export const connectSocket = () => {
  try {
    // Dynamically import socket.js to prevent circular dependency
    import("../socket").then(({ initSocket }) => {
      const socket = initSocket();

      if (!socket) {
        console.error("Failed to initialize socket connection");
        return false;
      }

      // Dispatch event for socket connection
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("socket_reconnected"));
      }, 500);

      return true;
    });

    return true;
  } catch (error) {
    console.error("Error connecting socket:", error);
    return false;
  }
};

/**
 * Disconnect from the socket server
 * @param {boolean} isNavigation - Whether the disconnect is due to navigation
 * @returns {boolean} Whether the disconnection was successful
 */
export const disconnectSocket = (isNavigation = false) => {
  try {
    // Dynamically import socket.js to prevent circular dependency
    import("../socket").then(({ closeSocket }) => {
      closeSocket(isNavigation);
    });
    return true;
  } catch (error) {
    console.error("Error disconnecting socket:", error);
    return false;
  }
};

/**
 * Check if the socket is currently connected
 * @returns {boolean} Whether the socket is connected
 */
export const isSocketConnected = () => {
  try {
    // Use a more direct approach to check connection status
    const { socket } = window.socketState || {};
    return socket && socket.connected;
  } catch {
    return false;
  }
};

/**
 * Get the socket instance
 * @returns {Object} The socket instance
 */
export const getSocketInstance = () => {
  try {
    // Dynamically import socket.js to prevent circular dependency
    return import("../socket").then(({ getSocket }) => {
      return getSocket();
    });
  } catch (error) {
    console.error("Error getting socket instance:", error);
    return null;
  }
};

/**
 * Force reconnect the socket and refresh message subscriptions
 * @param {string} conversationId - Optional ID of current conversation to refresh
 */
export const reconnectAndRefresh = (conversationId) => {
  try {
    // Disconnect first
    disconnectSocket(true);

    // Wait a brief moment
    setTimeout(() => {
      // Reconnect
      connectSocket();

      // Trigger a message refresh event if we have a conversation ID
      if (conversationId) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("force_message_refresh", {
              detail: { conversationId },
            })
          );
        }, 200);
      }
    }, 50);

    return true;
  } catch (error) {
    console.error("Error during reconnect and refresh:", error);
    return false;
  }
};

export default {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getSocketInstance,
  reconnectAndRefresh,
};
