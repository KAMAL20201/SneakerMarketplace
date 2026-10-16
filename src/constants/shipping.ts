/** Delivery method chosen by the buyer at checkout */
export type ShippingMode = "surface" | "air";

export interface ShippingMethod {
  mode: ShippingMode;
  label: string;
  courier: string;
  eta: string;
  /** Short line describing how the buyer pays for this method */
  paymentNote: string;
}

/** Flat per-item shipping fee for Air (Surface uses the listing's own shipping_charges) */
export const AIR_SHIPPING_FEE_PER_ITEM = 399;

/** Amount collected by the courier on delivery, per item, for Air orders */
export const AIR_COD_AMOUNT_PER_ITEM = 999;

export const DEFAULT_SHIPPING_MODE: ShippingMode = "surface";

export const SHIPPING_METHODS: Record<ShippingMode, ShippingMethod> = {
  surface: {
    mode: "surface",
    label: "Surface",
    courier: "Delhivery",
    eta: "7–10 days",
    paymentNote: "Pay full amount now",
  },
  air: {
    mode: "air",
    label: "Air (Express)",
    courier: "BlueDart",
    eta: "4–8 days",
    paymentNote: `₹${AIR_COD_AMOUNT_PER_ITEM} per item cash on delivery, rest now`,
  },
};

/** Per-unit shipping fee for an item under the given delivery method */
export function getItemShippingFee(
  mode: ShippingMode,
  listingShippingCharges: number | undefined
): number {
  return mode === "air" ? AIR_SHIPPING_FEE_PER_ITEM : listingShippingCharges ?? 0;
}

/**
 * Per-unit amount collected on delivery. Capped at the unit's own price plus
 * shipping so a cheap item never asks for more COD than it costs.
 */
export function getItemCodAmount(
  mode: ShippingMode,
  unitPrice: number,
  unitShippingFee: number
): number {
  if (mode !== "air") return 0;
  return Math.min(AIR_COD_AMOUNT_PER_ITEM, unitPrice + unitShippingFee);
}

export interface ShippingPricingItem {
  price: number;
  quantity: number;
  shippingCharges?: number;
}

export interface CheckoutTotals {
  subtotal: number;
  shippingFee: number;
  /** Subtotal − discount + shipping */
  total: number;
  /** Collected by the courier on delivery */
  codAmount: number;
  /** Paid now via UPI / bank transfer */
  payNowAmount: number;
}

export function computeCheckoutTotals(
  items: ShippingPricingItem[],
  mode: ShippingMode,
  discountAmount: number
): CheckoutTotals {
  let subtotal = 0;
  let shippingFee = 0;
  let codAmount = 0;

  for (const item of items) {
    const unitShippingFee = getItemShippingFee(mode, item.shippingCharges);
    subtotal += item.price * item.quantity;
    shippingFee += unitShippingFee * item.quantity;
    codAmount += getItemCodAmount(mode, item.price, unitShippingFee) * item.quantity;
  }

  const total = Math.max(subtotal - discountAmount, 0) + shippingFee;
  const cappedCodAmount = Math.min(codAmount, total);

  return {
    subtotal,
    shippingFee,
    total,
    codAmount: cappedCodAmount,
    payNowAmount: total - cappedCodAmount,
  };
}
