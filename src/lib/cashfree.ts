declare global {
  interface Window {
    Cashfree: any;
  }
}

// Only the public key is needed on the client side
// The secret key should only be used in server-side Edge Functions

export const loadCashfreeScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    // Use the correct v3 SDK
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";

    script.onload = () => {
      // Wait a bit for the SDK to initialize
      setTimeout(() => {
        if (window.Cashfree) {
          resolve();
        } else {
          reject(new Error("Cashfree SDK loaded but not available on window"));
        }
      }, 100);
    };

    script.onerror = () => reject(new Error("Failed to load Cashfree script"));
    document.head.appendChild(script);
  });
};

export const createCashfreeInstance = () => {
  if (!window.Cashfree) {
    throw new Error("Cashfree not loaded");
  }

  // Initialize Cashfree with correct mode
  // const mode = CASHFREE_ENV === "PROD" ? "production" : "sandbox";

  // return window.Cashfree({
  //   mode: mode,
  // });
};

export const formatAmount = (amount: number): number => {
  // Cashfree expects amount in smallest currency unit (paise for INR)
  return Math.round(amount * 100);
};

export const formatCurrency = (currency: string): string => {
  return currency.toUpperCase();
};

// Cashfree handles all customer data and one-click checkout internally
// We just need to pass the order details and let Cashfree manage the rest
