import { useState, useEffect, useCallback } from 'react';
import { StockValidationService, type CartValidationResult } from '../lib/stockValidationService';
import type { CartItem } from '../contexts/CartContext';

interface UseCartValidationResult {
  validation: CartValidationResult | null;
  isValidating: boolean;
  error: string | null;
  validateCart: () => Promise<void>;
  unavailableProductIds: Set<string>;
}

/**
 * Hook for real-time cart validation
 * Checks if cart items are still available in stock
 */
export function useCartValidation(
  cartItems: CartItem[],
  autoValidate = true,
  validateInterval = 30000 // 30 seconds
): UseCartValidationResult {
  const [validation, setValidation] = useState<CartValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized set of unavailable product IDs for quick lookup
  const unavailableProductIds = new Set(
    validation?.unavailableItems.map((item) => item.productId) || []
  );

  const validateCart = useCallback(async () => {
    if (!cartItems || cartItems.length === 0) {
      setValidation({
        isValid: true,
        unavailableItems: [],
        availableItems: [],
      });
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await StockValidationService.validateCartItems(cartItems);
      setValidation(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate cart items';
      setError(errorMessage);
      console.error('Cart validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [cartItems]);

  // Auto-validate on mount and when cart changes
  useEffect(() => {
    if (autoValidate) {
      validateCart();
    }
  }, [autoValidate, validateCart]);

  // Set up periodic validation
  useEffect(() => {
    if (!autoValidate || validateInterval <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      validateCart();
    }, validateInterval);

    return () => clearInterval(intervalId);
  }, [autoValidate, validateInterval, validateCart]);

  return {
    validation,
    isValidating,
    error,
    validateCart,
    unavailableProductIds,
  };
}
