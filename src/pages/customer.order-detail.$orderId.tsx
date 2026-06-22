import { Link, useNavigate, useParams } from "react-router-dom";
import { useRequireCustomer } from "@/lib/use-require-customer";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/react-start-mock";
import {
  ArrowLeft, RefreshCw, Loader2, MapPin, Phone, Navigation, ChefHat,
  ReceiptText, RotateCcw, HelpCircle, Download, CheckCircle2, XCircle,
  CreditCard,
} from "lucide-react";
import { getMyOrderDetail } from "@/lib/orders.functions";
import { toast } from "sonner";



type Detail = Awaited<ReturnType<typeof getMyOrderDetail>>;

const TIMELINE_STEPS = [
  { key: "order_received", label: "Order Received" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "preparing", label: "Preparing Food" },
  { key: "ready", label: "Ready For Dispatch" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

function timelineState(detail: Detail) {
  const reached = new Set<string>();
  for (const h of detail.history) reached.add(h.new_status);
  if (detail.order.paymentStatus === "paid" || detail.order.paymentStatus === "cash_on_delivery") reached.add("payment_confirmed");
  // current = latest status
  const current = detail.order.orderStatus;
  return { reached, current };
}

function OrderDetailScreen() {
  const ready = useRequireCustomer();
  const navigate = useNavigate();
  const { orderId = "" } = useParams<{ orderId: string }>();
  const fetchDetail = useServerFn(getMyOrderDetail);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setData(await fetchDetail({ data: { orderId } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load order"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (ready) load(); /* eslint-disable-next-line */ }, [ready, orderId]);

  if (!ready) return null;

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream">
        <Loader2 className="h-8 w-8 animate-spin text-saffron-deep" />
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">{error ?? "Order not found or access denied."}</p>
          <Link to="/customer/my-orders" className="mt-4 inline-block rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const { order, outlet, address, items, history, payments, invoice } = data;
  const { reached, current } = timelineState(data);
  const latestPayment = payments[0] ?? null;
  const isDelivered = order.orderStatus === "delivered" || order.orderStatus === "completed";
  const isCancelled = order.orderStatus === "cancelled";

  return (
    <main className="min-h-screen bg-cream pb-20">
      <header className="sticky top-0 z-30 border-b border-gold/20 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/customer/my-orders" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display text-lg leading-tight text-maroon">{order.orderNumber}</h1>
            <p className="truncate text-[11px] text-maroon-deep/60 capitalize">
              {order.orderType.replace("_", " ")} {order.tableNumber && `· Table ${order.tableNumber}`} · {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <button onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-5 px-4 py-4 sm:max-w-lg">
        {/* Delivered / Cancelled banner */}
        {isDelivered && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="text-display mt-2 text-base text-maroon">Delivered Successfully</p>
            <p className="text-[11px] text-maroon-deep/60">Thank you for choosing Kosia Rajula Ruchulu.</p>
            <button onClick={() => toast.message("Review feature coming soon")} className="mt-3 rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">
              Write Review
            </button>
          </div>
        )}
        {isCancelled && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-semibold text-red-700">Order Cancelled</p>
            </div>
            {order.cancellationReason && <p className="mt-1 text-xs text-red-700/80">Reason: {order.cancellationReason}</p>}
            {order.paymentStatus === "refunded" && <p className="mt-1 text-xs text-red-700/80">Refund issued: ₹{order.grandTotal}</p>}
          </div>
        )}

        {/* Timeline */}
        <Section title="Order Status">
          <div className="rounded-2xl border border-gold/25 bg-card p-4">
            <ol className="relative space-y-4 pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gold/20" />
              {TIMELINE_STEPS.map((s) => {
                const done = reached.has(s.key);
                const isCurrent = s.key === current;
                return (
                  <li key={s.key} className="relative">
                    <span className={`absolute -left-6 grid h-4 w-4 place-items-center rounded-full ${
                      done ? "bg-saffron text-cream" : "bg-gold/20 text-maroon-deep/40"
                    } ${isCurrent ? "ring-2 ring-saffron/40" : ""}`}>
                      {done && <span className="h-1.5 w-1.5 rounded-full bg-cream" />}
                    </span>
                    <p className={`text-xs font-semibold ${done ? "text-maroon" : "text-maroon-deep/40"}`}>{s.label}</p>
                    {(() => {
                      const h = history.find((x) => x.new_status === s.key);
                      return h ? <p className="text-[10px] text-maroon-deep/50">{new Date(h.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p> : null;
                    })()}
                  </li>
                );
              })}
            </ol>
          </div>
        </Section>

        {/* Outlet */}
        {outlet && (
          <Section title="Outlet">
            <div className="rounded-2xl border border-gold/25 bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-maroon">{outlet.outlet_name}</p>
                  <p className="mt-0.5 text-xs text-maroon-deep/70">{outlet.address}</p>
                  <p className="text-[11px] text-maroon-deep/50">{[outlet.city, outlet.state, outlet.pincode].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {outlet.phone && (
                  <a href={`tel:${outlet.phone}`} className="flex items-center justify-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
                    <Phone className="h-3.5 w-3.5" /> Call Outlet
                  </a>
                )}
                <a href={`https://maps.google.com/?q=${encodeURIComponent(`${outlet.outlet_name} ${outlet.address ?? ""}`)}`} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
                  <Navigation className="h-3.5 w-3.5" /> Get Directions
                </a>
              </div>
            </div>
          </Section>
        )}

        {/* Delivery / pickup / dine-in */}
        {order.orderType === "delivery" && address && (
          <Section title="Delivery Address">
            <div className="rounded-2xl border border-gold/25 bg-card p-3">
              <p className="text-sm font-semibold text-maroon">{address.address_label ?? "Address"}</p>
              <p className="mt-0.5 text-xs text-maroon-deep/70">{address.full_address}</p>
              <p className="text-[11px] text-maroon-deep/50">{[address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
            </div>
          </Section>
        )}

        {/* Items */}
        <Section title="Items">
          <div className="rounded-2xl border border-gold/25 bg-card divide-y divide-gold/15">
            {items.map((it) => (
              <div key={it.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-saffron/30 to-maroon/20 text-maroon/40">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-maroon">{it.itemName} <span className="text-[11px] text-maroon-deep/60">× {it.quantity}</span></p>
                    <p className="text-[11px] text-maroon-deep/60">{it.variantName} · ₹{it.unitPrice} each</p>
                    {it.addons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {it.addons.map((a, idx) => (
                          <span key={idx} className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-maroon">+ {a.name} × {a.quantity} ₹{a.price}</span>
                        ))}
                      </div>
                    )}
                    {it.specialInstructions && <p className="mt-1 text-[11px] italic text-maroon-deep/60">Note: {it.specialInstructions}</p>}
                  </div>
                  <p className="text-sm font-bold text-maroon">₹{it.totalPrice}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Payment */}
        <Section title="Payment">
          <div className="rounded-2xl border border-gold/25 bg-card p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-saffron-deep" />
              <p className="text-sm font-semibold text-maroon capitalize">{order.paymentStatus.replace("_", " ")}</p>
            </div>
            {latestPayment && (
              <div className="mt-2 space-y-1 text-[11px] text-maroon-deep/70">
                <p>Gateway: {latestPayment.payment_gateway} · {latestPayment.payment_mode ?? "—"}</p>
                {latestPayment.transaction_id && <p>Txn: {latestPayment.transaction_id}</p>}
                {latestPayment.merchant_transaction_id && <p>Merchant Txn: {latestPayment.merchant_transaction_id}</p>}
                <p>Amount: ₹{latestPayment.amount}</p>
                {latestPayment.paid_at && <p>Paid at: {new Date(latestPayment.paid_at).toLocaleString("en-IN")}</p>}
              </div>
            )}
            {order.paymentStatus === "failed" && (
              <button onClick={() => navigate("/checkout")}
                className="mt-3 rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream">Retry Payment</button>
            )}
          </div>
        </Section>

        {/* Bill */}
        <Section title="Bill Summary">
          <div className="rounded-2xl border border-gold/25 bg-card p-4 space-y-1 text-sm">
            <Row label="Subtotal" value={`₹${order.subtotal}`} />
            {order.discountAmount > 0 && <Row label="Discount" value={`-₹${order.discountAmount}`} accent />}
            <Row label="Taxes" value={`₹${order.taxAmount}`} />
            <Row label="Delivery" value={`₹${order.deliveryCharge}`} />
            <div className="my-2 border-t border-dashed border-gold/40" />
            <Row label="Grand Total" value={`₹${order.grandTotal}`} bold />
          </div>
        </Section>

        {/* Invoice */}
        <Section title="Invoice">
          <div className="rounded-2xl border border-gold/25 bg-card p-3">
            {invoice ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-maroon">{invoice.invoice_number}</p>
                  <p className="text-[11px] text-maroon-deep/60">₹{invoice.invoice_amount} · {new Date(invoice.generated_at).toLocaleDateString("en-IN")}</p>
                </div>
                {invoice.invoice_url ? (
                  <a href={invoice.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-maroon px-3 py-2 text-xs font-semibold text-cream">
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                ) : (
                  <button onClick={() => toast.message("Invoice file not available")} className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">Preview</button>
                )}
              </div>
            ) : (
              <p className="text-xs text-maroon-deep/60">Invoice will be available after order confirmation.</p>
            )}
          </div>
        </Section>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => toast.message("Reorder will be available after cart validation is connected.")}
            className="flex items-center justify-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
            <RotateCcw className="h-3.5 w-3.5" /> Reorder
          </button>
          <button onClick={() => toast.message("Support coming soon")}
            className="flex items-center justify-center gap-1 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
            <HelpCircle className="h-3.5 w-3.5" /> Need Help
          </button>
          <Link to="/customer/my-orders" className="col-span-2 flex items-center justify-center gap-1 rounded-xl bg-cream-warm/40 px-3 py-2 text-xs font-semibold text-maroon-deep">
            <ReceiptText className="h-3.5 w-3.5" /> All Orders
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-display text-base text-maroon">{title}</h3>
      {children}
    </section>
  );
}
function Row({ label, value, accent, bold }: { label: string; value: string; accent?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={bold ? "text-display text-base text-maroon" : "text-maroon-deep/70"}>{label}</span>
      <span className={`${accent ? "font-semibold text-emerald-700" : bold ? "text-display text-lg text-maroon" : "font-medium text-maroon"}`}>{value}</span>
    </div>
  );
}
export default OrderDetailScreen;
