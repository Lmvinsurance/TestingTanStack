import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertCustomerOwnsOrder(orderId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cust } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("supabase_user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!cust) throw new Error("Customer not found");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id, grand_total, order_number, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.customer_id !== cust.id) throw new Error("Order not found");
  return order;
}

function getBaseUrl(): string {
  // Best-effort prod URL; the redirect lands on /payment-status where we verify.
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  return "https://telugufood.club";
}

export const createPhonePePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const order = await assertCustomerOwnsOrder(data.orderId, context.userId);
    if (order.payment_status === "paid") {
      return { alreadyPaid: true as const };
    }
    const { phonepeCreatePayment } = await import("./phonepe.server");
    // merchantOrderId must be unique per attempt; suffix attempt timestamp.
    const merchantOrderId = `${order.order_number}-${Date.now()}`;
    const redirectUrl = `${getBaseUrl()}/payment-status?orderId=${order.id}&method=phonepe`;
    const res = await phonepeCreatePayment({
      merchantOrderId,
      amountPaise: Math.round(Number(order.grand_total) * 100),
      redirectUrl,
      message: `Order ${order.order_number}`,
      metaInfo: { udf1: order.id, udf2: order.order_number },
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      payment_gateway: "PhonePe",
      transaction_id: merchantOrderId,
      merchant_transaction_id: merchantOrderId,
      amount: order.grand_total,
      payment_status: "pending",
      payment_mode: "PG_CHECKOUT",
      gateway_response_snapshot: JSON.parse(JSON.stringify(res)),
    });

    return {
      alreadyPaid: false as const,
      redirectUrl: res.redirectUrl,
      merchantOrderId,
    };
  });

export const verifyPhonePePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const order = await assertCustomerOwnsOrder(data.orderId, context.userId);
    if (order.payment_status === "paid") return { paymentStatus: "success" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find latest pending PhonePe payment row for this order.
    const { data: pay } = await supabaseAdmin
      .from("payments")
      .select("merchant_transaction_id")
      .eq("order_id", order.id)
      .eq("payment_gateway", "PhonePe")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!pay?.merchant_transaction_id) {
      return { paymentStatus: "pending" as const, message: "No PhonePe attempt found" };
    }
    const { phonepeOrderStatus, applyPhonePeStatus } = await import("./phonepe.server");
    const status = await phonepeOrderStatus(pay.merchant_transaction_id);
    const applied = await applyPhonePeStatus(order.id, status);
    return { paymentStatus: applied.paymentStatus, state: status.state };
  });
