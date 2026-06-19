import { Link } from "react-router-dom";;
import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell, ChevronLeft, Calendar, TrendingUp, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { getAdminReports } from "@/lib/admin-reports.functions";



const RANGES = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["week", "This Week"], ["month", "This Month"], ["last_month", "Last Month"], ["all", "All Time"],
] as const;
type RangeKey = (typeof RANGES)[number][0];

function fmt(n: number) { return "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN"); }

function ReportsAdmin() {
  const [range, setRange] = useState<RangeKey>("month");
  const get = useServerFn(getAdminReports);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await get({ data: { range } });
        if (active) setData(res);
      } catch (err: any) {
        if (active) setError(err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchReports();
    return () => { active = false; };
  }, [range, get]);

  const d = data;

  const metrics = useMemo(() => {
    if (!d) return null;
    const orders = d.orders;
    const paid = orders.filter((o: any) => ["paid", "cash_on_delivery", "completed"].includes((o.payment_status || "").toLowerCase()));
    const revenue = paid.reduce((s: number, o: any) => s + Number(o.grand_total || 0), 0);
    const aov = paid.length ? revenue / paid.length : 0;
    const cancelled = orders.filter((o: any) => o.order_status === "cancelled").length;
    const refunded = orders.filter((o: any) => o.order_status === "refunded").length;

    // Outlet performance
    const byOutlet = new Map<string, any>();
    orders.forEach((o: any) => {
      const row = byOutlet.get(o.outlet_id) ?? { orders: 0, revenue: 0, completed: 0, cancelled: 0 };
      row.orders += 1;
      if (paid.includes(o)) row.revenue += Number(o.grand_total || 0);
      if (o.order_status === "delivered" || o.order_status === "completed") row.completed += 1;
      if (o.order_status === "cancelled") row.cancelled += 1;
      byOutlet.set(o.outlet_id, row);
    });
    const outletPerf = Array.from(byOutlet.entries()).map(([id, r]) => ({
      id, name: d.outlets.find((x: any) => x.id === id)?.outlet_name ?? "—", ...r, aov: r.orders ? r.revenue / r.orders : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Top items
    const byItem = new Map<string, any>();
    d.orderItems.forEach((it: any) => {
      const row = byItem.get(it.item_name_snapshot) ?? { name: it.item_name_snapshot, qty: 0, revenue: 0, orders: new Set<string>() };
      row.qty += Number(it.quantity || 0);
      row.revenue += Number(it.total_price || 0);
      row.orders.add(it.order_id);
      byItem.set(it.item_name_snapshot, row);
    });
    const topItems = Array.from(byItem.values())
      .map((r) => ({ ...r, orders: (r.orders as Set<string>).size }))
      .sort((a, b) => b.qty - a.qty).slice(0, 10);

    // Payments
    const payments = d.payments;
    const payByStatus = payments.reduce((acc: any, p: any) => {
      acc[p.payment_status] = (acc[p.payment_status] ?? 0) + 1;
      return acc;
    }, {});
    const collected = payments.filter((p: any) => p.payment_status === "success").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const refundedAmt = payments.filter((p: any) => p.payment_status === "refunded").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Invoices
    const invTotal = d.invoices.reduce((s: number, i: any) => s + Number(i.invoice_amount || 0), 0);
    const taxTotal = d.invoices.reduce((s: number, i: any) => s + Number(i.tax_amount || 0), 0);
    const pendingInv = paid.filter((o: any) => !d.invoices.some((i: any) => i.order_id === o.id)).length;

    // Availability
    const unavail = d.availability.filter((a: any) => !a.is_available).length;
    const limited = d.availability.filter((a: any) => a.stock_status === "limited").length;
    const soldOut = d.availability.filter((a: any) => a.stock_status === "sold_out").length;

    // Customer metrics
    const newCustomers = d.customers.length; // we filter by date implicitly via report range? no — keep all
    const ordersPerCustomer = new Map<string, number>();
    orders.forEach((o: any) => ordersPerCustomer.set(o.customer_id, (ordersPerCustomer.get(o.customer_id) ?? 0) + 1));
    const repeatCust = Array.from(ordersPerCustomer.values()).filter((n) => n > 1).length;

    return {
      revenue, aov, totalOrders: orders.length, cancelled, refunded,
      outletPerf, topItems, payByStatus, collected, refundedAmt,
      invTotal, taxTotal, pendingInv, unavail, limited, soldOut,
      newCustomers, repeatCust,
    };
  }, [d]);

  return (
    <AdminPage>
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/admin/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><ChevronLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon">Reports & Analytics</h1>
            <p className="truncate text-[10px] text-maroon-deep/60">Revenue, orders, customers, outlets</p>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><Bell className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="rounded-2xl border border-gold/25 bg-card p-3">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-saffron-deep" /><p className="text-display text-sm text-maroon">Date Range</p></div>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {RANGES.map(([k, label]) => (
              <Chip key={k} active={range === k} onClick={() => setRange(k)}>{label}</Chip>
            ))}
          </div>
        </div>

        {isLoading && <div className="grid place-items-center py-10 text-maroon"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {!!error && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700"><AlertCircle className="mx-auto mb-2 h-5 w-5" />{(error as Error).message}</div>}

        {metrics && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Revenue" value={fmt(metrics.revenue)} tone="emerald" />
              <StatCard label="Orders" value={metrics.totalOrders} tone="saffron" />
              <StatCard label="Avg Order" value={fmt(metrics.aov)} tone="blue" />
              <StatCard label="Cancelled" value={metrics.cancelled} tone="amber" />
              <StatCard label="Refunded" value={metrics.refunded} tone="maroon" />
              <StatCard label="Pending Invoices" value={metrics.pendingInv} tone="amber" />
            </div>

            <Card title="Outlet Performance">
              {metrics.outletPerf.length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {metrics.outletPerf.map((o, i) => {
                    const max = metrics.outletPerf[0]?.revenue || 1;
                    return (
                      <div key={o.id ?? i} className="rounded-2xl border border-gold/20 bg-cream/40 p-3">
                        <div className="flex items-center justify-between">
                          <div><p className="text-display text-sm text-maroon">{o.name}</p><p className="text-[10px] text-maroon-deep/60">{o.orders} orders • AOV {fmt(o.aov)}</p></div>
                          <p className="text-display text-base text-saffron-deep">{fmt(o.revenue)}</p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream"><div className="h-full bg-gradient-to-r from-saffron to-saffron-deep" style={{ width: `${(o.revenue / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card title="Top Selling Items">
              {metrics.topItems.length === 0 ? <Empty /> : (
                <div className="space-y-2">
                  {metrics.topItems.map((it, idx) => (
                    <div key={it.name} className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-cream/40 p-2.5">
                      <div className={`text-display grid h-9 w-9 place-items-center rounded-xl ${idx === 0 ? "bg-saffron text-cream" : idx === 1 ? "bg-gold/60 text-maroon" : idx === 2 ? "bg-amber-400/50 text-maroon" : "bg-cream text-maroon"}`}>#{idx + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-display truncate text-sm text-maroon">{it.name}</p>
                        <p className="text-[10px] text-maroon-deep/60">{it.qty} sold • {it.orders} orders</p>
                      </div>
                      <p className="text-display text-sm text-saffron-deep">{fmt(it.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="rounded-3xl border border-gold/25 bg-card p-3">
              <p className="text-display text-sm text-maroon">Category Performance</p>
              <p className="mt-2 text-[11px] text-maroon-deep/60">Category performance will appear when item-category mapping is enriched.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-gold/25 bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-saffron-deep">Customers</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-maroon">
                  <p>• Repeat: {metrics.repeatCust}</p>
                  <p>• Total customers loaded: {d?.customers?.length ?? 0}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-saffron-deep">Payments</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-maroon">
                  <p>• Collected: {fmt(metrics.collected)}</p>
                  <p>• Refunded: {fmt(metrics.refundedAmt)}</p>
                  {Object.entries(metrics.payByStatus).map(([k, v]) => <p key={k}>• {k}: {String(v)}</p>)}
                </div>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-saffron-deep">Invoices</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-maroon">
                  <p>• Total value: {fmt(metrics.invTotal)}</p>
                  <p>• Tax collected: {fmt(metrics.taxTotal)}</p>
                  <p>• Pending: {metrics.pendingInv}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-card p-3">
                <p className="text-[10px] font-bold uppercase text-saffron-deep">Availability</p>
                <div className="mt-1 space-y-0.5 text-[11px] text-maroon">
                  <p>• Unavailable: {metrics.unavail}</p>
                  <p>• Limited: {metrics.limited}</p>
                  <p>• Sold out: {metrics.soldOut}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gold/25 bg-gradient-to-br from-saffron/15 to-gold/10 p-3">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-saffron-deep" /><p className="text-display text-sm text-maroon">Smart Insights</p></div>
              <div className="mt-2 space-y-2">
                {[
                  metrics.outletPerf[0] ? `${metrics.outletPerf[0].name} leads with ${fmt(metrics.outletPerf[0].revenue)} in revenue.` : null,
                  metrics.topItems[0] ? `${metrics.topItems[0].name} is the top item with ${metrics.topItems[0].qty} units sold.` : null,
                  metrics.totalOrders ? `Avg order value is ${fmt(metrics.aov)} across ${metrics.totalOrders} orders.` : null,
                  metrics.pendingInv ? `${metrics.pendingInv} paid orders still need invoices.` : null,
                ].filter(Boolean).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-2xl bg-card/80 p-2.5">
                    <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <p className="text-[11px] text-maroon">{t}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => toast.message("Report export will be connected later.")} className="w-full rounded-2xl border border-gold/40 bg-card py-3 text-sm font-semibold text-maroon">
              Export Report
            </button>
          </>
        )}
      </div>

      <AdminBottomNav />
    </AdminPage>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-gold/25 bg-card p-3">
      <p className="text-display text-sm text-maroon">{title}</p>
      <div className="mt-2">{children}</div>
    </motion.div>
  );
}
function Empty() { return <p className="py-6 text-center text-[11px] text-maroon-deep/60">No data for selected range</p>; }

export default ReportsAdmin;
