import { Link, useNavigate } from "react-router-dom";;
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell, ShoppingBag, Utensils, TrendingUp, AlertTriangle, Store,
  FileText, BarChart3, CreditCard, Tag, Eye, LogOut, Loader2, Upload,
} from "lucide-react";
import { AdminGuard, adminSignOut } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ORDER_STATUS_BUCKETS, NEW_ORDER_STATUSES,
  bucketOrderCounts, computeEarnedRevenue, assertOrderStatus,
} from "@/lib/order-status";
import { StatusLegend } from "@/components/admin/StatusLegend";
import kostaLogo from "@/assets/kosta-rajula-ruchulu-logo.asset.json";



type OrderRow = {
  id: string;
  order_number: string | null;
  outlet_id: string | null;
  order_status: string;
  payment_status: string | null;
  grand_total: number | null;
  created_at: string;
  customers?: { full_name: string | null } | null;
};
type Outlet = { id: string; outlet_name: string };

function startOfDayISO(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}
function fmtINR(n: number | null | undefined) {
  return `₹${(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "just now";
  if (diff < 60) return `${Math.floor(diff)}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [outletId, setOutletId] = useState<string>("");

  const { data: outlets = [] } = useQuery<Outlet[]>({
    queryKey: ["admin", "outlets", "compact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outlets")
        .select("id, outlet_name")
        .eq("is_active", true)
        .order("outlet_name");
      if (error) throw error;
      return (data ?? []) as Outlet[];
    },
  });

  const { data: todayOrders = [], isLoading } = useQuery<OrderRow[]>({
    queryKey: ["admin", "dashboard", "today", outletId],
    queryFn: async () => {
      let qry = supabase
        .from("orders")
        .select("id, order_number, outlet_id, order_status, payment_status, grand_total, created_at, customers(full_name)")
        .gte("created_at", startOfDayISO())
        .order("created_at", { ascending: false });
      if (outletId) qry = qry.eq("outlet_id", outletId);
      const { data, error } = await qry;
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
    refetchInterval: 30000,
  });

  const { data: recent = [] } = useQuery<OrderRow[]>({
    queryKey: ["admin", "dashboard", "recent", outletId],
    queryFn: async () => {
      let qry = supabase
        .from("orders")
        .select("id, order_number, outlet_id, order_status, payment_status, grand_total, created_at, customers(full_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (outletId) qry = qry.eq("outlet_id", outletId);
      const { data, error } = await qry;
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
    refetchInterval: 30000,
  });

  const { data: customerCount } = useQuery<number>({
    queryKey: ["admin", "dashboard", "customers"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: itemCount } = useQuery<number>({
    queryKey: ["admin", "dashboard", "items"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("is_deleted", false)
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = useMemo(() => {
    const buckets = bucketOrderCounts(todayOrders);
    const { revenue, avg } = computeEarnedRevenue(todayOrders);
    return {
      total: todayOrders.length,
      revenue,
      avg,
      ...buckets,
    };
  }, [todayOrders]);

  const newCount = useMemo(
    () =>
      todayOrders.filter((o) => {
        const s = assertOrderStatus(o.order_status, "dashboard.new");
        return s !== null && NEW_ORDER_STATUSES.includes(s);
      }).length,
    [todayOrders],
  );

  const outletPerf = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; revenue: number }>();
    outlets.forEach((o) => map.set(o.id, { name: o.outlet_name, orders: 0, revenue: 0 }));
    todayOrders.forEach((o) => {
      if (!o.outlet_id) return;
      const r = map.get(o.outlet_id);
      if (!r) return;
      r.orders += 1;
      r.revenue += Number(o.grand_total) || 0;
    });
    return Array.from(map.values()).filter((r) => r.orders > 0).sort((a, b) => b.revenue - a.revenue);
  }, [outlets, todayOrders]);

  const maxOutletRev = Math.max(1, ...outletPerf.map((o) => o.revenue));

  const handleLogout = async () => {
    await adminSignOut();
    toast.success("Signed out");
    navigate("/admin/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-cream pb-8">
      <header className="header-gradient sticky top-12 z-20 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3 md:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gold/40 bg-cream">
            <img src={kostaLogo.url} alt="Kosta Rajula Ruchulu" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-display text-base leading-tight text-maroon">Admin Dashboard</p>
            <p className="text-[10px] text-maroon-deep/60">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="hidden rounded-full border border-gold/40 bg-card px-3 py-1.5 text-xs text-maroon sm:block">
            <option value="">All Outlets</option>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.outlet_name}</option>)}
          </select>
          <button onClick={handleLogout} title="Sign out" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 text-maroon">
            <LogOut className="h-4 w-4" />
          </button>
          <button className="relative hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/40 text-maroon sm:grid">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-saffron" />
          </button>
        </div>
        <div className="mx-auto mt-2 w-full max-w-6xl sm:hidden">
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full rounded-full border border-gold/40 bg-card px-3 py-1.5 text-xs text-maroon">
            <option value="">All Outlets</option>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.outlet_name}</option>)}
          </select>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-4">
        <section>
          <SectionHead title="Today" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            <KPI label="Orders Today" value={String(stats.total)} tone="saffron" />
            <KPI label="Revenue Today" value={fmtINR(stats.revenue)} tone="maroon" />
            <KPI label="Pending" value={String(stats.pending)} tone="amber" />
            <KPI label="Preparing" value={String(stats.preparing)} tone="blue" />
            <KPI label="Completed" value={String(stats.completed)} tone="emerald" />
          </div>
        </section>

        <section>
          <SectionHead title="Order Status Board" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { l: "New", v: newCount, c: "bg-saffron/15 text-saffron-deep" },
              { l: "Preparing", v: stats.preparing, c: "bg-amber-500/15 text-amber-700" },
              { l: "Ready", v: stats.ready, c: "bg-blue-500/15 text-blue-700" },
              { l: "Out for Delivery", v: stats.out, c: "bg-indigo-500/15 text-indigo-700" },
              { l: "Completed", v: stats.completed, c: "bg-emerald-500/15 text-emerald-700" },
              { l: "Cancelled", v: stats.cancelled, c: "bg-red-500/15 text-red-700" },
            ].map((s) => (
              <div key={s.l} className={`shrink-0 rounded-2xl px-4 py-3 text-center ${s.c}`}>
                <p className="text-display text-lg leading-none">{s.v}</p>
                <p className="mt-1 text-[10px] font-semibold">{s.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <StatusLegend />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-maroon to-maroon-deep p-5 text-cream shadow lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-cream/60">Today's Revenue</p>
                <p className="text-display mt-1 text-3xl">{fmtINR(stats.revenue)}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-300">
                  <TrendingUp className="h-3 w-3" /> Avg order {fmtINR(stats.avg)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-saffron" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div><p className="text-cream/60">Orders</p><p className="font-bold">{stats.total}</p></div>
              <div><p className="text-cream/60">Completed</p><p className="font-bold">{stats.completed}</p></div>
              <div><p className="text-cream/60">Cancelled</p><p className="font-bold">{stats.cancelled}</p></div>
            </div>
          </div>

          <div className="rounded-3xl border border-gold/25 bg-card p-4 shadow">
            <p className="text-[11px] uppercase tracking-wider text-maroon-deep/60">Catalog</p>
            <div className="mt-2 space-y-2">
              <Mini label="Active Menu Items" value={String(itemCount ?? "…")} />
              <Mini label="Customers" value={String(customerCount ?? "…")} />
              <Mini label="Outlets" value={String(outlets.length)} />
            </div>
          </div>
        </section>

        <section>
          <SectionHead title="Quick Actions" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
            {[
              { i: ShoppingBag, l: "Orders", to: "/admin/orders" },
              { i: Utensils, l: "Items", to: "/admin/items" },
              { i: Tag, l: "Categories", to: "/admin/categories" },
              { i: CreditCard, l: "Pricing", to: "/admin/pricing" },
              { i: Store, l: "Outlets", to: "/admin/outlets" },
              { i: FileText, l: "Reports", to: "/admin/reports" },
              { i: Upload, l: "Bulk Upload", to: "/admin/bulk-upload" },
            ].map(({ i: Icon, l, to }) => (
              <Link key={l} to={to} className="flex flex-col items-center gap-1.5 rounded-2xl border border-gold/25 bg-card p-3 shadow-sm hover:bg-saffron/5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-saffron/15 text-saffron-deep">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-semibold text-maroon">{l}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <SectionHead title="Recent Orders" action={<Link to="/admin/orders" className="text-[11px] font-semibold text-saffron-deep">View All</Link>} />
            {isLoading && <div className="flex items-center justify-center gap-2 py-8 text-sm text-maroon-deep/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
            {!isLoading && recent.length === 0 && <div className="rounded-2xl border border-dashed border-gold/30 bg-card p-6 text-center text-xs text-maroon-deep/60">No recent orders</div>}
            <div className="space-y-2">
              {recent.map((o) => (
                <Link key={o.id} to="/admin/orders" className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-card p-3 shadow-sm hover:bg-saffron/5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-saffron/15 text-saffron-deep">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-maroon">{o.order_number ?? o.id.slice(0, 8)} • {o.customers?.full_name ?? "Guest"}</p>
                    <p className="text-[10px] text-maroon-deep/60">{o.order_status.replace(/_/g, " ")} • {timeAgo(o.created_at)}</p>
                  </div>
                  <p className="text-display text-sm text-maroon">{fmtINR(o.grand_total)}</p>
                  <Eye className="h-3.5 w-3.5 text-maroon-deep/60" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <SectionHead title="Outlet Performance — Today" />
            {outletPerf.length === 0 && <div className="rounded-2xl border border-dashed border-gold/30 bg-card p-6 text-center text-xs text-maroon-deep/60">No outlet activity today</div>}
            <div className="space-y-2">
              {outletPerf.map((x) => (
                <div key={x.name} className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-maroon">{x.name}</p>
                    <p className="text-display text-base text-maroon">{fmtINR(x.revenue)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-maroon-deep/60">
                    <span>{x.orders} orders</span>
                    <span>Avg {fmtINR(Math.round(x.revenue / Math.max(1, x.orders)))}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gold/20">
                    <div className="h-full rounded-full bg-gradient-to-r from-saffron to-saffron-deep" style={{ width: `${(x.revenue / maxOutletRev) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {stats.pending > 0 && (
          <section>
            <SectionHead title="Needs Attention" />
            <Alert icon={AlertTriangle} title={`${stats.pending} order${stats.pending === 1 ? "" : "s"} pending`} desc="Review and confirm new orders" tone="amber" />
          </section>
        )}
      </div>
    </main>
  );
}

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-display text-base text-maroon">{title}</h2>
      {action}
    </div>
  );
}
function KPI({ label, value, tone, className }: { label: string; value: string; tone: string; className?: string }) {
  const map: Record<string, string> = {
    saffron: "from-saffron/20 to-saffron/5 text-saffron-deep",
    maroon: "from-maroon/15 to-maroon/5 text-maroon",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-700",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
  };
  return (
    <div className={`rounded-2xl border border-gold/25 bg-gradient-to-br ${map[tone]} p-3 shadow-sm ${className ?? ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-display mt-1 text-2xl">{value}</p>
    </div>
  );
}
function Alert({ icon: Icon, title, desc, tone }: { icon: typeof AlertTriangle; title: string; desc: string; tone: "amber" | "red" | "emerald" }) {
  const c = tone === "amber" ? "bg-amber-500/15 text-amber-700"
         : tone === "red" ? "bg-red-500/15 text-red-700"
         : "bg-emerald-500/15 text-emerald-700";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${c}`}><Icon className="h-4 w-4" /></div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-maroon">{title}</p>
        <p className="text-[11px] text-maroon-deep/60">{desc}</p>
      </div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-cream/60 p-2">
      <p className="text-[10px] uppercase tracking-wider text-maroon-deep/60">{label}</p>
      <p className="text-display text-xl text-maroon">{value}</p>
    </div>
  );
}

export default AdminDashboard;
