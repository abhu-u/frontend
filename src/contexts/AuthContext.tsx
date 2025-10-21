import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  restaurantName: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get API URL from environment variable
// For microservices, you can use different URLs for different services
const API_URL = import.meta.env.VITE_API_URL || 'https://wind-flat-mirror-alternatively.trycloudflare.com';
// const AUTH_API = import.meta.env.VITE_API_AUTH || 'http://localhost:5000';
// const ORDERS_API = import.meta.env.VITE_API_ORDERS || 'http://localhost:8080';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState<boolean>(true); 
  const navigate = useNavigate();

  // ✅ Memoize logout - only recreate if navigate changes
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId"); // Clean up userId too
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  // ✅ Verify token on mount and when token changes
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true; // Prevent state updates after unmount

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (!res.ok) throw new Error("Invalid token");

        const data = await res.json();
        
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          // Clear invalid token without redirecting (let PrivateRoute handle it)
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        if (!isMounted) return;
        
        // Clear invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        setToken(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      isMounted = false; // Cleanup flag
    };
  }, [token]); // ✅ ONLY depend on token, NOT logout

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);
        setToken(data.token);
        setUser(data.user);
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error(data.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
