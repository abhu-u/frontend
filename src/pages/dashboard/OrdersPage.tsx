import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, AlertCircle, RefreshCw, Loader2, User, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const API_BASE_URL = "https://platoo.duckdns.org/api";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrders, setUpdatingOrders] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate()
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const previousOrderCountRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  const getAuthData = () => {
    const token = localStorage.getItem('token');
    let userObj = null;
    
    try {
      const userStr = localStorage.getItem('user');
      if (userStr && userStr !== 'null') {
        userObj = JSON.parse(userStr);
      }
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
    }
    
    let userId = null;
    if (userObj && typeof userObj === 'object') {
      userId = userObj._id || userObj.id;
    }
    
    if (!userId && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.id || payload.userId || payload._id;
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
    
    return { token, user: { ...(userObj || {}), id: userId } };
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return { time: 'Just now', date: 'Today' };
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = Number(now) - Number(date);
    const diffMins = Math.floor(diffMs / 60000);
    
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'Just now';
    else if (diffMins < 60) timeAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    else {
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      }
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    const orderDate = new Date(date);
    orderDate.setHours(0, 0, 0, 0);
    
    let dateLabel = '';
    if (orderDate.getTime() === today.getTime()) {
      dateLabel = 'Today';
    } else if (orderDate.getTime() === yesterday.getTime()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
      });
    }
    
    const timeLabel = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return { time: timeAgo, date: dateLabel, fullTime: timeLabel };
  };

  const filterOrdersByDate = (ordersArray) => {
    if (dateFilter === "all") {
      return ordersArray;
    } else if (dateFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return ordersArray.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
    } else if (dateFilter === "custom") {
      const targetDate = new Date(customDate.year, customDate.month - 1, customDate.day);
      targetDate.setHours(0, 0, 0, 0);
      return ordersArray.filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === targetDate.getTime();
      });
    }
    return ordersArray;
  };

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      
      const { token, user } = getAuthData();
      
      if (!token || !user.id) {
        setError('Authentication required. Please log in.');
        setLoading(false);
        return;
      }

      const statusParam = statusFilter === "all" ? "" : statusFilter;
      const response = await fetch(`/api/orders/restaurant?status=${statusParam}&limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const ordersArray = Array.isArray(data.data) ? data.data : [];
        
        const transformedOrders = ordersArray.map(order => {
          const { time, date, fullTime } = formatDateTime(order.createdAt);
          const tableName = order.tableId?.tableName || 'Unknown';
          const itemNames = order.items?.map(item => 
            `${item.name} x${item.quantity}`
          ) || [];
          
          return {
            id: order._id,
            tableNumber: tableName,
            items: itemNames,
            itemsDetailed: order.items || [],
            total: order.totalPrice || 0,
            subtotal: order.totalPrice || 0,
            tax: 0,
            status: order.status || 'pending',
            timestamp: time,
            dateLabel: date,
            fullTime: fullTime,
            customerName: order.customerName || 'Guest',
            customerPhone: '',
            specialInstructions: order.specialInstructions || '',
            createdAt: order.createdAt,
            rawOrder: order
          };
        });
        
        const filteredOrders = filterOrdersByDate(transformedOrders);
        
        // Check if there's a new order (count increased)
        if (silent && filteredOrders.length > previousOrderCountRef.current) {
          // New order detected! Show a subtle notification or just update
          console.log('New order received!');
        }
        
        previousOrderCountRef.current = filteredOrders.length;
        setOrders(filteredOrders);
        
        if (error && filteredOrders.length > 0) {
          setError(null);
        }
      } else {
        throw new Error(data.message || 'Failed to fetch orders');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [error, statusFilter, dateFilter, customDate]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setUpdatingOrders(prev => new Set([...prev, orderId]));
      
      const { token } = getAuthData();
      
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update order status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus, timestamp: 'Just now' }
              : order
          )
        );
      } else {
        throw new Error(data.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

  const handleRefresh = () => {
    fetchOrders(false);
  };

  const handleCustomDateApply = () => {
    setDateFilter("custom");
    setShowDatePicker(false);
    fetchOrders(false);
  };

  const getDateFilterLabel = () => {
    if (dateFilter === "all") return "All Time";
    if (dateFilter === "today") return "Today";
    if (dateFilter === "custom") {
      const date = new Date(customDate.year, customDate.month - 1, customDate.day);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return "Select Date";
  };

  useEffect(() => {
    const { token, user } = getAuthData();
    
    if (token && user.id) {
      fetchOrders(false);
      
      // Set up polling to check for new orders every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchOrders(true); // Silent fetch
      }, 5000);
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else {
      setLoading(false);
      setError('Please log in to view orders');
    }
  }, [statusFilter, dateFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      case "preparing": return "bg-blue-500/20 text-blue-600 border-blue-500/30";  
      case "ready": return "bg-green-500/20 text-green-600 border-green-500/30";
      case "served": return "bg-gray-500/20 text-gray-600 border-gray-500/30";
      case "cancelled": return "bg-red-500/20 text-red-600 border-red-500/30";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "preparing": return <AlertCircle className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "served": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Live Orders</h2>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading orders...</span>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="border shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-muted rounded-xl"></div>
                    <div className="space-y-2.5 flex-1">
                      <div className="h-5 bg-muted rounded w-1/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !orders.length) {
    return (
      <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Live Orders</h2>
          <Button onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card className="border-destructive/50 bg-destructive/5 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Failed to Load Orders</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
            <Button onClick={handleRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Live Orders</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg bg-background shadow-sm hover:shadow transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-ring flex-1 sm:flex-none min-w-0"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="served">Served</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 sm:gap-2 shadow-sm hover:shadow transition-all duration-200 text-xs sm:text-sm flex-1 sm:flex-none px-2 sm:px-3">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="truncate">{getDateFilterLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-1.5rem)] sm:w-80 p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Select Date</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={dateFilter === "today" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("today");
                        setShowDatePicker(false);
                      }}
                      className="transition-all duration-200"
                    >
                      Today
                    </Button>
                    <Button
                      variant={dateFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setDateFilter("all");
                        setShowDatePicker(false);
                      }}
                      className="transition-all duration-200"
                    >
                      All Time
                    </Button>
                    <Button
                      variant={dateFilter === "custom" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter("custom")}
                      className="transition-all duration-200"
                    >
                      Custom
                    </Button>
                  </div>
                </div>
                
                {dateFilter === "custom" && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Year</label>
                        <input
                          type="number"
                          min="2020"
                          max="2030"
                          value={customDate.year}
                          onChange={(e) => setCustomDate(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Month</label>
                        <select
                          value={customDate.month}
                          onChange={(e) => setCustomDate(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {new Date(2000, i, 1).toLocaleString('en', { month: 'short' })}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Day</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={customDate.day}
                          onChange={(e) => setCustomDate(prev => ({ ...prev, day: parseInt(e.target.value) }))}
                          className="w-full px-2.5 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-200"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCustomDateApply}
                      size="sm"
                      className="w-full transition-all duration-200"
                    >
                      Apply Date Filter
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          
          <Badge variant="secondary" className="px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm text-xs sm:text-sm whitespace-nowrap">
            {statusFilter === "all" 
              ? `${orders.filter(o => o.status !== "served" && o.status !== "cancelled").length} Active` 
              : `${orders.length} ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
          </Badge>
          <Button size="sm" variant="outline" onClick={handleRefresh} className="shadow-sm hover:shadow transition-all duration-200 shrink-0 px-2 sm:px-3">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {orders.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 sm:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mb-4">
              <Clock className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No Orders Found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
              {dateFilter === "today" 
                ? "No orders have been placed today yet."
                : dateFilter === "all"
                ? "No orders have been placed yet."
                : `No orders found for ${getDateFilterLabel()}.`}
            </p>
            <Button variant="outline" onClick={handleRefresh} className="gap-2 shadow-sm hover:shadow transition-all duration-200 text-xs sm:text-sm">
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {orders.map((order) => (
            <Card 
              key={order.id} 
              className="shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary/50 animate-in fade-in slide-in-from-bottom-2"
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-primary font-bold text-xs sm:text-sm">{order.tableNumber}</span>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h4 className="font-semibold text-base sm:text-lg">{order.tableNumber}</h4>
                        {order.customerName && order.customerName !== 'Guest' && (
                          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/50 px-1.5 sm:px-2 py-0.5 rounded-md">
                            <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{order.customerName}</span>
                          </div>
                        )}
                      </div>
                      
                      <Badge className={`${getStatusColor(order.status)} text-xs border shadow-sm w-fit`}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 sm:ml-1.5 capitalize font-medium">{order.status}</span>
                      </Badge>
                      
                      <div className="text-xs sm:text-sm space-y-1 sm:space-y-1.5">
                        <p className="font-medium text-foreground/90 break-words">
                          {order.items.join(", ")}
                        </p>
                        {order.specialInstructions && (
                          <p className="text-amber-600 dark:text-amber-500 italic bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-md text-xs break-words">
                            Note: {order.specialInstructions}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                          <span className="font-bold text-lg sm:text-xl">${order.total.toFixed(2)}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="bg-muted/50 px-2 py-1 rounded whitespace-nowrap">{order.dateLabel}</span>
                            <span className="bg-muted/50 px-2 py-1 rounded whitespace-nowrap">{order.fullTime}</span>
                            <span className="bg-muted/50 px-2 py-1 rounded whitespace-nowrap">{order.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {order.status === "pending" && (
                      <Button 
                        size="sm"
                        disabled={updatingOrders.has(order.id)}
                        onClick={() => updateOrderStatus(order.id, "preparing")}
                        className="shadow-sm hover:shadow transition-all duration-200 gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        {updatingOrders.has(order.id) ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          "Start Preparing"
                        )}
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button 
                        size="sm"
                        variant="outline"
                        disabled={updatingOrders.has(order.id)}
                        onClick={() => updateOrderStatus(order.id, "ready")}
                        className="shadow-sm hover:shadow transition-all duration-200 gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        {updatingOrders.has(order.id) ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          "Mark Ready"
                        )}
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button 
                        size="sm"
                        disabled={updatingOrders.has(order.id)}
                        onClick={() => updateOrderStatus(order.id, "served")}
                        className="shadow-sm hover:shadow transition-all duration-200 gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        {updatingOrders.has(order.id) ? (
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          "Mark Served"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
