import type React from "react";

import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { generateOtp, storePendingOtp, verifyOtp } from "@/lib/adminOtp";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [pendingUserId, setPendingUserId] = useState<string>("");
  const [otpValue, setOtpValue] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await signIn(formData.email, formData.password);
      if (error) {
        toast.error(error.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        toast.error("Sign in failed. Please try again.");
        return;
      }

      // Check if this user is an admin
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminRow) {
        // Not an admin — sign them out so the session doesn't persist
        await supabase.auth.signOut();
        toast.error("Access denied. This login is for admins only.");
        return;
      }

      // Admin — generate and send OTP
      const otp = generateOtp();
      await storePendingOtp(user.id, otp);
      setPendingUserId(user.id);

      // Send OTP via email
      const { error: emailError } = await supabase.functions.invoke(
        "send-order-email",
        {
          body: {
            type: "admin_otp",
            recipient_email: formData.email,
            recipient_name: formData.email.split("@")[0],
            order_data: {
              order_id: "",
              product_title: "",
              amount: 0,
              currency: "INR",
              order_status: "pending",
            },
            template_data: {
              otp_code: otp,
            },
          },
        },
      );

      if (emailError) {
        toast.error("Failed to send OTP. Please try again.");
        await supabase.auth.signOut();
        return;
      }

      toast.success(`OTP sent to ${formData.email}`);
      setStep("otp");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingOtp(true);

    try {
      const valid = await verifyOtp(pendingUserId, otpValue.trim());
      if (!valid) {
        toast.error("Invalid or expired OTP. Please try again.");
        return;
      }

      toast.success("Welcome, admin!");
      // Redirect to orders page after successful login
      window.location.href = "/my-orders";
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await signIn(formData.email, formData.password);
      if (error || !data?.user) {
        toast.error("Could not resend OTP. Please start over.");
        setStep("credentials");
        return;
      }
      const otp = generateOtp();
      await storePendingOtp(data.user.id, otp);

      const { error: emailError } = await supabase.functions.invoke(
        "send-order-email",
        {
          body: {
            type: "admin_otp",
            recipient_email: formData.email,
            recipient_name: formData.email.split("@")[0],
            order_data: {
              order_id: "",
              product_title: "",
              amount: 0,
              currency: "INR",
              order_status: "pending",
            },
            template_data: {
              otp_code: otp,
            },
          },
        },
      );

      if (emailError) {
        toast.error("Failed to resend OTP.");
        return;
      }
      setOtpValue("");
      toast.success(`New OTP sent to ${formData.email}`);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-70px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass-card border-0 rounded-3xl shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-800">
              {step === "credentials" ? "Admin Login" : "Verify OTP"}
            </CardTitle>
            {step === "otp" && (
              <p className="text-sm text-gray-500 mt-1">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-gray-700">
                  {formData.email}
                </span>
              </p>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {step === "credentials" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-gray-700 font-semibold"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
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

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg font-semibold text-lg"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="otp"
                    className="text-gray-700 font-semibold"
                  >
                    One-Time Password
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="123456"
                      value={otpValue}
                      onChange={(e) =>
                        setOtpValue(e.target.value.replace(/\D/g, ""))
                      }
                      className="pl-12 glass-input rounded-2xl border-0 h-12 text-gray-700 placeholder:text-gray-500 tracking-[0.4em] text-center font-mono text-lg"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    The code expires in 10 minutes.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isVerifyingOtp || otpValue.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-2xl shadow-lg font-semibold text-lg"
                >
                  {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setStep("credentials")}
                    className="text-gray-500 hover:text-gray-700 underline"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    {isLoading ? "Sending..." : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
