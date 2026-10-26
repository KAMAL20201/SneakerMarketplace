-- Foundation only: checkout remains prepaid until the payment flow is integrated.
-- Keep amount unchanged: existing coupon/admin flows still use it as their base.
-- Snapshot fields hold FINAL per-order allocations including discounts/shipping.
-- The ₹100 checkout fee must be allocated across rows, never charged per row.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN payment_type text NOT NULL DEFAULT 'prepaid',
  ADD COLUMN payment_total numeric(14, 2),
  ADD COLUMN cod_fee numeric(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN advance_amount numeric(14, 2),
  ADD COLUMN cod_amount numeric(14, 2),
  ADD COLUMN advance_received_at timestamptz,
  ADD COLUMN cod_collected_at timestamptz,
  ADD CONSTRAINT orders_payment_type_check CHECK (payment_type IN ('prepaid', 'partial_cod')),
  ADD CONSTRAINT orders_payment_snapshot_check CHECK (
    -- Legacy and existing creation paths remain prepaid without a snapshot.
    (payment_type = 'prepaid' AND payment_total IS NULL
      AND advance_amount IS NULL AND cod_amount IS NULL AND cod_fee = 0)
    OR
    (payment_total IS NOT NULL AND advance_amount IS NOT NULL AND cod_amount IS NOT NULL
      AND payment_total >= 0 AND payment_total < 'Infinity'::numeric
      AND advance_amount >= 0 AND cod_amount >= 0 AND cod_fee BETWEEN 0 AND 100
      AND payment_total >= cod_fee
      AND advance_amount + cod_amount = payment_total
      AND (payment_type = 'partial_cod'
        OR (cod_fee = 0 AND cod_amount = 0 AND advance_amount = payment_total)))
  ),
  ADD CONSTRAINT orders_cod_collection_check CHECK (
    cod_collected_at IS NULL OR
    (payment_type = 'partial_cod' AND advance_received_at IS NOT NULL
      AND cod_collected_at >= advance_received_at)
  );

COMMENT ON COLUMN public.orders.payment_total IS
  'Final per-order payment allocation including shipping, discount and allocated COD fee. NULL for legacy prepaid rows; fall back to amount.';
COMMENT ON COLUMN public.orders.advance_amount IS
  'Amount due upfront, not amount received. Receipt is recorded separately.';
COMMENT ON COLUMN public.orders.cod_amount IS
  'Amount due on delivery, not amount collected. Receipt is recorded separately.';
COMMENT ON COLUMN public.orders.cod_fee IS
  'This order row share of the single INR 100 partial COD checkout fee.';

-- No policies/grants/functions changed. Existing order access controls apply.
COMMIT;
