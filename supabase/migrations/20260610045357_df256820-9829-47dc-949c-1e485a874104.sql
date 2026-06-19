-- 1) Fix mutable search_path on trigger functions (security invoker)
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.log_price_change() SET search_path = public;
ALTER FUNCTION public.generate_order_number() SET search_path = public;
ALTER FUNCTION public.generate_invoice_number() SET search_path = public;
ALTER FUNCTION public.log_order_status_change() SET search_path = public;

-- 2) Restrict SECURITY DEFINER helpers to authenticated only
REVOKE EXECUTE ON FUNCTION public.auth_admin_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auth_customer_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_customer_id() TO authenticated;

-- 3) Add scoped policies to RLS-enabled tables that had none

-- order_status_history: customer sees their own order's history; admin sees all
DROP POLICY IF EXISTS order_status_history_select ON public.order_status_history;
CREATE POLICY order_status_history_select ON public.order_status_history
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = public.auth_customer_id())
    OR public.auth_admin_role() IS NOT NULL
  );

-- payment_status_history: customer sees their own; admin sees all
DROP POLICY IF EXISTS payment_status_history_select ON public.payment_status_history;
CREATE POLICY payment_status_history_select ON public.payment_status_history
  FOR SELECT TO authenticated
  USING (
    payment_id IN (
      SELECT p.id FROM public.payments p
      JOIN public.orders o ON o.id = p.order_id
      WHERE o.customer_id = public.auth_customer_id()
    )
    OR public.auth_admin_role() IS NOT NULL
  );

-- cart_item_addons: scoped to cart owner
DROP POLICY IF EXISTS cart_item_addons_all_own ON public.cart_item_addons;
CREATE POLICY cart_item_addons_all_own ON public.cart_item_addons
  FOR ALL TO authenticated
  USING (
    cart_item_id IN (
      SELECT ci.id FROM public.cart_items ci
      JOIN public.carts c ON c.id = ci.cart_id
      WHERE c.customer_id = public.auth_customer_id()
    )
  )
  WITH CHECK (
    cart_item_id IN (
      SELECT ci.id FROM public.cart_items ci
      JOIN public.carts c ON c.id = ci.cart_id
      WHERE c.customer_id = public.auth_customer_id()
    )
  );

-- order_item_addons: scoped to order owner; admins read
DROP POLICY IF EXISTS order_item_addons_select ON public.order_item_addons;
CREATE POLICY order_item_addons_select ON public.order_item_addons
  FOR SELECT TO authenticated
  USING (
    order_item_id IN (
      SELECT oi.id FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.customer_id = public.auth_customer_id()
    )
    OR public.auth_admin_role() IS NOT NULL
  );