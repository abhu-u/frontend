import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroButton, GlassButton } from "@/components/ui/button-variants";
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  ShoppingBag,
  Star,
  Plus,
  Eye,
  Users,
  ChefHat,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw
} from "lucide-react";
import { getDashboardAnalytics } from "@/services/analyticsService";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "status-pending";
    case "preparing": return "status-preparing";
    case "ready": return "status-ready";
    case "served": return "status-completed";
    case "cancelled": return "bg-red-500/20 text-red-600 border-red-500/30";
    default: return "bg-muted";
  }
};

export const DashboardOverview = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardAnalytics('today');
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !analytics) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex items-center justify-center h-96">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                <ArrowDown className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Failed to Load Dashboard</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={fetchAnalytics} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            Welcome back! Here's what's happening at your restaurant today.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <GlassButton>
            <Eye className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View Menu</span>
            <span className="sm:hidden">Menu</span>
          </GlassButton>
          <HeroButton>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add New Dish</span>
            <span className="sm:hidden">Add</span>
          </HeroButton>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="card-glass border-0">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-sm font-medium">Total Orders Today</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground mt-2">
                  {analytics?.totalOrdersToday || 0}
                </p>
                <div className={`flex items-center text-xs lg:text-sm mt-1 ${analytics?.ordersChangePositive ? 'text-success' : 'text-destructive'}`}>
                  {analytics?.ordersChangePositive ? (
                    <ArrowUp className="h-4 w-4 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1 flex-shrink-0" />
                  )}
                  <span className="truncate">{analytics?.ordersChange || '0%'} from yesterday</span>
                </div>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <ShoppingBag className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-sm font-medium">Revenue Today</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground mt-2">
                  ${analytics?.revenueToday || '0.00'}
                </p>
                <div className={`flex items-center text-xs lg:text-sm mt-1 ${analytics?.revenueChangePositive ? 'text-success' : 'text-destructive'}`}>
                  {analytics?.revenueChangePositive ? (
                    <ArrowUp className="h-4 w-4 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="h-4 w-4 mr-1 flex-shrink-0" />
                  )}
                  <span className="truncate">{analytics?.revenueChange || '0%'} from yesterday</span>
                </div>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-sm font-medium">Pending Orders</p>
                <p className="text-2xl lg:text-3xl font-bold text-foreground mt-2">
                  {analytics?.pendingOrders || 0}
                </p>
                <div className="flex items-center text-xs lg:text-sm text-warning mt-1">
                  <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{analytics?.pendingOrders > 0 ? 'Needs attention' : 'All clear'}</span>
                </div>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-warning/10 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass border-0">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-sm font-medium">Popular Dish</p>
                <p className="text-base lg:text-lg font-bold text-foreground mt-2 truncate">
                  {analytics?.popularDish?.name || 'N/A'}
                </p>
                <div className="flex items-center text-xs lg:text-sm text-primary mt-1">
                  <ChefHat className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{analytics?.popularDish?.count || 0} orders today</span>
                </div>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-orange-secondary rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                <Star className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2 card-glass border-0">
          <CardHeader className="flex flex-row items-center justify-between p-4 lg:p-6">
            <CardTitle className="text-foreground text-base lg:text-lg">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs lg:text-sm">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            {analytics?.recentOrders?.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders yet today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics?.recentOrders?.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3 lg:space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">{order.tableNumber}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{order.customerName}</p>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {order.items.join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.timestamp}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="font-semibold text-foreground">${order.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Table {order.tableNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Sales Chart Placeholder */}
          <Card className="card-glass border-0">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-foreground flex items-center text-base lg:text-lg">
                <TrendingUp className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                <span className="truncate">Sales Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chart Coming Soon</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">This Week</span>
                  <span className="font-semibold text-foreground">
                    ${analytics?.revenueByDay?.reduce((sum, day) => sum + day.revenue, 0).toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Today</span>
                  <span className="font-semibold text-muted-foreground">${analytics?.revenueToday || '0.00'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Insights */}
          <Card className="card-glass border-0">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-foreground text-base lg:text-lg">Menu Insights</CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowUp className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Most Ordered</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {analytics?.popularDish?.name || 'N/A'} - {analytics?.popularDish?.count || 0} orders
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowDown className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Least Ordered</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {analytics?.leastOrderedDish?.name || 'N/A'} - {analytics?.leastOrderedDish?.count || 0} order
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Feedback */}
          <Card className="card-glass border-0">
            <CardHeader className="p-4 lg:p-6">
              <CardTitle className="text-foreground flex items-center text-base lg:text-lg">
                <Star className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                <span className="truncate">Recent Feedback</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-3">
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2 flex-wrap">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <p className="text-sm text-foreground">"Amazing food and great service!"</p>
                  <p className="text-xs text-muted-foreground mt-1">- Sarah W.</p>
                </div>
                
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2 flex-wrap">
                    <div className="flex">
                      {[...Array(4)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-muted-foreground">5 hours ago</span>
                  </div>
                  <p className="text-sm text-foreground">"Good food, quick service."</p>
                  <p className="text-xs text-muted-foreground mt-1">- Mike J.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="card-glass border-0">
        <CardHeader className="p-4 lg:p-6">
          <CardTitle className="text-foreground text-base lg:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <Plus className="h-6 w-6" />
              <span>Add New Dish</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <Users className="h-6 w-6" />
              <span>Manage Staff</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
