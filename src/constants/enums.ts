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
  ADMIN_IMPORT: "/admin/import",
  PROFILE: "/profile",
  MY_ADDRESSES: "/my-addresses",
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
  // Razorpay required pages
  CONTACT_US: "/contact-us",
  SHIPPING_POLICY: "/shipping-policy",
  CANCELLATIONS_REFUNDS: "/cancellations-refunds",
  WISHLIST: "/wishlist",
  NEW_ARRIVALS: "/new-arrivals",
  SNEAKERS: "/sneakers",
  APPARELS: "/apparels",
  ELECTRONICS: "/electronics",
  COLLECTIBLES: "/collectibles",
} as const;

// Helper functions for dynamic routes
export const ROUTE_HELPERS = {
  PRODUCT_DETAIL: (id: string) => `/product/${id}`,
  EDIT_LISTING: (id: string) => `/edit-listing/${id}`,
} as const;

// Product condition constants
export const PRODUCT_CONDITIONS = {
  NEW: "new",
  LIKE_NEW: "like new",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor",
} as const;

export type ProductCondition =
  (typeof PRODUCT_CONDITIONS)[keyof typeof PRODUCT_CONDITIONS];

// Brand enums for different categories
export const SNEAKER_BRANDS = {
  NIKE: "nike",
  ADIDAS: "adidas",
  JORDAN: "jordan",
  CONVERSE: "converse",
  VANS: "vans",
  NEW_BALANCE: "new balance",
  PUMA: "puma",
  REEBOK: "reebok",
} as const;

export const CLOTHING_BRANDS = {
  NIKE: "nike",
  ADIDAS: "adidas",
  SUPREME: "supreme",
  OFF_WHITE: "off-white",
  STONE_ISLAND: "stone island",
  KITH: "kith",
  FEAR_OF_GOD: "fear of god",
  ESSENTIALS: "essentials",
} as const;

export const ELECTRONIC_BRANDS = {
  APPLE: "apple",
  SAMSUNG: "samsung",
  SONY: "sony",
  BOSE: "bose",
  NINTENDO: "nintendo",
  PLAYSTATION: "playstation",
  XBOX: "xbox",
  GOOGLE: "google",
} as const;

export const COLLECTIBLE_BRANDS = {
  FUNKO: "funko",
  HOT_TOYS: "hot toys",
  KAWS: "kaws",
  BEARBRICK: "bearbrick",
  POKEMON: "pokemon",
  MARVEL: "marvel",
  DC_COMICS: "dc comics",
  DISNEY: "disney",
} as const;

// Size enums
export const SNEAKER_SIZES = {
  UK_5: "uk 5",
  UK_5_5: "uk 5.5",
  UK_6: "uk 6",
  UK_6_5: "uk 6.5",
  UK_7: "uk 7",
  UK_7_5: "uk 7.5",
  UK_8: "uk 8",
  UK_8_5: "uk 8.5",
  UK_9: "uk 9",
  UK_9_5: "uk 9.5",
  UK_10: "uk 10",
  UK_10_5: "uk 10.5",
  UK_11: "uk 11",
  UK_12: "uk 12",
  UK_13: "uk 13",
  UK_14: "uk 14",
} as const;

export const CLOTHING_SIZES = {
  ONE_SIZE: "one size",
  XS: "xs",
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
  XXL: "xxl",
  XXXL: "xxxl",
} as const;

// Delivery timeline constants
export const DELIVERY_TIMELINES = {
  THREE_TO_FIVE: "3-5",
  SEVEN_TO_TEN: "7-10",
  TWELVE_TO_FIFTEEN: "12-15",
  EIGHTEEN_TO_TWENTY_ONE: "18-21",
  TWENTY_ONE_TO_TWENTY_EIGHT: "21-28",
  CUSTOM: "custom",
} as const;

export type DeliveryTimeline =
  (typeof DELIVERY_TIMELINES)[keyof typeof DELIVERY_TIMELINES];

// Category IDs
export const CATEGORY_IDS = {
  SNEAKERS: "sneakers",
  CLOTHING: "clothing",
  ELECTRONICS: "electronics",
  COLLECTIBLES: "collectibles",
} as const;

export type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];

// Payment method types
export const PAYMENT_METHOD_TYPES = {
  UPI: "upi",
  BANK_ACCOUNT: "bank_account",
} as const;

export type PaymentMethodType =
  (typeof PAYMENT_METHOD_TYPES)[keyof typeof PAYMENT_METHOD_TYPES];

// Listing status
export const LISTING_STATUS = {
  DRAFT: "draft",
  UNDER_REVIEW: "under_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  SOLD: "sold",
  EXPIRED: "expired",
} as const;

export type ListingStatus =
  (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];
