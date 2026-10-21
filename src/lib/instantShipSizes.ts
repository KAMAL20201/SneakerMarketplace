import type { SupabaseClient } from "@supabase/supabase-js";
import { compareSizes } from "@/constants/sizeCharts";

interface InventorySize {
  size_value: string;
  is_sold: boolean;
  is_instant_ship: boolean;
}

interface ListingInventory {
  id: string;
  product_listing_sizes: InventorySize[];
  product_variants: { product_variant_sizes: InventorySize[] }[];
}

export async function fetchInstantShipSizes(
  client: SupabaseClient,
  listingIds: string[],
  signal: AbortSignal,
): Promise<Record<string, string[]>> {
  if (listingIds.length === 0) return {};

  // One bounded query per catalog page, including both inventory formats.
  const { data, error } = await client
    .from("product_listings")
    .select(`id,
      product_listing_sizes (size_value, is_sold, is_instant_ship),
      product_variants (product_variant_sizes (size_value, is_sold, is_instant_ship))`)
    .in("id", listingIds)
    .order("id")
    .range(0, listingIds.length - 1)
    .abortSignal(signal)
    .returns<ListingInventory[]>();

  if (error) {
    if (!signal.aborted) console.error("Failed to load instant-ship sizes:", error);
    return {};
  }

  const sizesByListing: Record<string, string[]> = {};
  for (const listing of data ?? []) {
    const variants = listing.product_variants ?? [];
    // Match product details: variants supersede legacy size rows.
    const sizes = variants.length > 0
      ? variants.flatMap((variant) => variant.product_variant_sizes ?? [])
      : listing.product_listing_sizes ?? [];
    sizesByListing[listing.id] = [...new Set(sizes
      .filter((size) => size.is_instant_ship && !size.is_sold)
      .map((size) => size.size_value.trim().toUpperCase())
      .filter(Boolean))].sort(compareSizes);
  }
  return sizesByListing;
}
