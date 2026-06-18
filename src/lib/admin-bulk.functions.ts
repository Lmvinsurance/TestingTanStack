import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAdmin } from "@/lib/authz.functions";

type BulkModuleKey =
  | "outlets"
  | "cuisines"
  | "dietary"
  | "categories"
  | "subcategories"
  | "items"
  | "variants"
  | "addons"
  | "item_addons";

type BulkRow = Record<string, unknown>;

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

function s(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}
function req(v: unknown, field: string): string {
  const out = s(v);
  if (!out) throw new Error(`${field} is required`);
  return out;
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(v: unknown, fallback = true): boolean {
  if (v === true || v === false) return v;
  if (v === null || v === undefined || v === "") return fallback;
  const t = String(v).toLowerCase();
  if (["true", "1", "yes", "y"].includes(t)) return true;
  if (["false", "0", "no", "n"].includes(t)) return false;
  return fallback;
}
function time(v: unknown): string | null {
  const t = s(v);
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = String(Math.min(23, parseInt(m[1], 10))).padStart(2, "0");
  return `${hh}:${m[2]}:00`;
}

export const bulkInsertRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { module: BulkModuleKey; rows: BulkRow[] }) => {
    if (!d?.module) throw new Error("module is required");
    if (!Array.isArray(d.rows)) throw new Error("rows must be an array");
    if (d.rows.length === 0) throw new Error("No rows to insert");
    if (d.rows.length > 2000) throw new Error("Max 2000 rows per upload");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdmin(context.userId);
    if (admin.role !== "super_admin") throw new Error("FORBIDDEN: Super admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pre-fetch lookups needed for the module
    const lookups = await loadLookups(supabaseAdmin, data.module);

    const errors: { row: number; message: string }[] = [];
    const records: BulkRow[] = [];

    data.rows.forEach((raw, idx) => {
      try {
        const built = buildRecord(data.module, raw, lookups, admin.id);
        records.push(built);
      } catch (e) {
        errors.push({ row: idx + 2, message: e instanceof Error ? e.message : "Invalid row" });
      }
    });

    if (records.length === 0) {
      return { inserted: 0, failed: errors.length, errors };
    }

    const tableMap: Record<BulkModuleKey, string> = {
      outlets: "outlets",
      cuisines: "cuisine_types",
      dietary: "dietary_types",
      categories: "menu_categories",
      subcategories: "menu_subcategories",
      items: "menu_items",
      variants: "item_variants",
      addons: "addons",
      item_addons: "item_addons",
    };

    // Insert in chunks of 200
    let inserted = 0;
    for (let i = 0; i < records.length; i += 200) {
      const chunk = records.slice(i, i + 200);
      const { error, data: inserted_rows } = await (supabaseAdmin as any)
        .from(tableMap[data.module])
        .insert(chunk as any)
        .select("id");
      if (error) {
        // Mark whole chunk failed but keep going
        chunk.forEach((_, j) =>
          errors.push({ row: i + j + 2, message: error.message }),
        );
      } else {
        inserted += inserted_rows?.length ?? chunk.length;
      }
    }

    return { inserted, failed: errors.length, errors: errors.slice(0, 50) };
  });

// ---------------- helpers ----------------

type Lookups = {
  categoriesBySlug?: Map<string, string>;
  subcategoriesBySlug?: Map<string, string>;
  cuisinesByName?: Map<string, string>;
  dietaryByCode?: Map<string, string>;
  itemsBySlug?: Map<string, string>;
  addonsByName?: Map<string, string>;
};

async function loadLookups(supabase: any, module: BulkModuleKey): Promise<Lookups> {
  const need = new Set<string>();
  switch (module) {
    case "subcategories":
      need.add("categories");
      break;
    case "items":
      need.add("categories");
      need.add("subcategories");
      need.add("cuisines");
      need.add("dietary");
      break;
    case "variants":
      need.add("items");
      break;
    case "item_addons":
      need.add("items");
      need.add("addons");
      break;
  }
  const out: Lookups = {};
  if (need.has("categories")) {
    const { data } = await supabase.from("menu_categories").select("id, slug").eq("is_deleted", false);
    out.categoriesBySlug = new Map((data ?? []).map((r: any) => [r.slug, r.id]));
  }
  if (need.has("subcategories")) {
    const { data } = await supabase.from("menu_subcategories").select("id, slug").eq("is_deleted", false);
    out.subcategoriesBySlug = new Map((data ?? []).map((r: any) => [r.slug, r.id]));
  }
  if (need.has("cuisines")) {
    const { data } = await supabase.from("cuisine_types").select("id, cuisine_name");
    out.cuisinesByName = new Map((data ?? []).map((r: any) => [r.cuisine_name.toLowerCase(), r.id]));
  }
  if (need.has("dietary")) {
    const { data } = await supabase.from("dietary_types").select("id, dietary_code");
    out.dietaryByCode = new Map((data ?? []).map((r: any) => [r.dietary_code.toUpperCase(), r.id]));
  }
  if (need.has("items")) {
    const { data } = await supabase.from("menu_items").select("id, slug").eq("is_deleted", false);
    out.itemsBySlug = new Map((data ?? []).map((r: any) => [r.slug, r.id]));
  }
  if (need.has("addons")) {
    const { data } = await supabase.from("addons").select("id, addon_name");
    out.addonsByName = new Map((data ?? []).map((r: any) => [r.addon_name.toLowerCase(), r.id]));
  }
  return out;
}

