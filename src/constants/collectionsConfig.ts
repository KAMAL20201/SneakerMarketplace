export interface CollectionConfig {
  id: string; // "new-balance-9060" — also the URL segment
  name: string; // "New Balance 9060" — display name
  slug: string; // "new-balance-9060" — URL segment
  brand: string; // "new balance" — exact DB brand value
  brandSlug: string; // "new-balance" — URL brand slug
  brandName: string; // "New Balance" — display brand name
  searchTerm: string; // "9060" — sent to RPC p_search
  exactPhrase: boolean; // whether to match exact consecutive phrase
  tagline: string; // short tagline shown on collection page
  description: string; // SEO meta description
  badge?: string; // optional badge like "Trending" or "Most Popular"
  imageUrl?: string; // banner image URL (AI-generated or from storage)
  category: string; // "sneakers"
}

export const COLLECTIONS_CONFIG: Record<string, CollectionConfig> = {
  "new-balance-9060": {
    id: "new-balance-9060",
    name: "New Balance 9060",
    slug: "new-balance-9060",
    brand: "new balance",
    brandSlug: "new-balance",
    brandName: "New Balance",
    searchTerm: "9060",
    exactPhrase: false,
    tagline: "The Future of the Dad Shoe",
    description:
      "Buy authentic New Balance 9060 in India. Shop verified NB 9060 in all colorways — Sea Salt, Quartz Grey, Mushroom & more. Best prices, fast delivery.",
    badge: "Most Popular",
    category: "sneakers",
    imageUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/9060s-coll.webp",
  },

  yeezy: {
    id: "yeezy",
    name: "Adidas Yeezy's",
    slug: "yeezy",
    brand: "adidas",
    brandSlug: "adidas",
    brandName: "Adidas",
    searchTerm: "yeezy",
    exactPhrase: false,
    tagline: "Kanye's Iconic Collaboration with Adidas",
    description:
      "Buy authentic Adidas Yeezy's in India. Shop verified Yeezy Boost 350, 700, Slides and more at the best prices. Fast delivery across India.",
    badge: "Trending",
    category: "sneakers",
    imageUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/yeezys-coll.webp",
  },

  // "new-balance-550": {
  //   id: "new-balance-550",
  //   name: "New Balance 550",
  //   slug: "new-balance-550",
  //   brand: "new balance",
  //   brandSlug: "new-balance",
  //   brandName: "New Balance",
  //   searchTerm: "550",
  //   exactPhrase: false,
  //   tagline: "Basketball Heritage Meets Street Style",
  //   description:
  //     "Buy authentic New Balance 550 in India. Shop verified NB 550 at the best prices. Fast delivery across India.",
  //   category: "sneakers",
  // },

  // "nike-dunk-low": {
  //   id: "nike-dunk-low",
  //   name: "Nike Dunk Low",
  //   slug: "nike-dunk-low",
  //   brand: "nike",
  //   brandSlug: "nike",
  //   brandName: "Nike",
  //   searchTerm: "dunk low",
  //   exactPhrase: false,
  //   tagline: "Born on the Hardwood, Built for the Streets",
  //   description:
  //     "Buy authentic Nike Dunk Low in India. Shop verified Dunk Low in all colorways — Panda, Green Glow, Retro & more. Best prices, fast delivery.",
  //   badge: "Trending",
  //   category: "sneakers",
  // },

  "air-jordan-1": {
    id: "air-jordan-1",
    name: "Air Jordan 1",
    slug: "air-jordan-1",
    brand: "air jordan",
    brandSlug: "air-jordan",
    brandName: "Air Jordan",
    searchTerm: "jordan 1",
    exactPhrase: true,
    tagline: "The Shoe That Started a Revolution",
    description:
      "Buy authentic Air Jordan 1 in India. Shop verified Jordan 1 Retro High and Low in all colorways at the best prices. Fast delivery across India.",
    category: "sneakers",
    imageUrl: "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/jordans-collection.webp",
  },

  "adidas-samba": {
    id: "adidas-samba",
    name: "Adidas Samba OG",
    slug: "adidas-samba",
    brand: "adidas",
    brandSlug: "adidas",
    brandName: "Adidas",
    searchTerm: "samba",
    exactPhrase: false,
    tagline: "Classic Football Meets Street Culture",
    description:
      "Buy authentic Adidas Samba OG in India. Shop verified Adidas Samba at the best prices. Fast delivery across India.",
    badge: "Trending",
    category: "sneakers",
    imageUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/sambas-collection.webp",
  },

  "onitsuka-tiger-mexico-66": {
    id: "onitsuka-tiger-mexico-66",
    name: "Onitsuka Tiger Mexico 66",
    slug: "onitsuka-tiger-mexico-66",
    brand: "onitsuka tiger",
    brandSlug: "onitsuka-tiger",
    brandName: "Onitsuka Tiger",
    searchTerm: "mexico 66",
    exactPhrase: false,
    tagline: "Iconic Japanese Heritage Since 1966",
    description:
      "Buy authentic Onitsuka Tiger Mexico 66 in India. Shop verified Mexico 66 at the best prices. Fast delivery across India.",
    category: "sneakers",
      imageUrl:
      "https://vojwfupyoathhvujwaqh.supabase.co/storage/v1/object/public/static-assets/mexico66.webp",
  },
};

export const ALL_COLLECTIONS = Object.values(COLLECTIONS_CONFIG);
