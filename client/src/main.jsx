/* eslint-disable */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n.js"; // Import i18n initialization
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { MessageProvider } from "./contexts/MessageContext.jsx";
import { PostProvider } from "./contexts/PostContext.jsx";
import { UserProvider } from "./contexts/UserContext.jsx";
import { GroupProvider } from "./contexts/GroupContext.jsx";
import { FriendProvider } from "./contexts/FriendContext.jsx";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import { LanguageProvider } from "./contexts/LanguageContext.jsx"; // Import LanguageProvider
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import { EditorState } from "@codemirror/state";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Đảm bảo các module CodeMirror được tải đúng với phiên bản phù hợp
window.__CODEMIRROR_STATE__ = EditorState;

// Clean up any "Login failed" messages on verification page
const cleanupLoginErrorMessages = () => {
  // Check if we're on the verification page
  if (window.location.pathname.includes("/verify-email")) {
    setTimeout(() => {
      // Hide all error banners with "Login failed" text
      const errorElements = document.querySelectorAll('[role="alert"]');
      errorElements.forEach((el) => {
        if (el.textContent && el.textContent.includes("Login failed")) {
          el.style.display = "none";
        }
      });

      // Apply general cleanup for any error messages
      const loginFailedHeadings = document.querySelectorAll(
        "h1, h2, h3, h4, div"
      );
      loginFailedHeadings.forEach((el) => {
        if (el.textContent === "Login failed") {
          el.style.display = "none";
          // Also try to hide parent containers with error styling
          let parent = el.parentElement;
          for (let i = 0; i < 3; i++) {
            // Check up to 3 parent levels
            if (
              parent &&
              (parent.classList.contains("bg-red-50") ||
                parent.classList.contains("text-red-700") ||
                parent.classList.contains("error"))
            ) {
              parent.style.display = "none";
              break;
            }
            parent = parent.parentElement;
          }
        }
      });
    }, 0);
  }
};

// Listen for route changes
window.addEventListener("popstate", cleanupLoginErrorMessages);

// Run on initial load
if (document.readyState === "complete") {
  cleanupLoginErrorMessages();
} else {
  window.addEventListener("load", cleanupLoginErrorMessages);
}

// Wrap app với các providers để React được sử dụng trong JSX
const AppWithProviders = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <UserProvider>
                  <PostProvider>
                    <GroupProvider>
                      <FriendProvider>
                        <MessageProvider>
                          <App />
                        </MessageProvider>
                      </FriendProvider>
                    </GroupProvider>
                  </PostProvider>
                </UserProvider>
              </NotificationProvider>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </BrowserRouter>
  </QueryClientProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <AppWithProviders />
);
