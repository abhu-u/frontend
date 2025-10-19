import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeroButton } from "@/components/ui/button-variants";
import { QrCode, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // ✅ Use auth context

  // ✅ Redirect if already logged in (wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("https://logic-lobby-fioricet-sunglasses.trycloudflare.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Store both token + userId
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.user.id);

        // ✅ Let AuthContext detect token change and navigate
        // The useEffect in AuthContext will update user state
        // and navigate to dashboard
        
        // Force a small delay to let AuthContext's useEffect trigger
        setTimeout(() => {
          window.location.href = "/dashboard"; // Force full reload to trigger auth check
        }, 100);
      } else {
        setError(data.message || data.errors?.[0]?.msg || "Login failed");
      }
    } catch (err) {
      setError("Network error, try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <QrCode className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">QRMenu</span>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Sign in to your restaurant dashboard
          </p>
        </div>

        {/* Login Form */}
        <Card className="card-glass border-0">
          <CardHeader>
            <CardTitle className="text-center text-foreground">
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="transition-smooth focus:ring-primary"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="transition-smooth focus:ring-primary pr-10"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <HeroButton type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </HeroButton>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
