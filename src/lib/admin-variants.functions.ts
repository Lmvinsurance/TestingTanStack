import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAdmin } from "@/lib/authz.functions";

async function getAdmin(userId: string) {
  const a = await assertActiveAdmin({ userId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, outlet_id")
    .eq("id", a.id)
    .maybeSingle();
  if (!data) throw new Error("FORBIDDEN: Admin not found");
  return data as { id: string; role: string; outlet_id: string | null };
}

function canManage(role: string) {
  return role === "super_admin";
}
function canView(role: string) {
  return role === "super_admin" || role === "outlet_admin";
}

export const listAdminVariants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin(context.userId);
    if (!canView(admin.role)) throw new Error("FORBIDDEN: No access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: items, error: ie } = await supabaseAdmin
      .from("menu_items")
      .select("id, item_name, category_id, is_active, is_deleted")
      .eq("is_deleted", false)
      .order("item_name", { ascending: true });
    if (ie) throw new Error(ie.message);

    const { data: variants, error: ve } = await supabaseAdmin
      .from("item_variants")
      .select("id, item_id, variant_name, quantity_label, serves_count, base_price, is_active, created_at, updated_at")
      .order("item_id", { ascending: true })
      .order("created_at", { ascending: false });
    if (ve) throw new Error(ve.message);

    return {
      role: admin.role,
      items: items ?? [],
      variants: variants ?? [],
    };
  });

type VariantInput = {
  item_id: string;
  variant_name: string;
  quantity_label?: string | null;
  serves_count?: number | null;
  base_price: number;
  is_active?: boolean;
};

function validate(d: VariantInput) {
  if (!d?.item_id) throw new Error("Item is required");
  if (!d?.variant_name?.trim()) throw new Error("Variant name is required");
  if (typeof d.base_price !== "number" || d.base_price < 0) throw new Error("Base price must be ≥ 0");
  return {
    item_id: d.item_id,
    variant_name: d.variant_name.trim().slice(0, 120),
    quantity_label: d.quantity_label?.toString().trim().slice(0, 60) || null,
    serves_count: d.serves_count != null && d.serves_count !== ("" as unknown as number) ? Number(d.serves_count) : null,
    base_price: Number(d.base_price),
    is_active: d.is_active ?? true,
  };
}

export const createAdminVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: VariantInput) => validate(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Only super admins can create variants");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("item_variants")
      .insert({ ...data, created_by: admin.id, updated_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateAdminVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string } & VariantInput) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, ...validate(d) };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Only super admins can edit variants");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("item_variants")
      .update({ ...patch, updated_by: admin.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAdminVariantActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, is_active: !!d.is_active };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Only super admins can change status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("item_variants")
      .update({ is_active: data.is_active, updated_by: admin.id, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
