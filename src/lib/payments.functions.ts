import { createServerFn } from "@/lib/react-start-mock";
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
    
    // AWS API endpoint for PhonePe integration
    const API_PATH = 'https://u18pdq88oa.execute-api.ap-south-1.amazonaws.com/';
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cust } = await supabaseAdmin
      .from("customers")
      .select("phone, first_name, last_name")
      .eq("supabase_user_id", context.userId)
      .maybeSingle();

    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("item_name, unit_price, quantity")
      .eq("order_id", order.id);

    // Calculate total with GST if not included in grand_total, or just use grand_total
    const totalAmount = parseFloat(order.grand_total);
    
    const items = (orderItems || []).map((i: any, idx: number) => ({
      id: idx + 1,
      name: i.item_name,
      price: Number(i.unit_price),
      quantity: i.quantity
    }));

    const payload = {
      mobilenumber: cust?.phone || "9999999999",
      customer_name: `${cust?.first_name || 'Customer'} ${cust?.last_name || ''}`.trim() || 'Customer',
      total_amount: totalAmount,
      order_status: 'PENDING',
      order_items: items,
      order_type: `Online`,
      restaurant_id: 1,
      payment_status: 'PENDING'
    };

    const axios = (await import("axios")).default;
    const response = await axios.post(`${API_PATH}api/admin/phonepay/order`, payload);

    if (response.status === 200 && response.data?.result?.redirectUrl) {
      const merchantOrderId = response.data.result.merchantOrderId || `${order.order_number}-${Date.now()}`;

      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        payment_gateway: "PhonePe",
        transaction_id: merchantOrderId,
        merchant_transaction_id: merchantOrderId,
        amount: order.grand_total,
        payment_status: "pending",
        payment_mode: "PG_CHECKOUT",
        gateway_response_snapshot: JSON.parse(JSON.stringify(response.data)),
      });

      return {
        alreadyPaid: false as const,
        redirectUrl: response.data.result.redirectUrl,
        merchantOrderId,
      };
    } else {
      throw new Error("PhonePe payment initiation failed.");
    }
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
