// Server-only helpers for automatic invoice generation.
// Idempotent: a single invoice row per order_id.
//
// Invoice number format: INV-KRR-YYYYMMDD-XXXX (XXXX = zero-padded random)
// Tries up to 5 times in case of a duplicate invoice_number collision.

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

function todayStamp(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function makeInvoiceNumber(): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-KRR-${todayStamp()}-${rand}`;
}

export async function ensureInvoiceForOrder(orderId: string): Promise<{
  id: string;
  invoiceNumber: string;
  created: boolean;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as AdminClient;

  // Existing invoice? Return it.
  const { data: existing, error: selErr } = await db
    .from("invoices")
    .select("id, invoice_number")
    .eq("order_id", orderId)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (existing) {
    return { id: existing.id, invoiceNumber: existing.invoice_number, created: false };
  }

  // Need order totals + payment state. Only generate for paid / COD orders.
  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, grand_total, tax_amount, payment_status, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderErr) throw new Error(orderErr.message);
  if (!order) throw new Error("Order not found");

  const ps = order.payment_status;
  const os = order.order_status;
  const eligible =
    ps === "paid" &&
    os !== "cancelled" &&
    os !== "refunded" &&
    os !== "payment_failed";
  if (!eligible) {
    throw new Error(`Order not eligible for invoicing (payment_status=${ps}, order_status=${os})`);
  }


  // Insert with retry on unique-constraint collision.
  let lastErr: unknown = null;
  for (let i = 0; i < 5; i++) {
    const invoiceNumber = makeInvoiceNumber();
    const { data: inserted, error: insErr } = await db
      .from("invoices")
      .insert({
        order_id: orderId,
        invoice_number: invoiceNumber,
        invoice_amount: order.grand_total,
        tax_amount: order.tax_amount,
        generated_by: "system",
        is_void: false,
      })
      .select("id, invoice_number")
      .single();
    if (!insErr && inserted) {
      return { id: inserted.id, invoiceNumber: inserted.invoice_number, created: true };
    }
    lastErr = insErr;
    // 23505 = unique violation → retry with a fresh random number
    if (insErr && String(insErr.code) !== "23505") {
      // Maybe a parallel call won the race — re-check.
      const { data: again } = await db
        .from("invoices")
        .select("id, invoice_number")
        .eq("order_id", orderId)
        .maybeSingle();
      if (again) {
        return { id: again.id, invoiceNumber: again.invoice_number, created: false };
      }
      throw new Error(insErr.message);
    }
  }
  throw new Error(
    lastErr instanceof Error ? lastErr.message : "Could not allocate a unique invoice number",
  );
}

// Best-effort wrapper used inside payment/order handlers — never throws.
export async function tryEnsureInvoice(orderId: string): Promise<void> {
  try {
    await ensureInvoiceForOrder(orderId);
  } catch (err) {
    // Payment success must not be blocked by invoicing failure.
    console.error("[invoice] generation failed for order", orderId, err);
  }
}
