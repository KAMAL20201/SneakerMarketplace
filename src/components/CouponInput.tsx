import React, { useState } from "react";
import { Tag, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import type { AppliedCoupon, CouponValidationResult } from "@/types/coupon";

interface CouponInputProps {
  orderAmount: number;
  productIds: string[];
  /** Price of each item in productIds (parallel array) — used to compute eligible subtotal */
  itemAmounts: number[];
  appliedCoupon: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
}

/** Map the COUPON_XXX: prefix from the RPC exception to a human-readable message */
function parseCouponError(rawMessage: string): string {
  const msg = rawMessage || "";
  if (msg.includes("COUPON_NOT_FOUND")) return "Invalid coupon code.";
  if (msg.includes("COUPON_INACTIVE")) return "This coupon is no longer active.";
  if (msg.includes("COUPON_EXHAUSTED")) return "This coupon has been fully redeemed.";
  if (msg.includes("COUPON_NOT_APPLICABLE"))
    return "This coupon is not valid for the items in your cart.";
  // COUPON_EXPIRED and COUPON_MIN_ORDER carry useful detail after the prefix
  const detailMatch = msg.match(/COUPON_EXPIRED: (.+)/);
  if (detailMatch) return detailMatch[1];
  const minMatch = msg.match(/COUPON_MIN_ORDER: (.+)/);
  if (minMatch) return minMatch[1];
  return "Could not apply coupon. Please try again.";
}

export const CouponInput: React.FC<CouponInputProps> = ({
  orderAmount,
  productIds,
  itemAmounts,
  appliedCoupon,
  onApply,
  onRemove,
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setError(null);
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc("validate_coupon", {
        p_code: trimmed,
        p_product_ids: productIds,
        p_item_amounts: itemAmounts,
        p_order_amount: orderAmount,
      });

      if (rpcError) {
        setError(parseCouponError(rpcError.message));
        return;
      }

      // RPC returns SETOF — take first row
      const result: CouponValidationResult = Array.isArray(data) ? data[0] : data;
      if (!result) {
        setError("Could not validate coupon.");
        return;
      }

      onApply({
        code: trimmed,
        couponId: result.coupon_id,
        discountAmount: result.discount_amount,
        remainingUses: result.remaining_uses,
        couponType: result.coupon_type,
        couponValue: result.coupon_value,
        applicableProductIds: result.applicable_product_ids,
      });
      setCode("");
    } catch (err) {
      setError("Could not apply coupon. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleApply();
  };

  // ── Applied state ──────────────────────────────────────────────────────────
  if (appliedCoupon) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="h-4 w-4 text-green-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-700 font-mono truncate">
                {appliedCoupon.code}
              </p>
              <p className="text-xs text-green-600">
                −₹{appliedCoupon.discountAmount} discount applied
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-full p-1 text-green-500 hover:bg-green-100 transition-colors"
            aria-label="Remove coupon"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {appliedCoupon.remainingUses !== null && appliedCoupon.remainingUses <= 5 && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            Only {appliedCoupon.remainingUses} use{appliedCoupon.remainingUses === 1 ? "" : "s"} left!
          </p>
        )}
      </div>
    );
  }

  // ── Input state ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Coupon code"
          className="font-mono uppercase text-sm rounded-xl"
          disabled={loading}
          maxLength={32}
        />
        <Button
          type="button"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          variant="outline"
          className="rounded-xl shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
