import type React from "react";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (_err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(true);

    try {
      let result;

      switch (provider) {
        case "Google":
          result = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/`,
            },
          });
          break;
        case "Apple":
          result = await supabase.auth.signInWithOAuth({
            provider: "apple",
            options: {
              redirectTo: `${window.location.origin}/`,
            },
          });
          break;
        case "Facebook":
          result = await supabase.auth.signInWithOAuth({
            provider: "facebook",
            options: {
              redirectTo: `${window.location.origin}/`,
            },
          });
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success(`Signing in with ${provider}...`);
      }
    } catch (_err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 glass-button rounded-2xl border-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>
        </div>

        <Card className="glass-card border-0 rounded-3xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl shadow-lg">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-white"
                  fill="currentColor"
                >
                  <path d="M16.5 3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V3zM11 3c0-.83-.67-1.5-1.5-1.5S8 2.17 8 3v4c0 .83.67 1.5 1.5 1.5S11 7.83 11 7V3zM6 8.5C6 7.12 7.12 6 8.5 6h7C16.88 6 18 7.12 18 8.5v2c0 .28-.22.5-.5.5h-1v2c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2h-1c-.28 0-.5-.22-.5-.5v-2zm6 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-1.5-.67-1.5-1.5-.67-1.5-1.5-1.5S12 18.17 12 19z" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              The Plug Market
            </CardTitle>
            <div className="flex justify-center items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-600 text-sm font-medium">Secure Login</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30 bg-transparent"
                onClick={() => handleSocialLogin("Google")}
                disabled={isLoading}
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* <Button
                type="button"
                variant="outline"
                className="w-full h-12 glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30 bg-transparent"
                onClick={() => handleSocialLogin("Apple")}
                disabled={isLoading}
              >
                <svg
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Continue with Apple
              </Button> */}

              {/* <Button
                type="button"
                variant="outline"
                className="w-full h-12 glass-button border-0 rounded-2xl text-gray-700 hover:bg-white/30 bg-transparent"
                onClick={() => handleSocialLogin("Facebook")}
                disabled={isLoading}
              >
                <svg
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 24 24"
                  fill="#1877F2"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Continue with Facebook
              </Button> */}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-white/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/20 px-4 py-2 rounded-xl text-gray-600 font-semibold backdrop-blur-sm">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-12 glass-input rounded-2xl border-0 h-12 text-gray-700 placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-gray-700 font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-12 pr-12 glass-input rounded-2xl border-0 h-12 text-gray-700 placeholder:text-gray-500"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/20 rounded-xl"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/forgot-password"
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg font-semibold text-lg"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
