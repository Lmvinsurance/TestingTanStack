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
const canManage = (r: string) => r === "super_admin";
const canView = (r: string) => r === "super_admin" || r === "outlet_admin";

export const listAdminAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdmin(context.userId);
    if (!canView(admin.role)) throw new Error("FORBIDDEN: No access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [addonsRes, mapsRes, itemsRes] = await Promise.all([
      supabaseAdmin
        .from("addons")
        .select("id, addon_name, description, price, is_active, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("item_addons")
        .select("id, item_id, addon_id, is_required, max_quantity"),
      supabaseAdmin
        .from("menu_items")
        .select("id, item_name, category_id, is_active, is_deleted")
        .eq("is_deleted", false)
        .order("item_name", { ascending: true }),
    ]);
    if (addonsRes.error) throw new Error(addonsRes.error.message);
    if (mapsRes.error) throw new Error(mapsRes.error.message);
    if (itemsRes.error) throw new Error(itemsRes.error.message);

    return {
      role: admin.role,
      addons: addonsRes.data ?? [],
      mappings: mapsRes.data ?? [],
      items: itemsRes.data ?? [],
    };
  });

type AddonInput = {
  addon_name: string;
  description?: string | null;
  price: number;
  is_active?: boolean;
};
function validate(d: AddonInput) {
  if (!d?.addon_name?.trim()) throw new Error("Add-on name is required");
  if (typeof d.price !== "number" || d.price < 0) throw new Error("Price must be ≥ 0");
  return {
    addon_name: d.addon_name.trim().slice(0, 120),
    description: d.description?.toString().trim().slice(0, 500) || null,
    price: Number(d.price),
    is_active: d.is_active ?? true,
  };
}

export const createAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AddonInput) => validate(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("addons")
      .insert({ ...data, created_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateAdminAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string } & AddonInput) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, ...validate(d) };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("addons")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAdminAddonActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, is_active: !!d.is_active };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("addons")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

type AssignmentItem = { item_id: string; is_required?: boolean; max_quantity?: number };
export const saveAddonAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { addon_id: string; items: AssignmentItem[] }) => {
    if (!d?.addon_id) throw new Error("addon_id required");
    if (!Array.isArray(d.items)) throw new Error("items must be array");
    return {
      addon_id: d.addon_id,
      items: d.items.map((i) => ({
        item_id: i.item_id,
        is_required: !!i.is_required,
        max_quantity: Math.max(1, Number(i.max_quantity ?? 1)),
      })),
    };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (!canManage(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: exErr } = await supabaseAdmin
      .from("item_addons")
      .select("id, item_id")
      .eq("addon_id", data.addon_id);
    if (exErr) throw new Error(exErr.message);

    const existingMap = new Map((existing ?? []).map((e) => [e.item_id, e.id]));
    const targetIds = new Set(data.items.map((i) => i.item_id));

    const toDelete = (existing ?? []).filter((e) => !targetIds.has(e.item_id)).map((e) => e.id);
    const toInsert = data.items
      .filter((i) => !existingMap.has(i.item_id))
      .map((i) => ({
        addon_id: data.addon_id,
        item_id: i.item_id,
        is_required: i.is_required,
        max_quantity: i.max_quantity,
      }));
    const toUpdate = data.items.filter((i) => existingMap.has(i.item_id));

    if (toDelete.length) {
      const { error } = await supabaseAdmin.from("item_addons").delete().in("id", toDelete);
      if (error) throw new Error(error.message);
    }
    if (toInsert.length) {
      const { error } = await supabaseAdmin.from("item_addons").insert(toInsert);
      if (error) throw new Error(error.message);
    }
    for (const u of toUpdate) {
      const id = existingMap.get(u.item_id)!;
      const { error } = await supabaseAdmin
        .from("item_addons")
        .update({ is_required: u.is_required, max_quantity: u.max_quantity })
        .eq("id", id);
      if (error) throw new Error(error.message);
    }
    return { ok: true, added: toInsert.length, removed: toDelete.length, updated: toUpdate.length };
  });
