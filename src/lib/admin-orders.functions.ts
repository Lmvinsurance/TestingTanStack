import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAdmin } from "@/lib/authz.functions";

const ALLOWED_ORDER_STATUSES = [
  "pending_payment",
  "order_received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
] as const;
type OrderStatus = (typeof ALLOWED_ORDER_STATUSES)[number];

const ALLOWED_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cash_on_delivery",
  "refunded",
] as const;
type PaymentStatus = (typeof ALLOWED_PAYMENT_STATUSES)[number];

async function getAdminContext(userId: string) {
  const admin = await assertActiveAdmin({ userId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: full } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, outlet_id, full_name, phone, email")
    .eq("id", admin.id)
    .maybeSingle();
  if (!full) throw new Error("FORBIDDEN: Admin not found");
  return full as {
    id: string;
    role: string;
    outlet_id: string | null;
    full_name: string;
    phone: string | null;
    email: string | null;
  };
}

// outlet scoping inlined at each call site to preserve PostgREST builder typing

export const getAdminMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminContext(context.userId);
    return {
      id: admin.id,
      role: admin.role,
      outletId: admin.outlet_id,
      fullName: admin.full_name,
      phone: admin.phone,
      email: admin.email,
    };
  });

type ListInput = {
  status?: string | null;
  search?: string | null;
  outletId?: string | null;
  orderType?: string | null;
  paymentStatus?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export const listAdminOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ListInput) => data ?? {})
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (admin.role !== "super_admin" && admin.outlet_id) {
      q = q.eq("outlet_id", admin.outlet_id);
    } else if (admin.role === "super_admin" && data.outletId) {
      q = q.eq("outlet_id", data.outletId);
    }
    if (data.status) q = q.eq("order_status", data.status);
    if (data.orderType) q = q.eq("order_type", data.orderType);
    if (data.paymentStatus) q = q.eq("payment_status", data.paymentStatus);
    if (data.dateFrom) q = q.gte("created_at", data.dateFrom);
    if (data.dateTo) q = q.lte("created_at", data.dateTo);

    const { data: ordersRaw, error } = await q;
    if (error) throw new Error(error.message);
    const orders = (ordersRaw ?? []) as any[];
    if (!orders.length) {
      return { orders: [], outletOptions: await loadOutletOptions(admin) };
    }

    const customerIds = Array.from(new Set(orders.map((o) => o.customer_id).filter(Boolean) as string[]));
    const outletIds = Array.from(new Set(orders.map((o) => o.outlet_id)));
    const orderIds = orders.map((o) => o.id);

    const [customersRes, outletsRes, itemsRes] = await Promise.all([
      customerIds.length
        ? supabaseAdmin.from("customers").select("id, full_name, phone, email").in("id", customerIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("outlets").select("id, outlet_name, phone, address").in("id", outletIds),
      supabaseAdmin
        .from("order_items")
        .select("order_id, item_name_snapshot")
        .in("order_id", orderIds),
    ]);

    const customers = new Map(
      (customersRes.data ?? []).map((c) => [
        c.id,
        { fullName: c.full_name, phone: c.phone, email: c.email },
      ]),
    );
    const outlets = new Map(
      (outletsRes.data ?? []).map((o) => [
        o.id,
        { name: o.outlet_name, phone: o.phone, address: o.address },
      ]),
    );
    const itemsByOrder = new Map<string, string[]>();
    (itemsRes.data ?? []).forEach((i) => {
      const arr = itemsByOrder.get(i.order_id) ?? [];
      arr.push(i.item_name_snapshot);
      itemsByOrder.set(i.order_id, arr);
    });

    let mapped = orders.map((o: any) => {
      const its = itemsByOrder.get(o.id) ?? [];
      const cust = o.customer_id ? customers.get(o.customer_id) : null;
      const outlet = outlets.get(o.outlet_id);
      const walkInName = o.walk_in_customer_name as string | null;
      const walkInPhone = o.walk_in_customer_phone as string | null;
      return {
        id: o.id,
        orderNumber: o.order_number,
        customerName: cust?.fullName ?? walkInName ?? (o.is_walk_in ? "Walk-in Customer" : "—"),
        customerPhone: cust?.phone ?? walkInPhone ?? "",
        customerEmail: cust?.email ?? null,
        outletName: outlet?.name ?? "—",
        outletPhone: outlet?.phone ?? null,
        outletAddress: outlet?.address ?? null,
        orderType: o.order_type,
        orderStatus: o.order_status,
        paymentStatus: o.payment_status,
        grandTotal: Number(o.grand_total),
        customerNotes: o.customer_notes,
        createdAt: o.created_at,
        firstItems: its.slice(0, 2),
        itemCount: its.length,
        isWalkIn: !!o.is_walk_in,
        tableNumber: o.table_number as string | null,
      };
    });

    const term = (data.search ?? "").trim().toLowerCase();
    if (term) {
      mapped = mapped.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.toLowerCase().includes(term) ||
          o.outletName.toLowerCase().includes(term),
      );
    }

    return { orders: mapped, outletOptions: await loadOutletOptions(admin) };
  });

