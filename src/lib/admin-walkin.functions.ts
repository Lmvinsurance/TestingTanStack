import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAdminRow, canViewOps } from "@/lib/admin-shared.functions";

const ALLOWED_PAYMENT_MODES = ["cash", "card_machine", "upi"] as const;
type PaymentMode = (typeof ALLOWED_PAYMENT_MODES)[number];

/** List outlets the admin can take walk-in orders for. */
export const listWalkinOutlets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("outlets")
      .select("id, outlet_name, outlet_code, city")
      .order("outlet_name");
    if (admin.role !== "super_admin" && admin.outlet_id) q = q.eq("id", admin.outlet_id);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return {
      role: admin.role,
      defaultOutletId: admin.outlet_id,
      outlets: (data ?? []).map((o) => ({
        id: o.id,
        name: o.outlet_name,
        code: o.outlet_code,
        city: o.city,
      })),
    };
  });

/** List menu items + variants available for a given outlet (with prices). */
export const listWalkinMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { outletId: string }) => {
    if (!d?.outletId) throw new Error("outletId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    if (admin.role !== "super_admin" && admin.outlet_id && admin.outlet_id !== data.outletId) {
      throw new Error("FORBIDDEN: Outlet not assigned to you");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [itemsRes, variantsRes, pricesRes, availRes, catsRes] = await Promise.all([
      supabaseAdmin
        .from("menu_items")
        .select("id, item_name, category_id, short_description, is_active, is_deleted")
        .eq("is_active", true)
        .eq("is_deleted", false),
      supabaseAdmin
        .from("item_variants")
        .select("id, item_id, variant_name, base_price, quantity_label, is_active")
        .eq("is_active", true),
      supabaseAdmin
        .from("outlet_variant_prices")
        .select("variant_id, item_id, selling_price, mrp_price, is_available")
        .eq("outlet_id", data.outletId),
      supabaseAdmin
        .from("outlet_item_availability")
        .select("item_id, is_available, stock_status")
        .eq("outlet_id", data.outletId),
      supabaseAdmin.from("menu_categories").select("id, category_name").order("display_order"),
    ]);

    const priceMap = new Map((pricesRes.data ?? []).map((p) => [p.variant_id, p]));
    const itemAvail = new Map((availRes.data ?? []).map((a) => [a.item_id, a]));
    const cats = new Map((catsRes.data ?? []).map((c) => [c.id, c.category_name]));
    const variantsByItem = new Map<string, any[]>();
    (variantsRes.data ?? []).forEach((v) => {
      const arr = variantsByItem.get(v.item_id) ?? [];
      arr.push(v);
      variantsByItem.set(v.item_id, arr);
    });

    const items = (itemsRes.data ?? [])
      .map((it) => {
        const itemOk = itemAvail.get(it.id)?.is_available !== false;
        const variants = (variantsByItem.get(it.id) ?? [])
          .map((v) => {
            const p = priceMap.get(v.id);
            const price = p ? Number(p.selling_price) : Number(v.base_price);
            const available = itemOk && (!p || p.is_available !== false);
            return {
              id: v.id,
              name: v.variant_name,
              label: v.quantity_label,
              price,
              mrp: p?.mrp_price != null ? Number(p.mrp_price) : null,
              available,
            };
          })
          .filter((v) => v.available && v.price > 0);
        return {
          id: it.id,
          name: it.item_name,
          category: cats.get(it.category_id) ?? "Other",
          description: it.short_description,
          variants,
        };
      })
      .filter((it) => it.variants.length > 0);

    return { items, categories: Array.from(new Set(items.map((i) => i.category))).sort() };
  });

type CartLine = {
  variantId: string;
  itemId: string;
  itemName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
};

type CreateInput = {
  outletId: string;
  items: CartLine[];
  walkInName?: string | null;
  walkInPhone?: string | null;
  tableNumber?: string | null;
  paymentMode: PaymentMode;
  discountAmount?: number;
  taxPercent?: number;
  notes?: string | null;
};

