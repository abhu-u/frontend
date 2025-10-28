import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  ShoppingBag,
  Menu as MenuIcon,
  Calendar,
  Users,
  Star,
  Settings,
  ChevronLeft,
  Home,
  QrCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Orders",
    href: "/dashboard/orders",
    icon: ShoppingBag,
    badge: 3
  },
  {
    title: "Menu Management",
    href: "/dashboard/menu",
    icon: MenuIcon,
  },
  {
    title: "Tables & QR Codes",
    href: "/dashboard/tables",
    icon: QrCode,
  },
  {
    title: "Reservations",
    href: "/dashboard/reservations",
    icon: Calendar,
  },
  {
    title: "Customers & Feedback",
    href: "/dashboard/feedback",
    icon: Star,
  },
  {
    title: "Staff Management",
    href: "/dashboard/staff",
    icon: Users,
  },
  {
    title: "Analytics & Reports",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const DashboardSidebar = ({ collapsed, onToggle }: DashboardSidebarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col h-full",
        // Mobile: always full width (256px)
        // Desktop (lg+): responsive to collapsed prop
        "w-64",
        collapsed ? "lg:w-16" : "lg:w-64"
      )}
    >
      {/* Collapse Toggle - Desktop Only */}
      <div className="hidden lg:block p-4 border-b border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = currentPath === item.href || 
                          (item.href !== "/dashboard" && currentPath.startsWith(item.href));
          
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center px-3 py-2 rounded-lg transition-colors group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-sidebar-primary" : "text-sidebar-foreground"
                )} 
              />
              {/* Show text on mobile always, on desktop only when not collapsed */}
              <span className={cn(
                "font-medium flex-1 ml-3",
                "lg:hidden", // Always show on mobile
                !collapsed && "lg:inline" // Show on desktop when expanded
              )}>
                {item.title}
              </span>
              
              {/* Badge - same logic as text */}
              {item.badge && (
                <span className={cn(
                  "bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-5 h-5 flex items-center justify-center ml-2",
                  "lg:hidden", // Always show on mobile
                  !collapsed && "lg:flex" // Show on desktop when expanded
                )}>
                  {item.badge}
                </span>
              )}
              
              {/* Tooltip for collapsed state - Desktop only */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-sidebar text-sidebar-foreground text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 hidden lg:block shadow-lg border border-sidebar-border">
                  {item.title}
                  {item.badge && (
                    <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - hide on mobile, show on desktop when expanded */}
      <div className={cn(
        "p-4 border-t border-sidebar-border",
        "hidden", // Hide on mobile
        !collapsed && "lg:block" // Show on desktop when expanded
      )}>
        <div className="text-xs text-muted-foreground text-center">
          <p>QRMenu Dashboard</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </aside>
  );
};
