export const ROUTE_NAMES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  HOME: "/",
  MY_ORDERS: "/my-orders",
  PRODUCT_DETAIL: "/product/:id",
  CART: "/cart",
  CHECKOUT: "/checkout",
  BROWSE: "/browse",
  PROFILE: "/profile",
  MY_ADDRESSES: "/my-addresses",
  SETTINGS: "/settings",
  FORGOT_PASSWORD: "/forgot-password",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  SECURE_PAYMENTS: "/secure-payments",
  HELP: "/help",
  FAQ: "/faq",
  SHIPPING: "/shipping",
  ABOUT: "/about",
  CONTACT_US: "/contact-us",
  SHIPPING_POLICY: "/shipping-policy",
} as const;

// Helper functions for dynamic routes
export const ROUTE_HELPERS = {
  PRODUCT_DETAIL: (id: string) => `/product/${id}`,
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

export const ACCESSORY_BRANDS = {
  ROLEX: "rolex",
  OMEGA: "omega",
  CASIO: "casio",
  G_SHOCK: "g-shock",
  APPLE: "apple",
  SAMSUNG: "samsung",
  LOUIS_VUITTON: "louis vuitton",
  GUCCI: "gucci",
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

export const GAMING_BRANDS = {
  NINTENDO: "nintendo",
  PLAYSTATION: "playstation",
  XBOX: "xbox",
  STEAM: "steam",
  RAZER: "razer",
  LOGITECH: "logitech",
  CORSAIR: "corsair",
  STEELSERIES: "steelseries",
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
  UK_5_US_6_EU_40: "uk 5 / us 6 / eu 40",
  UK_5_5_US_6_5_EU_40: "uk 5.5 / us 6.5 / eu 40",
  UK_6_US_7_EU_41: "uk 6 / us 7 / eu 41",
  UK_6_5_US_7_5_EU_41: "uk 6.5 / us 7.5 / eu 41",
  UK_7_US_8_EU_42: "uk 7 / us 8 / eu 42",
  UK_7_5_US_8_5_EU_42: "uk 7.5 / us 8.5 / eu 42",
  UK_8_US_9_EU_43: "uk 8 / us 9 / eu 43",
  UK_8_5_US_9_5_EU_43: "uk 8.5 / us 9.5 / eu 43",
  UK_9_US_10_EU_44: "uk 9 / us 10 / eu 44",
  UK_9_5_US_10_5_EU_44: "uk 9.5 / us 10.5 / eu 44",
  UK_10_US_11_EU_45: "uk 10 / us 11 / eu 45",
  UK_10_5_US_11_5_EU_45: "uk 10.5 / us 11.5 / eu 45",
  UK_11_US_12_EU_46: "uk 11 / us 12 / eu 46",
  UK_12_US_13_EU_47: "uk 12 / us 13 / eu 47",
  UK_13_US_14_EU_48: "uk 13 / us 14 / eu 48",
  UK_14_US_15_EU_49: "uk 14 / us 15 / eu 49",
} as const;

export const CLOTHING_SIZES = {
  XS: "xs",
  S: "s",
  M: "m",
  L: "l",
  XL: "xl",
  XXL: "xxl",
  XXXL: "xxxl",
} as const;

// Category IDs
export const CATEGORY_IDS = {
  SNEAKERS: "sneakers",
  CLOTHING: "clothing",
  ACCESSORIES: "accessories",
  ELECTRONICS: "electronics",
  GAMING: "gaming",
  COLLECTIBLES: "collectibles",
} as const;

export type CategoryId = (typeof CATEGORY_IDS)[keyof typeof CATEGORY_IDS];