function pad(n: number, w: number) {
  return n.toString().padStart(w, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
}

/**
 * Step 1 — Place a walk-in order. Always created in pending state.
 * Inserts a payments row reflecting the chosen mode:
 *   cash/card_machine → status 'pending' (awaiting counter confirmation)
 *   upi               → gateway 'phonepe', status 'initiated'; returns redirectUrl
 */
export const createWalkinOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CreateInput) => {
    if (!d?.outletId) throw new Error("outletId required");
    if (!Array.isArray(d.items) || d.items.length === 0) throw new Error("Add at least one item");
    if (!ALLOWED_PAYMENT_MODES.includes(d.paymentMode)) throw new Error("Invalid payment mode");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    if (admin.role !== "super_admin" && admin.outlet_id && admin.outlet_id !== data.outletId) {
      throw new Error("FORBIDDEN: Outlet not assigned to you");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Re-validate prices server-side
    const variantIds = data.items.map((i) => i.variantId);
    const [pricesRes, variantsRes] = await Promise.all([
      supabaseAdmin
        .from("outlet_variant_prices")
        .select("variant_id, selling_price, is_available")
        .eq("outlet_id", data.outletId)
        .in("variant_id", variantIds),
      supabaseAdmin
        .from("item_variants")
        .select("id, item_id, variant_name, base_price")
        .in("id", variantIds),
    ]);
    const priceMap = new Map((pricesRes.data ?? []).map((p) => [p.variant_id, p]));
    const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v]));

    let subtotal = 0;
    const lines = data.items.map((line) => {
      const v = variantMap.get(line.variantId);
      if (!v) throw new Error(`Variant not found: ${line.variantId}`);
      const p = priceMap.get(line.variantId);
      if (p && p.is_available === false) throw new Error(`Item unavailable: ${line.itemName}`);
      const price = p ? Number(p.selling_price) : Number(v.base_price);
      const qty = Math.max(1, Math.floor(line.quantity));
      const lineTotal = price * qty;
      subtotal += lineTotal;
      return {
        item_id: v.item_id,
        variant_id: v.id,
        item_name_snapshot: line.itemName,
        variant_name_snapshot: line.variantName || v.variant_name,
        unit_price_snapshot: price,
        quantity: qty,
        total_price: lineTotal,
        special_instructions: line.notes ?? null,
      };
    });

    const discount = Math.max(0, Number(data.discountAmount) || 0);
    const taxPct = Math.max(0, Number(data.taxPercent) || 0);
    const taxable = Math.max(0, subtotal - discount);
    const taxAmount = Math.round(taxable * (taxPct / 100) * 100) / 100;
    const grand = Math.round((taxable + taxAmount) * 100) / 100;

    const now = new Date();
    const orderNumber = `ORD-${ymd(now)}-${pad(now.getHours(), 2)}${pad(now.getMinutes(), 2)}${pad(
      now.getSeconds(),
      2,
    )}${pad(Math.floor(Math.random() * 1000), 3)}`;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: null as any,
        outlet_id: data.outletId,
        order_type: "dine_in",
        order_status: "pending_payment",
        payment_status: "pending",
        subtotal,
        tax_amount: taxAmount,
        delivery_charge: 0,
        discount_amount: discount,
        grand_total: grand,
        customer_notes: data.notes ?? null,
        created_by: context.userId,
        last_updated_by: context.userId,
        is_walk_in: true,
        walk_in_customer_name: data.walkInName?.trim() || null,
        walk_in_customer_phone: data.walkInPhone?.trim() || null,
        table_number: data.tableNumber?.trim() || null,
      } as any)
      .select("id, order_number")
      .single();
    if (oErr) throw new Error(oErr.message);

    const itemRows = lines.map((l) => ({ ...l, order_id: order.id }));
    const { error: iErr } = await supabaseAdmin.from("order_items").insert(itemRows);
    if (iErr) throw new Error(iErr.message);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "pending_payment",
      remarks: `Walk-in order created (${data.paymentMode}) by ${admin.role}`,
      changed_by: admin.id,
      changed_by_role: admin.role,
    });

    // UPI → init PhonePe + payments row, return redirectUrl
    if (data.paymentMode === "upi") {
      const { phonepeCreatePayment } = await import("./phonepe.server");
      const merchantOrderId = `${order.order_number}-${Date.now()}`;
      const redirectUrl = `${process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "") || "https://telugufood.club"}/payment-status?orderId=${order.id}&method=phonepe&admin=1`;
      try {
        const res = await phonepeCreatePayment({
          merchantOrderId,
          amountPaise: Math.round(grand * 100),
          redirectUrl,
          message: `Walk-in ${order.order_number}`,
          metaInfo: { udf1: order.id, udf2: order.order_number },
        });
        await supabaseAdmin.from("payments").insert({
          order_id: order.id,
          payment_gateway: "phonepe",
          payment_mode: "upi",
          payment_status: "initiated",
          amount: grand,
          transaction_id: merchantOrderId,
          merchant_transaction_id: merchantOrderId,
          gateway_response_snapshot: JSON.parse(JSON.stringify(res)),
        });
        return {
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMode: "upi" as const,
          redirectUrl: res.redirectUrl,
          merchantOrderId,
        };
      } catch (e: any) {
        // Roll forward: order remains pending_payment, no payment row yet
        throw new Error(`PhonePe init failed: ${e?.message ?? "unknown"}`);
      }
    }

    // Cash / Card machine → pending payment row awaiting counter confirmation
    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      payment_gateway: "manual",
      payment_mode: data.paymentMode,
      payment_status: "pending",
      amount: grand,
      transaction_id: `WALKIN-${order.order_number}`,
    });

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentMode: data.paymentMode,
    };
  });

