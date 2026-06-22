import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type ItemInput = {
  itemId: string;
  variantId: string;
  itemName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  specialInstructions?: string | null;
  addons?: { name: string; price: number; quantity: number }[];
};

type CreateOrderInput = {
  outletId: string;
  orderType: "delivery" | "pickup" | "dine_in";
  paymentMethod: "phonepe" | "upi" | "cod";
  items: ItemInput[];
  addressId?: string | null;
  customerNotes?: string;
  totals: {
    subtotal: number;
    taxAmount: number;
    deliveryCharge: number;
    discountAmount: number;
    grandTotal: number;
  };
};

async function resolveCustomerId(userId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, is_active, is_deleted")
    .eq("supabase_user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Customer profile not found");
  if (!data.is_active) throw new Error("Customer account inactive");
  return data.id;
}

function makeOrderNumber(): string {
  const d = new Date();
  const yyyymmdd =
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `KRR-ORD-${yyyymmdd}-${rand}`;
}

export const listMyAddresses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const customerId = await resolveCustomerId(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("customer_addresses")
      .select("id, address_label, full_address, city, state, pincode, is_default")
      .eq("customer_id", customerId)
      .eq("is_deleted", false)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { addresses: data ?? [] };
  });

export const listRecommendedItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { outletId: string }) => {
    if (!data?.outletId) throw new Error("outletId required");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prices } = await supabaseAdmin
      .from("outlet_variant_prices")
      .select("item_id, variant_id, selling_price, is_available")
      .eq("outlet_id", data.outletId)
      .eq("is_available", true)
      .limit(40);
    if (!prices?.length) return { items: [] };
    const seen = new Map<string, { itemId: string; variantId: string; price: number }>();
    for (const p of prices) {
      if (!seen.has(p.item_id)) seen.set(p.item_id, { itemId: p.item_id, variantId: p.variant_id, price: Number(p.selling_price) });
    }
    const itemIds = Array.from(seen.keys()).slice(0, 8);
    if (!itemIds.length) return { items: [] };
    const [itemsRes, imgsRes] = await Promise.all([
      supabaseAdmin
        .from("menu_items")
        .select("id, item_name, is_active, is_deleted")
        .in("id", itemIds)
        .eq("is_active", true)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("item_images")
        .select("item_id, image_url, is_primary, display_order")
        .in("item_id", itemIds),
    ]);
    const items = itemsRes.data ?? [];
    const imgs = imgsRes.data ?? [];
    const imgByItem = new Map<string, string>();
    imgs.forEach((i) => {
      if (!imgByItem.has(i.item_id) || i.is_primary) imgByItem.set(i.item_id, i.image_url);
    });
    return {
      items: items.map((it) => {
        const p = seen.get(it.id)!;
        return {
          itemId: it.id,
          itemName: it.item_name,
          variantId: p.variantId,
          price: p.price,
          image: imgByItem.get(it.id) ?? null,
        };
      }),
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateOrderInput) => {
    if (!data?.outletId) throw new Error("outletId required");
    if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("Cart is empty");
    if (!["delivery", "pickup", "dine_in"].includes(data.orderType)) throw new Error("Invalid order type");
    if (!["phonepe", "upi", "cod"].includes(data.paymentMethod)) throw new Error("Invalid payment method");
    if (data.orderType === "delivery" && !data.addressId) throw new Error("Delivery address is required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const customerId = await resolveCustomerId(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.addressId) {
      const { data: addr } = await supabaseAdmin
        .from("customer_addresses")
        .select("id")
        .eq("id", data.addressId)
        .eq("customer_id", customerId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (!addr) throw new Error("Address not found");
    }

    const isCod = data.paymentMethod === "cod";
    // Status mismatch fix: orders.order_status enum uses 'received', not 'order_received';
    // orders.payment_status enum does not include 'cash_on_delivery' — COD stays 'pending'
    // until cash is collected at delivery (invoice generated then).
    const orderStatus = isCod ? "received" : "pending_payment";
    const paymentStatus = "pending";

    const orderNumber = makeOrderNumber();

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        outlet_id: data.outletId,
        order_type: data.orderType,
        order_status: orderStatus,
        payment_status: paymentStatus,
        subtotal: data.totals.subtotal,
        tax_amount: data.totals.taxAmount,
        delivery_charge: data.totals.deliveryCharge,
        discount_amount: data.totals.discountAmount,
        grand_total: data.totals.grandTotal,
        customer_notes: data.customerNotes ?? null,
        delivery_address_id: data.orderType === "delivery" ? data.addressId : null,
        created_by: context.userId,
        last_updated_by: context.userId,
      })
      .select("id, order_number, grand_total, order_status, payment_status, created_at")
      .single();
    if (orderErr || !orderRow) throw new Error(orderErr?.message ?? "Failed to create order");

    for (const it of data.items) {
      const total = (it.unitPrice + (it.addons?.reduce((s, a) => s + a.price * a.quantity, 0) ?? 0)) * it.quantity;
      const { data: oi, error: oiErr } = await supabaseAdmin
        .from("order_items")
        .insert({
          order_id: orderRow.id,
          item_id: it.itemId,
          variant_id: it.variantId,
          item_name_snapshot: it.itemName,
          variant_name_snapshot: it.variantName,
          unit_price_snapshot: it.unitPrice,
          quantity: it.quantity,
          total_price: total,
          special_instructions: it.specialInstructions ?? null,
        })
        .select("id")
        .single();
      if (oiErr || !oi) throw new Error(oiErr?.message ?? "Failed to insert order item");
      if (it.addons?.length) {
        const { error: addErr } = await supabaseAdmin.from("order_item_addons").insert(
          it.addons.map((a) => ({
            order_item_id: oi.id,
            addon_name_snapshot: a.name,
            price_snapshot: a.price,
            quantity: a.quantity,
          })),
        );
        if (addErr) throw new Error(addErr.message);
      }
    }

    if (isCod) {
      // Record the COD intent as a pending payment row for audit.
      await supabaseAdmin.from("payments").insert({
        order_id: orderRow.id,
        payment_gateway: "manual",
        payment_mode: "cash",
        payment_status: "pending",
        amount: data.totals.grandTotal,
        transaction_id: `COD-${orderRow.order_number}`,
      });
    }

    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderRow.id,
      old_status: null,
      new_status: orderStatus,
      remarks: "Order created from customer checkout",
      changed_by: context.userId,
      changed_by_role: "customer",
    });

    // Invoice is generated only after payment_status = 'paid'. COD orders
    // get their invoice when cash is collected (separate step), not here.


    let merchantTransactionId = undefined;
    if (!isCod) {
      merchantTransactionId = `ORDID${Date.now()}`;
      await supabaseAdmin.from("payments").insert({
        order_id: orderRow.id,
        payment_gateway: "phonepe",
        payment_mode: data.paymentMethod,
        payment_status: "pending",
        amount: data.totals.grandTotal,
        transaction_id: merchantTransactionId,
        merchant_transaction_id: merchantTransactionId,
      });
    }

    return {
      orderId: orderRow.id,
      orderNumber: orderRow.order_number,
      grandTotal: Number(orderRow.grand_total),
      orderStatus: orderRow.order_status,
      paymentStatus: orderRow.payment_status,
      merchantTransactionId,
    };
  });

