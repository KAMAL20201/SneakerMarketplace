export interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "flat";
  value: number;
  max_uses: number | null;
  used_count: number;
  applicable_product_ids: string[] | null;
  min_order_amount: number | null;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponValidationResult {
  coupon_id: string;
  discount_amount: number;
  coupon_type: "percentage" | "flat";
  coupon_value: number;
  remaining_uses: number | null;
  /** NULL means the coupon applies to all products */
  applicable_product_ids: string[] | null;
}

/** Shape stored in CartContext and BuyNowModal local state after a successful validation */
export interface AppliedCoupon {
  code: string;
  couponId: string;
  discountAmount: number;
  remainingUses: number | null;
  couponType: "percentage" | "flat";
  couponValue: number;
  /** NULL means all products are eligible */
  applicableProductIds: string[] | null;
}
