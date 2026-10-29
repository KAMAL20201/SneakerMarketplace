import type { CartItem } from "./orderService";
import { supabase } from "./supabase";

export interface StockValidationResult {
  productId: string;
  itemId?: string;
  availableQuantity?: number;
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

    const { data: sizes, error: sizesError } = await supabase
      .from("product_listing_sizes")
      .select("listing_id, size_value, is_sold, quantity")
      .in("listing_id", productIds);
    if (sizesError) throw new Error("Failed to validate size stock");
    const sizeStock = new Map((sizes || []).map((size) => [
      `${size.listing_id}::${size.size_value}`, size.is_sold ? 0 : size.quantity ?? 1,
    ]));

    const variantIds = [...new Set(cartItems.map((item) => item.variantId)
      .filter((id): id is string => !!id))];
    const variantStock = new Map<string, number>();
    if (variantIds.length > 0) {
      const { data: sizes, error: variantError } = await supabase
        .from("product_variant_sizes")
        .select("variant_id, size_value, is_sold, quantity")
        .in("variant_id", variantIds);
      if (variantError) throw new Error("Failed to validate variant stock");
      sizes?.forEach((size) => variantStock.set(
        `${size.variant_id}::${size.size_value}`, size.is_sold ? 0 : size.quantity ?? 1,
      ));
    }

    const unavailableItems: StockValidationResult[] = [];
    const availableItems: StockValidationResult[] = [];

    for (const item of cartItems) {
      const productInfo = productStatusMap.get(item.productId);

      if (!productInfo || productInfo.status !== "active") {
        unavailableItems.push({
          productId: item.productId,
          itemId: item.id,
          isAvailable: false,
          currentStatus: productInfo?.status || "not_found",
          productName: productInfo?.title,
        });
        continue;
      }

      const availableQuantity = item.variantId
        ? variantStock.get(`${item.variantId}::${item.size}`) ?? 1
        : sizeStock.get(`${item.productId}::${item.size}`) ?? 1;
      const requestedQuantity = cartItems.filter((candidate) =>
        candidate.productId === item.productId && candidate.size === item.size &&
        (candidate.variantId ?? null) === (item.variantId ?? null)
      ).reduce((total, candidate) => total + candidate.quantity, 0);
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || requestedQuantity > availableQuantity) {
        unavailableItems.push({
          productId: item.productId,
          itemId: item.id,
          availableQuantity,
          isAvailable: false,
          currentStatus: availableQuantity === 0 ? "sold" : "insufficient_stock",
          productName: productInfo.title,
        });
        continue;
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
