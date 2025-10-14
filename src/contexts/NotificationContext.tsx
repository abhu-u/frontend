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

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  // Load notifications from localStorage on mount
  const [notifications, setNotifications] = useState<OrderNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Failed to load notifications from localStorage:", error);
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
      console.error("Failed to save notifications to localStorage:", error);
    }
  }, [notifications]);

  // Connect to Socket.io when user is authenticated
  useEffect(() => {
    console.log("=== NOTIFICATION CONTEXT DEBUG ===");
    console.log("Full user object:", user);
    console.log("user.id:", user?.id);
    if (user) {
      const keys = Object.keys(user);
      console.log("All user properties:", keys);
      keys.forEach(key => {
        console.log(`  ${key}:`, user[key as keyof typeof user]);
      });
    }
    
    // Try both id and _id for compatibility
    const userId = (user as Record<string, unknown>)?._id as string | undefined || user?.id;
    
    if (!userId) {
      console.log("❌ No user ID found - skipping socket connection");
      return;
    }

    console.log("✅ Connecting socket to:", API_URL);
    console.log("✅ With user ID:", userId);

    const socketInstance = io(API_URL, {
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket connected successfully! Socket ID:", socketInstance.id);
      console.log("📡 Joining room: restaurant-" + userId);
      socketInstance.emit("join-restaurant", userId);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    socketInstance.on("new-order", (data) => {
      console.log("🔔 NEW ORDER EVENT RECEIVED!", data);

      const newNotification: OrderNotification = {
        id: `${data.orderId}-${Date.now()}`,
        orderId: data.orderId,
        tableNumber: data.tableNumber,
        customerName: data.customerName,
        items: data.items,
        totalPrice: data.totalPrice,
        itemCount: data.itemCount,
        timestamp: new Date(data.timestamp).toLocaleTimeString(),
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
      if (Notification.permission === "granted") {
        new Notification("New Order!", {
          body: `Table ${data.tableNumber} - ${data.customerName} (${data.itemCount} items)`,
          icon: "/qr-icon.png",
        });
      }
    });

    socketInstance.on("order-status-updated", (data) => {
      console.log("🔄 Order status updated:", data);
    });

    socketInstance.on("order-cancelled", (data) => {
      console.log("❌ Order cancelled:", data);
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    setSocket(socketInstance);

    return () => {
      console.log("🧹 Cleaning up socket connection");
      socketInstance.disconnect();
    };
  }, [user]);

  // Request notification permission
  useEffect(() => {
    if (user && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("🔔 Notification permission:", permission);
      });
    }
  }, [user]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((err) => console.log("🔇 Audio play failed:", err));
    } catch (err) {
      console.log("🔇 Notification sound failed:", err);
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

  console.log("📊 Current notifications count:", notifications.length, "Unread:", unreadCount);

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