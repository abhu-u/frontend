import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Loader2, 
  CheckCircle,
  Utensils,
  User,
  MessageSquare,
  Check,
  Search,
  X,
  ChevronRight,
  Leaf,
  DollarSign,
  SlidersHorizontal,
  Bell
} from "lucide-react";

const API_BASE_URL = "https://wind-flat-mirror-alternatively.trycloudflare.com/api";

const CustomerOrderPage = () => {
  const getTableIdFromUrl = () => {
  const pathSegments = window.location.pathname.split('/').filter(Boolean); // Remove empty strings
  const tableId = pathSegments[pathSegments.length - 1];
  
  console.log('Extracted tableId:', tableId);
  
  // Validate tableId
  if (!tableId || tableId === 'order' || tableId === 'customer') {
    console.error('Invalid tableId extracted from URL');
    return null;
  }
  
  return tableId;
};

  const [tableId] = useState(getTableIdFromUrl());
  const [loading, setLoading] = useState(true);
  const [restaurantData, setRestaurantData] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [menuSections, setMenuSections] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showVegOnly, setShowVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/menu/table/${tableId}`);
        const data = await response.json();
        
        if (data.success) {
          setRestaurantData(data.data.restaurant);
          setTableData(data.data.table);
          setMenuSections(data.data.menu);
        } else {
          console.error("Failed to load menu:", data.message);
        }
      } catch (error) {
        console.error("Error loading menu:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMenuData();
  }, [tableId]);

  // Poll for order status updates
  useEffect(() => {
    if (!orderId) return;

    const pollOrderStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/customer/${orderId}/status`);
        const data = await response.json();
        
        if (data.success) {
          setOrderStatus(data.data.status);
        }
      } catch (error) {
        console.error("Error polling order status:", error);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(pollOrderStatus, 3000);
    
    // Initial poll
    pollOrderStatus();

    return () => clearInterval(interval);
  }, [orderId]);

  const addToCart = (item, selectedAddons = []) => {
    const cartItem = {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      addons: selectedAddons,
      isVeg: item.isVeg
    };

    setCart(prev => [...prev, cartItem]);
  };

  const updateQuantity = (cartItemId, change) => {
    setCart(prev => prev.map(item => {
      if (item.id === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + change);
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const getItemTotal = (item) => {
    const basePrice = item.price;
    const addonsPrice = item.addons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    return (basePrice + addonsPrice) * item.quantity;
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + getItemTotal(item), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const applyPriceFilter = (price) => {
    if (priceFilter === "all") return true;
    if (priceFilter === "under10") return price < 10;
    if (priceFilter === "10to20") return price >= 10 && price <= 20;
    if (priceFilter === "over20") return price > 20;
    return true;
  };

  const getFilteredMenu = () => {
    return menuSections.map(section => ({
      ...section,
      items: section.items.filter(item => {
        const matchesCategory = selectedCategory === "all" || section.name.toLowerCase().includes(selectedCategory.toLowerCase());
        const matchesVeg = !showVegOnly || item.isVeg;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             item.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPrice = applyPriceFilter(item.price);
        return matchesCategory && matchesVeg && matchesSearch && matchesPrice;
      })
    })).filter(section => section.items.length > 0);
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setShowVegOnly(false);
    setPriceFilter("all");
    setSearchQuery("");
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (selectedCategory !== "all") count++;
    if (showVegOnly) count++;
    if (priceFilter !== "all") count++;
    if (searchQuery) count++;
    return count;
  };

  const callWaiter = async () => {
    try {
      setIsCallingWaiter(true);
      
      const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}/call-waiter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName: customerName || "Guest"
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setWaiterCalled(true);
        setTimeout(() => setWaiterCalled(false), 5000);
      } else {
        alert(data.message || "Failed to call waiter. Please try again.");
      }
      
    } catch (error) {
      console.error("Error calling waiter:", error);
      alert("Failed to call waiter. Please try again.");
    } finally {
      setIsCallingWaiter(false);
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert("Please add items to your cart before placing an order.");
      return;
    }

    try {
      setIsPlacingOrder(true);
      
      const orderItems = cart.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        addons: item.addons.map(addon => addon.name)
      }));

      const response = await fetch(`${API_BASE_URL}/orders/table/${tableId}/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: orderItems,
          customerName: customerName || "Guest",
          specialInstructions: specialInstructions
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setOrderId(data.data._id);
        setOrderStatus(data.data.status);
        setOrderPlaced(true);
        setCart([]);
        setShowCart(false);
      } else {
        alert(data.message || "Failed to place order. Please try again.");
      }
      
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-orange-500 text-white";
      case "preparing": return "bg-blue-500 text-white";
      case "ready": return "bg-green-500 text-white";
      case "served": return "bg-gray-500 text-white";
      default: return "bg-orange-500 text-white";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending": return "Order Received";
      case "preparing": return "Preparing Your Order";
      case "ready": return "Order Ready";
      case "served": return "Served";
      default: return "Processing";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Loading Menu</h2>
          <p className="text-muted-foreground">Preparing your dining experience...</p>
        </div>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
        <Card className="max-w-md w-full text-center shadow-strong border-0 animate-scale-in">
          <CardContent className="p-10">
            <div className="relative mb-6">
              <CheckCircle className="h-20 w-20 text-success mx-auto" />
              <div className="absolute inset-0 blur-2xl bg-success/30 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">Order Confirmed!</h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Your order has been sent to the kitchen.
            </p>
            <div className="bg-secondary rounded-xl p-6 mb-6 border border-border">
              <p className="font-bold text-foreground text-xl mb-1">
                {restaurantData?.name}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {tableData?.tableName}
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Order ID:</span>
                <span className="text-sm font-mono font-bold text-foreground">
                  {orderId?.slice(-8).toUpperCase()}
                </span>
              </div>

              <div className="mb-4">
                <Badge className={`${getStatusColor(orderStatus)} text-base px-4 py-2`}>
                  {getStatusText(orderStatus)}
                </Badge>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Status updates automatically</p>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">Live tracking active</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={callWaiter}
                disabled={isCallingWaiter || waiterCalled}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isCallingWaiter ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Calling...
                  </>
                ) : waiterCalled ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2 text-success" />
                    Waiter Notified!
                  </>
                ) : (
                  <>
                    <Bell className="h-5 w-5 mr-2" />
                    Call Waiter
                  </>
                )}
              </Button>

              <Button 
                onClick={() => {
                  setOrderPlaced(false);
                  setOrderId(null);
                  setOrderStatus("pending");
                }} 
                className="w-full"
                size="lg"
              >
                Place Another Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredMenu = getFilteredMenu();

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Mobile-Optimized Header */}
      <div className="sticky top-0 z-50 backdrop-blur-glass border-b border-border shadow-soft bg-background/95">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="bg-gradient-primary p-2 rounded-lg shadow-soft flex-shrink-0">
                <Utensils className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-foreground truncate">
                  {restaurantData?.name || "Restaurant"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {tableData?.tableName}
                </p>
              </div>
            </div>
            <Button
              onClick={callWaiter}
              disabled={isCallingWaiter || waiterCalled}
              variant={waiterCalled ? "success" : "outline"}
              size="sm"
              className="shadow-soft flex-shrink-0"
            >
              {isCallingWaiter ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : waiterCalled ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Called</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Call Waiter</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        {/* Mobile Search */}
        <div className="mb-3 animate-slide-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-2 bg-card shadow-soft text-base"
            />
          </div>
        </div>

        {/* Quick Filters Row */}
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
          <Button
            onClick={() => setShowVegOnly(!showVegOnly)}
            variant={showVegOnly ? "success" : "outline"}
            size="sm"
            className="whitespace-nowrap shadow-soft h-9"
          >
            <Leaf className="h-3.5 w-3.5 mr-1.5" />
            Veg Only
          </Button>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="whitespace-nowrap shadow-soft h-9"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {activeFiltersCount() > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 text-xs flex items-center justify-center">
                {activeFiltersCount()}
              </Badge>
            )}
          </Button>

          {activeFiltersCount() > 0 && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="whitespace-nowrap h-9"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <Card className="mb-4 border-2 shadow-medium animate-slide-up">
            <CardContent className="p-4 space-y-4">
              {/* Price Filter */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={priceFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriceFilter("all")}
                    className="h-9 text-xs"
                  >
                    All Prices
                  </Button>
                  <Button
                    variant={priceFilter === "under10" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriceFilter("under10")}
                    className="h-9 text-xs"
                  >
                    Under $10
                  </Button>
                  <Button
                    variant={priceFilter === "10to20" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriceFilter("10to20")}
                    className="h-9 text-xs"
                  >
                    $10 - $20
                  </Button>
                  <Button
                    variant={priceFilter === "over20" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriceFilter("over20")}
                    className="h-9 text-xs"
                  >
                    Over $20
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Category Pills */}
        <div className="flex overflow-x-auto gap-2 pb-3 mb-6 scrollbar-hide -mx-3 px-3">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className="whitespace-nowrap shadow-soft h-9 text-sm"
          >
            All Items
          </Button>
          {menuSections.map((section) => (
            <Button
              key={section.id}
              variant={selectedCategory === section.name.toLowerCase() ? "default" : "outline"}
              onClick={() => setSelectedCategory(section.name.toLowerCase())}
              className="whitespace-nowrap shadow-soft h-9 text-sm"
            >
              {section.name}
            </Button>
          ))}
        </div>

        {/* Mobile Menu Items */}
        {filteredMenu.length === 0 ? (
          <Card className="text-center py-12 border-0 shadow-medium bg-card/80 backdrop-blur">
            <CardContent>
              <Utensils className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-2">No items found</h3>
              <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters</p>
              {activeFiltersCount() > 0 && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredMenu.map((section) => (
              <div key={section.id} className="animate-fade-in">
                <div className="flex items-center gap-2 mb-4 sticky top-16 bg-background/95 backdrop-blur-sm py-2 z-10 -mx-3 px-3">
                  <div className="h-1 w-8 bg-gradient-primary rounded-full" />
                  <h2 className="text-xl font-bold text-foreground">{section.name}</h2>
                  <div className="h-1 flex-1 bg-gradient-primary/20 rounded-full" />
                </div>
                
                <div className="space-y-4">
                  {section.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-50 px-3 animate-slide-up">
          <Button 
            onClick={() => setShowCart(true)}
            size="lg"
            className="w-full h-14 shadow-strong hover:shadow-glow text-base font-bold"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            View Cart ({getCartItemCount()})
            <span className="ml-auto text-lg">${getCartTotal().toFixed(2)}</span>
          </Button>
        </div>
      )}

      {/* Mobile-Optimized Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="w-full h-full max-w-full max-h-full m-0 rounded-none p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-primary p-1.5 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-primary-foreground" />
                </div>
                <span>Your Order</span>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 text-sm px-2 py-0.5">
                {getCartItemCount()}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Your cart is empty
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
                          <div className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                            item.isVeg 
                              ? 'bg-success border-success' 
                              : 'bg-destructive border-destructive'
                          }`} />
                        </div>
                        <p className="text-xs text-primary font-semibold mb-1">${item.price.toFixed(2)} each</p>
                        {item.addons.length > 0 && (
                          <div className="space-y-0.5 mb-2">
                            {item.addons.map((addon, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                <Plus className="h-2.5 w-2.5" />
                                <span className="truncate">{addon.name} {addon.price > 0 && `(+${addon.price.toFixed(2)})`}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(item.id)}
                        className="h-8 w-8 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-background rounded-lg p-0.5 shadow-soft">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-8 w-8"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-8 w-8"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        ${getItemTotal(item).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-border px-4 py-4 space-y-3 bg-secondary/30 flex-shrink-0">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Your Name (Optional)
                  </label>
                  <Input
                    placeholder="Enter your name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="border-2 bg-card h-10 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Special Instructions (Optional)
                  </label>
                  <Textarea
                    placeholder="Any special requests..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={2}
                    className="border-2 bg-card resize-none text-sm"
                  />
                </div>
              </div>

              <div className="bg-card rounded-xl p-3 shadow-soft border border-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-muted-foreground">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
                
                <Button
                  onClick={placeOrder}
                  disabled={isPlacingOrder}
                  variant="success"
                  className="w-full h-12 text-base"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Placing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MenuItemCard = ({ item, onAddToCart }) => {
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [showAddons, setShowAddons] = useState(false);

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.name === addon.name);
      if (exists) {
        return prev.filter(a => a.name !== addon.name);
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleAddToCart = () => {
    onAddToCart(item, selectedAddons);
    setSelectedAddons([]);
    setShowAddons(false);
  };

  const getItemTotalWithAddons = () => {
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
    return item.price + addonsTotal;
  };

  return (
    <Card className="group bg-card border-0 shadow-medium hover:shadow-strong transition-all duration-300 overflow-hidden active:scale-[0.98]">
      <CardContent className="p-0">
        <div className="flex flex-col">
          <div className="w-full h-40 relative overflow-hidden">
            {item.image ? (
              <img 
                src={`https://wind-flat-mirror-alternatively.trycloudflare.com${item.image}`} 
                alt={item.name} 
                className="w-full h-full object-cover group-active:scale-105 transition-transform duration-300" 
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 group-hover:opacity-80 transition-opacity" />
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                  <Utensils className="h-10 w-10 text-muted-foreground/50" />
                </div>
              </>
            )}
            <div className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-3 flex items-center justify-center shadow-medium ${
              item.isVeg 
                ? 'bg-white border-success' 
                : 'bg-white border-destructive'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                item.isVeg ? 'bg-success' : 'bg-destructive'
              }`} />
            </div>
            <div className="absolute top-2 right-2 bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-medium">
              <p className="text-base font-bold text-primary-foreground">${item.price.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="p-3">
            <div className="mb-3">
              <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-primary transition-colors leading-tight">
                {item.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>
            
            <div className="space-y-2">
              {item.addons && item.addons.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddons(!showAddons)}
                  className="w-full h-9 shadow-soft text-xs"
                >
                  {showAddons ? 'Hide Options' : 'Customize'}
                  <ChevronRight className={`h-3.5 w-3.5 ml-1 transition-transform ${showAddons ? 'rotate-90' : ''}`} />
                </Button>
              )}
              <Button 
                onClick={handleAddToCart}
                className="w-full h-10 shadow-soft hover:shadow-medium text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Cart • ${getItemTotalWithAddons().toFixed(2)}
              </Button>
            </div>
            
            {showAddons && item.addons && item.addons.length > 0 && (
              <div className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border animate-slide-up">
                <h4 className="font-bold text-foreground text-xs mb-2 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Customize your order
                </h4>
                <div className="space-y-2">
                  {item.addons.map((addon, index) => (
                    <label 
                      key={index} 
                      className="flex items-center justify-between cursor-pointer hover:bg-card p-2 rounded-lg transition-colors active:scale-95"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedAddons.some(a => a.name === addon.name)}
                          onChange={() => toggleAddon(addon)}
                          className="w-4 h-4 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 flex-shrink-0"
                        />
                        <span className="text-xs font-medium text-foreground truncate">
                          {addon.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary ml-2 flex-shrink-0">
                        {addon.price > 0 ? `+${addon.price.toFixed(2)}` : 'Free'}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedAddons.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-muted-foreground">Total with add-ons:</span>
                      <span className="text-base font-bold text-primary">${getItemTotalWithAddons().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerOrderPage;
