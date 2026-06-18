CREATE OR REPLACE FUNCTION public.auth_admin_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM admin_users WHERE supabase_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM customers WHERE supabase_user_id = auth.uid() AND is_deleted = false LIMIT 1;
$$;

DROP POLICY IF EXISTS admin_users_self_select ON public.admin_users;
CREATE POLICY admin_users_self_select ON public.admin_users
  FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid());