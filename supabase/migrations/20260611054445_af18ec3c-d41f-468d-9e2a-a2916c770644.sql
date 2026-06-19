CREATE OR REPLACE FUNCTION public.is_active_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE supabase_user_id = _uid AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "menu_item_images_public_read" ON storage.objects;
CREATE POLICY "menu_item_images_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'menu-item-images');

DROP POLICY IF EXISTS "menu_item_images_admin_write" ON storage.objects;
CREATE POLICY "menu_item_images_admin_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-item-images' AND public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "menu_item_images_admin_update" ON storage.objects;
CREATE POLICY "menu_item_images_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'menu-item-images' AND public.is_active_admin(auth.uid()))
WITH CHECK (bucket_id = 'menu-item-images' AND public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "menu_item_images_admin_delete" ON storage.objects;
CREATE POLICY "menu_item_images_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'menu-item-images' AND public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "invoice_pdfs_public_read" ON storage.objects;
CREATE POLICY "invoice_pdfs_public_read" ON storage.objects
FOR SELECT
USING (bucket_id = 'invoice-pdfs');

DROP POLICY IF EXISTS "invoice_pdfs_admin_write" ON storage.objects;
CREATE POLICY "invoice_pdfs_admin_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoice-pdfs' AND public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "invoice_pdfs_admin_update" ON storage.objects;
CREATE POLICY "invoice_pdfs_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'invoice-pdfs' AND public.is_active_admin(auth.uid()))
WITH CHECK (bucket_id = 'invoice-pdfs' AND public.is_active_admin(auth.uid()));

DROP POLICY IF EXISTS "invoice_pdfs_admin_delete" ON storage.objects;
CREATE POLICY "invoice_pdfs_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'invoice-pdfs' AND public.is_active_admin(auth.uid()));