/**
 * Step 2 (cash / card_machine) — Confirm payment collected at counter.
 * Updates payment to 'collected', order to paid/received, generates invoice.
 */
export const confirmCounterPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; mode: "cash" | "card_machine" }) => {
    if (!d?.orderId) throw new Error("orderId required");
    if (d.mode !== "cash" && d.mode !== "card_machine") throw new Error("Invalid mode");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, outlet_id, grand_total, order_status, payment_status, order_number")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN");
    }
    if (order.payment_status === "paid") {
      // Idempotent: ensure invoice exists
      const { ensureInvoiceForOrder } = await import("./invoices.server");
      const inv = await ensureInvoiceForOrder(order.id);
      return { ok: true, alreadyPaid: true, invoiceId: inv.id };
    }

    const nowIso = new Date().toISOString();

    // Update the latest pending payment row (created at order time), or insert if missing.
    const { data: payRow } = await supabaseAdmin
      .from("payments")
      .select("id, payment_mode")
      .eq("order_id", order.id)
      .eq("payment_gateway", "manual")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payRow) {
      const { error: upErr } = await supabaseAdmin
        .from("payments")
        .update({
          payment_status: "collected",
          payment_mode: data.mode,
          paid_at: nowIso,
        })
        .eq("id", payRow.id);
      if (upErr) throw new Error(upErr.message);
    } else {
      const { error: insErr } = await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        payment_gateway: "manual",
        payment_mode: data.mode,
        payment_status: "collected",
        amount: order.grand_total,
        paid_at: nowIso,
        transaction_id: `WALKIN-${order.order_number}`,
      });
      if (insErr) throw new Error(insErr.message);
    }

    const { error: ordErr } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "received",
        last_updated_by: context.userId,
      })
      .eq("id", order.id);
    if (ordErr) throw new Error(ordErr.message);

    await supabaseAdmin.from("order_status_history").insert({
      order_id: order.id,
      old_status: order.order_status,
      new_status: "received",
      remarks: `${data.mode === "cash" ? "Cash" : "Card machine"} payment collected at counter`,
      changed_by: admin.id,
      changed_by_role: admin.role,
    });

    const { ensureInvoiceForOrder } = await import("./invoices.server");
    const inv = await ensureInvoiceForOrder(order.id);
    return { ok: true, invoiceId: inv.id, invoiceNumber: inv.invoiceNumber };
  });

