export interface BrandModel {
  name: string; // "New Balance 9060" — displayed on page
  slug: string; // "9060" — used in URL /brands/new-balance/9060
  searchTerm: string; // sent to RPC p_search param
  description: string; // meta description for the model page
  exactPhrase?: boolean; // default false; set true only when you need consecutive-word matching
}

export interface BrandConfig {
  name: string; // "New Balance"
  slug: string; // "new-balance" — URL segment
  dbValue: string; // "new balance" — exact value stored in DB brand column
  tagline: string; // short tagline shown on brands index
  description: string; // meta description + shown as subheading on brand page
  models: BrandModel[];
}

export const BRANDS_CONFIG: Record<string, BrandConfig> = {
  nike: {
    name: "Nike",
    slug: "nike",
    dbValue: "nike",
    tagline: "Just Do It",
    description:
      "Shop authentic Nike sneakers and apparel in India. Find verified Nike Dunk, Air Force 1, Air Max and more at The Plug Market.",
    models: [
      {
        name: "Dunk Low",
        slug: "dunk-low",
        searchTerm: "dunk low",
        description:
          "Buy authentic Nike Dunk Low in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Dunk High",
        slug: "dunk-high",
        searchTerm: "dunk high",
        description:
          "Buy authentic Nike Dunk High in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Air Force 1",
        slug: "air-force-1",
        searchTerm: "air force 1",
        description:
          "Buy authentic Nike Air Force 1 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Air Max 90",
        slug: "air-max-90",
        searchTerm: "air max 90",
        description:
          "Buy authentic Nike Air Max 90 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Blazer Mid",
        slug: "blazer-mid",
        searchTerm: "blazer mid",
        description:
          "Buy authentic Nike Blazer Mid in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Air Max 95",
        slug: "air-max-95",
        searchTerm: "air max 95",
        description:
          "Buy authentic Nike Air Max 95 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },

  "air-jordan": {
    name: "Air Jordan",
    slug: "air-jordan",
    dbValue: "air jordan",
    tagline: "Be Like Mike",
    description:
      "Shop authentic Air Jordan sneakers in India. Find verified Jordan 1, Jordan 4, Jordan 11 and more at The Plug Market.",
    models: [
      {
        name: "Jordan 1 Retro High",
        slug: "jordan-1-retro-high",
        searchTerm: "jordan 1 high",
        description:
          "Buy authentic Air Jordan 1 Retro High in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Jordan 1 Low",
        slug: "jordan-1-low",
        searchTerm: "jordan 1 low",
        description:
          "Buy authentic Air Jordan 1 Low in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Jordan 4 Retro",
        slug: "jordan-4",
        searchTerm: "jordan 4",
        description:
          "Buy authentic Air Jordan 4 Retro in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Jordan 3 Retro",
        slug: "jordan-3",
        searchTerm: "jordan 3",
        description:
          "Buy authentic Air Jordan 3 Retro in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Jordan 11",
        slug: "jordan-11",
        searchTerm: "jordan 11",
        description:
          "Buy authentic Air Jordan 11 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },

  "new-balance": {
    name: "New Balance",
    slug: "new-balance",
    dbValue: "new balance",
    tagline: "Fearlessly Independent",
    description:
      "Shop authentic New Balance sneakers in India. Find verified 9060, 550, 574, 2002R and more at The Plug Market.",
    models: [
      {
        name: "9060",
        slug: "9060",
        searchTerm: "9060",
        description:
          "Buy authentic New Balance 9060 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "550",
        slug: "550",
        searchTerm: "550",
        description:
          "Buy authentic New Balance 550 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "574",
        slug: "574",
        searchTerm: "574",
        description:
          "Buy authentic New Balance 574 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "2002R",
        slug: "2002r",
        searchTerm: "2002",
        description:
          "Buy authentic New Balance 2002R in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "1906R",
        slug: "1906r",
        searchTerm: "1906",
        description:
          "Buy authentic New Balance 1906R in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "327",
        slug: "327",
        searchTerm: "327",
        description:
          "Buy authentic New Balance 327 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },

  adidas: {
    name: "Adidas",
    slug: "adidas",
    dbValue: "adidas",
    tagline: "Impossible is Nothing",
    description:
      "Shop authentic Adidas sneakers in India. Find verified Samba, Campus 00s, Gazelle, Stan Smith and more at The Plug Market.",
    models: [
      {
        name: "Samba OG",
        slug: "samba",
        searchTerm: "samba",
        description:
          "Buy authentic Adidas Samba OG in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Campus 00s",
        slug: "campus-00s",
        searchTerm: "campus 00s",
        description:
          "Buy authentic Adidas Campus 00s in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Gazelle",
        slug: "gazelle",
        searchTerm: "gazelle",
        description:
          "Buy authentic Adidas Gazelle in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Stan Smith",
        slug: "stan-smith",
        searchTerm: "stan smith",
        description:
          "Buy authentic Adidas Stan Smith in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Yeezy 350 V2",
        slug: "yeezy-350",
        searchTerm: "yeezy 350",
        description:
          "Buy authentic Adidas Yeezy 350 V2 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },

  "onitsuka-tiger": {
    name: "Onitsuka Tiger",
    slug: "onitsuka-tiger",
    dbValue: "onitsuka tiger",
    tagline: "Born in Japan. Worn Worldwide.",
    description:
      "Shop authentic Onitsuka Tiger sneakers in India. Find verified Mexico 66, Ultimate 81, Delegation EX and more at The Plug Market.",
    models: [
      {
        name: "Mexico 66",
        slug: "mexico-66",
        searchTerm: "mexico 66",
        description:
          "Buy authentic Onitsuka Tiger Mexico 66 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Ultimate 81",
        slug: "ultimate-81",
        searchTerm: "ultimate 81",
        description:
          "Buy authentic Onitsuka Tiger Ultimate 81 in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Delegation EX",
        slug: "delegation-ex",
        searchTerm: "delegation",
        description:
          "Buy authentic Onitsuka Tiger Delegation EX in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Aaron",
        slug: "aaron",
        searchTerm: "aaron",
        description:
          "Buy authentic Onitsuka Tiger Aaron in India. Verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },
};

export const ALL_BRANDS = Object.values(BRANDS_CONFIG);