async function loadOutletOptions(admin: { role: string; outlet_id: string | null }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin.from("outlets").select("id, outlet_name").order("outlet_name");
  if (admin.role !== "super_admin" && admin.outlet_id) q = q.eq("id", admin.outlet_id);
  const { data } = await q;
  return (data ?? []).map((o) => ({ id: o.id, name: o.outlet_name }));
}

export const getAdminOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN: Order not in your outlet");
    }

    const [customerRes, outletRes, itemsRes, historyRes, paymentsRes, addressRes] =
      await Promise.all([
        order.customer_id
          ? supabaseAdmin
              .from("customers")
              .select("full_name, phone, email")
              .eq("id", order.customer_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        supabaseAdmin
          .from("outlets")
          .select("outlet_name, phone, address, city, state, pincode")
          .eq("id", order.outlet_id)
          .maybeSingle(),
        supabaseAdmin
          .from("order_items")
          .select(
            "id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price, special_instructions",
          )
          .eq("order_id", order.id),
        supabaseAdmin
          .from("order_status_history")
          .select("id, old_status, new_status, remarks, changed_by_role, created_at")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
        supabaseAdmin
          .from("payments")
          .select(
            "id, payment_gateway, payment_mode, transaction_id, merchant_transaction_id, amount, payment_status, paid_at, created_at",
          )
          .eq("order_id", order.id)
          .order("created_at", { ascending: false }),
        order.delivery_address_id
          ? supabaseAdmin
              .from("customer_addresses")
              .select("address_label, full_address, city, state, pincode")
              .eq("id", order.delivery_address_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
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
      arr.push({
        name: a.addon_name_snapshot,
        price: Number(a.price_snapshot),
        quantity: a.quantity,
      });
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
      customer: customerRes.data
        ? {
            fullName: customerRes.data.full_name,
            phone: customerRes.data.phone,
            email: customerRes.data.email,
          }
        : null,
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
      history: (historyRes.data ?? []).map((h) => ({
        id: h.id,
        oldStatus: h.old_status,
        newStatus: h.new_status,
        remarks: h.remarks,
        changedByRole: h.changed_by_role,
        createdAt: h.created_at,
      })),
      payments: (paymentsRes.data ?? []).map((p) => ({
        id: p.id,
        gateway: p.payment_gateway,
        mode: p.payment_mode,
        transactionId: p.transaction_id,
        merchantTransactionId: p.merchant_transaction_id,
        amount: Number(p.amount),
        status: p.payment_status,
        paidAt: p.paid_at,
        createdAt: p.created_at,
      })),
      adminRole: admin.role,
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; newStatus: string; remarks?: string | null }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!ALLOWED_ORDER_STATUSES.includes(data.newStatus as OrderStatus)) {
      throw new Error("Invalid order status");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, outlet_id, order_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN: Order not in your outlet");
    }

    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: data.newStatus,
        updated_at: now,
        last_updated_by: context.userId,
      })
      .eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    const { error: histErr } = await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.order_status,
      new_status: data.newStatus,
      remarks: data.remarks ?? `Status updated by ${admin.role}`,
      changed_by: admin.id,
      changed_by_role: admin.role,
    });
    if (histErr) throw new Error(histErr.message);

    return { ok: true };
  });

export const updatePaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; newStatus: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    if (!ALLOWED_PAYMENT_STATUSES.includes(data.newStatus as PaymentStatus)) {
      throw new Error("Invalid payment status");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    if (!["super_admin", "outlet_admin", "cashier"].includes(admin.role)) {
      throw new Error("FORBIDDEN: Only cashier or admin can update payment status");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, outlet_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN: Order not in your outlet");
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: data.newStatus,
        updated_at: new Date().toISOString(),
        last_updated_by: context.userId,
      })
      .eq("id", order.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { orderId: string; reason: string }) => {
    if (!data?.orderId) throw new Error("orderId required");
    const reason = (data?.reason ?? "").trim();
    if (reason.length < 3) throw new Error("Cancellation reason required (min 3 chars)");
    if (reason.length > 500) throw new Error("Reason too long (max 500 chars)");
    return { orderId: data.orderId, reason };
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminContext(context.userId);
    if (!["super_admin", "outlet_admin", "cashier"].includes(admin.role)) {
      throw new Error("FORBIDDEN: Only admins or cashiers can cancel orders");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("id, outlet_id, order_status, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN: Order not in your outlet");
    }
    if (["cancelled", "refunded", "delivered", "completed"].includes(order.order_status)) {
      throw new Error(`Cannot cancel an order that is already ${order.order_status}`);
    }

    const now = new Date().toISOString();
    const nextPayment =
      order.payment_status === "paid" ? "refunded" : order.payment_status;

    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        order_status: "cancelled",
        payment_status: nextPayment,
        cancellation_reason: data.reason,
        updated_at: now,
        last_updated_by: context.userId,
      })
      .eq("id", order.id);
    if (updErr) throw new Error(updErr.message);

    const { error: histErr } = await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.order_status,
      new_status: "cancelled",
      remarks: `Cancelled by ${admin.role}: ${data.reason}`,
      changed_by: admin.id,
      changed_by_role: admin.role,
    });
    if (histErr) throw new Error(histErr.message);

    return { ok: true, refundedFlagged: nextPayment === "refunded" };
  });