import { supabase } from './supabase';
import type { CartItem } from '../contexts/CartContext';

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
   * Check if a single product is still available for purchase
   */
  static async checkProductAvailability(
    productId: string
  ): Promise<StockValidationResult> {
    try {
      const { data: product, error } = await supabase
        .from('product_listings')
        .select('id, status, title')
        .eq('id', productId)
        .single();

      if (error || !product) {
        return {
          productId,
          isAvailable: false,
          currentStatus: 'not_found',
        };
      }

      return {
        productId,
        isAvailable: product.status === 'active',
        currentStatus: product.status,
        productName: product.title,
      };
    } catch (error) {
      console.error('Error checking product availability:', error);
      return {
        productId,
        isAvailable: false,
        currentStatus: 'error',
      };
    }
  }

  /**
   * Validate all items in cart are still available
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
      .from('product_listings')
      .select('id, status, title')
      .in('id', productIds);

    if (error) {
      console.error('Error validating cart items:', error);
      throw new Error('Failed to validate cart items');
    }

    const productStatusMap = new Map(
      products?.map((p) => [p.id, { status: p.status, title: p.title }]) || []
    );

    const unavailableItems: StockValidationResult[] = [];
    const availableItems: StockValidationResult[] = [];

    for (const productId of productIds) {
      const productInfo = productStatusMap.get(productId);

      if (!productInfo || productInfo.status !== 'active') {
        unavailableItems.push({
          productId,
          isAvailable: false,
          currentStatus: productInfo?.status || 'not_found',
          productName: productInfo?.title,
        });
      } else {
        availableItems.push({
          productId,
          isAvailable: true,
          currentStatus: productInfo.status,
          productName: productInfo.title,
        });
      }
    }

    return {
      isValid: unavailableItems.length === 0,
      unavailableItems,
      availableItems,
    };
  }

  /**
   * Validate and update product status with optimistic locking
   * Returns true if successfully marked as sold, false if already sold
   */
  static async markProductAsSold(productId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .update({ status: 'sold' })
        .eq('id', productId)
        .eq('status', 'active') // Only update if still active (optimistic locking)
        .select()
        .single();

      if (error) {
        console.error('Error marking product as sold:', error);
        return false;
      }

      // If no data returned, product was not active (already sold or unavailable)
      return !!data;
    } catch (error) {
      console.error('Error in markProductAsSold:', error);
      return false;
    }
  }

  /**
   * Batch validate products before checkout
   * Throws error if any product is unavailable
   */
  static async validateBeforeCheckout(
    cartItems: CartItem[]
  ): Promise<void> {
    const validation = await this.validateCartItems(cartItems);

    if (!validation.isValid) {
      const unavailableNames = validation.unavailableItems
        .map((item) => item.productName || item.productId)
        .join(', ');

      throw new Error(
        `The following items are no longer available: ${unavailableNames}`
      );
    }
  }
}
