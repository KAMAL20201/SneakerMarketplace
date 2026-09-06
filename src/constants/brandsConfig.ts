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
  dbValue: string; // "new balance" — primary/canonical DB brand value
  /** Additional DB brand values to include (for casing variants, aliases, etc.) */
  dbValues?: string[];
  tagline: string; // short tagline shown on brands index
  description: string; // meta description + shown as subheading on brand page
  models: BrandModel[];
}

/** Returns all DB brand values (primary + variants) for use in RPC p_brands array */
export function getBrandDbValues(config: BrandConfig): string[] {
  return [config.dbValue, ...(config.dbValues ?? [])];
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
        name: "Yeezy's",
        slug: "yeezy",
        searchTerm: "yeezy",
        description:
          "Buy authentic Adidas Yeezy's in India. Verified listings, best prices, fast delivery at The Plug Market.",
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

  anta: {
    name: "ANTA",
    slug: "anta",
    dbValue: "Anta",
    dbValues: ["ANTA"],
    tagline: "Keep Moving Forward",
    description:
      "Buy authentic ANTA shoes in India — ANTA C202, Fold H1, Zone 2 and more. China's top-performing running brand, now available in India with fast delivery at The Plug Market.",
    models: [
      {
        name: "C202",
        slug: "c202",
        searchTerm: "C202",
        description:
          "Buy authentic ANTA C202 shoes in India. The ANTA C202 is China's iconic marathon racing shoe — verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Fold H1",
        slug: "fold-h1",
        searchTerm: "Fold H1",
        description:
          "Buy authentic ANTA Fold H1 shoes in India. Shop ANTA Fold H1 with fast delivery and verified authenticity at The Plug Market.",
      },
      {
        name: "Zone 2 90",
        slug: "zone-2-90",
        searchTerm: "Zone 2",
        description:
          "Buy authentic ANTA Zone 2 90 shoes in India. Shop ANTA Zone 2 with fast delivery and verified authenticity at The Plug Market.",
      },
    ],
  },

  "li-ning": {
    name: "Li-Ning",
    slug: "li-ning",
    dbValue: "Li Ning",
    tagline: "Anything is Possible",
    description:
      "Buy authentic Li-Ning shoes in India — Feidian 6, Red Hare and more. China's most innovative running brand with cutting-edge foam technology. Fast delivery with verified authenticity at The Plug Market.",
    models: [
      {
        name: "Feidian 6 Elite",
        slug: "feidian-6-elite",
        searchTerm: "Feidian 6 Elite",
        description:
          "Buy authentic Li-Ning Feidian 6 Elite in India. The Feidian 6 Elite is Li-Ning's flagship racing shoe — verified listings, best prices, fast delivery at The Plug Market.",
      },
      {
        name: "Feidian 6 Challenger",
        slug: "feidian-6-challenger",
        searchTerm: "Feidian 6 Challenger",
        description:
          "Buy authentic Li-Ning Feidian 6 Challenger in India. Shop Li-Ning Feidian 6 Challenger with fast delivery and verified authenticity at The Plug Market.",
      },
      {
        name: "Red Hare 9 Ultra",
        slug: "red-hare-9-ultra",
        searchTerm: "Red Hare 9 Ultra",
        description:
          "Buy authentic Li-Ning Red Hare 9 Ultra in India. Shop Li-Ning Red Hare 9 Ultra with fast delivery and verified authenticity at The Plug Market.",
      },
    ],
  },

  xtep: {
    name: "Xtep",
    slug: "xtep",
    dbValue: "Xtep",
    tagline: "Feel the Difference",
    description:
      "Buy authentic Xtep shoes in India — Xtep 2000km, 160X and more. China's premier running brand known for marathon-level performance. Fast delivery with verified authenticity at The Plug Market.",
    models: [
      {
        name: "2000km 5th Gen PRO",
        slug: "2000km",
        searchTerm: "2000",
        description:
          "Buy authentic Xtep 2000km shoes in India. The Xtep 2000km is one of China's top marathon racing shoes — verified listings, best prices, fast delivery at The Plug Market.",
      },
    ],
  },

  "361": {
    name: "361°",
    slug: "361",
    dbValue: "361",
    tagline: "One Degree Beyond",
    description:
      "Buy authentic 361° shoes in India — 361 Mega 3 Pro and more. China's rising running brand delivering competition-level performance. Fast delivery with verified authenticity at The Plug Market.",
    models: [
      {
        name: "Mega 3 Pro",
        slug: "mega-3-pro",
        searchTerm: "Mega 3 Pro",
        description:
          "Buy authentic 361° Mega 3 Pro in India. Shop 361 Mega 3 Pro with fast delivery and verified authenticity at The Plug Market.",
      },
    ],
  },

  qiaodan: {
    name: "Qiaodan",
    slug: "qiaodan",
    dbValue: "qiaodan",
    tagline: "Born to Run",
    description:
      "Buy authentic Qiaodan shoes in India — Qiaodan Leili and more. China's fast-growing running brand inspired by elite marathon performance. Fast delivery with verified authenticity at The Plug Market.",
    models: [
      {
        name: "Leili 2.0 GT",
        slug: "leili-2-gt",
        searchTerm: "Leili 2.0 GT",
        description:
          "Buy authentic Qiaodan Leili 2.0 GT in India. Shop Qiaodan Leili 2.0 GT with fast delivery and verified authenticity at The Plug Market.",
      },
      {
        name: "Leili 2.0",
        slug: "leili-2",
        searchTerm: "Leili 2.0",
        description:
          "Buy authentic Qiaodan Leili 2.0 in India. Shop Qiaodan Leili 2.0 with fast delivery and verified authenticity at The Plug Market.",
      },
    ],
  },

  dynafish: {
    name: "DynaFish",
    slug: "dynafish",
    dbValue: "Dynafish",
    tagline: "Ultra Performance",
    description:
      "Buy authentic DynaFish shoes in India — DynaFish Xiaonian, Xianion and more. China's ultra-niche performance running brand. Fast delivery with verified authenticity at The Plug Market.",
    models: [
      {
        name: "Xiaonian",
        slug: "xiaonian",
        searchTerm: "Xiaonian",
        description:
          "Buy authentic DynaFish Xiaonian in India. Shop DynaFish Xiaonian with fast delivery and verified authenticity at The Plug Market.",
      },
      {
        name: "Xianion",
        slug: "xianion",
        searchTerm: "Xianion",
        description:
          "Buy authentic DynaFish Xianion in India. Shop DynaFish Xianion with fast delivery and verified authenticity at The Plug Market.",
      },
    ],
  },
};

export const ALL_BRANDS = Object.values(BRANDS_CONFIG);

