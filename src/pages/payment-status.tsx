import { Link, useNavigate } from "react-router-dom";;
import { useRequireCustomer } from "@/lib/use-require-customer";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/react-start-mock";
import {
  CheckCircle2, XCircle, Loader2, ShoppingBag,
  RefreshCw, ReceiptText, MapPin,
} from "lucide-react";
import {
  getMyOrderDetail,
} from "@/lib/orders.functions";
import { verifyPhonePePayment } from "@/lib/payments.functions";
import { getMyInvoiceForOrder, generateMyInvoice } from "@/lib/invoices.functions";
import { clearCart } from "@/lib/cart-store";
import { clearCheckout } from "@/lib/checkout-store";
import { toast } from "sonner";

type Search = { orderId?: string; method?: "phonepe" | "upi" | "cod" };



function PaymentStatusScreen() {
  const ready = useRequireCustomer();
  const { orderId, method } = Route.useSearch();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getMyOrderDetail);
  const verifyPhonePe = useServerFn(verifyPhonePePayment);
  const fetchInvoice = useServerFn(getMyInvoiceForOrder);
  const regenInvoice = useServerFn(generateMyInvoice);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Awaited<ReturnType<typeof fetchDetail>> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [invoice, setInvoice] = useState<Awaited<ReturnType<typeof fetchInvoice>>["invoice"] | null>(null);
  const [invLoading, setInvLoading] = useState(false);

  const isCod = method === "cod";
  const isOnline = method === "phonepe" || method === "upi";

  const refresh = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      const data = await fetchDetail({ data: { orderId } });
      setOrder(data);
      setError(null);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  };

  const runVerify = async (silent = false) => {
    if (!orderId || !isOnline) return;
    setVerifying(true);
    try {
      const res = await verifyPhonePe({ data: { orderId } });
      const d = await refresh();
      if (!silent) {
        if (res.paymentStatus === "success") toast.success("Payment confirmed");
        else if (res.paymentStatus === "failed") toast.error("Payment failed");
        else toast.message("Payment still pending");
      }
      return d;
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (!orderId) { navigate("/cart", { replace: true }); return; }
    (async () => {
      const d = await refresh();
      // If we just returned from PhonePe and still pending, hit verify.
      if (d && isOnline && d.order.paymentStatus === "pending") {
        await runVerify(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, orderId]);

  // Auto-clear cart for COD or paid orders.
  useEffect(() => {
    if (order && (order.order.paymentStatus === "cash_on_delivery" || order.order.paymentStatus === "paid")) {
      clearCart();
      clearCheckout();
    }
  }, [order]);

  // Fetch invoice whenever the order becomes invoice-eligible.
  const eligible =
    order &&
    (order.order.paymentStatus === "paid" || order.order.paymentStatus === "cash_on_delivery");
  useEffect(() => {
    if (!eligible || !orderId) return;
    let cancelled = false;
    (async () => {
      try {
        setInvLoading(true);
        const res = await fetchInvoice({ data: { orderId } });
        if (!cancelled) setInvoice(res.invoice);
      } catch { /* ignore */ }
      finally { if (!cancelled) setInvLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, orderId]);

  const refreshInvoice = async () => {
    if (!orderId) return;
    setInvLoading(true);
    try {
      const res = await fetchInvoice({ data: { orderId } });
      setInvoice(res.invoice);
      if (!res.invoice) toast.message("Invoice is still being generated.");
    } finally { setInvLoading(false); }
  };

  const regenerate = async () => {
    if (!orderId) return;
    setInvLoading(true);
    try {
      await regenInvoice({ data: { orderId } });
      const res = await fetchInvoice({ data: { orderId } });
      setInvoice(res.invoice);
      toast.success("Invoice ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate invoice");
    } finally { setInvLoading(false); }
  };

  if (!ready) return null;

  if (loading || !order) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron-deep" />
          <p className="mt-3 text-sm text-maroon-deep/70">{error ?? "Loading order…"}</p>
        </div>
      </main>
    );
  }

  const ps = order.order.paymentStatus;
  const status: "processing" | "success" | "failed" | "cod" =
    ps === "paid" ? "success" :
    ps === "failed" ? "failed" :
    ps === "cash_on_delivery" ? "cod" : "processing";

  return (
    <main className="min-h-screen bg-cream pb-20">
      <header className="border-b border-gold/20 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl">
          <h1 className="text-display text-lg text-maroon">Payment Status</h1>
          <p className="text-[11px] text-maroon-deep/60">Order {order.order.orderNumber}</p>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-5 px-4 py-6 sm:max-w-lg">
        {status === "processing" && (
          <StateCard
            icon={<Loader2 className="h-12 w-12 animate-spin text-saffron-deep" />}
            title="Payment Processing"
            subtitle="We are waiting for PhonePe to confirm your payment."
            color="border-saffron/30 bg-saffron/10"
          >
            <div className="mt-4">
              <button onClick={() => runVerify(false)} disabled={verifying}
                className="w-full rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream disabled:opacity-50">
                {verifying ? "Checking…" : "Check Payment Status"}
              </button>
            </div>
          </StateCard>
        )}
        {status === "success" && (
          <StateCard
            icon={<CheckCircle2 className="h-12 w-12 text-emerald-600" />}
            title="Payment Successful"
            subtitle="Your order has been received and is being prepared."
            color="border-emerald-200 bg-emerald-50"
          />
        )}
        {status === "failed" && (
          <StateCard
            icon={<XCircle className="h-12 w-12 text-red-600" />}
            title="Payment Failed"
            subtitle="The payment could not be completed. You can retry below."
            color="border-red-200 bg-red-50"
          >
            <div className="mt-4 flex gap-2">
              <button onClick={() => navigate("/checkout")}
                className="rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream">Retry Payment</button>
              <Link to="/cart" className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">Back To Cart</Link>
            </div>
          </StateCard>
        )}
        {status === "cod" && (
          <StateCard
            icon={<CheckCircle2 className="h-12 w-12 text-emerald-600" />}
            title="Order Placed Successfully"
            subtitle="Pay cash on delivery when your order arrives."
            color="border-emerald-200 bg-emerald-50"
          />
        )}

        <div className="rounded-2xl border border-gold/25 bg-card p-4">
          <p className="text-display text-base text-maroon">{order.outlet?.outlet_name ?? "Outlet"}</p>
          {order.outlet?.address && <p className="mt-0.5 flex items-start gap-1 text-xs text-maroon-deep/60"><MapPin className="mt-0.5 h-3 w-3" />{order.outlet.address}</p>}
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-maroon-deep/70">Amount</span>
            <span className="text-display text-lg text-maroon">₹{order.order.grandTotal}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-maroon-deep/70">Payment method</span>
            <span className="font-semibold text-maroon">{isCod ? "Cash On Delivery" : "PhonePe / UPI"}</span>
          </div>
        </div>

        {eligible && (
          <div className="rounded-2xl border border-gold/25 bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-display text-sm text-maroon">Invoice</p>
              {invLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-saffron-deep" />}
            </div>
            {invoice ? (
              <>
                <p className="text-xs text-maroon-deep/70">No. <span className="font-semibold text-maroon">{invoice.invoice_number}</span></p>
                <p className="mt-0.5 text-[11px] text-maroon-deep/60">
                  Generated {new Date(invoice.generated_at).toLocaleString()}
                </p>
                <div className="mt-3 flex gap-2">
                  {invoice.invoice_url ? (
                    <a href={invoice.invoice_url} target="_blank" rel="noreferrer"
                       className="flex-1 rounded-xl bg-saffron px-3 py-2 text-center text-xs font-semibold text-cream">
                      Download Invoice
                    </a>
                  ) : (
                    <button disabled
                       className="flex-1 rounded-xl bg-saffron/40 px-3 py-2 text-xs font-semibold text-cream/80">
                      PDF coming soon
                    </button>
                  )}
                  <button onClick={refreshInvoice} className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
                    Refresh
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-maroon-deep/70">
                  Invoice is being generated. Please refresh in a few seconds.
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={refreshInvoice} disabled={invLoading}
                    className="flex-1 rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60">
                    Refresh Invoice
                  </button>
                  <button onClick={regenerate} disabled={invLoading}
                    className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate(`/customer/order/${order.order.id }`)}
            className="flex items-center justify-center gap-2 rounded-xl bg-maroon px-3 py-2 text-xs font-semibold text-cream">
            <ReceiptText className="h-3.5 w-3.5" /> Track Order
          </button>
          <Link to="/customer/my-orders"
            className="flex items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
            My Orders
          </Link>
          <Link to="/customer/menu"
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon">
            <ShoppingBag className="h-3.5 w-3.5" /> Continue Shopping
          </Link>
          <button onClick={refresh}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-cream-warm/40 px-3 py-2 text-[11px] font-medium text-maroon-deep/70">
            <RefreshCw className="h-3 w-3" /> Refresh status
          </button>
        </div>
      </div>
    </main>
  );
}

function StateCard({
  icon, title, subtitle, color, children,
}: { icon: React.ReactNode; title: string; subtitle: string; color: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border p-6 text-center ${color}`}>
      <div className="grid place-items-center">{icon}</div>
      <p className="text-display mt-4 text-xl text-maroon">{title}</p>
      <p className="mt-1 text-xs text-maroon-deep/70">{subtitle}</p>
      {children}
    </div>
  );
}
export default PaymentStatusScreen;
