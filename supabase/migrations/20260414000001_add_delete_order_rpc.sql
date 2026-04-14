-- RPC: delete_order
-- Admin-only order deletion. Checks that the caller is in admin_users before deleting.
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

  DELETE FROM orders WHERE id = p_order_id;
END;
$$;
