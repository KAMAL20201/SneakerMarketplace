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
