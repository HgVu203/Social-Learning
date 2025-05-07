/**
 * Connect to the socket server
 * @returns {boolean} Whether the connection was successful
 */
export const connectSocket = () => {
  console.log("Checking if socket connection is needed");

  // Import the isOnMessagePage function directly from socket.js
  import("../socket").then(({ isOnMessagePage }) => {
    // Check if we're on a message page first
    if (!isOnMessagePage()) {
      console.log("Not on message page, skipping socket connection");
      return false;
    }

    console.log("On message page, connecting socket");
    // Proceed with socket connection since we're on a message page
    import("../socket").then(({ initSocket, checkAndRestoreConnection }) => {
      try {
        const socket = initSocket();
        if (!socket) {
          checkAndRestoreConnection();
        }
        return true;
      } catch (error) {
        console.error("Socket connection error:", error);
        return false;
      }
    });
  });
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
    // First check if we're on a message page
    import("../socket").then(
      ({ isOnMessagePage, checkAndRestoreConnection, closeSocket }) => {
        if (!isOnMessagePage()) {
          console.log("Not on message page, skipping socket reconnection");
          return false;
        }

        // First disconnect if needed
        closeSocket(true);

        // Wait a brief moment
        setTimeout(() => {
          // Try to restore connection
          checkAndRestoreConnection();

          // Trigger a message refresh event if we have a conversation ID
          if (conversationId) {
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("force_message_refresh", {
                  detail: { conversationId },
                })
              );
            }, 500); // Increased timeout for better reliability
          }
        }, 200); // Increased timeout for better reliability
      }
    );

    return true;
  } catch (error) {
    console.error("Error during reconnect and refresh:", error);

    // Fallback to direct connection if dynamic import fails
    setTimeout(() => {
      connectSocket();
    }, 300);

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
