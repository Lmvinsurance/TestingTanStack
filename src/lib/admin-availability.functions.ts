import { createServerFn } from "@/lib/react-start-mock";
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
  ["super_admin", "outlet_admin", "kitchen", "cashier"].includes(role);
const canManage = (role: string) =>
  ["super_admin", "outlet_admin", "kitchen"].includes(role);

function outletScopeOk(role: string, ownOutlet: string | null, targetOutlet: string) {
  if (role === "super_admin") return true;
  return !!ownOutlet && ownOutlet === targetOutlet;
}

export const listOutletAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin(context.userId);
    if (!canView(admin.role)) throw new Error("FORBIDDEN: No access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let aq = supabaseAdmin
      .from("outlet_item_availability")
      .select(
        "id, outlet_id, item_id, is_available, stock_status, available_from, available_to, updated_at",
      )
      .order("updated_at", { ascending: false });
    if (admin.role !== "super_admin" && admin.outlet_id)
      aq = aq.eq("outlet_id", admin.outlet_id);
    const { data: availability, error: ae } = await aq;
    if (ae) throw new Error(ae.message);

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
      .eq("is_active", true)
      .order("item_name");
    if (ie) throw new Error(ie.message);

    return {
      role: admin.role,
      outletId: admin.outlet_id,
      availability: availability ?? [],
      outlets: outlets ?? [],
      items: items ?? [],
    };
  });

type AvailInput = {
  outlet_id: string;
  item_id: string;
  is_available: boolean;
  stock_status?: string;
  available_from?: string | null;
  available_to?: string | null;
};

function validate(d: AvailInput) {
  if (!d?.outlet_id || !d?.item_id) throw new Error("Outlet and item are required");
  const allowedStatus = ["available", "limited", "sold_out", "unavailable"];
  const status = d.stock_status || (d.is_available ? "available" : "unavailable");
  if (!allowedStatus.includes(status)) throw new Error("Invalid stock status");
  const norm = (t?: string | null) => {
    if (!t) return null;
    return /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t;
  };
  return {
    outlet_id: d.outlet_id,
    item_id: d.item_id,
    is_available: !!d.is_available,
    stock_status: status,
    available_from: norm(d.available_from),
    available_to: norm(d.available_to),
  };
}

export const upsertAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AvailInput) => validate(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Cannot manage availability");
    if (!outletScopeOk(admin.role, admin.outlet_id, data.outlet_id))
      throw new Error("FORBIDDEN: Outlet not in your scope");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("outlet_item_availability")
      .select("id")
      .eq("outlet_id", data.outlet_id)
      .eq("item_id", data.item_id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("outlet_item_availability")
        .update({
          is_available: data.is_available,
          stock_status: data.stock_status,
          available_from: data.available_from,
          available_to: data.available_to,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, updated: true };
    }
    const { data: row, error } = await supabaseAdmin
      .from("outlet_item_availability")
      .insert({ ...data, updated_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, updated: false };
  });

export const bulkAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    outlet_id: string;
    item_ids: string[];
    action: "available" | "unavailable" | "limited" | "sold_out";
  }) => {
    if (!d?.outlet_id) throw new Error("Outlet required");
    if (!Array.isArray(d.item_ids) || d.item_ids.length === 0) throw new Error("Select items");
    if (!["available", "unavailable", "limited", "sold_out"].includes(d.action))
      throw new Error("Invalid action");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN: Cannot manage availability");
    if (!outletScopeOk(admin.role, admin.outlet_id, data.outlet_id))
      throw new Error("FORBIDDEN: Outlet not in your scope");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const is_available = data.action === "available" || data.action === "limited";
    const rows = data.item_ids.map((item_id) => ({
      outlet_id: data.outlet_id,
      item_id,
      is_available,
      stock_status: data.action,
      updated_by: admin.id,
    }));
    const { error } = await supabaseAdmin
      .from("outlet_item_availability")
      .upsert(rows, { onConflict: "outlet_id,item_id" });
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });
