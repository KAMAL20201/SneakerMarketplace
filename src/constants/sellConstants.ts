import {
  Package,
  Shirt,
} from "lucide-react";
import {
  SNEAKER_BRANDS,
  CLOTHING_BRANDS,
  SNEAKER_SIZES,
  CLOTHING_SIZES,
  CATEGORY_IDS,
} from "./enums";

export const categories = [
  {
    id: CATEGORY_IDS.SNEAKERS,
    name: "Sneakers",
    icon: Package,
    image: "/storage/v1/object/public/static-assets/sneakers.webp",
    brands: Object.values(SNEAKER_BRANDS),
    sizes: Object.values(SNEAKER_SIZES),
    hasSize: true,
    hasBrand: true,
    hasModel: true,
    variantLabel: "Colorway",
    hasColorPicker: true,
  },
  {
    id: CATEGORY_IDS.CLOTHING,
    name: "Apparels & Bags",
    icon: Shirt,
    image: "/storage/v1/object/public/static-assets/clothing.webp",
    brands: Object.values(CLOTHING_BRANDS),
    sizes: Object.values(CLOTHING_SIZES),
    hasSize: true,
    hasBrand: true,
    hasModel: false,
    variantLabel: "Color",
    hasColorPicker: true,
  },
];
