import { Link } from "react-router-dom";;
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Bell, ChevronLeft, Crown, Loader2, AlertCircle, Inbox, Power } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { listAdminCustomers, getAdminCustomerProfile, setCustomerActive } from "@/lib/admin-customers.functions";



function fmt(n: number) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

function CustomersAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminCustomers);
  const profile = useServerFn(getAdminCustomerProfile);
  const toggleActive = useServerFn(setCustomerActive);

  const q = useQuery({ queryKey: ["admin", "customers"], queryFn: () => list(), retry: 1 });

  const [filter, setFilter] = useState<"All" | "New" | "Repeat" | "Active" | "Inactive" | "HighValue">("All");
  const [search, setSearch] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const role = q.data?.role;
  const canManage = role === "super_admin";

  const ordersByCustomer = useMemo(() => {
    const m = new Map<string, any[]>();
    (q.data?.orders ?? []).forEach((o: any) => {
      const arr = m.get(o.customer_id) ?? [];
      arr.push(o);
      m.set(o.customer_id, arr);
    });
    return m;
  }, [q.data]);

  const addressByCustomer = useMemo(() => {
    const m = new Map<string, any>();
    (q.data?.addresses ?? []).forEach((a: any) => {
      if (a.is_default || !m.has(a.customer_id)) m.set(a.customer_id, a);
    });
    return m;
  }, [q.data]);

  const enriched = useMemo(() => {
    return (q.data?.customers ?? []).map((c: any) => {
      const os = ordersByCustomer.get(c.id) ?? [];
      const spend = os.reduce((s, o) => s + Number(o.grand_total || 0), 0);
      const last = os.length ? os.map((o) => o.created_at).sort().slice(-1)[0] : null;
      return { ...c, total_orders: os.length, total_spend: spend, last_order: last, address: addressByCustomer.get(c.id) };
    });
  }, [q.data, ordersByCustomer, addressByCustomer]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return enriched.filter((c: any) => {
      if (filter === "New" && c.total_orders > 1) return false;
      if (filter === "Repeat" && c.total_orders < 2) return false;
      if (filter === "Active" && !c.is_active) return false;
      if (filter === "Inactive" && c.is_active) return false;
      if (filter === "HighValue" && c.total_spend < 5000) return false;
      if (!needle) return true;
      return [c.full_name, c.phone, c.email].filter(Boolean).some((v: string) => v.toLowerCase().includes(needle));
    });
  }, [enriched, search, filter]);

  const totals = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const orders = q.data?.orders ?? [];
    const totalSpend = orders.reduce((s: number, o: any) => s + Number(o.grand_total || 0), 0);
    return {
      total: enriched.length,
      newToday: enriched.filter((c: any) => new Date(c.created_at).getTime() >= today.getTime()).length,
      repeat: enriched.filter((c: any) => c.total_orders > 1).length,
      active: enriched.filter((c: any) => c.is_active).length,
      inactive: enriched.filter((c: any) => !c.is_active).length,
      aov: orders.length ? Math.round(totalSpend / orders.length) : 0,
    };
  }, [enriched, q.data]);

  const profileQ = useQuery({
    queryKey: ["admin", "customer-profile", viewId],
    queryFn: () => profile({ data: { customer_id: viewId! } }),
    enabled: !!viewId,
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleActive({ data: v }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "customers"] });
      qc.invalidateQueries({ queryKey: ["admin", "customer-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const sel: any = filtered.find((c: any) => c.id === viewId) ?? null;

  return (
    <AdminPage>
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/admin/dashboard" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><ChevronLeft className="h-4 w-4" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display truncate text-base leading-tight text-maroon">Customers</h1>
            <p className="truncate text-[10px] text-maroon-deep/60">Manage customers and engagement</p>
          </div>
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon"><Bell className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total" value={totals.total} tone="saffron" />
          <StatCard label="New Today" value={totals.newToday} tone="emerald" />
          <StatCard label="Repeat" value={totals.repeat} tone="maroon" />
          <StatCard label="Active" value={totals.active} tone="emerald" />
          <StatCard label="Inactive" value={totals.inactive} tone="amber" />
          <StatCard label="AOV" value={fmt(totals.aov)} tone="blue" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "New", "Repeat", "Active", "Inactive", "HighValue"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === "HighValue" ? "High Value" : f}</Chip>
          ))}
        </div>

        {q.isLoading && <div className="grid place-items-center py-10 text-maroon"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {q.isError && <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700"><AlertCircle className="mx-auto mb-2 h-5 w-5" />{(q.error as Error).message}</div>}
        {!q.isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-gold/30 bg-card p-8 text-center text-maroon-deep/60"><Inbox className="mx-auto mb-2 h-8 w-8" /><p className="text-sm">No customers</p></div>
        )}

        <div className="space-y-3">
          {filtered.map((c: any, i: number) => {
            const init = (c.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
                <div className="flex gap-3 p-3">
                  <div className="text-display grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-saffron/40 to-gold/30 text-lg text-maroon">{init}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-display truncate text-sm text-maroon">{c.full_name ?? "—"}</h3>
                        <p className="truncate text-[10px] text-maroon-deep/60">{c.phone ?? ""} {c.email ? `• ${c.email}` : ""}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${c.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>{c.is_active ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                      <div className="rounded-lg bg-cream/60 px-1.5 py-1 text-center"><p className="text-maroon-deep/60">Orders</p><p className="text-display text-sm text-maroon">{c.total_orders}</p></div>
                      <div className="rounded-lg bg-cream/60 px-1.5 py-1 text-center"><p className="text-maroon-deep/60">Spend</p><p className="text-display text-sm text-saffron-deep">{fmt(c.total_spend)}</p></div>
                      <div className="rounded-lg bg-cream/60 px-1.5 py-1 text-center"><p className="text-maroon-deep/60">Last</p><p className="text-[10px] font-semibold text-maroon">{c.last_order ? new Date(c.last_order).toLocaleDateString() : "—"}</p></div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold">
                  <button onClick={() => setViewId(c.id)} className="rounded-lg py-1.5 text-maroon">Profile</button>
                  {canManage ? (
                    <button onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })} className={`rounded-lg py-1.5 ${c.is_active ? "text-red-700" : "text-emerald-700"}`}>
                      <Power className="mr-1 inline h-3 w-3" />{c.is_active ? "Deactivate" : "Activate"}
                    </button>
                  ) : (
                    <button onClick={() => toast.message("Marketing actions will be connected later.")} className="rounded-lg py-1.5 text-saffron-deep">Send Offer</button>
                  )}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewId(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Customer Profile</h2>
                <button onClick={() => setViewId(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gold/25 bg-card p-3">
                <div className="text-display grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-saffron/40 to-gold/30 text-xl text-maroon">
                  {(sel.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-display truncate text-lg text-maroon">{sel.full_name ?? "—"}</p>
                  <p className="truncate text-[11px] text-maroon-deep/60">{sel.phone ?? ""} {sel.email ? `• ${sel.email}` : ""}</p>
                  <span className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${sel.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>
                    <Crown className="h-2.5 w-2.5" /> {sel.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-gold/25 bg-card p-3"><p className="text-[10px] font-semibold uppercase text-maroon-deep/60">Lifetime Spend</p><p className="text-display text-lg text-maroon">{fmt(sel.total_spend)}</p></div>
                <div className="rounded-2xl border border-gold/25 bg-card p-3"><p className="text-[10px] font-semibold uppercase text-maroon-deep/60">Total Orders</p><p className="text-display text-lg text-maroon">{sel.total_orders}</p></div>
              </div>

              {profileQ.isLoading ? (
                <div className="mt-4 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-maroon" /></div>
              ) : profileQ.data ? (
                <>
                  <Section title="Addresses">
                    {(profileQ.data.addresses ?? []).length === 0 && <p className="text-[11px] text-maroon-deep/60">No addresses on file</p>}
                    {(profileQ.data.addresses ?? []).map((a: any) => (
                      <p key={a.id} className="text-[11px] text-maroon">• {a.address_label ? `${a.address_label}: ` : ""}{a.full_address}{a.city ? `, ${a.city}` : ""}</p>
                    ))}
                  </Section>
                  <Section title="Recent Orders">
                    {(profileQ.data.orders ?? []).slice(0, 10).map((o: any) => (
                      <p key={o.id} className="text-[11px] text-maroon">• {o.order_number} — {fmt(o.grand_total)} — {o.order_status}</p>
                    ))}
                    {(profileQ.data.orders ?? []).length === 0 && <p className="text-[11px] text-maroon-deep/60">No orders</p>}
                  </Section>
                  <Section title="Payment History">
                    {(profileQ.data.payments ?? []).slice(0, 10).map((p: any) => (
                      <p key={p.id} className="text-[11px] text-maroon">• {fmt(p.amount)} — {p.payment_mode ?? p.payment_status}</p>
                    ))}
                    {(profileQ.data.payments ?? []).length === 0 && <p className="text-[11px] text-maroon-deep/60">No payments</p>}
                  </Section>
                </>
              ) : null}

              {canManage && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => toggleMut.mutate({ id: sel.id, is_active: !sel.is_active })} className={`flex-1 rounded-xl py-3 text-sm font-semibold ${sel.is_active ? "border border-red-300 bg-red-50 text-red-700" : "bg-emerald-600 text-white"}`}>
                    {sel.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => toast.message("Marketing actions will be connected later.")} className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream">Send Offer</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl border border-gold/25 bg-card p-3">
      <p className="text-[10px] font-bold uppercase text-saffron-deep">{title}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

export default CustomersAdmin;
