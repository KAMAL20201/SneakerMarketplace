import { PAYMENT_TYPES } from "@/constants/enums";
import { formatPaymentAmount, getOrderPaymentBreakdown } from "@/lib/orderPayment";
import type { OrderPaymentFields, PaymentBreakdown } from "@/types/orderPayment";

interface OrderPaymentSummaryProps {
  order: OrderPaymentFields & { amount: number };
}

export function OrderPaymentSummary({ order }: OrderPaymentSummaryProps) {
  if (order.payment_type !== PAYMENT_TYPES.PARTIAL_COD) return null;
  let payment: PaymentBreakdown;
  try {
    payment = getOrderPaymentBreakdown(order);
  } catch {
    return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Payment breakdown unavailable. Please refresh or contact us for help.</p>;
  }
  return (
    <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-sm" aria-label="Partial COD payment breakdown">
      <p className="font-semibold text-purple-800">{order.advance_received_at ? order.cod_collected_at || payment.codAmount === 0 ? "Fully paid" : "Advance received · COD outstanding" : "Awaiting advance"}</p>
      <dl className="space-y-2">
        <div className="flex justify-between gap-3 font-semibold"><dt>Order total</dt><dd>{formatPaymentAmount(payment.totalAmount)}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>Advance {order.advance_received_at ? "received" : "due"}</dt><dd className={order.advance_received_at ? "font-medium text-green-700" : "font-medium text-amber-700"}>{formatPaymentAmount(payment.advanceAmount)} · {order.advance_received_at ? "Received" : "Awaiting payment"}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><dt>COD balance</dt><dd className={order.cod_collected_at || payment.codAmount === 0 ? "font-medium text-green-700" : "font-medium text-amber-700"}>{formatPaymentAmount(payment.codAmount)} · {order.cod_collected_at ? "Collected" : payment.codAmount === 0 ? "No balance due" : "Due on delivery"}</dd></div>
        <div className="flex justify-between gap-3 text-gray-600"><dt>COD fee included</dt><dd>{formatPaymentAmount(payment.codFee)}</dd></div>
      </dl>
      {order.checkout_id && <p className="text-xs text-gray-500">Checkout #{order.checkout_id.slice(0, 8)} · amounts allocated to this item</p>}
    </div>
  );
}
