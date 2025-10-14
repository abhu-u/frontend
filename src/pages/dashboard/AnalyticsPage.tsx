import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Award,
  Download,
  Calendar,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroButton, GlassButton } from "@/components/ui/button-variants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  getDashboardAnalytics,
  getOrdersOverTime,
  getPopularHours,
  getRecentActivity,
} from "../../services/analyticsService";

const CHART_COLORS = {
  primary: "hsl(var(--chart-1))",
  success: "hsl(var(--chart-2))",
  accent: "hsl(var(--chart-3))",
  warning: "hsl(var(--chart-4))",
  danger: "hsl(var(--chart-5))",
};

const MetricCard = ({ title, value, change, trend, icon }) => {
  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="flex items-center gap-1 text-xs mt-2">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-success" />
          ) : (
            <TrendingDown className="h-3 w-3 text-destructive" />
          )}
          <span
            className={
              trend === "up" ? "text-success" : "text-destructive"
            }
          >
            {change}
          </span>
          <span className="text-muted-foreground">vs last week</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("This Week");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [metrics, setMetrics] = useState(null);
  const [ordersOverTime, setOrdersOverTime] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [popularHours, setPopularHours] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const period = dateRange === "Today" ? "today" : dateRange === "This Week" ? "week" : "month";

      const [analyticsData, ordersTimeData, hoursData, activityData] = await Promise.all([
        getDashboardAnalytics(period),
        getOrdersOverTime(period),
        getPopularHours(),
        getRecentActivity(20),
      ]);

      setMetrics({
        totalOrders: analyticsData.totalOrdersToday,
        ordersChange: analyticsData.ordersChange,
        ordersChangePositive: analyticsData.ordersChangePositive,
        totalRevenue: analyticsData.revenueToday,
        revenueChange: analyticsData.revenueChange,
        revenueChangePositive: analyticsData.revenueChangePositive,
        avgOrderValue: analyticsData.totalOrdersToday > 0 
          ? (parseFloat(analyticsData.revenueToday) / analyticsData.totalOrdersToday).toFixed(2)
          : "0.00",
        topItem: analyticsData.popularDish.name,
        topItemCount: analyticsData.popularDish.count,
      });

      setOrdersOverTime(ordersTimeData.ordersOverTime);
      setRevenueData(ordersTimeData.revenueData);
      setCategorySales(analyticsData.categorySales);
      setPopularHours(hoursData);
      setRecentOrders(activityData);

    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(err.message || "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAllData();

    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Completed":
        return <Badge variant="default">Completed</Badge>;
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = recentOrders.filter((order) =>
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.items.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToCSV = () => {
    const csvContent = [
      ["Order ID", "Date", "Table", "Items", "Amount", "Payment", "Status"],
      ...recentOrders.map(order => [
        order.id,
        order.date,
        order.table,
        order.items,
        order.amount,
        order.payment,
        order.status
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <Card className="max-w-md w-full">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                  <TrendingDown className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Failed to Load Analytics</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={fetchAllData} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your restaurant performance and insights
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <GlassButton className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {dateRange}
                </GlassButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Select Period</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDateRange("Today")}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange("This Week")}>
                  This Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateRange("This Month")}>
                  This Month
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchAllData} 
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <HeroButton className="gap-2" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </HeroButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Orders"
            value={metrics?.totalOrders?.toString() || "0"}
            change={metrics?.ordersChange || "+0%"}
            trend={metrics?.ordersChangePositive ? "up" : "down"}
            icon={<ShoppingCart className="h-4 w-4" />}
          />
          <MetricCard
            title="Total Revenue"
            value={`$${metrics?.totalRevenue || "0.00"}`}
            change={metrics?.revenueChange || "+0%"}
            trend={metrics?.revenueChangePositive ? "up" : "down"}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            title="Avg Order Value"
            value={`$${metrics?.avgOrderValue || "0.00"}`}
            change="+4.7%"
            trend="up"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <MetricCard
            title="Top Item"
            value={metrics?.topItem || "N/A"}
            change={`${metrics?.topItemCount || 0} orders`}
            trend="up"
            icon={<Award className="h-4 w-4" />}
          />
          <MetricCard
            title="Active Today"
            value={metrics?.totalOrders?.toString() || "0"}
            change="Live data"
            trend="up"
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle>Orders Over Time</CardTitle>
              <CardDescription>Daily order volume this {dateRange.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersOverTime.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No order data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={ordersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.primary, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Daily revenue performance</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.success}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.success}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Category Sales</CardTitle>
              <CardDescription>Revenue by menu category</CardDescription>
            </CardHeader>
            <CardContent>
              {categorySales.length === 0 || categorySales.every(c => c.value === 0) ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categorySales.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            Object.values(CHART_COLORS)[
                              index % Object.values(CHART_COLORS).length
                            ]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle>Popular Hours</CardTitle>
              <CardDescription>Busiest times of the day</CardDescription>
            </CardHeader>
            <CardContent>
              {popularHours.length === 0 || popularHours.every(h => h.orders === 0) ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hourly data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={popularHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="orders"
                      fill={CHART_COLORS.accent}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest orders from your restaurant</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id.slice(0, 8)}...</TableCell>
                      <TableCell>{order.date}</TableCell>
                      <TableCell>{order.table}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {order.items}
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${order.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{order.payment}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}