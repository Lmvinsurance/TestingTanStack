import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, X, Phone, Printer, RefreshCw, Bell, ChevronRight, Loader2,
  ShoppingBag, AlertTriangle, ChefHat, Receipt, ConciergeBell, Ban,
} from "lucide-react";
import { toast } from "sonner";
import { AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  getAdminMe,
  listAdminOrders,
  getAdminOrderDetail,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrder,
} from "@/lib/admin-orders.functions";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders Management — Telugu Food Club Admin" }] }),
  component: () => (
    <AdminGuard>
      <OrdersAdmin />
    </AdminGuard>
  ),
});

type AdminMe = Awaited<ReturnType<typeof getAdminMe>>;
type OrderRow = Awaited<ReturnType<typeof listAdminOrders>>["orders"][number];
type OrderDetail = Awaited<ReturnType<typeof getAdminOrderDetail>>;

const STATUS_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending Payment" },
  { key: "order_received", label: "New Orders" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
];

const STATUS_OPTIONS = [
  "pending_payment",
  "order_received",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

const PAYMENT_OPTIONS = ["pending", "paid", "failed", "cash_on_delivery", "refunded"];

function statusTone(s: string) {
  if (s === "delivered" || s === "completed") return "bg-emerald-500/15 text-emerald-700";
  if (s === "ready") return "bg-blue-500/15 text-blue-700";
  if (s === "out_for_delivery") return "bg-saffron/15 text-saffron-deep";
  if (s === "preparing") return "bg-amber-500/15 text-amber-800";
  if (s === "order_received") return "bg-saffron/20 text-saffron-deep";
  if (s === "cancelled") return "bg-red-500/15 text-red-700";
  if (s === "refunded") return "bg-purple-500/15 text-purple-700";
  return "bg-gold/20 text-maroon";
}
function payTone(s: string) {
  if (s === "paid") return "bg-emerald-500/15 text-emerald-700";
  if (s === "failed") return "bg-red-500/15 text-red-700";
  if (s === "refunded") return "bg-purple-500/15 text-purple-700";
  if (s === "cash_on_delivery") return "bg-blue-500/15 text-blue-700";
  return "bg-amber-500/15 text-amber-800";
}
function pretty(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function OrdersAdmin() {
  const fetchMe = useServerFn(getAdminMe);
  const fetchOrders = useServerFn(listAdminOrders);
  const fetchDetail = useServerFn(getAdminOrderDetail);
  const mutateStatus = useServerFn(updateOrderStatus);
  const mutatePay = useServerFn(updatePaymentStatus);
  const mutateCancel = useServerFn(cancelOrder);

  const [me, setMe] = useState<AdminMe | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [outletOptions, setOutletOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const [outletFilter, setOutletFilter] = useState<string>("");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("");
  const [payFilter, setPayFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailOrder, setDetailOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusOrder, setStatusOrder] = useState<OrderRow | null>(null);
  const [kotOrder, setKotOrder] = useState<OrderDetail | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);

  const canCancel = me?.role === "super_admin" || me?.role === "outlet_admin" || me?.role === "cashier";
  const isTerminal = (s: string) => ["cancelled", "refunded", "delivered", "completed"].includes(s);

  const isKitchen = me?.role === "kitchen";
  const canEditPayment = me?.role === "cashier" || me?.role === "super_admin" || me?.role === "outlet_admin";

  const load = useCallback(async () => {
    if (!me) return;
    setError(null);
    try {
      const res = await fetchOrders({
        data: {
          status: tab === "all" ? null : tab,
          search: q || null,
          outletId: outletFilter || null,
          orderType: orderTypeFilter || null,
          paymentStatus: payFilter || null,
          dateFrom: dateFrom ? new Date(dateFrom).toISOString() : null,
          dateTo: dateTo ? new Date(dateTo + "T23:59:59").toISOString() : null,
        },
      });
      setOrders(res.orders);
      setOutletOptions(res.outletOptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [me, fetchOrders, tab, q, outletFilter, orderTypeFilter, payFilter, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchMe();
        setMe(r);
      } catch (e) {
        setMeError(e instanceof Error ? e.message : "Access denied");
        setLoading(false);
      }
    })();
  }, [fetchMe]);

  useEffect(() => {
    if (me) load();
  }, [me, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
  };

  const openDetail = async (orderId: string) => {
    setDetailLoading(true);
    setDetailOrder({ ...(detailOrder ?? ({} as OrderDetail)) }); // open with skeleton
    try {
      const r = await fetchDetail({ data: { orderId } });
      setDetailOrder(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load order");
      setDetailOrder(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openKot = async (orderId: string) => {
    try {
      const r = await fetchDetail({ data: { orderId } });
      setKotOrder(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load KOT");
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach((o) => {
      c[o.orderStatus] = (c[o.orderStatus] ?? 0) + 1;
    });
    return c;
  }, [orders]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((o) => new Date(o.createdAt).toDateString() === today).length;
  }, [orders]);

  if (meError) {
    return (
      <AdminPage>
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <AlertTriangle className="mx-auto h-10 w-10 text-red-600" />
            <h2 className="text-display mt-3 text-xl text-maroon">Access Denied</h2>
            <p className="mt-1 text-sm text-maroon-deep/70">{meError}</p>
            <Link to="/admin/login" className="mt-4 inline-block rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-cream">
              Go to login
            </Link>
          </div>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/admin/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon">
              {isKitchen ? "Kitchen Board" : "Orders Management"}
            </h1>
            <p className="truncate text-[10px] text-maroon-deep/60">
              {me ? `${pretty(me.role)}${me.outletId ? " · Outlet scoped" : ""}` : "Loading…"}
            </p>
          </div>
          {!isKitchen && (
            <Link
              to="/admin/walkin"
              className="hidden items-center gap-1 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-3 py-1.5 text-[11px] font-semibold text-cream sm:inline-flex"
            >
              <ConciergeBell className="h-3.5 w-3.5" /> Walk-in
            </Link>
          )}
          <button
            onClick={refresh}
            disabled={refreshing}
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon disabled:opacity-50"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-saffron" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        {!isKitchen && (
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Today's Orders" value={todayCount} tone="saffron" />
            <StatCard label="Preparing" value={counts.preparing ?? 0} tone="amber" />
            <StatCard label="Ready" value={counts.ready ?? 0} tone="blue" />
            <StatCard label="Delivered" value={counts.delivered ?? 0} tone="emerald" />
          </div>
        )}

        {isKitchen ? (
          <KitchenBoard
            orders={orders}
            loading={loading}
            onOpen={openDetail}
            onStatus={(o) => setStatusOrder(o)}
            onKot={(id) => openKot(id)}
          />
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_TABS.map((t) => (
                <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                </Chip>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search order #, customer, phone, outlet"
                className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {me?.role === "super_admin" && (
                <select
                  value={outletFilter}
                  onChange={(e) => setOutletFilter(e.target.value)}
                  className="rounded-xl border border-gold/30 bg-card px-2 py-2 text-maroon"
                >
                  <option value="">All Outlets</option>
                  {outletOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="rounded-xl border border-gold/30 bg-card px-2 py-2 text-maroon"
              >
                <option value="">All Types</option>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
                <option value="dine_in">Dine In</option>
              </select>
              <select
                value={payFilter}
                onChange={(e) => setPayFilter(e.target.value)}
                className="rounded-xl border border-gold/30 bg-card px-2 py-2 text-maroon"
              >
                <option value="">All Payments</option>
                {PAYMENT_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {pretty(p)}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-gold/30 bg-card px-2 py-2 text-maroon"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-gold/30 bg-card px-2 py-2 text-maroon"
              />
            </div>

            {loading ? (
              <SkeletonList />
            ) : error ? (
              <ErrorState message={error} onRetry={refresh} />
            ) : orders.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {orders.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-gold/15 p-3">
                      <div className="min-w-0">
                        <p className="text-display truncate text-sm text-maroon">
                          {o.orderNumber}
                          {o.isWalkIn && <span className="ml-1.5 rounded-full bg-saffron/20 px-1.5 py-0.5 text-[9px] font-bold text-saffron-deep">WALK-IN</span>}
                        </p>
                        <p className="truncate text-[11px] text-maroon-deep/70">
                          {o.customerName}{o.customerPhone ? ` • ${o.customerPhone}` : ""}
                          {o.tableNumber ? ` • Table ${o.tableNumber}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-maroon-deep/60">
                          {o.outletName} • {pretty(o.orderType)} • {fmtTime(o.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-display text-base text-maroon">₹{o.grandTotal.toFixed(0)}</p>
                        <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold ${payTone(o.paymentStatus)}`}>
                          {pretty(o.paymentStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusTone(o.orderStatus)}`}>
                        {pretty(o.orderStatus)}
                      </span>
                      <span className="text-[10px] text-maroon-deep/60">
                        {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                        {o.firstItems.length > 0 && <> • {o.firstItems.join(", ")}</>}
                      </span>
                    </div>
                    <div className={`mt-2 grid ${canCancel ? "grid-cols-5" : "grid-cols-4"} gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold`}>
                      <button onClick={() => openDetail(o.id)} className="rounded-lg py-1.5 text-maroon">
                        View
                      </button>
                      <button onClick={() => setStatusOrder(o)} className="rounded-lg py-1.5 text-saffron-deep">
                        Status
                      </button>
                      <button
                        onClick={() => openKot(o.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-maroon"
                      >
                        <Printer className="h-3 w-3" /> KOT
                      </button>
                      <Link
                        to="/admin/invoice/$orderId"
                        params={{ orderId: o.id }}
                        search={{ format: "thermal" as const }}
                        className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-emerald-700"
                      >
                        <Receipt className="h-3 w-3" /> Invoice
                      </Link>
                      {canCancel && (
                        <button
                          onClick={() => setCancelTarget(o)}
                          disabled={isTerminal(o.orderStatus)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-red-700 disabled:opacity-40"
                        >
                          <Ban className="h-3 w-3" /> Cancel
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AdminBottomNav />

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {detailOrder && (
          <DetailDrawer
            detail={detailOrder}
            loading={detailLoading}
            isKitchen={isKitchen}
            canEditPayment={canEditPayment}
            onClose={() => setDetailOrder(null)}
            onChangePayment={async (newStatus) => {
              if (!detailOrder?.order) return;
              try {
                await mutatePay({ data: { orderId: detailOrder.order.id, newStatus } });
                toast.success("Payment status updated.");
                await load();
                const r = await fetchDetail({ data: { orderId: detailOrder.order.id } });
                setDetailOrder(r);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to update payment status");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* STATUS MODAL */}
      <AnimatePresence>
        {statusOrder && (
          <StatusModal
            order={statusOrder}
            onClose={() => setStatusOrder(null)}
            onSave={async (newStatus, remarks) => {
              try {
                await mutateStatus({
                  data: { orderId: statusOrder.id, newStatus, remarks: remarks || null },
                });
                toast.success("Order status updated successfully.");
                setStatusOrder(null);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to update status");
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* KOT MODAL */}
      <AnimatePresence>
        {kotOrder && <KotModal detail={kotOrder} onClose={() => setKotOrder(null)} />}
      </AnimatePresence>

      {/* CANCEL MODAL */}
      <AnimatePresence>
        {cancelTarget && (
          <CancelModal
            order={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={async (reason) => {
              try {
                const res = await mutateCancel({ data: { orderId: cancelTarget.id, reason } });
                toast.success(
                  res.refundedFlagged
                    ? "Order cancelled. Payment marked as refunded — process refund in PhonePe."
                    : "Order cancelled.",
                );
                setCancelTarget(null);
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Failed to cancel order");
              }
            }}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl border border-gold/20 bg-card" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-gold/30 bg-card p-10 text-center">
      <ShoppingBag className="h-8 w-8 text-saffron-deep" />
      <p className="text-display mt-2 text-base text-maroon">No orders found</p>
      <p className="text-[11px] text-maroon-deep/60">Try clearing filters or refresh.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
      <AlertTriangle className="mx-auto mb-1 h-5 w-5" />
      {message}
      <button onClick={onRetry} className="ml-2 underline">
        Retry
      </button>
    </div>
  );
}

function DetailDrawer({
  detail,
  loading,
  isKitchen,
  canEditPayment,
  onClose,
  onChangePayment,
}: {
  detail: OrderDetail;
  loading: boolean;
  isKitchen: boolean;
  canEditPayment: boolean;
  onClose: () => void;
  onChangePayment: (s: string) => void;
}) {
  const order = detail?.order;
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5"
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl text-maroon">
            {order?.orderNumber ?? "Loading…"}
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !order ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-saffron-deep" />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {!isKitchen && detail.customer && (
              <Section title="Customer Information">
                <p className="text-display text-base text-maroon">{detail.customer.fullName}</p>
                <p className="text-[11px] text-maroon-deep/70">
                  {detail.customer.phone}
                  {detail.customer.email ? ` • ${detail.customer.email}` : ""}
                </p>
              </Section>
            )}

            {detail.outlet && (
              <Section title="Outlet">
                <p className="text-display text-base text-maroon">{detail.outlet.outlet_name}</p>
                <p className="text-[11px] text-maroon-deep/70">
                  {detail.outlet.address}
                  {detail.outlet.city ? `, ${detail.outlet.city}` : ""}
                </p>
                {detail.outlet.phone && (
                  <p className="text-[11px] text-maroon-deep/70">📞 {detail.outlet.phone}</p>
                )}
              </Section>
            )}

            <Section title="Order Info">
              <div className="grid grid-cols-2 gap-1 text-[11px] text-maroon">
                <span>Type: <b>{pretty(order.orderType)}</b></span>
                <span>Status: <b>{pretty(order.orderStatus)}</b></span>
                <span>Payment: <b>{pretty(order.paymentStatus)}</b></span>
                <span>Placed: <b>{fmtTime(order.createdAt)}</b></span>
              </div>
            </Section>

            <Section title="Items">
              {detail.items.map((it) => (
                <div key={it.id} className="mt-2 border-t border-gold/15 pt-2 text-xs first:mt-0 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-maroon">{it.itemName}</p>
                      <p className="text-[10px] text-maroon-deep/60">
                        {it.variantName} • Qty: {it.quantity} • ₹{it.unitPrice.toFixed(0)} ea
                      </p>
                    </div>
                    <span className="text-display text-sm text-maroon">₹{it.totalPrice.toFixed(0)}</span>
                  </div>
                  {it.addons.length > 0 && (
                    <div className="mt-1 text-[10px] text-maroon-deep/70">
                      Add-ons:{" "}
                      {it.addons.map((a, idx) => (
                        <span key={idx}>
                          {a.name} × {a.quantity} (₹{a.price})
                          {idx < it.addons.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {it.specialInstructions && (
                    <div className="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] text-amber-800">
                      Note: {it.specialInstructions}
                    </div>
                  )}
                </div>
              ))}
            </Section>

            {order.customerNotes && (
              <Section title="Customer Notes">
                <p className="text-[11px] text-maroon">{order.customerNotes}</p>
              </Section>
            )}

            {!isKitchen && (
              <>
                <Section title="Bill Summary">
                  <div className="space-y-1 text-[11px] text-maroon">
                    <Row k="Subtotal" v={`₹${order.subtotal.toFixed(2)}`} />
                    <Row k="Tax" v={`₹${order.taxAmount.toFixed(2)}`} />
                    <Row k="Delivery" v={`₹${order.deliveryCharge.toFixed(2)}`} />
                    <Row k="Discount" v={`-₹${order.discountAmount.toFixed(2)}`} />
                    <div className="mt-1 border-t border-gold/20 pt-1">
                      <Row k="Grand Total" v={`₹${order.grandTotal.toFixed(2)}`} strong />
                    </div>
                  </div>
                </Section>

                {detail.payments.length > 0 && (
                  <Section title="Payments">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="mt-1 grid grid-cols-2 gap-1 border-t border-gold/15 pt-1 text-[11px] text-maroon first:mt-0 first:border-0 first:pt-0">
                        <span>Gateway: <b>{p.gateway ?? "—"}</b></span>
                        <span>Mode: <b>{p.mode ?? "—"}</b></span>
                        <span className="col-span-2 truncate">TXN: <b>{p.transactionId ?? "—"}</b></span>
                        <span>Amount: <b>₹{p.amount.toFixed(2)}</b></span>
                        <span>Status: <b className={p.status === "success" ? "text-emerald-700" : "text-maroon"}>{p.status}</b></span>
                      </div>
                    ))}
                  </Section>
                )}

                {canEditPayment && (
                  <Section title="Update Payment Status">
                    <select
                      defaultValue={order.paymentStatus}
                      onChange={(e) => onChangePayment(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gold/30 bg-cream/50 px-3 py-2 text-xs"
                    >
                      {PAYMENT_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {pretty(p)}
                        </option>
                      ))}
                    </select>
                  </Section>
                )}
              </>
            )}

            {detail.history.length > 0 && (
              <Section title="Status Timeline">
                <div className="space-y-1 text-[11px] text-maroon-deep/70">
                  {detail.history.map((h) => (
                    <div key={h.id} className="flex justify-between border-t border-gold/15 pt-1 first:border-0 first:pt-0">
                      <span>
                        {pretty(h.newStatus)}
                        {h.changedByRole ? ` • ${h.changedByRole}` : ""}
                      </span>
                      <span>{fmtTime(h.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </motion.div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gold/25 bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-saffron-deep">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "text-display text-sm text-maroon" : ""}>{k}</span>
      <span className={strong ? "text-display text-sm text-maroon" : ""}>{v}</span>
    </div>
  );
}

function StatusModal({
  order,
  onClose,
  onSave,
}: {
  order: OrderRow;
  onClose: () => void;
  onSave: (newStatus: string, remarks: string) => void;
}) {
  const [next, setNext] = useState(order.orderStatus);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-black/40" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-x-4 top-1/2 z-[60] -translate-y-1/2 rounded-3xl border border-gold/30 bg-cream p-5 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2"
        style={{ left: "1rem", right: "1rem" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-display text-lg text-maroon">Update Status</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-maroon-deep/60">{order.orderNumber}</p>
        <label className="mt-3 block text-[10px] font-bold uppercase text-saffron-deep">New Status</label>
        <select
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gold/30 bg-card px-3 py-2 text-sm text-maroon"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {pretty(s)}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-[10px] font-bold uppercase text-saffron-deep">Remarks (optional)</label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs"
        />
        <button
          disabled={saving || next === order.orderStatus}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(next, remarks);
            } finally {
              setSaving(false);
            }
          }}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Status"}
        </button>
      </motion.div>
    </>
  );
}

function KotModal({ detail, onClose }: { detail: OrderDetail; onClose: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-black/40" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-x-4 top-10 z-[60] max-h-[85vh] overflow-y-auto rounded-3xl border border-gold/30 bg-cream p-5 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-display text-lg text-maroon">Kitchen Order Ticket</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 border-t border-dashed border-gold/40 pt-3 font-mono text-[12px] text-maroon">
          <p className="text-center text-display text-base">{detail.order.orderNumber}</p>
          <p className="text-center text-[11px]">{detail.outlet?.outlet_name}</p>
          <p className="text-center text-[10px]">{fmtTime(detail.order.createdAt)} • {pretty(detail.order.orderType)}</p>
          <div className="my-2 border-t border-dashed border-gold/40" />
          {detail.items.map((it) => (
            <div key={it.id} className="mb-2">
              <p className="font-bold">
                {it.quantity} × {it.itemName}
              </p>
              <p className="pl-3 text-[11px]">— {it.variantName}</p>
              {it.addons.map((a, idx) => (
                <p key={idx} className="pl-3 text-[11px]">+ {a.name} × {a.quantity}</p>
              ))}
              {it.specialInstructions && (
                <p className="pl-3 text-[11px] italic">★ {it.specialInstructions}</p>
              )}
            </div>
          ))}
          {detail.order.customerNotes && (
            <>
              <div className="my-2 border-t border-dashed border-gold/40" />
              <p className="text-[11px] italic">Note: {detail.order.customerNotes}</p>
            </>
          )}
        </div>
        <button
          onClick={() => window.print()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-2.5 text-sm font-semibold text-cream"
        >
          <Printer className="h-4 w-4" /> Print KOT
        </button>
      </motion.div>
    </>
  );
}

function KitchenBoard({
  orders,
  loading,
  onOpen,
  onStatus,
  onKot,
}: {
  orders: OrderRow[];
  loading: boolean;
  onOpen: (id: string) => void;
  onStatus: (o: OrderRow) => void;
  onKot: (id: string) => void;
}) {
  const columns: { key: string; label: string }[] = [
    { key: "order_received", label: "Order Received" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
  ];
  if (loading) return <SkeletonList />;
  return (
    <div className="space-y-4">
      {columns.map((col) => {
        const list = orders.filter((o) => o.orderStatus === col.key);
        return (
          <div key={col.key}>
            <div className="mb-2 flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-saffron-deep" />
              <p className="text-display text-sm text-maroon">{col.label}</p>
              <span className="rounded-full bg-saffron/15 px-2 py-0.5 text-[10px] font-bold text-saffron-deep">
                {list.length}
              </span>
            </div>
            {list.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gold/30 bg-card p-4 text-center text-[11px] text-maroon-deep/60">
                No orders
              </p>
            ) : (
              <div className="space-y-2">
                {list.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-gold/25 bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="text-display text-sm text-maroon">{o.orderNumber}</p>
                        <p className="text-[10px] text-maroon-deep/60">
                          {pretty(o.orderType)} • {fmtTime(o.createdAt)}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-maroon">
                          {o.firstItems.join(", ")}
                          {o.itemCount > o.firstItems.length ? ` +${o.itemCount - o.firstItems.length} more` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-semibold">
                      <button onClick={() => onOpen(o.id)} className="rounded-lg border border-gold/30 py-1 text-maroon">
                        View
                      </button>
                      <button onClick={() => onStatus(o)} className="rounded-lg bg-saffron/20 py-1 text-saffron-deep">
                        Status
                      </button>
                      <button onClick={() => onKot(o.id)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-gold/30 py-1 text-maroon">
                        <Printer className="h-3 w-3" /> KOT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CancelModal({
  order,
  onClose,
  onConfirm,
}: {
  order: OrderRow;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const PRESETS = [
    "Customer requested cancellation",
    "Item(s) unavailable",
    "Outlet closed / unable to fulfil",
    "Payment issue",
    "Duplicate order",
  ];
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const trimmed = reason.trim();
  const valid = trimmed.length >= 3 && trimmed.length <= 500;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[60] bg-black/40" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="fixed inset-x-4 top-1/2 z-[60] -translate-y-1/2 rounded-3xl border border-red-200 bg-cream p-5 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-display text-lg text-red-700">Cancel Order</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-maroon-deep/70">
          {order.orderNumber} • ₹{order.grandTotal.toFixed(0)} • {pretty(order.paymentStatus)}
        </p>
        {order.paymentStatus === "paid" && (
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-800">
            Payment is already marked paid. Cancelling will flag it as <b>refunded</b>; you must process the refund in PhonePe manually.
          </p>
        )}
        <label className="mt-3 block text-[10px] font-bold uppercase text-saffron-deep">Reason</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setReason(p)}
              className="rounded-full border border-gold/30 bg-card px-2 py-1 text-[10px] text-maroon hover:bg-saffron/10"
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Describe why this order is being cancelled…"
          className="mt-2 w-full rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs"
        />
        <p className="mt-1 text-right text-[10px] text-maroon-deep/50">{trimmed.length}/500</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-gold/30 bg-card py-2.5 text-sm font-semibold text-maroon"
          >
            Keep Order
          </button>
          <button
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onConfirm(trimmed);
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
          >
            {saving ? "Cancelling…" : "Confirm Cancel"}
          </button>
        </div>
      </motion.div>
    </>
  );
}