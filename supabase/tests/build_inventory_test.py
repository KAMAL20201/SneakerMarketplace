"""Build a rollback-only integration test of the migration using temp fixtures.
Usage: python3 supabase/tests/build_inventory_test.py > /tmp/inventory-test.sql
Execute the generated SQL in a PostgreSQL connection with Supabase roles/auth.uid().
"""
from pathlib import Path

root = Path(__file__).resolve().parents[2]
migration = (root / 'supabase/migrations/20261012055312_size_inventory.sql').read_text()
migration = migration.replace('CREATE SCHEMA IF NOT EXISTS inventory_private;', '')
migration = migration.replace('GRANT USAGE ON SCHEMA inventory_private TO authenticated;', '')
migration = migration.replace('inventory_private.', 'pg_temp.').replace('public.', 'pg_temp.')
migration = migration.replace('IN SCHEMA inventory_private', 'IN SCHEMA pg_temp')
bootstrap = '''
BEGIN;
CREATE TEMP TABLE admin_users (user_id uuid PRIMARY KEY);
CREATE TEMP TABLE product_listings (id uuid PRIMARY KEY, status text, sold_at timestamptz);
CREATE TEMP TABLE product_variants (id uuid PRIMARY KEY, listing_id uuid);
CREATE TEMP TABLE product_variant_sizes (id uuid PRIMARY KEY, variant_id uuid, size_value text, is_sold boolean DEFAULT false);
CREATE TEMP TABLE product_listing_sizes (id uuid PRIMARY KEY, listing_id uuid, size_value text, is_sold boolean DEFAULT false);
CREATE TEMP TABLE orders (id uuid PRIMARY KEY, product_id uuid, variant_id uuid, ordered_size text, status text, updated_at timestamptz, is_deleted boolean DEFAULT false);
INSERT INTO admin_users VALUES ('10000000-0000-0000-0000-000000000001');
INSERT INTO product_listings VALUES ('20000000-0000-0000-0000-000000000001', 'active', NULL), ('20000000-0000-0000-0000-000000000002', 'active', NULL);
INSERT INTO product_variants VALUES ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
INSERT INTO product_variant_sizes VALUES
 ('30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'UK 8', false),
 ('30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'UK 9', false),
 ('30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'SOLD', true);
INSERT INTO product_listing_sizes VALUES ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'M', false);
INSERT INTO orders (id, product_id, variant_id, ordered_size, status) VALUES
 ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'UK 8', 'pending_payment'),
 ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'UK 8', 'pending_payment'),
 ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', NULL, 'M', 'pending_payment');
ALTER TABLE product_variant_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_listing_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_variants ON product_variant_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY seller_variants ON product_variant_sizes FOR UPDATE TO authenticated
 USING (auth.uid() = '10000000-0000-0000-0000-000000000002')
 WITH CHECK (auth.uid() = '10000000-0000-0000-0000-000000000002');
CREATE POLICY read_legacy ON product_listing_sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_legacy ON product_listing_sizes FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY read_listings ON product_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_listings ON product_listings FOR UPDATE TO authenticated
 USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()))
 WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
GRANT SELECT, UPDATE, INSERT ON ALL TABLES IN SCHEMA pg_temp TO authenticated;
'''
print(bootstrap)
print(migration)
print((root / 'supabase/tests/size_inventory.sql').read_text())