function buildRecord(
  module: BulkModuleKey,
  r: BulkRow,
  lk: Lookups,
  adminId: string,
): BulkRow {
  switch (module) {
    case "outlets":
      return {
        outlet_name: req(r.outlet_name, "outlet_name"),
        outlet_code: req(r.outlet_code, "outlet_code"),
        phone: s(r.phone),
        email: s(r.email),
        address: s(r.address),
        city: s(r.city),
        state: s(r.state),
        pincode: s(r.pincode),
        latitude: num(r.latitude),
        longitude: num(r.longitude),
        opening_time: time(r.opening_time),
        closing_time: time(r.closing_time),
        is_active: bool(r.is_active, true),
        created_by: adminId,
        updated_by: adminId,
      };
    case "cuisines":
      return {
        cuisine_name: req(r.cuisine_name, "cuisine_name"),
        is_active: bool(r.is_active, true),
      };
    case "dietary":
      return {
        dietary_name: req(r.dietary_name, "dietary_name"),
        dietary_code: req(r.dietary_code, "dietary_code").toUpperCase(),
        is_active: bool(r.is_active, true),
      };
    case "categories":
      return {
        category_name: req(r.category_name, "category_name"),
        slug: req(r.slug, "slug").toLowerCase(),
        description: s(r.description),
        display_order: num(r.display_order) ?? 0,
        image_url: s(r.image_url),
        is_active: bool(r.is_active, true),
        created_by: adminId,
        updated_by: adminId,
      };
    case "subcategories": {
      const catSlug = req(r.category_slug, "category_slug").toLowerCase();
      const catId = lk.categoriesBySlug?.get(catSlug);
      if (!catId) throw new Error(`Unknown category_slug "${catSlug}"`);
      return {
        category_id: catId,
        subcategory_name: req(r.subcategory_name, "subcategory_name"),
        slug: req(r.slug, "slug").toLowerCase(),
        description: s(r.description),
        display_order: num(r.display_order) ?? 0,
        is_active: bool(r.is_active, true),
        created_by: adminId,
        updated_by: adminId,
      };
    }
    case "items": {
      const catSlug = req(r.category_slug, "category_slug").toLowerCase();
      const catId = lk.categoriesBySlug?.get(catSlug);
      if (!catId) throw new Error(`Unknown category_slug "${catSlug}"`);
      const subSlug = s(r.subcategory_slug)?.toLowerCase() ?? null;
      const subId = subSlug ? lk.subcategoriesBySlug?.get(subSlug) ?? null : null;
      if (subSlug && !subId) throw new Error(`Unknown subcategory_slug "${subSlug}"`);
      const cuName = s(r.cuisine_name)?.toLowerCase() ?? null;
      const cuId = cuName ? lk.cuisinesByName?.get(cuName) ?? null : null;
      if (cuName && !cuId) throw new Error(`Unknown cuisine_name "${cuName}"`);
      const diCode = s(r.dietary_code)?.toUpperCase() ?? null;
      const diId = diCode ? lk.dietaryByCode?.get(diCode) ?? null : null;
      if (diCode && !diId) throw new Error(`Unknown dietary_code "${diCode}"`);
      return {
        category_id: catId,
        subcategory_id: subId,
        cuisine_id: cuId,
        dietary_type_id: diId,
        item_name: req(r.item_name, "item_name"),
        slug: req(r.slug, "slug").toLowerCase(),
        short_description: s(r.short_description),
        full_description: s(r.full_description),
        ingredients: s(r.ingredients),
        spice_level: s(r.spice_level),
        preparation_type: s(r.preparation_type),
        meal_timing: s(r.meal_timing),
        is_bestseller: bool(r.is_bestseller, false),
        is_recommended: bool(r.is_recommended, false),
        is_new: bool(r.is_new, false),
        is_active: bool(r.is_active, true),
        created_by: adminId,
        updated_by: adminId,
      };
    }
    case "variants": {
      const itemSlug = req(r.item_slug, "item_slug").toLowerCase();
      const itemId = lk.itemsBySlug?.get(itemSlug);
      if (!itemId) throw new Error(`Unknown item_slug "${itemSlug}"`);
      const price = num(r.base_price);
      if (price === null || price < 0) throw new Error("base_price must be ≥ 0");
      return {
        item_id: itemId,
        variant_name: req(r.variant_name, "variant_name"),
        quantity_label: s(r.quantity_label),
        serves_count: num(r.serves_count),
        base_price: price,
        is_active: bool(r.is_active, true),
        created_by: adminId,
        updated_by: adminId,
      };
    }
    case "addons": {
      const price = num(r.price);
      if (price === null || price < 0) throw new Error("price must be ≥ 0");
      return {
        addon_name: req(r.addon_name, "addon_name"),
        description: s(r.description),
        price,
        is_active: bool(r.is_active, true),
        created_by: adminId,
      };
    }
    case "item_addons": {
      const itemSlug = req(r.item_slug, "item_slug").toLowerCase();
      const itemId = lk.itemsBySlug?.get(itemSlug);
      if (!itemId) throw new Error(`Unknown item_slug "${itemSlug}"`);
      const addonName = req(r.addon_name, "addon_name").toLowerCase();
      const addonId = lk.addonsByName?.get(addonName);
      if (!addonId) throw new Error(`Unknown addon_name "${r.addon_name}"`);
      return {
        item_id: itemId,
        addon_id: addonId,
        is_required: bool(r.is_required, false),
        max_quantity: Math.max(1, num(r.max_quantity) ?? 1),
      };
    }
  }
}
