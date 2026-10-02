-- ============================================================
-- INSTANT SHIP SALE: +7.5% price bump + 10% coupon (3 days)
-- Date: 2026-10-02
-- ============================================================

-- ── Step 1: Increase prices by 7.5% on instant-ship sizes ──

-- product_listing_sizes (legacy table)
UPDATE product_listing_sizes pls
SET price = ROUND(pls.price * 1.075 / 100.0) * 100
FROM product_listings pl
WHERE pls.listing_id = pl.id
  AND pls.is_instant_ship = TRUE
  AND pl.category = 'sneakers'
  AND pl.status = 'active'
  AND pl.is_deleted = FALSE;

-- product_variant_sizes (new variant table)
UPDATE product_variant_sizes pvs
SET price = ROUND(pvs.price * 1.075 / 100.0) * 100
FROM product_variants pv
JOIN product_listings pl ON pl.id = pv.listing_id
WHERE pvs.variant_id = pv.id
  AND pvs.is_instant_ship = TRUE
  AND pl.category = 'sneakers'
  AND pl.status = 'active'
  AND pl.is_deleted = FALSE;

-- ── Step 2: Create the coupon ──────────────────────────────

INSERT INTO coupons (
  code,
  type,
  value,
  max_uses,
  applicable_product_ids,
  min_order_amount,
  expires_at,
  is_active,
  description
)
VALUES (
  'INSTANTSHIP10',
  'percentage',
  10,
  NULL,           -- unlimited uses
  ARRAY[
    '014e1d57-76f3-463e-9f61-2f6d4c616e4a',
    '097093bb-575f-42ca-8302-355d46eae7db',
    '15f71c95-07bf-437a-aeb9-fa47c7ad8a44',
    '17fb160b-6f7c-4e10-8f17-b7bb7c9d626e',
    '1f1a6353-e229-4a42-b669-20ee2db283bf',
    '202818b4-1380-43d5-a332-3b6edea51f08',
    '2feeb799-6a47-4b6c-a8e3-974b094f26b3',
    '31efc227-a26f-4e7b-ae38-5b1d65688873',
    '3bd74795-7a87-4ff8-b16d-ab49df2c2920',
    '5403ef46-b9c6-451d-9c23-133e714ee890',
    '5486f776-6106-4655-b54f-6c0fb3c5110a',
    '55c968e8-3998-4cc1-a7ac-2d6e4dfb4e17',
    '60fc5e95-3eb7-4113-993f-a0d99f594ecd',
    '6ea72ada-ccad-45b1-8dfa-742a4f1dea4c',
    '749fba5d-4109-4c35-b0e9-6cdea87b3fd2',
    '7f315085-3146-4e9b-bd50-ba40adf82dff',
    '8392ae17-0757-4a8d-b6c4-f517a2b6e3c4',
    '84b67306-79b5-42ef-a8e8-2ee6bb3162fc',
    '9180854b-5567-4c69-81f8-922e970f6b37',
    '9515d9e3-1fcf-4031-b73c-1549167b3629',
    '97cd0951-35d8-4e82-8363-d18e86c4c82f',
    '9cd362df-133c-4a1b-8d4b-90cdc8ddf8de',
    'a047ad1a-2516-49e5-ad43-26bd690cc21b',
    'a59742f6-682d-4fd0-ac4e-3b4b6e3a264f',
    'a88000ed-0f7b-4496-95b2-74a51f873473',
    'b7b6184d-b6e8-4bc9-afbc-3e9a73c3aad9',
    'c175b71a-a4b0-43e2-9654-d6e8550465a3',
    'c6979612-3df9-4b3a-9ce8-22fe9299be10',
    'ce6aac1a-d851-4046-9d19-7e60d5f82f5f',
    'd272ee68-6e50-47f9-989a-fd4391321182',
    'd3eb3986-c899-4965-8390-3d4498df3c93',
    'd9928d32-f3ce-4532-ae2c-cfa022560fd9',
    'dbc6df0d-8622-45f1-90bc-42be086f4b28',
    'dd73c19b-cad5-4949-bd3d-71553b33495c',
    'e393ce58-73c5-4819-8317-0f8f4ace56e4',
    'e821b5bd-319d-41d9-a3ba-bceb49a0acb8',
    'e85a6bde-7d63-48f8-b646-07b368247d30',
    'ec2d9231-e15a-4504-b205-252976186ae2',
    'eea6201b-b3c6-4369-a21e-d95ab2245e55',
    'f09f13e5-839c-44fe-adda-0cf503cb1c78'
  ]::uuid[],
  NULL,           -- no minimum order
  NOW() + INTERVAL '3 days',   -- expires 3 days from now
  TRUE,
  'Instant Ship Sale — 10% off all instant ship sneakers. Valid for 3 days.'
);
