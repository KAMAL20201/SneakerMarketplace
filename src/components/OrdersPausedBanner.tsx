import React, { useState } from "react";
import { APP_CONFIG } from "@/config/app";
import { LaunchEmailService } from "@/lib/launchEmailService";
import { X, Bell, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Slim, sticky banner shown site-wide when ORDERS_PAUSED is true.
 * Contains a brief explanation and an inline email‐signup form so
 * visitors can get notified when ordering resumes.
 *
 * Dismissible per session (sessionStorage).
 */
const STORAGE_KEY = "orders-paused-banner-dismissed";

const OrdersPausedBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!APP_CONFIG.ORDERS_PAUSED || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // sessionStorage unavailable — just hide for this render
    }
    // Notify layout to adjust padding
    window.dispatchEvent(new Event("orders-paused-dismissed"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const result = await LaunchEmailService.subscribeEmail({
        email,
        source: "orders-paused",
      });

      if (result.success || result.alreadySubscribed) {
        setStatus("success");
        setMessage(result.alreadySubscribed
          ? "You're already on the list! 🎉"
          : "You're in! We'll ping you the moment we're back. 🎉");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="relative z-50 bg-amber-50 border-b border-amber-200 text-amber-900 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:py-2">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left">
          {/* Message */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-amber-800">
            <Bell className="h-4 w-4 shrink-0 animate-bounce text-amber-600" />
            <span>
              Standard shipping orders are temporarily paused. ⚡ <strong>Instant Shipping items</strong> are still available to order!
            </span>
          </div>

          {/* Email form / success */}
          {status === "success" ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-700 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </span>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-1.5 shrink-0"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-8 w-44 sm:w-48 rounded-lg border border-amber-300 bg-white px-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-8 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="sm:hidden">Notify Me</span>
                    <span className="hidden sm:inline">Notify Me When Resumed</span>
                  </>
                )}
              </button>
            </form>
          )}

          {status === "error" && (
            <span className="text-xs text-red-600">{message}</span>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-amber-600 transition hover:bg-amber-200 hover:text-amber-800"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default OrdersPausedBanner;
