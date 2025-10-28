import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import OverviewPage from "./dashboard/OverviewPage";
import OrdersPage from "./dashboard/OrdersPage";
import MenuManagementPage from "./dashboard/MenuManagementPage";
import TablesPage from "./dashboard/TablesPage";
import ReservationsPage from "./dashboard/ReservationsPage";
import FeedbackPage from "./dashboard/FeedbackPage";
import StaffManagementPage from "./dashboard/StaffManagementPage";
import AnalyticsPage from "./dashboard/AnalyticsPage";
import SettingsPage from "./dashboard/SettingsPage";

const Dashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  // Close mobile sidebar when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  const handleMobileMenuToggle = () => {
    setSidebarOpen(prev => !prev);
  };

  // Show loading spinner while auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user data, show error
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      {/* Mobile Overlay with fade animation */}
      <div
        className={`
          fixed inset-0 bg-black/50 lg:hidden
          transition-opacity duration-300 ease-in-out
          ${sidebarOpen ? 'opacity-100 z-40 pointer-events-auto' : 'opacity-0 -z-10 pointer-events-none'}
        `}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar with slide animation */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0 z-50' : '-translate-x-full lg:translate-x-0'}
          lg:z-auto
        `}
      >
        <DashboardSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        {/* Mobile Close Button with fade animation */}
        <button
          onClick={() => setSidebarOpen(false)}
          className={`
            lg:hidden absolute top-4 right-4 p-2 rounded-lg 
            bg-sidebar-accent hover:bg-sidebar-accent/80 
            text-sidebar-foreground shadow-lg
            transition-opacity duration-300 ease-in-out
            ${sidebarOpen ? 'opacity-100 z-[60]' : 'opacity-0 -z-10 pointer-events-none'}
          `}
          aria-label="Close menu"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative z-30">
          <DashboardHeader 
            restaurantName={user.restaurantName || user.email || "Restaurant"}
            ownerName={user.name || "Owner"}
            ownerEmail={user.email}
            restaurantLogo={user.restaurantLogo}
            onMobileMenuClick={handleMobileMenuToggle}
          />
        </div>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index element={<OverviewPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuManagementPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="feedback" element={<FeedbackPage />} />
            <Route path="staff" element={<StaffManagementPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
