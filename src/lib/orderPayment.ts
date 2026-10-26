import { PAYMENT_TYPES, type PaymentType } from "../constants/enums";
import type { OrderPaymentFields, PaymentBreakdown } from "../types/orderPayment";

export const PARTIAL_COD_FEE = 100;

export function formatPaymentAmount(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function toPaise(amount: number): number {
  const paise = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(paise)) {
    throw new Error("Payment amounts must be finite, non-negative INR amounts.");
  }
  return paise;
}

/** Call once per checkout with the total AFTER discounts and shipping.
 * Do not call once per item: the ₹100 fee applies once to the entire checkout.
 * This calculates amounts due; it does not confirm receipt of payment.
 */
export function calculatePaymentBreakdown(
  orderAmount: number,
  paymentType: PaymentType = PAYMENT_TYPES.PREPAID
): PaymentBreakdown {
  if (paymentType !== PAYMENT_TYPES.PREPAID && paymentType !== PAYMENT_TYPES.PARTIAL_COD) {
    throw new Error("Unsupported payment type.");
  }
  const orderPaise = toPaise(orderAmount);
  const feePaise = paymentType === PAYMENT_TYPES.PARTIAL_COD ? PARTIAL_COD_FEE * 100 : 0;
  const totalPaise = paymentType === PAYMENT_TYPES.PARTIAL_COD
    ? Math.round((orderPaise + feePaise) / 100) * 100
    : orderPaise + feePaise;
  // Multiplication by 7 must also stay exact before division and rounding.
  if (!Number.isSafeInteger(totalPaise * 7)) {
    throw new Error("Payment amount exceeds the supported range.");
  }
  const advancePaise = paymentType === PAYMENT_TYPES.PARTIAL_COD
    ? Math.round(totalPaise * 7 / 1000) * 100
    : totalPaise;

  return {
    paymentType,
    orderAmount: orderPaise / 100,
    codFee: feePaise / 100,
    totalAmount: totalPaise / 100,
    advanceAmount: advancePaise / 100,
    codAmount: (totalPaise - advancePaise) / 100,
  };
}

/** Reads the saved allocation without charging the checkout fee again per row. */
export function getOrderPaymentBreakdown(
  order: OrderPaymentFields & { amount: number }
): PaymentBreakdown {
  const paymentType = order.payment_type ?? PAYMENT_TYPES.PREPAID;
  if (order.payment_total == null && paymentType === PAYMENT_TYPES.PREPAID) {
    return calculatePaymentBreakdown(order.amount);
  }
  if (order.payment_total == null || order.advance_amount == null || order.cod_amount == null) {
    throw new Error("Order payment breakdown is incomplete.");
  }
  if (paymentType !== PAYMENT_TYPES.PREPAID && paymentType !== PAYMENT_TYPES.PARTIAL_COD) {
    throw new Error("Unsupported payment type.");
  }
  const totalPaise = toPaise(order.payment_total);
  const advancePaise = toPaise(order.advance_amount);
  const codPaise = toPaise(order.cod_amount);
  const feePaise = toPaise(order.cod_fee ?? 0);
  if (advancePaise + codPaise !== totalPaise || feePaise > totalPaise || feePaise > PARTIAL_COD_FEE * 100
    || (paymentType === PAYMENT_TYPES.PREPAID && (feePaise !== 0 || codPaise !== 0))) {
    throw new Error("Order payment breakdown is inconsistent.");
  }
  return {
    paymentType,
    orderAmount: (totalPaise - feePaise) / 100,
    codFee: feePaise / 100,
    totalAmount: totalPaise / 100,
    advanceAmount: advancePaise / 100,
    codAmount: codPaise / 100,
  };
}
