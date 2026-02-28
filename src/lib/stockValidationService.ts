import type { CartItem } from "./orderService";
import { supabase } from "./supabase";

export interface StockValidationResult {
  productId: string;
  isAvailable: boolean;
  currentStatus: string;
  productName?: string;
}

export interface CartValidationResult {
  isValid: boolean;
  unavailableItems: StockValidationResult[];
  availableItems: StockValidationResult[];
}

/**
 * Stock Validation Service
 * Handles real-time stock availability checks to prevent selling out-of-stock items
 */
export class StockValidationService {
  /**
   * Check if a single product (and optionally a specific size / variant+size) is still available.
   *
   * - When `variantId` + `size` are provided (new variant-based listings):
   *   checks `product_variant_sizes` for that exact variant+size is_sold flag.
   * - When only `size` is provided (legacy multi-size listings):
   *   checks `product_listing_sizes` for that size's is_sold flag.
   * - When neither is provided: falls back to product-level status.
   */
  static async checkProductAvailability(
    productId: string,
    size?: string,
    variantId?: string | null
  ): Promise<StockValidationResult> {
    try {
      const { data: product, error } = await supabase
        .from("product_listings")
        .select("id, status, title")
        .eq("id", productId)
        .single();

      if (error || !product) {
        return {
          productId,
          isAvailable: false,
          currentStatus: "not_found",
        };
      }

      // ── Variant-based listing: check product_variant_sizes ──
      if (variantId && size) {
        const { data: variantSizeRow } = await supabase
          .from("product_variant_sizes")
          .select("is_sold")
          .eq("variant_id", variantId)
          .eq("size_value", size)
          .maybeSingle();

        if (variantSizeRow) {
          return {
            productId,
            isAvailable: product.status === "active" && !variantSizeRow.is_sold,
            currentStatus: variantSizeRow.is_sold ? "sold" : product.status,
            productName: product.title,
          };
        }
      }

      // ── Legacy multi-size listing: check product_listing_sizes ──
      if (size) {
        const { data: sizeRow } = await supabase
          .from("product_listing_sizes")
          .select("is_sold")
          .eq("listing_id", productId)
          .eq("size_value", size)
          .maybeSingle();

        if (sizeRow) {
          return {
            productId,
            isAvailable: product.status === "active" && !sizeRow.is_sold,
            currentStatus: sizeRow.is_sold ? "sold" : product.status,
            productName: product.title,
          };
        }
      }

      // ── Single-size listing or no size provided: use product-level status ──
      return {
        productId,
        isAvailable: product.status === "active",
        currentStatus: product.status,
        productName: product.title,
      };
    } catch (error) {
      console.error("Error checking product availability:", error);
      return {
        productId,
        isAvailable: false,
        currentStatus: "error",
      };
    }
  }

  /**
   * Validate all items in cart are still available (size-aware)
   */
  static async validateCartItems(
    cartItems: CartItem[]
  ): Promise<CartValidationResult> {
    if (!cartItems || cartItems.length === 0) {
      return {
        isValid: true,
        unavailableItems: [],
        availableItems: [],
      };
    }

    // Get unique product IDs from cart
    const productIds = [...new Set(cartItems.map((item) => item.productId))];

    // Fetch current status for all products in one query
    const { data: products, error } = await supabase
      .from("product_listings")
      .select("id, status, title")
      .in("id", productIds);

    if (error) {
      console.error("Error validating cart items:", error);
      throw new Error("Failed to validate cart items");
    }

    const productStatusMap = new Map(
      products?.map((p) => [p.id, { status: p.status, title: p.title }]) || []
    );

    // Fetch sold sizes for all legacy multi-size products in cart
    const { data: soldSizes } = await supabase
      .from("product_listing_sizes")
      .select("listing_id, size_value, is_sold")
      .in("listing_id", productIds)
      .eq("is_sold", true);

    const soldSizeSet = new Set(
      (soldSizes || []).map((s) => `${s.listing_id}::${s.size_value}`)
    );

    // Fetch sold variant sizes for all variant-based cart items (one batch query)
    const variantIds = [
      ...new Set(
        cartItems
          .map((item) => item.variantId)
          .filter((id): id is string => !!id)
      ),
    ];
    const soldVariantSizeSet = new Set<string>();
    if (variantIds.length > 0) {
      const { data: soldVariantSizes } = await supabase
        .from("product_variant_sizes")
        .select("variant_id, size_value")
        .in("variant_id", variantIds)
        .eq("is_sold", true);

      (soldVariantSizes || []).forEach((s) =>
        soldVariantSizeSet.add(`${s.variant_id}::${s.size_value}`)
      );
    }

    const unavailableItems: StockValidationResult[] = [];
    const availableItems: StockValidationResult[] = [];

    for (const item of cartItems) {
      const productInfo = productStatusMap.get(item.productId);

      if (!productInfo || productInfo.status !== "active") {
        unavailableItems.push({
          productId: item.productId,
          isAvailable: false,
          currentStatus: productInfo?.status || "not_found",
          productName: productInfo?.title,
        });
        continue;
      }

      // Check variant-based size availability (new listings)
      if (item.variantId) {
        const variantSizeKey = `${item.variantId}::${item.size}`;
        if (soldVariantSizeSet.has(variantSizeKey)) {
          unavailableItems.push({
            productId: item.productId,
            isAvailable: false,
            currentStatus: "sold",
            productName: productInfo.title,
          });
          continue;
        }
      } else {
        // Check legacy per-size availability
        const sizeKey = `${item.productId}::${item.size}`;
        if (soldSizeSet.has(sizeKey)) {
          unavailableItems.push({
            productId: item.productId,
            isAvailable: false,
            currentStatus: "sold",
            productName: productInfo.title,
          });
          continue;
        }
      }

      availableItems.push({
        productId: item.productId,
        isAvailable: true,
        currentStatus: productInfo.status,
        productName: productInfo.title,
      });
    }

    return {
      isValid: unavailableItems.length === 0,
      unavailableItems,
      availableItems,
    };
  }

