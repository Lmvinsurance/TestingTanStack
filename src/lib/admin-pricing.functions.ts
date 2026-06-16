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

const canView = (role: string) =>
  role === "super_admin" || role === "outlet_admin" || role === "cashier";
const canManage = (role: string) => role === "super_admin" || role === "outlet_admin";

function outletScopeOk(role: string, ownOutlet: string | null, targetOutlet: string) {
  if (role === "super_admin") return true;
  if (role === "outlet_admin") return !!ownOutlet && ownOutlet === targetOutlet;
  return false;
}

export const listOutletPricing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin(context.userId);
    if (!canView(admin.role)) throw new Error("FORBIDDEN: No access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let pq = supabaseAdmin
      .from("outlet_variant_prices")
      .select(
        "id, outlet_id, item_id, variant_id, mrp_price, selling_price, is_available, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (admin.role !== "super_admin" && admin.outlet_id) pq = pq.eq("outlet_id", admin.outlet_id);
    const { data: prices, error: pe } = await pq;
    if (pe) throw new Error(pe.message);

    let oq = supabaseAdmin
      .from("outlets")
      .select("id, outlet_name, outlet_code, is_active")
      .eq("is_deleted", false)
      .eq("is_active", true)
      .order("outlet_name");
    if (admin.role !== "super_admin" && admin.outlet_id) oq = oq.eq("id", admin.outlet_id);
    const { data: outlets, error: oe } = await oq;
    if (oe) throw new Error(oe.message);

    const { data: items, error: ie } = await supabaseAdmin
      .from("menu_items")
      .select("id, item_name, category_id, is_active")
      .eq("is_deleted", false)
      .order("item_name");
    if (ie) throw new Error(ie.message);

    const { data: variants, error: ve } = await supabaseAdmin
      .from("item_variants")
      .select("id, item_id, variant_name, quantity_label, base_price, is_active")
      .order("variant_name");
    if (ve) throw new Error(ve.message);

    return {
      role: admin.role,
      outletId: admin.outlet_id,
      prices: prices ?? [],
      outlets: outlets ?? [],
      items: items ?? [],
      variants: variants ?? [],
    };
  });

type PriceInput = {
  outlet_id: string;
  item_id: string;
  variant_id: string;
  selling_price: number;
  mrp_price?: number | null;
  is_available?: boolean;
};

function validate(d: PriceInput) {
  if (!d?.outlet_id || !d?.item_id || !d?.variant_id) throw new Error("Outlet, item and variant are required");
  if (typeof d.selling_price !== "number" || d.selling_price < 0) throw new Error("Selling price must be ≥ 0");
  if (d.mrp_price != null && (typeof d.mrp_price !== "number" || d.mrp_price < 0))
    throw new Error("MRP price must be ≥ 0");
  return {
    outlet_id: d.outlet_id,
    item_id: d.item_id,
    variant_id: d.variant_id,
    selling_price: Number(d.selling_price),
    mrp_price: d.mrp_price == null ? null : Number(d.mrp_price),
    is_available: d.is_available ?? true,
  };
}

export const upsertOutletPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: PriceInput) => validate(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Cannot manage pricing");
    if (!outletScopeOk(admin.role, admin.outlet_id, data.outlet_id))
      throw new Error("FORBIDDEN: Outlet not in your scope");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("outlet_variant_prices")
      .select("id")
      .eq("outlet_id", data.outlet_id)
      .eq("variant_id", data.variant_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("outlet_variant_prices")
        .update({
          selling_price: data.selling_price,
          mrp_price: data.mrp_price,
          is_available: data.is_available,
          item_id: data.item_id,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, updated: true };
    }
    const { data: row, error } = await supabaseAdmin
      .from("outlet_variant_prices")
      .insert({ ...data, created_by: admin.id, updated_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, updated: false };
  });

export const setOutletPriceAvailable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_available: boolean }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, is_available: !!d.is_available };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Cannot manage pricing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("outlet_variant_prices")
      .select("outlet_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Price record not found");
    if (!outletScopeOk(admin.role, admin.outlet_id, row.outlet_id))
      throw new Error("FORBIDDEN: Outlet not in your scope");
    const { error } = await supabaseAdmin
      .from("outlet_variant_prices")
      .update({
        is_available: data.is_available,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
