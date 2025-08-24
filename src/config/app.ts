// App configuration
export const APP_CONFIG = {
  // Set this to false when you want to show the coming soon page
  // Set this to true when you want to show the actual website
  IS_COMING_SOON:
    import.meta.env.VITE_IS_COMING_SOON === "true" &&
    import.meta.env.VITE_APP_DEV_ENV === "PROD",

  // App metadata
  APP_NAME: "SneakIn Market",
  APP_DESCRIPTION: "The Ultimate Sneaker Marketplace",
  APP_VERSION: "1.0.0",

  // Contact information
  CONTACT_EMAIL: "hello@sneakinmarket.com",

  // Social media links
  SOCIAL_LINKS: {
    twitter: "#",
    instagram: "#",
    facebook: "#",
  },
};
