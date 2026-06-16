import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow } from "@/lib/admin-shared.functions";

export const listAdminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN: Kitchen has no payment access");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let orderQ = supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_id, outlet_id, grand_total, order_status, payment_status, created_at");
    if (admin.outlet_id && admin.role !== "super_admin") orderQ = orderQ.eq("outlet_id", admin.outlet_id);
    const { data: orders, error: oe } = await orderQ.limit(2000);
    if (oe) throw new Error(oe.message);

    const orderIds = (orders ?? []).map((o) => o.id);
    const [{ data: payments, error: pe }, { data: customers }, { data: outlets }] = await Promise.all([
      orderIds.length
        ? supabaseAdmin
            .from("payments")
            .select("id, order_id, transaction_id, merchant_transaction_id, amount, payment_status, payment_gateway, payment_mode, gateway_response_snapshot, paid_at, created_at")
            .in("order_id", orderIds)
            .order("created_at", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabaseAdmin.from("customers").select("id, full_name, phone, email"),
      supabaseAdmin.from("outlets").select("id, outlet_name, outlet_code"),
    ]);
    if (pe) throw new Error(pe.message);

    return { role: admin.role, payments: payments ?? [], orders: orders ?? [], customers: customers ?? [], outlets: outlets ?? [] };
  });
