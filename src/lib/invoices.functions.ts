import { createServerFn } from "@/lib/react-start-mock";
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

/** Generate and upload PDF for a customer's invoice */
export const generateAndUploadMyInvoicePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string, invoiceNumber: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!data?.invoiceNumber) throw new Error("invoiceNumber required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Fetch full order data for PDF
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.orderId).single();
    const { data: items } = await supabaseAdmin.from("order_items").select("*").eq("order_id", data.orderId);
    const { data: payments } = await supabaseAdmin.from("payments").select("*").eq("order_id", data.orderId);
    const { data: outlet } = await supabaseAdmin.from("outlets").select("*").eq("id", order?.outlet_id).single();
    const { data: customer } = await supabaseAdmin.from("customers").select("*").eq("supabase_user_id", context.userId).single();
    const itemIds = (items || []).map((i: any) => i.id);
    const { data: addons } = itemIds.length ? await supabaseAdmin.from("order_item_addons").select("*").in("order_item_id", itemIds) : { data: [] };

    // Build PDF
    const { buildPdfBlob } = await import("@/components/invoice-pdf");
    const blob = await buildPdfBlob({
      order,
      items: items || [],
      addons: addons || [],
      payments: payments || [],
      customer: { full_name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 'Guest', phone: customer?.phone || '', email: customer?.email || '' },
      outlet,
      invoiceNumber: data.invoiceNumber
    });

    const path = `${data.orderId}/${data.invoiceNumber}.pdf`;
    
    // Convert Blob to ArrayBuffer for Node.js Supabase Storage upload
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("invoices")
      .upload(path, arrayBuffer, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    const { data: pubData } = supabaseAdmin.storage.from("invoices").getPublicUrl(path);

    const { error } = await supabaseAdmin
      .from("invoices")
      .update({ invoice_url: pubData.publicUrl })
      .eq("order_id", data.orderId)
      .is("invoice_url", null);

    if (error) throw new Error(error.message);
    return { ok: true, invoiceUrl: pubData.publicUrl };
  });

export const getMyInvoiceOrderDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: order }, { data: items }, { data: payments }] = await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", data.orderId).maybeSingle(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", data.orderId),
      supabaseAdmin.from("payments").select("*").eq("order_id", data.orderId),
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

export const updateMyInvoiceUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string, invoiceUrl: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!data?.invoiceUrl) throw new Error("invoiceUrl required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const ok = await customerOwnsOrder(data.orderId, context.userId);
    if (!ok) throw new Error("Order not found");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("invoices")
      .update({ invoice_url: data.invoiceUrl })
      .eq("order_id", data.orderId);
      
    if (error) throw new Error(error.message);
    return { ok: true };
  });
