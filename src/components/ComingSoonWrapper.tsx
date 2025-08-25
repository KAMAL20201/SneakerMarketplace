import React from "react";
import { APP_CONFIG } from "../config/app";
import { supabase } from "@/lib/supabase";
import { LaunchEmailService } from "@/lib/launchEmailService";

interface ComingSoonWrapperProps {
  children: React.ReactNode;
}

const ComingSoonWrapper: React.FC<ComingSoonWrapperProps> = ({ children }) => {
  // Check if we should show coming soon page
  const isComingSoon = APP_CONFIG.IS_COMING_SOON;
  const [email, setEmail] = React.useState("");
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = React.useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setSubscriptionMessage("");

    try {
      // Use the service to handle email subscription
      const result = await LaunchEmailService.subscribeEmail({
        email,
        source: "coming-soon-page",
      });
      console.log(result);

      if (result.success) {
        setIsSubscribed(true);
        setEmail("");
        setSubscriptionMessage(result.message);

        // Send to Supabase Edge Function for email processing
        const { error: functionError } = await supabase.functions.invoke(
          "subscribe",
          {
            body: {
              email: email.toLowerCase().trim(),
              source: "coming-soon-page",
              timestamp: new Date().toISOString(),
            },
          }
        );

        if (functionError) {
          console.warn(
            "Email function error (non-critical):",
            functionError.message
          );
          // Don't throw error here as the email was successfully stored
        }
      } else {
        setSubscriptionMessage(result.message);
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error("Subscription error:", error);
      setSubscriptionMessage("Failed to subscribe. Please try again.");
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  // If not coming soon, show the actual website
  if (!isComingSoon) {
    return <>{children}</>;
  }

  // Otherwise, show the coming soon page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 opacity-50 animate-pulse"></div>

            {/* Logo icon - Electric plug representing "The Plug" */}
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 text-white relative z-10"
              fill="currentColor"
            >
              <path d="M16.5 3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V3zM11 3c0-.83-.67-1.5-1.5-1.5S8 2.17 8 3v4c0 .83.67 1.5 1.5 1.5S11 7.83 11 7V3zM6 8.5C6 7.12 7.12 6 8.5 6h7C16.88 6 18 7.12 18 8.5v2c0 .28-.22.5-.5.5h-1v2c0 2.21-1.79 4-4 4s-4-1.79-4-2v-2h-1c-.28 0-.5-.22-.5-.5v-2zm6 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-1.5-.67-1.5-1.5-.67-1.5-1.5-1.5S12 18.17 12 19z" />
            </svg>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer"></div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">
            {APP_CONFIG.APP_NAME}
          </h1>
          <p className="text-lg text-gray-600">{APP_CONFIG.APP_DESCRIPTION}</p>
        </div>

        {/* Coming Soon Message */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Coming Soon
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            We're working hard to bring you the best marketplace experience for
            sneakers, streetwear, and collectibles. Get ready for exclusive
            drops, authentic products, and seamless transactions.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-purple-200 shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">
              Authentic Products
            </h3>
            <p className="text-sm text-gray-600">
              Verified sneakers from trusted sellers
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-pink-200 shadow-lg hover:scale-105 transition-all duration-300">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-pink-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-1">Fast & Secure</h3>
            <p className="text-sm text-gray-600">
              Quick transactions with buyer protection
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200 shadow-lg mb-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              How It Works
            </h3>
            <p className="text-gray-600 text-sm">
              Your money is safe with our secure escrow system
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-sm text-center hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-3">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                Secure Payment
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Buyer pays and we hold the money securely until you're satisfied
              </p>
            </div>

            <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-sm text-center hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mb-3">
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                Money Protected
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your payment is safe with us - no risk of losing your money
              </p>
            </div>

            <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-sm text-center hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 mb-3">
                <svg
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                1 Day to Approve
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                You have 24 hours to inspect and approve your purchase
              </p>
            </div>

            <div className="bg-white/60 p-4 rounded-2xl backdrop-blur-sm text-center hover:scale-105 transition-all duration-300">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mb-3">
                <svg
                  className="h-5 w-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                Money Released
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Once approved, seller gets paid. If not satisfied, full refund
              </p>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-purple-200 shadow-lg">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Get Notified When We Launch
          </h3>

          {isSubscribed ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-green-700 font-medium">
                {subscriptionMessage || "You're on the list! 🎉"}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                We'll notify you as soon as we launch.
              </p>
              <button
                onClick={() => setIsSubscribed(false)}
                className="text-purple-600 hover:text-purple-700 text-sm mt-2 underline"
              >
                Subscribe another email
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-2 rounded-xl border border-purple-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? "Subscribing..." : "Notify Me"}
              </button>
            </form>
          )}
        </div>

        {/* Social Links */}
        <div className="mt-8 flex justify-center">
          <a
            href="https://instagram.com/the.plugmarket"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-700 transition-colors duration-200 hover:scale-110"
            aria-label="Follow us on Instagram"
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-purple-200">
          <p className="text-gray-500 text-sm">
            © 2025 The Plug Market. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonWrapper;
