// PhonePe V2 Standard Checkout helper.
// In this SPA, "server functions" run in the browser, so calls to api.phonepe.com
// would be CORS-blocked and would leak credentials. We proxy through the
// `phonepe` Supabase edge function which holds the PhonePe client secret.

import { supabase } from "@/integrations/supabase/client";

export type PhonePeCreatePayload = {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  message?: string;
  metaInfo?: Record<string, string>;
};

async function invokePhonePe(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("phonepe", { body });
  if (error) {
    // Supabase wraps non-2xx as FunctionsHttpError; try to surface the upstream message.
    const ctx: any = (error as any).context;
    let detail = "";
    try { detail = ctx ? await ctx.text() : ""; } catch { /* noop */ }
    throw new Error(`PhonePe edge error: ${error.message}${detail ? ` — ${detail}` : ""}`);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

export async function phonepeCreatePayment(p: PhonePeCreatePayload) {
  const res = await invokePhonePe({ action: "create", ...p });
  if (!res?.redirectUrl) throw new Error(`PhonePe create failed: ${JSON.stringify(res)}`);
  return res as {
    orderId: string;
    state: string;
    expireAt: number;
    redirectUrl: string;
  };
}

export async function phonepeOrderStatus(merchantOrderId: string) {
  const res = await invokePhonePe({ action: "status", merchantOrderId });
  return res as {
    orderId: string;
    state: "COMPLETED" | "FAILED" | "PENDING" | string;
    amount: number;
    paymentDetails?: Array<{
      transactionId?: string;
      paymentMode?: string;
      state?: string;
      amount?: number;
      timestamp?: number;
    }>;
  };
}

// Maps PhonePe state → our DB enums.
export function mapPhonePeState(state: string): {
  paymentStatus: "success" | "failed" | "pending";
  orderStatus: "received" | "pending_payment" | "payment_failed";
} {
  const s = (state || "").toUpperCase();
  if (s === "COMPLETED") return { paymentStatus: "success", orderStatus: "received" };
  if (s === "FAILED") return { paymentStatus: "failed", orderStatus: "payment_failed" };
  return { paymentStatus: "pending", orderStatus: "pending_payment" };
}

// Apply a PhonePe status response to our DB (idempotent).
export async function applyPhonePeStatus(
  orderId: string,
  status: Awaited<ReturnType<typeof phonepeOrderStatus>>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mapped = mapPhonePeState(status.state);
  const pd = status.paymentDetails?.[0];
  const txnId = pd?.transactionId ?? status.orderId;

  // Read current order
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, grand_total, payment_status, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.payment_status === "paid" && mapped.paymentStatus !== "failed") {
    return { ok: true, alreadyPaid: true, paymentStatus: order.payment_status };
  }

  // Upsert a payment row keyed by transaction_id (best effort: insert; if dup, update).
  const paymentRow = {
    order_id: orderId,
    payment_gateway: "phonepe",
    transaction_id: txnId,
    merchant_transaction_id: status.orderId,
    amount: (status.amount ?? 0) / 100 || Number(order.grand_total),
    payment_status: mapped.paymentStatus,
    payment_mode: "upi",
    gateway_response_snapshot: JSON.parse(JSON.stringify(status)),
    paid_at: mapped.paymentStatus === "success" ? new Date().toISOString() : null,
  };
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("merchant_transaction_id", status.orderId)
    .maybeSingle();
  if (existing) {
    await supabaseAdmin.from("payments").update(paymentRow).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("payments").insert(paymentRow);
  }

  if (mapped.paymentStatus === "success") {
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", order_status: "received" })
      .eq("id", orderId);
    
    if (updateError) {
      console.error("FAILED TO UPDATE ORDER:", updateError);
      throw new Error(`Order update failed: ${updateError.message}`);
    }

    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.order_status,
      new_status: "received",
      remarks: "PhonePe payment confirmed",
      changed_by_role: "system",
    });
    const { tryEnsureInvoice } = await import("./invoices.server");
    await tryEnsureInvoice(orderId);
  } else if (mapped.paymentStatus === "failed") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", order_status: "payment_failed" })
      .eq("id", orderId);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.order_status,
      new_status: "payment_failed",
      remarks: "PhonePe payment failed",
      changed_by_role: "system",
    });
  }

  return { ok: true, paymentStatus: mapped.paymentStatus };
}

