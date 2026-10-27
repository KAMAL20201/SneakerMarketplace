import type { PaymentType } from "@/constants/enums";

/** Saved per-order allocation of the checkout payment, in INR.
 * Missing snapshots belong to legacy prepaid orders; use their existing amount.
 * Amounts are obligations, not proof that payment has been received.
 */
export interface OrderPaymentFields {
  checkout_id?: string | null;
  payment_type?: PaymentType;
  payment_total?: number | null;
  cod_fee?: number;
  advance_amount?: number | null;
  cod_amount?: number | null;
  advance_received_at?: string | null;
  cod_collected_at?: string | null;
}

export interface PaymentBreakdown {
  paymentType: PaymentType;
  orderAmount: number;
  codFee: number;
  totalAmount: number;
  advanceAmount: number;
  codAmount: number;
}
