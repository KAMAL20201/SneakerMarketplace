// App configuration
export const APP_CONFIG = {
  // Set this to false when you want to show the coming soon page
  // Set this to true when you want to show the actual website
  IS_COMING_SOON:
    import.meta.env.VITE_IS_COMING_SOON === "true" &&
    import.meta.env.VITE_APP_DEV_ENV === "PROD",

  // App metadata
  APP_NAME: "The Plug Market",
  APP_DESCRIPTION:
    "The Plug: Where Sneaker Culture Meets Streetwear Innovation",
  APP_VERSION: "1.0.0",

  // Contact information
  CONTACT_EMAIL: "support@theplugmarket.in",

  // Social media links
  SOCIAL_LINKS: {
    twitter: "#",
    instagram: "#",
    facebook: "#",
  },
};
