import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

export interface OrderNotification {
  id: string;
  orderId: string;
  tableNumber: string;
  customerName: string;
  items: string[];
  totalPrice: number;
  itemCount: number;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: OrderNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "restaurant_notifications";

// Get API URL from environment variable with fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Debug logging (remove in production)
if (import.meta.env.DEV) {
  console.log('🌐 NotificationContext - API_URL:', API_URL);
  console.log('🌐 Environment:', import.meta.env.MODE);
}

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  // Load notifications from localStorage on mount
  const [notifications, setNotifications] = useState<OrderNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error("❌ Failed to load notifications from localStorage:", error);
    }
    return [];
  });

  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useAuth();

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error("❌ Failed to save notifications to localStorage:", error);
    }
  }, [notifications]);

  // Connect to Socket.io when user is authenticated
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("=== NOTIFICATION CONTEXT DEBUG ===");
      console.log("API_URL:", API_URL);
      console.log("User object:", user);
      console.log("user?.id:", user?.id);
    }

    // Try both id and _id for compatibility
    const userId = (user as Record<string, unknown>)?._id as string | undefined || user?.id;
    
    if (!userId) {
      if (import.meta.env.DEV) {
        console.log("⏸️ No user ID found - skipping socket connection");
      }
      return;
    }

    // Validate API_URL before connecting
    if (!API_URL || API_URL === 'undefined') {
      console.error("❌ Invalid API_URL. Please check your .env file!");
      console.error("Expected: VITE_API_URL=https://your-backend-url.com");
      return;
    }

    if (import.meta.env.DEV) {
      console.log("✅ Initializing socket connection to:", API_URL);
      console.log("✅ User ID:", userId);
    }

    const socketInstance = io(API_URL, {
      transports: ["websocket", "polling"],
      path: "/socket.io/",
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected! Socket ID:", socketInstance.id);
      const room = `restaurant-${userId}`;
      console.log("📡 Joining room:", room);
      socketInstance.emit("join-restaurant", userId);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error.message);
      if (import.meta.env.DEV) {
        console.error("Connection details:", {
          url: API_URL,
          error: error,
          description: error.message
        });
      }
    });

    socketInstance.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });

    socketInstance.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("❌ Socket reconnection failed");
    });

    socketInstance.on("new-order", (data) => {
      console.log("🔔 NEW ORDER EVENT RECEIVED!", data);

      const newNotification: OrderNotification = {
        id: `${data.orderId}-${Date.now()}`,
        orderId: data.orderId,
        tableNumber: data.tableNumber,
        customerName: data.customerName,
        items: data.items || [],
        totalPrice: data.totalPrice || 0,
        itemCount: data.itemCount || 0,
        timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        read: false,
      };

      console.log("➕ Adding notification:", newNotification);
      setNotifications((prev) => {
        console.log("📋 Previous notifications:", prev.length);
        const updated = [newNotification, ...prev];
        console.log("📋 Updated notifications:", updated.length);
        return updated;
      });

      // Play notification sound
      playNotificationSound();

      // Show browser notification if permission granted
      if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
        try {
          new Notification("New Order!", {
            body: `Table ${data.tableNumber} - ${data.customerName} (${data.itemCount} items)`,
            icon: "/qr-icon.png",
            tag: `order-${data.orderId}`, // Prevent duplicate notifications
          });
        } catch (error) {
          console.error("❌ Failed to show browser notification:", error);
        }
      }
    });

    socketInstance.on("order-status-updated", (data) => {
      console.log("🔄 Order status updated:", data);
      // You can add logic here to update notification status if needed
    });

    socketInstance.on("order-cancelled", (data) => {
      console.log("❌ Order cancelled:", data);
      // You can add logic here to remove or update the notification
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected. Reason:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    setSocket(socketInstance);

    return () => {
      if (import.meta.env.DEV) {
        console.log("🧹 Cleaning up socket connection");
      }
      socketInstance.off("connect");
      socketInstance.off("connect_error");
      socketInstance.off("error");
      socketInstance.off("new-order");
      socketInstance.off("order-status-updated");
      socketInstance.off("order-cancelled");
      socketInstance.off("disconnect");
      socketInstance.disconnect();
    };
  }, [user]);

  // Request notification permission
  useEffect(() => {
    if (user && typeof Notification !== 'undefined' && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("🔔 Notification permission:", permission);
      }).catch(error => {
        console.error("❌ Failed to request notification permission:", error);
      });
    }
  }, [user]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => {
        if (import.meta.env.DEV) {
          console.log("🔇 Audio play failed (this is normal if user hasn't interacted with page):", err.message);
        }
      });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.log("🔇 Notification sound failed:", err);
      }
    }
  };

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (import.meta.env.DEV) {
    console.log("📊 Current notifications:", notifications.length, "Unread:", unreadCount);
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