/**
 * Step 2 (upi) — Verify the latest PhonePe attempt for a walk-in order.
 * Updates payments/orders and generates invoice on success.
 */
export const verifyWalkinUpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    if (!d?.orderId) throw new Error("orderId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, outlet_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN");
    }
    if (order.payment_status === "paid") return { paymentStatus: "success" as const };

    const { data: pay } = await supabaseAdmin
      .from("payments")
      .select("merchant_transaction_id")
      .eq("order_id", order.id)
      .eq("payment_gateway", "phonepe")
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

/** Full order + invoice payload for printing. */
export const getInvoicePrintData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => {
    if (!d?.orderId) throw new Error("orderId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const admin = await getAdminRow(context.userId);
    if (!canViewOps(admin.role)) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    if (admin.role !== "super_admin" && admin.outlet_id && order.outlet_id !== admin.outlet_id) {
      throw new Error("FORBIDDEN");
    }

    const [outletRes, itemsRes, invRes, payRes, custRes] = await Promise.all([
      supabaseAdmin.from("outlets").select("*").eq("id", order.outlet_id).maybeSingle(),
      supabaseAdmin
        .from("order_items")
        .select("id, item_name_snapshot, variant_name_snapshot, quantity, unit_price_snapshot, total_price")
        .eq("order_id", order.id),
      supabaseAdmin
        .from("invoices")
        .select("id, invoice_number, invoice_url, invoice_amount, tax_amount, generated_at, is_void")
        .eq("order_id", order.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("payments")
        .select("payment_mode, payment_gateway, amount, payment_status, paid_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      order.customer_id
        ? supabaseAdmin
            .from("customers")
            .select("full_name, phone, email")
            .eq("id", order.customer_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const o = order as any;
    const inv = invRes.data;
    const pay = payRes.data;
    const printable =
      o.payment_status === "paid" &&
      !!inv &&
      !inv.is_void &&
      (pay?.payment_status === "success" || pay?.payment_status === "collected");

    return {
      order: {
        id: o.id,
        orderNumber: o.order_number,
        orderType: o.order_type,
        orderStatus: o.order_status,
        paymentStatus: o.payment_status,
        subtotal: Number(o.subtotal),
        taxAmount: Number(o.tax_amount),
        discountAmount: Number(o.discount_amount),
        deliveryCharge: Number(o.delivery_charge),
        grandTotal: Number(o.grand_total),
        notes: o.customer_notes,
        createdAt: o.created_at,
        isWalkIn: !!o.is_walk_in,
        walkInName: o.walk_in_customer_name,
        walkInPhone: o.walk_in_customer_phone,
        tableNumber: o.table_number,
      },
      outlet: outletRes.data,
      customer: custRes.data,
      items: (itemsRes.data ?? []).map((i) => ({
        name: i.item_name_snapshot,
        variant: i.variant_name_snapshot,
        qty: i.quantity,
        unit: Number(i.unit_price_snapshot),
        total: Number(i.total_price),
      })),
      invoice: inv
        ? {
            number: inv.invoice_number,
            url: inv.invoice_url ?? null,
            amount: Number(inv.invoice_amount),
            tax: Number(inv.tax_amount),
            generatedAt: inv.generated_at,
            isVoid: inv.is_void,
          }
        : null,
      payment: pay
        ? {
            mode: pay.payment_mode,
            gateway: pay.payment_gateway,
            amount: Number(pay.amount),
            status: pay.payment_status,
            paidAt: pay.paid_at,
          }
        : null,
      printable,
    };
  });
