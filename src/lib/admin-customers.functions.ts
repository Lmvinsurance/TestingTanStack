import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow, isSuper } from "@/lib/admin-shared.functions";

export const listAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: customers, error: ce }, { data: orders }, { data: addresses }] = await Promise.all([
      supabaseAdmin
        .from("customers")
        .select("id, full_name, phone, email, is_active, is_deleted, created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("orders").select("id, customer_id, grand_total, created_at, payment_status").limit(5000),
      supabaseAdmin
        .from("customer_addresses")
        .select("id, customer_id, address_label, full_address, city, is_default, is_deleted")
        .eq("is_deleted", false),
    ]);
    if (ce) throw new Error(ce.message);

    return { role: admin.role, customers: customers ?? [], orders: orders ?? [], addresses: addresses ?? [] };
  });

export const getAdminCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { customer_id: string }) => {
    if (!d?.customer_id) throw new Error("customer_id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: customer }, { data: addresses }, { data: orders }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("customers").select("*").eq("id", data.customer_id).maybeSingle(),
      supabaseAdmin.from("customer_addresses").select("*").eq("customer_id", data.customer_id).eq("is_deleted", false),
      supabaseAdmin
        .from("orders")
        .select("id, order_number, grand_total, order_status, payment_status, created_at")
        .eq("customer_id", data.customer_id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("payments")
        .select("id, order_id, amount, payment_mode, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    return { customer, addresses: addresses ?? [], orders: orders ?? [], payments: payments ?? [] };
  });

export const setCustomerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; is_active: boolean }) => {
    if (!d?.id) throw new Error("id required");
    return { id: d.id, is_active: !!d.is_active };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!isSuper(admin.role)) throw new Error("FORBIDDEN: Only super admins can change customer status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("customers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