async function assertOrderOwnership(orderId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const customerId = await resolveCustomerId(userId);
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.customer_id !== customerId) throw new Error("Order not found or access denied");
  return { customerId };
}

export const simulatePaymentSuccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOrderOwnership(data.orderId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, grand_total, payment_status, order_status")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    if (order.payment_status === "paid") return { ok: true, alreadyPaid: true };
    const txnId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const merchantTxnId = `MTX-${Date.now()}`;
    await supabaseAdmin.from("payments").insert({
      order_id: data.orderId,
      payment_gateway: "PhonePe",
      transaction_id: txnId,
      merchant_transaction_id: merchantTxnId,
      amount: order.grand_total,
      payment_status: "success",
      payment_mode: "UPI",
      gateway_response_snapshot: { simulated: true, code: "PAYMENT_SUCCESS", txnId, merchantTxnId },
      paid_at: new Date().toISOString(),
    });
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", order_status: "received", last_updated_by: context.userId })
      .eq("id", data.orderId);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: data.orderId,
      old_status: order.order_status,
      new_status: "received",
      remarks: "Payment successful. Order received.",
      changed_by: context.userId,
      changed_by_role: "customer",
    });
    const { tryEnsureInvoice } = await import("./invoices.server");
    await tryEnsureInvoice(data.orderId);
    return { ok: true };
  });

