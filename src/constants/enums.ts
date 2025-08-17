export const ROUTE_NAMES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  HOME: "/",
  SELL: "/sell",
  MY_LISTINGS: "/my-listings",
  MY_ORDERS: "/my-orders",
  PRODUCT_DETAIL: "/product/:id",
  CART: "/cart",
  CHECKOUT: "/checkout",
  PAYMENT_METHODS: "/payment-methods",
  BROWSE: "/browse",
  EDIT_LISTING: "/edit-listing/:id",
  ADMIN_REVIEW: "/admin/review",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  // Additional routes found in the codebase
  FORGOT_PASSWORD: "/forgot-password",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  BUYER_PROTECTION: "/buyer-protection",
  SECURE_PAYMENTS: "/secure-payments",
  REVIEW_PROCESS: "/review-process",
  HELP: "/help",
  FAQ: "/faq",
  SHIPPING: "/shipping",
  RETURNS: "/returns",
  ABOUT: "/about",
  SELLER_AGREEMENT: "/seller-agreement",
} as const;

// Helper functions for dynamic routes
export const ROUTE_HELPERS = {
  PRODUCT_DETAIL: (id: string) => `/product/${id}`,
  EDIT_LISTING: (id: string) => `/edit-listing/${id}`,
} as const;