  /**
   * Mark a specific size as sold for a listing.
   *
   * When `variantId` is provided (new variant-based listings), marks the size
   * in `product_variant_sizes`. When all sizes across all variants of the product
   * are sold, also marks the parent `product_listings` row as sold.
   *
   * When `variantId` is omitted (legacy listings), falls back to marking the size
   * in `product_listing_sizes`. If all sizes are sold, marks the product as sold.
   * For single-size legacy listings (no rows in product_listing_sizes), marks the
   * whole product as sold directly.
   *
   * Returns true if successfully marked, false if already sold or not found.
   */
  static async markSizeAsSold(
    productId: string,
    size: string,
    variantId?: string | null
  ): Promise<boolean> {
    try {
      // ── Variant-based listing ──
      if (variantId) {
        const { data: updated, error } = await supabase
          .from("product_variant_sizes")
          .update({ is_sold: true })
          .eq("variant_id", variantId)
          .eq("size_value", size)
          .eq("is_sold", false) // Optimistic lock — only update if not already sold
          .select()
          .maybeSingle();

        if (error) {
          console.error("Error marking variant size as sold:", error);
          return false;
        }

        if (!updated) {
          // Already sold or size row not found
          return false;
        }

        // Check if ALL sizes across ALL variants of this product are now sold.
        // If so, mark the whole listing as sold.
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id")
          .eq("listing_id", productId);

        if (variants && variants.length > 0) {
          const variantIds = variants.map((v) => v.id);
          const { data: allSizes } = await supabase
            .from("product_variant_sizes")
            .select("is_sold")
            .in("variant_id", variantIds);

          const allSold =
            allSizes && allSizes.length > 0 && allSizes.every((s) => s.is_sold);
          if (allSold) {
            await this.markProductAsSold(productId);
          }
        }

        return true;
      }

      // ── Legacy listing: check product_listing_sizes ──
      const { data: sizeRows } = await supabase
        .from("product_listing_sizes")
        .select("size_value, is_sold")
        .eq("listing_id", productId);

      if (sizeRows && sizeRows.length > 0) {
        // Multi-size legacy listing: mark the specific size as sold
        const { data: updated, error } = await supabase
          .from("product_listing_sizes")
          .update({ is_sold: true })
          .eq("listing_id", productId)
          .eq("size_value", size)
          .eq("is_sold", false) // Optimistic lock — only update if not already sold
          .select()
          .maybeSingle();

        if (error) {
          console.error("Error marking size as sold:", error);
          return false;
        }

        if (!updated) {
          // Size was already sold or not found
          return false;
        }

        // Check if all sizes are now sold — if so, mark the whole listing as sold
        const remaining = sizeRows.filter(
          (s) => s.size_value !== size && !s.is_sold
        );
        if (remaining.length === 0) {
          await this.markProductAsSold(productId);
        }

        return true;
      }

      // ── Single-size legacy listing: mark the whole product as sold ──
      return this.markProductAsSold(productId);
    } catch (error) {
      console.error("Error in markSizeAsSold:", error);
      return false;
    }
  }

  /**
   * Validate and update product status with optimistic locking
   * Returns true if successfully marked as sold, false if already sold
   */
  static async markProductAsSold(productId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("product_listings")
        .update({ status: "sold" })
        .eq("id", productId)
        .eq("status", "active") // Only update if still active (optimistic locking)
        .select()
        .maybeSingle();

      if (error) {
        console.error("Error marking product as sold:", error);
        return false;
      }

      // If no data returned, product was not active (already sold or unavailable)
      return !!data;
    } catch (error) {
      console.error("Error in markProductAsSold:", error);
      return false;
    }
  }

  /**
   * Batch validate products before checkout
   * Throws error if any product is unavailable
   */
  static async validateBeforeCheckout(cartItems: CartItem[]): Promise<void> {
    const validation = await this.validateCartItems(cartItems);

    if (!validation.isValid) {
      const unavailableNames = validation.unavailableItems
        .map((item) => item.productName || item.productId)
        .join(", ");

      throw new Error(
        `The following items are no longer available: ${unavailableNames}`
      );
    }
  }
}