export const updateCustomerPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string, merchantTransactionId: string }) => data)
  .handler(async ({ data, context }) => {
    await assertOrderOwnership(data.orderId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const axios = (await import("axios")).default;
    
    // Server-side verification
    const SUPABASE_EDGE_FUNCTION_URL = 'https://aynfbxixpviadworsbmk.supabase.co/functions/v1/phonepe';
    const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, {
      action: 'status',
      merchantOrderId: data.merchantTransactionId
    });
    
    if (!response.data) {
      return { success: false, status: "pending" };
    }
    
    const result = response.data;
    const isSuccess = result.state === 'COMPLETED' || result.status === 'SUCCESS' || result.paymentState === 'COMPLETED' || result.success === true;
    const isFailed = result.state === 'FAILED' || result.status === 'FAILED' || result.paymentState === 'FAILED';
    
    let dbStatus = "pending";
    if (isSuccess) dbStatus = "success";
    else if (isFailed) dbStatus = "failed";

    if (dbStatus !== "pending") {
      const { data: pay } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("order_id", data.orderId)
        .eq("payment_status", "pending")
        .maybeSingle();

      if (pay) {
        await supabaseAdmin.from("payments").update({
          payment_status: dbStatus,
          paid_at: dbStatus === 'success' ? new Date().toISOString() : null,
          transaction_id: data.merchantTransactionId,
        }).eq("id", pay.id);
      }

      await supabaseAdmin.from("orders").update({
        payment_status: dbStatus === 'success' ? 'paid' : 'failed',
        order_status: dbStatus === 'success' ? 'received' : 'payment_failed',
        last_updated_by: context.userId,
      }).eq("id", data.orderId);

      await supabaseAdmin.from("order_status_history").insert({
        order_id: data.orderId,
        old_status: 'pending_payment',
        new_status: dbStatus === 'success' ? 'received' : 'payment_failed',
        remarks: dbStatus === 'success' ? 'Payment successful' : 'Payment failed',
        changed_by: context.userId,
        changed_by_role: 'customer',
      });

      if (dbStatus === 'success') {
        const { tryEnsureInvoice } = await import("./invoices.server");
        await tryEnsureInvoice(data.orderId);
      }
    }

    return { success: dbStatus !== "pending", status: dbStatus };
  });


