import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow } from "@/lib/admin-shared.functions";

type Range = "today" | "yesterday" | "week" | "month" | "last_month" | "all";

function rangeBounds(r: Range): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let from = start;
  let to = new Date(start);
  to.setDate(to.getDate() + 1);
  if (r === "yesterday") {
    from = new Date(start);
    from.setDate(from.getDate() - 1);
    to = start;
  } else if (r === "week") {
    from = new Date(start);
    from.setDate(from.getDate() - 6);
    to = new Date(start);
    to.setDate(to.getDate() + 1);
  } else if (r === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (r === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (r === "all") {
    from = new Date(2000, 0, 1);
    to = new Date(now.getFullYear() + 1, 0, 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export const getAdminReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: Range }) => ({ range: (d?.range ?? "month") as Range }))
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    const { from, to } = rangeBounds(data.range);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let orderQ = supabaseAdmin
      .from("orders")
      .select("id, outlet_id, customer_id, grand_total, order_status, payment_status, created_at")
      .gte("created_at", from)
      .lt("created_at", to);
    if (admin.outlet_id && admin.role !== "super_admin") orderQ = orderQ.eq("outlet_id", admin.outlet_id);
    const { data: orders } = await orderQ.limit(10000);
    const orderIds = (orders ?? []).map((o) => o.id);

    const [{ data: outlets }, { data: items }, { data: payments }, { data: invoices }, { data: avail }, { data: customers }] = await Promise.all([
      supabaseAdmin.from("outlets").select("id, outlet_name").eq("is_deleted", false),
      orderIds.length
        ? supabaseAdmin.from("order_items").select("order_id, item_name_snapshot, quantity, total_price").in("order_id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabaseAdmin.from("payments").select("amount, payment_status, payment_mode, payment_gateway, created_at").in("order_id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
      orderIds.length
        ? supabaseAdmin.from("invoices").select("id, invoice_amount, tax_amount, is_void, order_id").in("order_id", orderIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("outlet_item_availability").select("outlet_id, item_id, is_available, stock_status"),
      supabaseAdmin.from("customers").select("id, created_at, is_active, is_deleted").eq("is_deleted", false),
    ]);

    return {
      role: admin.role,
      range: data.range,
      orders: orders ?? [],
      outlets: outlets ?? [],
      orderItems: items ?? [],
      payments: payments ?? [],
      invoices: invoices ?? [],
      availability: avail ?? [],
      customers: customers ?? [],
    };
  });
