import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import axiosInstance from "../services/axiosService";

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications on auth state change
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchUnreadCount();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // Setup socket listener for real-time notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    // Lắng nghe sự kiện thông báo mới từ socket (thông qua custom event)
    const handleNotification = (event) => {
      const notification = event.detail;
      console.log("Received notification in context:", notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener("notification_received", handleNotification);

    return () => {
      window.removeEventListener("notification_received", handleNotification);
    };
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/notifications");
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axiosInstance.get("/notifications/unread-count");
      if (response.data.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await axiosInstance.patch(
        `/notifications/${notificationId}/read`
      );
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, read: true }
              : notification
          )
        );
        fetchUnreadCount();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axiosInstance.patch("/notifications/read-all");
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await axiosInstance.delete(
        `/notifications/${notificationId}`
      );
      if (response.data.success) {
        setNotifications((prev) =>
          prev.filter((notification) => notification._id !== notificationId)
        );
        fetchUnreadCount();
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
