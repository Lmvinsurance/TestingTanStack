import { Link, useNavigate } from "react-router-dom";;
import { useRequireCustomer } from "@/lib/use-require-customer";
import { CustomerSignOutButton } from "@/components/customer/CustomerSignOutButton";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@/lib/react-start-mock";
import {
  ArrowLeft, Search, Loader2, ShoppingBag, RefreshCw, MapPin,
  ReceiptText, RotateCcw, Eye, Download,
} from "lucide-react";
import { getMyOrders } from "@/lib/orders.functions";
import { toast } from "sonner";



type Order = Awaited<ReturnType<typeof getMyOrders>>["orders"][number];

const TABS = ["All", "Active", "Completed", "Cancelled", "Refunded"] as const;
type Tab = (typeof TABS)[number];

const ACTIVE_STATUSES = new Set(["pending_payment", "order_received", "preparing", "ready", "out_for_delivery"]);
const COMPLETED_STATUSES = new Set(["completed", "delivered"]);

function statusBadge(s: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    pending_payment: { label: "Pending Payment", cls: "bg-amber-100 text-amber-800" },
    order_received: { label: "Order Received", cls: "bg-saffron/15 text-saffron-deep" },
    preparing: { label: "Preparing", cls: "bg-saffron/20 text-saffron-deep" },
    ready: { label: "Ready", cls: "bg-emerald-100 text-emerald-700" },
    out_for_delivery: { label: "Out for Delivery", cls: "bg-blue-100 text-blue-700" },
    delivered: { label: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
    completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
    refunded: { label: "Refunded", cls: "bg-purple-100 text-purple-700" },
  };
  return map[s] ?? { label: s, cls: "bg-gold/20 text-maroon-deep" };
}

function MyOrdersScreen() {
  const ready = useRequireCustomer();
  const navigate = useNavigate();
  const fetchOrders = useServerFn(getMyOrders);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("All");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true); setError(null);
    try { const r = await fetchOrders(); setOrders(r.orders); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load orders"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (ready) load(); /* eslint-disable-next-line */ }, [ready]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (tab === "Active" && !ACTIVE_STATUSES.has(o.orderStatus)) return false;
      if (tab === "Completed" && !COMPLETED_STATUSES.has(o.orderStatus)) return false;
      if (tab === "Cancelled" && o.orderStatus !== "cancelled") return false;
      if (tab === "Refunded" && o.orderStatus !== "refunded") return false;
      if (!term) return true;
      return (
        o.orderNumber.toLowerCase().includes(term) ||
        o.outletName.toLowerCase().includes(term) ||
        o.firstItems.some((n) => n.toLowerCase().includes(term))
      );
    });
  }, [orders, tab, q]);

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/customer/menu" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-display flex-1 text-lg text-maroon">My Orders</h1>
          <button onClick={load} aria-label="Refresh"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <CustomerSignOutButton />
        </div>
        <div className="mx-auto mt-3 w-full max-w-6xl">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-maroon-deep/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by order number, item or outlet"
              className="w-full rounded-xl border border-gold/30 bg-cream-warm/30 py-2 pl-9 pr-3 text-sm placeholder:text-maroon-deep/40 focus:border-saffron focus:outline-none" />
          </div>
          <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  tab === t ? "bg-saffron text-cream" : "bg-card text-maroon-deep/70 border border-gold/30"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4 sm:max-w-lg">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gold/10" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>
            <button onClick={load} className="mt-3 rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-cream">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              subtitle="Start exploring authentic Telugu food."
              cta={<Link to="/customer/menu" className="rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">Browse Menu</Link>}
            />
          ) : (
            <EmptyState title="No orders found" subtitle="No orders match your search or selected filters." />
          )
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const sb = statusBadge(o.orderStatus);
              return (
                <div key={o.id} className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-display text-sm text-maroon">{o.orderNumber}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-maroon-deep/60">
                        <MapPin className="h-3 w-3" /> {o.outletName} · <span className="capitalize">{o.orderType.replace("_", " ")}</span>
                        {o.tableNumber && <span>· Table {o.tableNumber}</span>}
                      </p>
                      <p className="text-[10px] text-maroon-deep/50">
                        {new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-display text-base text-maroon">₹{o.grandTotal}</p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${sb.cls}`}>
                        {sb.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 rounded-xl bg-cream-warm/40 p-2 text-[11px] text-maroon-deep/70">
                    {o.firstItems.join(" · ") || "—"}
                    {o.itemCount > o.firstItems.length && <span className="text-maroon-deep/50"> + {o.itemCount - o.firstItems.length} more</span>}
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px] font-semibold">
                    <button onClick={() => navigate(`/customer/order/${o.id }`)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-saffron px-2 py-1.5 text-cream"><ReceiptText className="h-3 w-3" />Track</button>
                    <button onClick={() => navigate(`/customer/order/${o.id }`)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-gold/40 px-2 py-1.5 text-maroon"><Eye className="h-3 w-3" />Details</button>
                    <button onClick={() => { toast.message("Reorder will be available after cart validation is connected."); navigate("/customer/menu"); }}
                      className="flex items-center justify-center gap-1 rounded-lg border border-gold/40 px-2 py-1.5 text-maroon"><RotateCcw className="h-3 w-3" />Reorder</button>
                    <button onClick={() => toast.message("Invoice not generated yet.")}
                      className="flex items-center justify-center gap-1 rounded-lg border border-gold/40 px-2 py-1.5 text-maroon"><Download className="h-3 w-3" />Invoice</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ title, subtitle, cta }: { title: string; subtitle: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-gold/40 bg-card p-10 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <p className="text-display mt-4 text-base text-maroon">{title}</p>
      <p className="mt-1 text-xs text-maroon-deep/60">{subtitle}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
export default MyOrdersScreen;
