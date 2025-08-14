import type { RazorpayOptions } from "../types/razorpay";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Temporary debug log - remove after testing
console.log("Razorpay Key ID loaded:", RAZORPAY_KEY_ID);

export const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
};

export const createRazorpayInstance = (options: RazorpayOptions) => {
  if (!window.Razorpay) {
    throw new Error("Razorpay not loaded");
  }

  return new window.Razorpay(options);
};

export const formatAmount = (amount: number): number => {
  // Razorpay expects amount in smallest currency unit (paise for INR)
  return Math.round(amount * 100);
};

export const formatCurrency = (currency: string): string => {
  return currency.toUpperCase();
};
