-- Add soft delete support to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Update RPC: soft delete instead of hard delete
CREATE OR REPLACE FUNCTION delete_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized: admin only';
  END IF;

  UPDATE orders SET is_deleted = true, updated_at = now() WHERE id = p_order_id;
END;
$$;
