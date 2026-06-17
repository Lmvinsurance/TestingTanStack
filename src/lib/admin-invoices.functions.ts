import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow } from "@/lib/admin-shared.functions";

export const listAdminInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let oq = supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_id, outlet_id, grand_total, tax_amount, order_status, payment_status, created_at");
    if (admin.outlet_id && admin.role !== "super_admin") oq = oq.eq("outlet_id", admin.outlet_id);
    const { data: orders } = await oq.limit(2000);

    const orderIds = (orders ?? []).map((o) => o.id);
    const [{ data: invoices }, { data: customers }, { data: outlets }] = await Promise.all([
      orderIds.length
        ? supabaseAdmin
            .from("invoices")
            .select("id, order_id, invoice_number, invoice_url, invoice_amount, tax_amount, generated_at, is_void")
            .in("order_id", orderIds)
            .order("generated_at", { ascending: false })
            .limit(2000)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("customers").select("id, full_name, phone, email"),
      supabaseAdmin.from("outlets").select("id, outlet_name, outlet_code"),
    ]);
    return { role: admin.role, invoices: invoices ?? [], orders: orders ?? [], customers: customers ?? [], outlets: outlets ?? [] };
  });

export const getInvoiceOrderDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => {
    if (!d?.order_id) throw new Error("order_id required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.order_id).maybeSingle(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.order_id),
      supabaseAdmin.from("payments").select("*").eq("order_id", data.order_id),
    ]);
    if (!order) throw new Error("Order not found");
    const itemIds = (items ?? []).map((i) => i.id);
    const { data: addons } = itemIds.length
      ? await supabaseAdmin.from("order_item_addons").select("*").in("order_item_id", itemIds)
      : { data: [] as any[] };
    const [{ data: customer }, { data: outlet }] = await Promise.all([
      order.customer_id
        ? supabaseAdmin.from("customers").select("*").eq("id", order.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("outlets").select("*").eq("id", order.outlet_id).maybeSingle(),
    ]);
    return { order, items: items ?? [], addons: addons ?? [], payments: payments ?? [], customer, outlet };
  });

export const saveAdminInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    order_id: string;
    invoice_number: string;
    invoice_amount: number;
    tax_amount: number;
    invoice_url?: string | null;
  }) => {
    if (!d?.order_id) throw new Error("order_id required");
    if (!d?.invoice_number) throw new Error("invoice_number required");
    return {
      order_id: d.order_id,
      invoice_number: d.invoice_number,
      invoice_amount: Number(d.invoice_amount) || 0,
      tax_amount: Number(d.tax_amount) || 0,
      invoice_url: d.invoice_url || null,
    };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (admin.role === "kitchen") throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Upsert by order_id (one invoice per order)
    const { data: existing } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("invoices")
        .update({
          invoice_number: data.invoice_number,
          invoice_amount: data.invoice_amount,
          tax_amount: data.tax_amount,
          invoice_url: data.invoice_url,
          generated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, updated: true };
    }
    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        order_id: data.order_id,
        invoice_number: data.invoice_number,
        invoice_amount: data.invoice_amount,
        tax_amount: data.tax_amount,
        invoice_url: data.invoice_url,
        generated_by: admin.id,
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, updated: false };
  });
