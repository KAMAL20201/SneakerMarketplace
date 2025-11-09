import { useState, useEffect, useCallback } from 'react';
import { StockValidationService, type CartValidationResult } from '../lib/stockValidationService';
import type { CartItem } from '../contexts/CartContext';

interface UseCartValidationResult {
  validation: CartValidationResult | null;
  isValidating: boolean;
  error: string | null;
  validateCart: () => Promise<CartValidationResult>;
  unavailableProductIds: Set<string>;
}

/**
 * Hook for cart validation
 * Checks if cart items are still available in stock
 * Validates on-demand to avoid unnecessary database calls
 */
export function useCartValidation(
  cartItems: CartItem[],
  autoValidate = false
): UseCartValidationResult {
  const [validation, setValidation] = useState<CartValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized set of unavailable product IDs for quick lookup
  const unavailableProductIds = new Set(
    validation?.unavailableItems.map((item) => item.productId) || []
  );

  const validateCart = useCallback(async (): Promise<CartValidationResult> => {
    if (!cartItems || cartItems.length === 0) {
      const emptyResult = {
        isValid: true,
        unavailableItems: [],
        availableItems: [],
      };
      setValidation(emptyResult);
      return emptyResult;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await StockValidationService.validateCartItems(cartItems);
      setValidation(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate cart items';
      setError(errorMessage);
      console.error('Cart validation error:', err);
      const errorResult = {
        isValid: false,
        unavailableItems: [],
        availableItems: [],
      };
      setValidation(errorResult);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [cartItems]);

  // Auto-validate on mount and when cart changes (if enabled)
  useEffect(() => {
    if (autoValidate) {
      validateCart();
    }
  }, [autoValidate, validateCart]);

  return {
    validation,
    isValidating,
    error,
    validateCart,
    unavailableProductIds,
  };
}
