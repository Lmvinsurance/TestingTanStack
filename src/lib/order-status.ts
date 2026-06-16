/**
 * Single source of truth for order/payment status enums.
 * MUST stay in sync with the DB CHECK constraints:
 *   orders.order_status, orders.payment_status, payments.payment_status
 *
 * Any UI filter, KPI calculation, or status badge MUST import from this file.
 */

export const ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "initiated",
  "pending",
  "success",
  "failed",
  "refunded",
  "cancelled",
  "collected",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Status groups for KPI roll-ups. Each order status appears in exactly one bucket. */
export const ORDER_STATUS_BUCKETS = {
  pending: ["pending_payment", "received"] as OrderStatus[],
  preparing: ["preparing"] as OrderStatus[],
  ready: ["ready"] as OrderStatus[],
  out: ["out_for_delivery"] as OrderStatus[],
  completed: ["completed"] as OrderStatus[],
  cancelled: ["cancelled", "refunded", "payment_failed"] as OrderStatus[],
} as const;

/** Order statuses that count toward today's earned revenue (with payment_status='paid'). */
export const REVENUE_ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  "received",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
];

/** Order is considered "active/new" (needs attention). */
export const NEW_ORDER_STATUSES: OrderStatus[] = ["received"];

export type StatusMeta = {
  label: string;
  description: string;
  tone: "amber" | "red" | "saffron" | "blue" | "indigo" | "emerald" | "slate" | "maroon";
};

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending_payment: {
    label: "Pending Payment",
    description: "Order placed, awaiting payment confirmation (UPI/PhonePe).",
    tone: "amber",
  },
  payment_failed: {
    label: "Payment Failed",
    description: "Payment attempt failed; order not yet accepted.",
    tone: "red",
  },
  received: {
    label: "Received",
    description: "Payment confirmed; outlet has accepted the order.",
    tone: "saffron",
  },
  preparing: { label: "Preparing", description: "Kitchen is preparing the order.", tone: "amber" },
  ready: { label: "Ready", description: "Order is packed and ready for pickup/dispatch.", tone: "blue" },
  out_for_delivery: { label: "Out for Delivery", description: "Rider has picked up; on the way.", tone: "indigo" },
  completed: { label: "Completed", description: "Order delivered / collected by customer.", tone: "emerald" },
  cancelled: { label: "Cancelled", description: "Order cancelled by customer or outlet.", tone: "slate" },
  refunded: { label: "Refunded", description: "Order amount refunded to the customer.", tone: "maroon" },
};

export const ORDER_PAYMENT_STATUS_META: Record<OrderPaymentStatus, StatusMeta> = {
  pending: { label: "Pending", description: "Payment not yet collected (UPI initiated or COD).", tone: "amber" },
  paid: { label: "Paid", description: "Payment received in full; invoice can be generated.", tone: "emerald" },
  failed: { label: "Failed", description: "Payment attempt failed.", tone: "red" },
  refunded: { label: "Refunded", description: "Full refund issued to customer.", tone: "maroon" },
  partially_refunded: { label: "Partially Refunded", description: "Partial refund issued.", tone: "indigo" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  initiated: { label: "Initiated", description: "UPI/PhonePe transaction created, awaiting customer.", tone: "blue" },
  pending: { label: "Pending", description: "Payment in progress or COD not yet collected.", tone: "amber" },
  success: { label: "Success", description: "Gateway confirmed successful UPI payment.", tone: "emerald" },
  failed: { label: "Failed", description: "Gateway returned failure / customer cancelled.", tone: "red" },
  refunded: { label: "Refunded", description: "Amount refunded back to source.", tone: "maroon" },
  cancelled: { label: "Cancelled", description: "Transaction cancelled before completion.", tone: "slate" },
  collected: { label: "Collected", description: "Cash / card-machine collected at counter.", tone: "emerald" },
};

// ---------------------------------------------------------------------------
// Runtime validation helpers
// ---------------------------------------------------------------------------
const warned = new Set<string>();
function warnOnce(scope: string, value: string, allowed: readonly string[]) {
  const key = `${scope}:${value}`;
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
  console.warn(
    `[order-status] Unknown ${scope} "${value}". Expected one of: ${allowed.join(", ")}. ` +
      `Update src/lib/order-status.ts if the DB enum has changed.`,
  );
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}
export function isOrderPaymentStatus(v: unknown): v is OrderPaymentStatus {
  return typeof v === "string" && (ORDER_PAYMENT_STATUSES as readonly string[]).includes(v);
}
export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export function assertOrderStatus(v: unknown, ctx = "filter"): OrderStatus | null {
  if (v == null || v === "") return null;
  if (isOrderStatus(v)) return v;
  warnOnce(`order_status (${ctx})`, String(v), ORDER_STATUSES);
  return null;
}
export function assertOrderPaymentStatus(v: unknown, ctx = "filter"): OrderPaymentStatus | null {
  if (v == null || v === "") return null;
  if (isOrderPaymentStatus(v)) return v;
  warnOnce(`orders.payment_status (${ctx})`, String(v), ORDER_PAYMENT_STATUSES);
  return null;
}

/**
 * Bucket-counter for a list of order rows. Unknown statuses are reported once
 * via console.warn and excluded from every bucket so totals stay honest.
 */
export function bucketOrderCounts<T extends { order_status: string | null }>(rows: T[]) {
  const counts: Record<keyof typeof ORDER_STATUS_BUCKETS, number> = {
    pending: 0, preparing: 0, ready: 0, out: 0, completed: 0, cancelled: 0,
  };
  for (const r of rows) {
    const s = assertOrderStatus(r.order_status, "bucket");
    if (!s) continue;
    for (const [bucket, members] of Object.entries(ORDER_STATUS_BUCKETS) as [
      keyof typeof ORDER_STATUS_BUCKETS,
      OrderStatus[],
    ][]) {
      if (members.includes(s)) counts[bucket] += 1;
    }
  }
  return counts;
}

/**
 * Sum of grand_total for rows that are revenue-eligible per the status machine:
 *   payment_status = 'paid' AND order_status ∈ REVENUE_ELIGIBLE_ORDER_STATUSES.
 */
export function computeEarnedRevenue<
  T extends { order_status: string | null; payment_status: string | null; grand_total: number | null },
>(rows: T[]) {
  let revenue = 0;
  let count = 0;
  for (const r of rows) {
    const os = assertOrderStatus(r.order_status, "revenue");
    const ps = assertOrderPaymentStatus(r.payment_status, "revenue");
    if (!os || ps !== "paid") continue;
    if (!REVENUE_ELIGIBLE_ORDER_STATUSES.includes(os)) continue;
    revenue += Number(r.grand_total) || 0;
    count += 1;
  }
  return { revenue, count, avg: count ? Math.round(revenue / count) : 0 };
}
