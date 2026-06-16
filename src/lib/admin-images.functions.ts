import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow, isSuper } from "@/lib/admin-shared.functions";

export const listAdminImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminRow(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: items, error: ie }, { data: images, error: xe }] = await Promise.all([
      supabaseAdmin
        .from("menu_items")
        .select("id, item_name, category_id, is_active, is_deleted")
        .eq("is_deleted", false)
        .order("item_name", { ascending: true }),
      supabaseAdmin
        .from("item_images")
        .select("id, item_id, image_url, is_primary, display_order, created_at")
        .order("item_id", { ascending: true })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);
    if (ie) throw new Error(ie.message);
    if (xe) throw new Error(xe.message);

    return { role: admin.role, items: items ?? [], images: images ?? [] };
  });

type CreateImageInput = {
  item_id: string;
  image_url: string;
  is_primary?: boolean;
  display_order?: number;
};

export const createAdminImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateImageInput) => {
    if (!d?.item_id) throw new Error("Item is required");
    if (!d?.image_url) throw new Error("image_url is required");
    return {
      item_id: d.item_id,
      image_url: d.image_url,
      is_primary: !!d.is_primary,
      display_order: Number.isFinite(d.display_order) ? Number(d.display_order) : 0,
    };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!isSuper(admin.role)) throw new Error("FORBIDDEN: Only super admins can upload images");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.is_primary) {
      const { error: pe } = await supabaseAdmin
        .from("item_images")
        .update({ is_primary: false })
        .eq("item_id", data.item_id);
      if (pe) throw new Error(pe.message);
    }
    const { data: row, error } = await supabaseAdmin
      .from("item_images")
      .insert(data)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setPrimaryAdminImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; item_id: string }) => {
    if (!d?.id || !d?.item_id) throw new Error("id and item_id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!isSuper(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("item_images").update({ is_primary: false }).eq("item_id", data.item_id);
    const { error } = await supabaseAdmin
      .from("item_images")
      .update({ is_primary: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const replaceAdminImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; image_url: string }) => {
    if (!d?.id || !d?.image_url) throw new Error("id and image_url required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!isSuper(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("item_images")
      .update({ image_url: data.image_url })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdminImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!isSuper(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Try to delete storage object if URL points to our bucket
    const { data: row } = await supabaseAdmin
      .from("item_images")
      .select("image_url")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.image_url) {
      const marker = "/storage/v1/object/public/menu-item-images/";
      const idx = row.image_url.indexOf(marker);
      if (idx >= 0) {
        const path = row.image_url.slice(idx + marker.length);
        await supabaseAdmin.storage.from("menu-item-images").remove([path]);
      }
    }
    const { error } = await supabaseAdmin.from("item_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
