import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function customerOwnsOrder(orderId: string, userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cust } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("supabase_user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!cust) return false;
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  return Boolean(order && order.customer_id === cust.id);
}

/** Fetch the invoice (if any) for one of the signed-in customer's orders. */
export const getMyInvoiceForOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, invoice_url, invoice_amount, tax_amount, generated_at, is_void")
      .eq("order_id", data.orderId)
      .maybeSingle();
    return { invoice: inv ?? null };
  });

/** Trigger invoice generation for a paid/COD order the customer owns. Idempotent. */
export const generateMyInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    const { ensureInvoiceForOrder } = await import("./invoices.server");
    const res = await ensureInvoiceForOrder(data.orderId);
    return res;
  });

/** List invoices for all of the signed-in customer's orders. */
export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("supabase_user_id", context.userId)
      .eq("is_deleted", false)
      .maybeSingle();
    if (!cust) return { invoices: [] };
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_id", cust.id);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length === 0) return { invoices: [] };
    const { data: invs } = await supabaseAdmin
      .from("invoices")
      .select("id, order_id, invoice_number, invoice_url, invoice_amount, generated_at, is_void")
      .in("order_id", orderIds)
      .order("generated_at", { ascending: false });
    return { invoices: invs ?? [] };
  });
