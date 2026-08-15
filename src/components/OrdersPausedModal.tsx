import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { LaunchEmailService } from "@/lib/launchEmailService";
import { Wrench, CheckCircle2, Loader2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrdersPausedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Friendly modal shown when a user clicks "Buy Now" or "Add to Cart"
 * while ordering is paused. Explains the situation and offers an
 * email signup so the user is notified when we're back.
 */
const OrdersPausedModal: React.FC<OrdersPausedModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

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
        setMessage(
          result.alreadySubscribed
            ? "You're already on the list! We'll notify you soon. 🎉"
            : "You're in! We'll email you the moment we're back. 🎉"
        );
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

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStatus("idle");
      setMessage("");
      setEmail("");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-3xl p-6 sm:p-8 text-center">
        <DialogHeader className="space-y-3">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100">
            <Wrench className="h-8 w-8 text-orange-500" />
          </div>

          <DialogTitle className="text-xl font-bold text-gray-900">
            Standard Orders Paused
          </DialogTitle>

          <DialogDescription className="text-gray-600 text-sm leading-relaxed">
            Standard shipping orders are currently paused while we upgrade our system.
            However, <strong>Instant Shipping items</strong> are in-hand and available to order!
          </DialogDescription>
        </DialogHeader>

        {/* Notify form */}
        <div className="mt-4 rounded-2xl bg-gray-50 p-4">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-green-700">{message}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1.5 mb-3 text-sm font-medium text-gray-700">
                <Bell className="h-4 w-4 text-orange-500" />
                Get notified when we're back
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold h-10 shadow-md"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    "Notify Me When Orders Resume"
                  )}
                </Button>
              </form>
              {status === "error" && (
                <p className="mt-2 text-xs text-red-500">{message}</p>
              )}
            </>
          )}
        </div>

        {/* Continue browsing */}
        <Button
          variant="ghost"
          onClick={handleClose}
          className="mt-2 w-full rounded-xl text-gray-500 hover:text-gray-700"
        >
          Continue Browsing
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default OrdersPausedModal;