export const simulatePaymentFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertOrderOwnership(data.orderId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, grand_total")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    const txnId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const merchantTxnId = `MTX-${Date.now()}`;
    await supabaseAdmin.from("payments").insert({
      order_id: data.orderId,
      payment_gateway: "PhonePe",
      transaction_id: txnId,
      merchant_transaction_id: merchantTxnId,
      amount: order.grand_total,
      payment_status: "failed",
      payment_mode: "UPI",
      gateway_response_snapshot: { simulated: true, code: "PAYMENT_FAILED", reason: "user_cancelled" },
    });
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", order_status: "payment_failed", last_updated_by: context.userId })
      .eq("id", data.orderId);

    return { ok: true };
  });

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const customerId = await resolveCustomerId(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, outlet_id, order_type, order_status, payment_status, grand_total, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    if (!orders?.length) return { orders: [] };
    const orderIds = orders.map((o) => o.id);
    const outletIds = Array.from(new Set(orders.map((o) => o.outlet_id)));
    const [outletsRes, itemsRes] = await Promise.all([
      supabaseAdmin.from("outlets").select("id, outlet_name").in("id", outletIds),
      supabaseAdmin.from("order_items").select("order_id, item_name_snapshot").in("order_id", orderIds),
    ]);
    const outletMap = new Map((outletsRes.data ?? []).map((o) => [o.id, o.outlet_name]));
    const itemsByOrder = new Map<string, string[]>();
    (itemsRes.data ?? []).forEach((i) => {
      const arr = itemsByOrder.get(i.order_id) ?? [];
      arr.push(i.item_name_snapshot);
      itemsByOrder.set(i.order_id, arr);
    });
    return {
      orders: orders.map((o) => {
        const its = itemsByOrder.get(o.id) ?? [];
        return {
          id: o.id,
          orderNumber: o.order_number,
          outletName: outletMap.get(o.outlet_id) ?? "—",
          orderType: o.order_type,
          orderStatus: o.order_status,
          paymentStatus: o.payment_status,
          grandTotal: Number(o.grand_total),
          createdAt: o.created_at,
          firstItems: its.slice(0, 2),
          itemCount: its.length,
        };
      }),
    };
  });

export const getMyOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const customerId = await resolveCustomerId(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order || order.customer_id !== customerId) throw new Error("Order not found or access denied");

    const [outletRes, itemsRes, historyRes, paymentsRes, invoiceRes, addressRes] = await Promise.all([
      supabaseAdmin.from("outlets").select("id, outlet_name, phone, address, city, state, pincode").eq("id", order.outlet_id).maybeSingle(),
      supabaseAdmin
        .from("order_items")
        .select("id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price, special_instructions")
        .eq("order_id", order.id),
      supabaseAdmin
        .from("order_status_history")
        .select("id, old_status, new_status, remarks, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("payments")
        .select("id, payment_gateway, transaction_id, merchant_transaction_id, amount, payment_status, payment_mode, paid_at, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("invoices").select("id, invoice_number, invoice_amount, generated_at, invoice_url").eq("order_id", order.id).maybeSingle(),
      order.delivery_address_id
        ? supabaseAdmin
            .from("customer_addresses")
            .select("address_label, full_address, city, state, pincode")
            .eq("id", order.delivery_address_id)
            .maybeSingle()
        : Promise.resolve({
            data: null as null | {
              address_label: string | null;
              full_address: string;
              city: string | null;
              state: string | null;
              pincode: string | null;
            },
          }),
    ]);

    const items = itemsRes.data ?? [];
    const itemIds = items.map((i) => i.id);
    const addonsRes = itemIds.length
      ? await supabaseAdmin
          .from("order_item_addons")
          .select("order_item_id, addon_name_snapshot, price_snapshot, quantity")
          .in("order_item_id", itemIds)
      : { data: [] };
    const addonsByItem = new Map<string, { name: string; price: number; quantity: number }[]>();
    (addonsRes.data ?? []).forEach((a) => {
      const arr = addonsByItem.get(a.order_item_id) ?? [];
      arr.push({ name: a.addon_name_snapshot, price: Number(a.price_snapshot), quantity: a.quantity });
      addonsByItem.set(a.order_item_id, arr);
    });

    return {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        orderType: order.order_type,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.tax_amount),
        deliveryCharge: Number(order.delivery_charge),
        discountAmount: Number(order.discount_amount),
        grandTotal: Number(order.grand_total),
        customerNotes: order.customer_notes,
        cancellationReason: order.cancellation_reason,
        createdAt: order.created_at,
      },
      outlet: outletRes.data,
      address: addressRes.data,
      items: items.map((i) => ({
        id: i.id,
        itemName: i.item_name_snapshot,
        variantName: i.variant_name_snapshot,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price_snapshot),
        totalPrice: Number(i.total_price),
        specialInstructions: i.special_instructions,
        addons: addonsByItem.get(i.id) ?? [],
      })),
      history: historyRes.data ?? [],
      payments: (paymentsRes.data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })),
      invoice: invoiceRes.data,
    };
  });