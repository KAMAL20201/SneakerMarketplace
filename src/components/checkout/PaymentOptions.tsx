import { useId } from "react";
import { PAYMENT_TYPES, type PaymentType } from "@/constants/enums";
import { calculatePaymentBreakdown, formatPaymentAmount } from "@/lib/orderPayment";

interface PaymentOptionsProps {
  amount: number;
  value: PaymentType;
  onChange: (value: PaymentType) => void;
}

export function PaymentOptions({ amount, value, onChange }: PaymentOptionsProps) {
  const name = useId();
  const breakdown = calculatePaymentBreakdown(amount, value);
  const roundingAdjustment = Math.round((breakdown.totalAmount - breakdown.orderAmount - breakdown.codFee) * 100) / 100;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-3 font-semibold text-gray-900">How would you like to pay?</legend>
      {[PAYMENT_TYPES.PREPAID, PAYMENT_TYPES.PARTIAL_COD].map((paymentType) => {
        const option = calculatePaymentBreakdown(amount, paymentType);
        const partial = paymentType === PAYMENT_TYPES.PARTIAL_COD;
        return (
          <label key={paymentType} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${value === paymentType ? "border-purple-600 bg-purple-50" : "border-gray-200 bg-white"}`}>
            <input type="radio" name={name} value={paymentType} checked={value === paymentType} onChange={() => onChange(paymentType)} className="mt-1 h-5 w-5 shrink-0 accent-purple-600" />
            <span className="min-w-0 space-y-1 text-sm">
              <span className="block font-semibold text-gray-900">{partial ? "Partial COD" : "Pay in full"}</span>
              <span className="block font-medium">Pay {formatPaymentAmount(option.advanceAmount)} now</span>
              <span className="block text-gray-600">{partial ? `${formatPaymentAmount(option.codAmount)} on delivery · 70% now, 30% later` : "No COD fee"}</span>
              {partial && <span className="block text-xs text-gray-600">₹100 extra, included before the split</span>}
            </span>
          </label>
        );
      })}
      <div aria-live="polite" aria-atomic="true" className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm">
        {value === PAYMENT_TYPES.PARTIAL_COD && <div className="flex justify-between gap-3"><span>Partial COD fee</span><span>+₹100</span></div>}
        {roundingAdjustment !== 0 && <div className="flex justify-between gap-3 text-gray-600"><span>Round off</span><span>{roundingAdjustment > 0 ? "+" : "−"}{formatPaymentAmount(Math.abs(roundingAdjustment))}</span></div>}
        <div className="flex justify-between gap-3 font-semibold"><span>Total</span><span>{formatPaymentAmount(breakdown.totalAmount)}</span></div>
        <div className="flex justify-between gap-3 font-semibold text-purple-700"><span>Pay now</span><span>{formatPaymentAmount(breakdown.advanceAmount)}</span></div>
        {value === PAYMENT_TYPES.PARTIAL_COD && <div className="flex justify-between gap-3"><span>Due on delivery</span><span>{formatPaymentAmount(breakdown.codAmount)}</span></div>}
      </div>
    </fieldset>
  );
}
