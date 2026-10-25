import type { SupabaseClient } from "@supabase/supabase-js";
import type { ComponentProps } from "react";
import type ProductCard from "@/components/ui/ProductCard";
import { BRANDS_CONFIG } from "@/constants/brandsConfig";

export function getHomeBrandConfig(brand: string) {
  const normalize = (value: string): string => value.trim().toLowerCase().replace(/[\s-]+/g, "");
  return Object.values(BRANDS_CONFIG).find((config) =>
    [config.name, config.slug, config.dbValue, ...(config.dbValues ?? [])]
      .some((name) => normalize(name) === normalize(brand)),
  );
}

export interface HomeBrandSection {
  id: string;
  brand: string;
  title: string;
  is_active: boolean;
  sort_order: number;
}

export type BrandListing = ComponentProps<typeof ProductCard>["product"];
export interface BrandSectionPreview extends HomeBrandSection {
  listings: BrandListing[];
  productCount: number;
}
export const SECTION_PAGE_SIZE = 6;
export const PRODUCT_PAGE_SIZE = 8;

export async function fetchBrandProducts(client: SupabaseClient, brand: string, page = 1) {
  const config = getHomeBrandConfig(brand);
  const brandValues = [...new Set([brand.trim(), ...(config ? [config.dbValue, config.name, ...(config.dbValues ?? [])] : [])])];
  const { data, error, count } = await client.from("listings_with_images")
    .select("id, slug, title, brand, price, min_price, retail_price, condition, size_value, image_url", { count: "exact" })
    .eq("status", "active")
    .or(brandValues.map((value) => `brand.ilike.${JSON.stringify(value.replace(/[\\%_]/g, "\\$&"))}`).join(","))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * PRODUCT_PAGE_SIZE, page * PRODUCT_PAGE_SIZE - 1)
    .returns<BrandListing[]>();
  if (error) throw error;
  return { listings: data ?? [], productCount: count ?? 0 };
}

export async function fetchBrandSections(client: SupabaseClient, page = 1, admin = false) {
  let query = client.from("home_brand_sections")
    .select("id, brand, title, is_active, sort_order", { count: "exact" });
  if (!admin) query = query.eq("is_active", true);
  const { data, error, count } = await query.order("sort_order").order("created_at").order("id")
    .range((page - 1) * SECTION_PAGE_SIZE, page * SECTION_PAGE_SIZE - 1)
    .returns<HomeBrandSection[]>();
  if (error) throw error;
  return { sections: data ?? [], count: count ?? 0 };
}

export async function fetchBrandPreviews(client: SupabaseClient, page = 1) {
  const { sections, count } = await fetchBrandSections(client, page);
  const previews = await Promise.all(sections.map(async (section): Promise<BrandSectionPreview> => ({
    ...section,
    ...await fetchBrandProducts(client, section.brand),
  })));
  return { sections: previews, count };
}
