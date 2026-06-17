import { Link } from "react-router-dom";;
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Bell, ChevronLeft, CreditCard, RefreshCcw, Loader2, AlertCircle, Inbox } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { listAdminPayments } from "@/lib/admin-payments.functions";



type PaymentRow = {
  id: string; order_id: string; transaction_id: string | null; merchant_transaction_id: string | null;
  amount: number; payment_status: string; payment_gateway: string; payment_mode: string | null;
  gateway_response_snapshot: any; paid_at: string | null; created_at: string;
};

function fmt(n: number) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

function PaymentsAdmin() {
  const list = useServerFn(listAdminPayments);
  const q = useQuery({ queryKey: ["admin", "payments"], queryFn: () => list(), retry: 1 });

  const [filter, setFilter] = useState<"All" | "success" | "failed" | "pending" | "refunded">("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<string | null>(null);
  const [refund, setRefund] = useState<string | null>(null);

  const customersById = useMemo(() => new Map((q.data?.customers ?? []).map((c: any) => [c.id, c])), [q.data]);
  const ordersById = useMemo(() => new Map((q.data?.orders ?? []).map((o: any) => [o.id, o])), [q.data]);
  const outletsById = useMemo(() => new Map((q.data?.outlets ?? []).map((o: any) => [o.id, o])), [q.data]);

  const payments = (q.data?.payments ?? []) as PaymentRow[];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return payments.filter((p) => {
      const st = (p.payment_status || "").toLowerCase();
      if (filter !== "All" && st !== filter) return false;
      if (!needle) return true;
      const order = ordersById.get(p.order_id);
      const cust: any = order ? customersById.get(order.customer_id) : null;
      return [p.transaction_id, p.merchant_transaction_id, order?.order_number, cust?.full_name, cust?.phone]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [payments, filter, search, ordersById, customersById]);

  const totals = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isToday = (s: string | null) => s && new Date(s).getTime() >= today.getTime();
    const ok = payments.filter((p) => p.payment_status === "success");
    return {
      today: ok.filter((p) => isToday(p.paid_at ?? p.created_at)).reduce((s, p) => s + Number(p.amount || 0), 0),
      success: ok.length,
      failed: payments.filter((p) => p.payment_status === "failed").length,
      pending: payments.filter((p) => p.payment_status === "pending").length,
      refunded: payments.filter((p) => p.payment_status === "refunded").reduce((s, p) => s + Number(p.amount || 0), 0),
    };
  }, [payments]);

  const sel = payments.find((p) => p.id === view);
  const selOrder = sel ? ordersById.get(sel.order_id) : null;
  const selCust: any = selOrder ? customersById.get((selOrder as any).customer_id) : null;
  const selOutlet: any = selOrder ? outletsById.get((selOrder as any).outlet_id) : null;

  return (
    <AdminPage>
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/admin/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><ChevronLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon">Payments</h1>
            <p className="truncate text-[10px] text-maroon-deep/60">Monitor and manage customer transactions</p>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><Bell className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Today" value={fmt(totals.today)} tone="emerald" />
          <StatCard label="Successful" value={totals.success} tone="saffron" />
          <StatCard label="Failed" value={totals.failed} tone="amber" />
          <StatCard label="Pending" value={totals.pending} tone="blue" />
          <StatCard label="Refunded" value={fmt(totals.refunded)} tone="maroon" />
          <StatCard label="Total" value={payments.length} tone="emerald" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search txn, order, customer" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "success", "failed", "pending", "refunded"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}</Chip>
          ))}
        </div>

        {q.isLoading && <div className="grid place-items-center py-10 text-maroon"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {q.isError && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700">
            <AlertCircle className="mx-auto mb-2 h-5 w-5" />{(q.error as Error).message}
          </div>
        )}
        {!q.isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-gold/30 bg-card p-8 text-center text-maroon-deep/60">
            <Inbox className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">No payments found</p>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((p, i) => {
            const order: any = ordersById.get(p.order_id);
            const cust: any = order ? customersById.get(order.customer_id) : null;
            const outlet: any = order ? outletsById.get(order.outlet_id) : null;
            const st = (p.payment_status || "").toLowerCase();
            const tone = st === "success" ? "bg-emerald-500/15 text-emerald-700"
              : st === "failed" ? "bg-red-500/15 text-red-700"
              : st === "refunded" ? "bg-maroon/15 text-maroon"
              : "bg-amber-500/15 text-amber-700";
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-display truncate text-sm text-maroon">{p.transaction_id ?? p.merchant_transaction_id ?? p.id.slice(0, 8)}</p>
                      <p className="truncate text-[10px] text-saffron-deep">{order?.order_number ?? "—"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{p.payment_status}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-maroon-deep/70">{cust?.full_name ?? "—"} • {outlet?.outlet_name ?? "—"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-saffron/15 text-saffron-deep"><CreditCard className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[11px] font-semibold text-maroon">{p.payment_gateway}{p.payment_mode ? ` · ${p.payment_mode}` : ""}</p>
                        <p className="text-[10px] text-maroon-deep/60">{new Date(p.paid_at ?? p.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-display text-lg text-maroon">{fmt(p.amount)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold">
                  <button onClick={() => setView(p.id)} className="rounded-lg py-1.5 text-maroon">View Details</button>
                  <button onClick={() => setRefund(p.id)} className="rounded-lg py-1.5 text-saffron-deep"><RefreshCcw className="mr-1 inline h-3 w-3" /> Refund</button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AdminBottomNav />

      <AnimatePresence>
        {sel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setView(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Payment Details</h2>
                <button onClick={() => setView(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              {[
                { t: "Transaction", rows: [["Transaction ID", sel.transaction_id ?? "—"], ["Merchant TXN", sel.merchant_transaction_id ?? "—"], ["Gateway", sel.payment_gateway], ["Mode", sel.payment_mode ?? "—"], ["Status", sel.payment_status]] },
                { t: "Order", rows: [["Order #", (selOrder as any)?.order_number ?? "—"], ["Total", fmt((selOrder as any)?.grand_total ?? 0)]] },
                { t: "Customer", rows: [["Name", selCust?.full_name ?? "—"], ["Phone", selCust?.phone ?? "—"], ["Email", selCust?.email ?? "—"]] },
                { t: "Outlet", rows: [["Name", selOutlet?.outlet_name ?? "—"], ["Code", selOutlet?.outlet_code ?? "—"]] },
                { t: "Payment", rows: [["Amount", fmt(sel.amount)], ["Paid at", sel.paid_at ? new Date(sel.paid_at).toLocaleString() : "—"], ["Created", new Date(sel.created_at).toLocaleString()]] },
              ].map((s) => (
                <div key={s.t} className="mt-3 rounded-2xl border border-gold/25 bg-card p-3">
                  <p className="text-[10px] font-bold uppercase text-saffron-deep">{s.t}</p>
                  <div className="mt-2 space-y-1 text-[11px]">
                    {s.rows.map(([k, v]) => (
                      <div key={k as string} className="flex justify-between gap-2">
                        <span className="text-maroon-deep/60">{k}</span>
                        <span className="truncate text-right font-semibold text-maroon">{v as any}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {sel.gateway_response_snapshot && (
                <div className="mt-3 rounded-2xl border border-gold/25 bg-card p-3">
                  <p className="text-[10px] font-bold uppercase text-saffron-deep">Gateway Response</p>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-cream/60 p-2 text-[10px] text-maroon">{JSON.stringify(sel.gateway_response_snapshot, null, 2)}</pre>
                </div>
              )}
            </motion.div>
          </>
        )}

        {refund && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setRefund(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <h2 className="text-display text-xl text-maroon">Process Refund</h2>
              <p className="mt-2 text-[12px] text-maroon-deep/70">Refund processing will be enabled after PhonePe integration.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setRefund(null)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Close</button>
                <button onClick={() => { toast.message("Refund processing will be enabled after PhonePe integration."); setRefund(null); }} className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream">Acknowledge</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

export default PaymentsAdmin;
