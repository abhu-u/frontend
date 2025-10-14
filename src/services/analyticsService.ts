// src/services/analyticsService.js

const API_BASE_URL = '/api';

const getAuthHeaders = () => {
  // Check if we're in a browser environment
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

export const getDashboardAnalytics = async (period = 'today') => {
  try {
    const headers = getAuthHeaders();
    
    const endDate = new Date();
    let startDate = new Date();
    
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/orders/restaurant?limit=1000&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch analytics data');
    }
    
    return processAnalyticsData(data.data, period);
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    throw error;
  }
};

const processAnalyticsData = (orders, period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayOrders = orders.filter(order => 
    new Date(order.createdAt) >= today
  );
  
  const yesterdayOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= yesterday && orderDate < today;
  });
  
  const totalOrdersToday = todayOrders.length;
  const totalOrdersYesterday = yesterdayOrders.length;
  const ordersChange = totalOrdersYesterday > 0 
    ? ((totalOrdersToday - totalOrdersYesterday) / totalOrdersYesterday * 100).toFixed(1)
    : 0;
  
  const revenueToday = todayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const revenueYesterday = yesterdayOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  const revenueChange = revenueYesterday > 0
    ? ((revenueToday - revenueYesterday) / revenueYesterday * 100).toFixed(1)
    : 0;
  
  const pendingOrders = todayOrders.filter(order => order.status === 'pending').length;
  
  const dishCount = {};
  todayOrders.forEach(order => {
    order.items.forEach(item => {
      dishCount[item.name] = (dishCount[item.name] || 0) + item.quantity;
    });
  });
  
  const popularDish = Object.entries(dishCount).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
  
  const recentOrders = todayOrders
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(order => ({
      id: order._id,
      tableNumber: order.tableId?.tableName || 'Unknown',
      customerName: order.customerName || 'Guest',
      items: order.items.map(item => item.name),
      total: order.totalPrice,
      status: order.status,
      timestamp: getTimeAgo(order.createdAt),
      createdAt: order.createdAt
    }));
  
  const revenueByDay = calculateRevenueByDay(orders, period);
  const categorySales = calculateCategorySales(orders);
  const leastOrderedDish = Object.entries(dishCount).sort((a, b) => a[1] - b[1])[0] || ['N/A', 0];
  
  return {
    totalOrdersToday,
    ordersChange: `${ordersChange >= 0 ? '+' : ''}${ordersChange}%`,
    ordersChangePositive: ordersChange >= 0,
    revenueToday: revenueToday.toFixed(2),
    revenueChange: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
    revenueChangePositive: revenueChange >= 0,
    pendingOrders,
    popularDish: {
      name: popularDish[0],
      count: popularDish[1]
    },
    leastOrderedDish: {
      name: leastOrderedDish[0],
      count: leastOrderedDish[1]
    },
    recentOrders,
    revenueByDay,
    categorySales
  };
};

const calculateRevenueByDay = (orders, period) => {
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const revenueMap = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    revenueMap[dayName] = 0;
  }
  
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dayName = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
    if (revenueMap.hasOwnProperty(dayName)) {
      revenueMap[dayName] += order.totalPrice;
    }
  });
  
  return Object.entries(revenueMap).map(([day, revenue]) => ({
    date: day,
    revenue: Math.round(revenue * 100) / 100
  }));
};

const calculateCategorySales = (orders) => {
  const categories = {
    mains: ['burger', 'steak', 'pasta', 'pizza', 'curry', 'salmon', 'chicken'],
    drinks: ['wine', 'beer', 'juice', 'soda', 'water', 'coffee', 'tea'],
    starters: ['salad', 'wings', 'soup', 'bread', 'appetizer'],
    desserts: ['cake', 'ice cream', 'tiramisu', 'pudding', 'dessert']
  };
  
  const sales = {
    Mains: 0,
    Drinks: 0,
    Starters: 0,
    Desserts: 0
  };
  
  orders.forEach(order => {
    order.items.forEach(item => {
      const itemName = item.name.toLowerCase();
      let categorized = false;
      
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => itemName.includes(keyword))) {
          const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
          sales[categoryName] += item.price * item.quantity;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        sales.Mains += item.price * item.quantity;
      }
    });
  });
  
  const total = Object.values(sales).reduce((sum, val) => sum + val, 0);
  
  return Object.entries(sales).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0
  }));
};

export const getOrdersOverTime = async (period = 'week') => {
  try {
    const headers = getAuthHeaders();
    
    const endDate = new Date();
    let startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/orders/restaurant?limit=1000&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders data');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch orders data');
    }
    
    return processOrdersOverTime(data.data, period);
  } catch (error) {
    console.error('Error fetching orders over time:', error);
    throw error;
  }
};

const processOrdersOverTime = (orders, period) => {
  const days = period === 'week' ? 7 : 30;
  const dataMap = {};
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    dataMap[dayName] = { orders: 0, revenue: 0 };
  }
  
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dayName = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
    if (dataMap[dayName]) {
      dataMap[dayName].orders += 1;
      dataMap[dayName].revenue += order.totalPrice;
    }
  });
  
  return {
    ordersOverTime: Object.entries(dataMap).map(([date, data]) => ({
      date,
      orders: data.orders
    })),
    revenueData: Object.entries(dataMap).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100
    }))
  };
};

export const getPopularHours = async () => {
  try {
    const headers = getAuthHeaders();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const response = await fetch(
      `${API_BASE_URL}/orders/restaurant?limit=1000&startDate=${today.toISOString()}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch popular hours data');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch popular hours data');
    }
    
    return processPopularHours(data.data);
  } catch (error) {
    console.error('Error fetching popular hours:', error);
    throw error;
  }
};

const processPopularHours = (orders) => {
  const hours = ['11am', '12pm', '1pm', '2pm', '6pm', '7pm', '8pm', '9pm'];
  const hourMap = {};
  
  hours.forEach(hour => {
    hourMap[hour] = 0;
  });
  
  orders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const hour = orderDate.getHours();
    
    let hourLabel;
    if (hour === 11) hourLabel = '11am';
    else if (hour === 12) hourLabel = '12pm';
    else if (hour === 13) hourLabel = '1pm';
    else if (hour === 14) hourLabel = '2pm';
    else if (hour === 18) hourLabel = '6pm';
    else if (hour === 19) hourLabel = '7pm';
    else if (hour === 20) hourLabel = '8pm';
    else if (hour === 21) hourLabel = '9pm';
    
    if (hourLabel && hourMap.hasOwnProperty(hourLabel)) {
      hourMap[hourLabel] += 1;
    }
  });
  
  return Object.entries(hourMap).map(([hour, orders]) => ({
    hour,
    orders
  }));
};

export const getRecentActivity = async (limit = 10) => {
  try {
    const headers = getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE_URL}/orders/restaurant?limit=${limit}`,
      { headers }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent activity');
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch recent activity');
    }
    
    return data.data.map(order => ({
      id: order._id,
      date: new Date(order.createdAt).toISOString().split('T')[0],
      table: order.tableId?.tableName || 'Unknown',
      items: order.items.map(item => `${item.name} x${item.quantity}`).join(', '),
      amount: order.totalPrice,
      payment: 'Card',
      status: order.status === 'served' ? 'Completed' : order.status === 'cancelled' ? 'Cancelled' : 'Pending'
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

const getTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};