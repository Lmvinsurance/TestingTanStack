import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAdmin } from "@/lib/authz.functions";

async function getAdminContext(userId: string) {
  const admin = await assertActiveAdmin({ userId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, outlet_id")
    .eq("id", admin.id)
    .maybeSingle();
  if (!data) throw new Error("FORBIDDEN: Admin not found");
  return data as { id: string; role: string; outlet_id: string | null };
}

function requireSuperAdmin(role: string) {
  if (role !== "super_admin") throw new Error("FORBIDDEN: Super admin only");
}

// =========================================================
// OUTLETS
// =========================================================

export type OutletRow = {
  id: string;
  outlet_name: string;
  outlet_code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_time: string | null;
  closing_time: string | null;
  is_active: boolean;
  created_at: string;
};

export const listOutlets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("outlets")
      .select(
        "id, outlet_name, outlet_code, phone, email, address, city, state, pincode, latitude, longitude, opening_time, closing_time, is_active, created_at",
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (admin.role === "outlet_admin" && admin.outlet_id) {
      q = q.eq("id", admin.outlet_id);
    } else if (admin.role !== "super_admin" && admin.role !== "outlet_admin") {
      // kitchen / cashier: limited to their outlet (read-only)
      if (admin.outlet_id) q = q.eq("id", admin.outlet_id);
      else return { role: admin.role, outletId: admin.outlet_id, outlets: [] as OutletRow[] };
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return {
      role: admin.role,
      outletId: admin.outlet_id,
      outlets: (data ?? []) as OutletRow[],
    };
  });

type OutletInput = {
  id?: string | null;
  outlet_name: string;
  outlet_code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  is_active: boolean;
};

export const upsertOutlet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: OutletInput) => {
    if (!data?.outlet_name?.trim()) throw new Error("Outlet name is required");
    if (!data?.outlet_code?.trim()) throw new Error("Outlet code is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      outlet_name: data.outlet_name.trim(),
      outlet_code: data.outlet_code.trim(),
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      pincode: data.pincode || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      opening_time: data.opening_time || null,
      closing_time: data.closing_time || null,
      is_active: data.is_active,
      updated_by: admin.id,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("outlets").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("outlets")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setOutletActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_active: boolean }) => {
    if (!data?.id) throw new Error("Outlet id required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("outlets")
      .update({ is_active: data.is_active, updated_by: admin.id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// CUISINE TYPES
// schema: id, cuisine_name, is_active, created_at
// =========================================================

export type CuisineRow = {
  id: string;
  cuisine_name: string;
  is_active: boolean;
  created_at: string;
};

export const listCuisines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cuisine_types")
      .select("id, cuisine_name, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { role: admin.role, items: (data ?? []) as CuisineRow[] };
  });

type CuisineInput = { id?: string | null; cuisine_name: string; is_active: boolean };

export const upsertCuisine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CuisineInput) => {
    if (!data?.cuisine_name?.trim()) throw new Error("Cuisine name is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      cuisine_name: data.cuisine_name.trim(),
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("cuisine_types").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("cuisine_types")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setCuisineActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_active: boolean }) => {
    if (!data?.id) throw new Error("Cuisine id required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("cuisine_types")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// DIETARY TYPES
// schema: id, dietary_name, dietary_code, is_active, created_at
// =========================================================

export type DietaryRow = {
  id: string;
  dietary_name: string;
  dietary_code: string;
  is_active: boolean;
  created_at: string;
};

export const listDietary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("dietary_types")
      .select("id, dietary_name, dietary_code, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { role: admin.role, items: (data ?? []) as DietaryRow[] };
  });

type DietaryInput = {
  id?: string | null;
  dietary_name: string;
  dietary_code: string;
  is_active: boolean;
};

export const upsertDietary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: DietaryInput) => {
    if (!data?.dietary_name?.trim()) throw new Error("Dietary name is required");
    if (!data?.dietary_code?.trim()) throw new Error("Dietary code is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      dietary_name: data.dietary_name.trim(),
      dietary_code: data.dietary_code.trim().toUpperCase(),
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("dietary_types").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("dietary_types")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setDietaryActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_active: boolean }) => {
    if (!data?.id) throw new Error("Dietary id required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("dietary_types")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// MENU CATEGORIES
// =========================================================

export type CategoryRow = {
  id: string;
  category_name: string;
  slug: string;
  description: string | null;
  display_order: number;
  image_url: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
};

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("menu_categories")
      .select("id, category_name, slug, description, display_order, image_url, is_active, is_deleted, created_at")
      .eq("is_deleted", false)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { role: admin.role, items: (data ?? []) as CategoryRow[] };
  });

type CategoryInput = {
  id?: string | null;
  category_name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  image_url?: string | null;
  is_active: boolean;
};

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CategoryInput) => {
    if (!d?.category_name?.trim()) throw new Error("Category name is required");
    if (!d?.slug?.trim()) throw new Error("Slug is required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      category_name: data.category_name.trim(),
      slug: data.slug.trim().toLowerCase(),
      description: data.description ?? null,
      display_order: data.display_order,
      image_url: data.image_url ?? null,
      is_active: data.is_active,
      updated_by: admin.id,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("menu_categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("menu_categories")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setCategoryActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("Category id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("menu_categories")
      .update({ is_active: data.is_active, updated_by: admin.id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (!d?.id) throw new Error("Category id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("menu_categories")
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: admin.id,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// MENU SUBCATEGORIES
// =========================================================

export type SubcategoryRow = {
  id: string;
  category_id: string;
  subcategory_name: string;
  slug: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  category_name?: string;
};

export const listSubcategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: subs, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
      supabaseAdmin
        .from("menu_subcategories")
        .select("id, category_id, subcategory_name, slug, description, display_order, is_active, is_deleted, created_at")
        .eq("is_deleted", false)
        .order("display_order", { ascending: true }),
      supabaseAdmin
        .from("menu_categories")
        .select("id, category_name")
        .eq("is_deleted", false)
        .order("display_order", { ascending: true }),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    const map = new Map((cats ?? []).map((c) => [c.id, c.category_name]));
    const items = (subs ?? []).map((s) => ({ ...s, category_name: map.get(s.category_id) ?? "—" })) as SubcategoryRow[];
    return { role: admin.role, items, categories: (cats ?? []) as { id: string; category_name: string }[] };
  });

type SubcategoryInput = {
  id?: string | null;
  category_id: string;
  subcategory_name: string;
  slug: string;
  description?: string | null;
  display_order: number;
  is_active: boolean;
};

export const upsertSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: SubcategoryInput) => {
    if (!d?.subcategory_name?.trim()) throw new Error("Subcategory name is required");
    if (!d?.slug?.trim()) throw new Error("Slug is required");
    if (!d?.category_id) throw new Error("Category is required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      category_id: data.category_id,
      subcategory_name: data.subcategory_name.trim(),
      slug: data.slug.trim().toLowerCase(),
      description: data.description ?? null,
      display_order: data.display_order,
      is_active: data.is_active,
      updated_by: admin.id,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("menu_subcategories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("menu_subcategories")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setSubcategoryActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("Subcategory id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("menu_subcategories")
      .update({ is_active: data.is_active, updated_by: admin.id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// MENU ITEMS
// =========================================================

export type MenuItemRow = {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  cuisine_id: string | null;
  dietary_type_id: string | null;
  item_name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  ingredients: string | null;
  spice_level: string | null;
  preparation_type: string | null;
  meal_timing: string | null;
  is_bestseller: boolean;
  is_recommended: boolean;
  is_new: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  category_name?: string | null;
  subcategory_name?: string | null;
  cuisine_name?: string | null;
  dietary_name?: string | null;
};

export const listMenuItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [items, cats, subs, cuisines, diets] = await Promise.all([
      supabaseAdmin
        .from("menu_items")
        .select(
          "id, category_id, subcategory_id, cuisine_id, dietary_type_id, item_name, slug, short_description, full_description, ingredients, spice_level, preparation_type, meal_timing, is_bestseller, is_recommended, is_new, is_active, is_deleted, created_at",
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("menu_categories").select("id, category_name").eq("is_deleted", false),
      supabaseAdmin.from("menu_subcategories").select("id, subcategory_name").eq("is_deleted", false),
      supabaseAdmin.from("cuisine_types").select("id, cuisine_name"),
      supabaseAdmin.from("dietary_types").select("id, dietary_name, dietary_code"),
    ]);
    if (items.error) throw new Error(items.error.message);
    const cMap = new Map((cats.data ?? []).map((c) => [c.id, c.category_name]));
    const sMap = new Map((subs.data ?? []).map((s) => [s.id, s.subcategory_name]));
    const cuMap = new Map((cuisines.data ?? []).map((c) => [c.id, c.cuisine_name]));
    const dMap = new Map((diets.data ?? []).map((d) => [d.id, d.dietary_name]));
    const out = (items.data ?? []).map((i) => ({
      ...i,
      category_name: i.category_id ? cMap.get(i.category_id) ?? null : null,
      subcategory_name: i.subcategory_id ? sMap.get(i.subcategory_id) ?? null : null,
      cuisine_name: i.cuisine_id ? cuMap.get(i.cuisine_id) ?? null : null,
      dietary_name: i.dietary_type_id ? dMap.get(i.dietary_type_id) ?? null : null,
    })) as MenuItemRow[];
    return {
      role: admin.role,
      items: out,
      categories: (cats.data ?? []) as { id: string; category_name: string }[],
      subcategories: (subs.data ?? []) as { id: string; subcategory_name: string }[],
      subcategoriesFull: ((await supabaseAdmin
        .from("menu_subcategories")
        .select("id, category_id, subcategory_name")
        .eq("is_deleted", false)
        .eq("is_active", true)).data ?? []) as { id: string; category_id: string; subcategory_name: string }[],
      cuisines: (cuisines.data ?? []) as { id: string; cuisine_name: string }[],
      dietary: (diets.data ?? []) as { id: string; dietary_name: string; dietary_code: string }[],
    };
  });

type MenuItemInput = {
  id?: string | null;
  category_id: string;
  subcategory_id?: string | null;
  cuisine_id?: string | null;
  dietary_type_id?: string | null;
  item_name: string;
  slug: string;
  short_description?: string | null;
  full_description?: string | null;
  ingredients?: string | null;
  spice_level?: string | null;
  preparation_type?: string | null;
  meal_timing?: string | null;
  is_bestseller: boolean;
  is_recommended: boolean;
  is_new: boolean;
  is_active: boolean;
};

export const upsertMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: MenuItemInput) => {
    if (!d?.item_name?.trim()) throw new Error("Item name is required");
    if (!d?.slug?.trim()) throw new Error("Slug is required");
    if (!d?.category_id) throw new Error("Category is required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      category_id: data.category_id,
      subcategory_id: data.subcategory_id || null,
      cuisine_id: data.cuisine_id || null,
      dietary_type_id: data.dietary_type_id || null,
      item_name: data.item_name.trim(),
      slug: data.slug.trim().toLowerCase(),
      short_description: data.short_description ?? null,
      full_description: data.full_description ?? null,
      ingredients: data.ingredients ?? null,
      spice_level: data.spice_level ?? null,
      preparation_type: data.preparation_type ?? null,
      meal_timing: data.meal_timing ?? null,
      is_bestseller: data.is_bestseller,
      is_recommended: data.is_recommended,
      is_new: data.is_new,
      is_active: data.is_active,
      updated_by: admin.id,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("menu_items").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("menu_items")
      .insert({ ...payload, created_by: admin.id })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setMenuItemActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("Item id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    requireSuperAdmin(admin.role);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({ is_active: data.is_active, updated_by: admin.id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========================================================
// DASHBOARD SUMMARY
// =========================================================

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startISO = startOfDay.toISOString();
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endISO = endOfDay.toISOString();

    let orderQ = supabaseAdmin
      .from("orders")
      .select("id, grand_total, order_status, payment_status, customer_id, outlet_id, created_at, order_number")
      .gte("created_at", startISO)
      .lt("created_at", endISO)
      .order("created_at", { ascending: false });
    if (admin.role !== "super_admin" && admin.outlet_id) {
      orderQ = orderQ.eq("outlet_id", admin.outlet_id);
    }
    const { data: todayOrders, error: oErr } = await orderQ.limit(1000);
    if (oErr) throw new Error(oErr.message);

    const [{ data: outlets }, { data: items }, { data: customers }, { count: customerCount }, { data: recent }] =
      await Promise.all([
        supabaseAdmin.from("outlets").select("id, outlet_name").eq("is_deleted", false).eq("is_active", true),
        supabaseAdmin.from("menu_items").select("id, item_name, is_active").eq("is_deleted", false),
        supabaseAdmin
          .from("customers")
          .select("id, full_name, phone")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(5),
        supabaseAdmin
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("is_deleted", false)
          .eq("is_active", true),
        admin.role === "super_admin"
          ? supabaseAdmin
              .from("orders")
              .select("id, order_number, grand_total, order_status, payment_status, created_at, customer_id, outlet_id")
              .order("created_at", { ascending: false })
              .limit(8)
          : supabaseAdmin
              .from("orders")
              .select("id, order_number, grand_total, order_status, payment_status, created_at, customer_id, outlet_id")
              .eq("outlet_id", admin.outlet_id ?? "")
              .order("created_at", { ascending: false })
              .limit(8),
      ]);

    // Outlet performance for today
    const outletPerf = (outlets ?? []).map((o) => {
      const orders = (todayOrders ?? []).filter((x) => x.outlet_id === o.id);
      const revenue = orders.reduce(
        (s, x) => s + (x.payment_status === "paid" ? Number(x.grand_total) || 0 : 0),
        0,
      );
      return { id: o.id, name: o.outlet_name, orderCount: orders.length, revenue };
    });

    // Low stock / sold out
    const { data: availability } = await supabaseAdmin
      .from("outlet_item_availability")
      .select("outlet_id, item_id, stock_status, is_available")
      .in("stock_status", ["limited", "sold_out"]);
    const itemMap = new Map((items ?? []).map((i) => [i.id, i.item_name]));
    const lowStock = (availability ?? [])
      .filter((a) => (admin.role === "super_admin" ? true : a.outlet_id === admin.outlet_id))
      .map((a) => ({
        item_id: a.item_id,
        item_name: itemMap.get(a.item_id) ?? "Item",
        stock_status: a.stock_status,
      }))
      .slice(0, 10);

    const counts = {
      total: todayOrders?.length ?? 0,
      pending_payment: 0,
      received: 0,
      preparing: 0,
      ready: 0,
      out_for_delivery: 0,
      completed: 0,
      cancelled: 0,
    };
    let revenue = 0;
    for (const o of todayOrders ?? []) {
      const s = o.order_status as keyof typeof counts;
      if (s in counts) counts[s] += 1;
      if (o.payment_status === "paid") revenue += Number(o.grand_total) || 0;
    }

    // Lookup customer/outlet names for recent orders
    const custIds = Array.from(new Set((recent ?? []).map((r) => r.customer_id).filter(Boolean) as string[]));
    const outIds = Array.from(new Set((recent ?? []).map((r) => r.outlet_id).filter(Boolean) as string[]));
    const [{ data: custs }, { data: outs }] = await Promise.all([
      custIds.length
        ? supabaseAdmin.from("customers").select("id, full_name").in("id", custIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      outIds.length
        ? supabaseAdmin.from("outlets").select("id, outlet_name").in("id", outIds)
        : Promise.resolve({ data: [] as { id: string; outlet_name: string }[] }),
    ]);
    const cName = new Map((custs ?? []).map((c) => [c.id, c.full_name ?? "Guest"]));
    const oName = new Map((outs ?? []).map((o) => [o.id, o.outlet_name]));
    const recentOrders = (recent ?? []).map((r) => ({
      id: r.id,
      order_number: r.order_number,
      grand_total: Number(r.grand_total) || 0,
      order_status: r.order_status,
      payment_status: r.payment_status,
      created_at: r.created_at,
      customer_name: r.customer_id ? cName.get(r.customer_id) ?? "Guest" : "Guest",
      outlet_name: r.outlet_id ? oName.get(r.outlet_id) ?? "—" : "—",
    }));

    return {
      role: admin.role,
      outletId: admin.outlet_id,
      outlets: outlets ?? [],
      counts,
      revenue,
      activeItems: (items ?? []).filter((i) => i.is_active).length,
      totalItems: items?.length ?? 0,
      customerCount: customerCount ?? 0,
      newCustomers: customers ?? [],
      recentOrders,
      outletPerformance: outletPerf,
      lowStock,
    };
  });
