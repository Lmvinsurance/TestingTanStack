import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useRequireCustomer } from "@/lib/use-require-customer";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/react-start-mock";
import {
  CheckCircle2, XCircle, Loader2, ShoppingBag,
  RefreshCw, ReceiptText, MapPin,
} from "lucide-react";
import {
  getMyOrderDetail,
  updateCustomerPaymentStatus,
  updateOrderStatus,
} from "@/lib/orders.functions";
import { verifyPhonePePayment } from "@/lib/payments.functions";
import { getMyInvoiceForOrder, generateMyInvoice, getMyInvoiceOrderDetails, updateMyInvoiceUrl } from "@/lib/invoices.functions";
import { clearCart } from "@/lib/cart-store";
import { clearCheckout } from "@/lib/checkout-store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildPdfBlob } from "@/components/invoice-pdf";

type Search = { orderId?: string; method?: "phonepe" | "upi" | "cod" };

function PaymentStatusScreen() {
  const ready = useRequireCustomer();
  const [sp] = useSearchParams();
  const orderId = sp.get("orderId") || undefined;
  const method = (sp.get("method") as "phonepe" | "upi" | "cod" | null) || undefined;
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getMyOrderDetail);
  const verifyPhonePe = useServerFn(verifyPhonePePayment);
  const fetchInvoice = useServerFn(getMyInvoiceForOrder);
  const regenInvoice = useServerFn(generateMyInvoice);
  const fetchRawDetails = useServerFn(getMyInvoiceOrderDetails);
  const updateInvoiceUrl = useServerFn(updateMyInvoiceUrl);
  const updatePayment = useServerFn(updateCustomerPaymentStatus);
  const updateOrder = useServerFn(updateOrderStatus);

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
    if (!orderId || !isOnline) {
      console.log("Cannot verify: missing orderId or not online payment");
      return;
    }
    
    setVerifying(true);
    console.log("Starting payment verification for order:", orderId);
    
    try {
      let statusResult = "pending";
      
      // Get merchant transaction ID from URL
      let mTxnId = sp.get("merchantTxnId");
      
      // If not in URL, try to get from order's payment record
      if (!mTxnId && order?.payments?.[0]?.merchant_transaction_id) {
        mTxnId = order.payments[0].merchant_transaction_id;
      }
      
      console.log("Merchant Transaction ID:", mTxnId);
      
      // Call the verification function with the transaction ID
      const result = await updatePayment({ 
        data: { 
          orderId, 
          merchantTransactionId: mTxnId 
        } 
      });
      
      console.log("Payment update result:", result);
      statusResult = result.status;
      
      // If payment is successful, refresh order data
      if (statusResult === "success" || statusResult === "paid") {
        console.log("Payment successful, refreshing order...");
        await refresh();
        clearCart();
        clearCheckout();
      } else if (statusResult === "failed") {
        console.log("Payment failed");
        await refresh();
      }
      
      // Refresh one more time to ensure we have the latest data
      const finalOrder = await refresh();
      
      // Show appropriate toast message
      if (!silent) {
        if (statusResult === "success" || statusResult === "paid") {
          toast.success("Payment confirmed! Your order is being prepared.");
        } else if (statusResult === "failed") {
          toast.error("Payment failed. Please try again.");
        } else {
          toast.message("Payment is still being processed. Please wait.");
        }
      }
      
      return finalOrder;
    } catch (e) {
      console.error("Verification error:", e);
      if (!silent) {
        toast.error(e instanceof Error ? e.message : "Verification failed");
      }
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (!orderId) { 
      navigate("/cart", { replace: true }); 
      return; 
    }
    
    (async () => {
      const d = await refresh();
      console.log("Initial order data:", d);
      
      // If we just returned from PhonePe and still pending, hit verify.
      if (d && isOnline && d.order.paymentStatus === "pending") {
        console.log("Payment still pending, starting verification...");
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
        if (!cancelled) {
          if (res.invoice && !res.invoice.invoice_url) {
            await regenerate();
          } else {
            setInvoice(res.invoice);
            setInvLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching invoice:", error);
        if (!cancelled) setInvLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, orderId]);

  const refreshInvoice = async () => {
    if (!orderId) return;
    setInvLoading(true);
    try {
      const res = await fetchInvoice({ data: { orderId } });
      if (res.invoice && !res.invoice.invoice_url) {
        await regenerate();
      } else {
        setInvoice(res.invoice);
        if (!res.invoice) toast.message("Invoice is still being generated.");
        setInvLoading(false);
      }
    } catch (error) {
      console.error("Error refreshing invoice:", error);
      toast.error("Could not fetch invoice");
      setInvLoading(false);
    }
  };

  const regenerate = async () => {
    if (!orderId) return;
    setInvLoading(true);
    try {
      const res = await regenInvoice({ data: { orderId } });
      const invoiceNumber = res.invoiceNumber;
      
      const details = await fetchRawDetails({ data: { orderId } });
      const blob = await buildPdfBlob({
        order: details.order,
        items: details.items,
        addons: details.addons,
        payments: details.payments,
        customer: details.customer,
        outlet: details.outlet,
        invoiceNumber,
      });

      const path = `invoices/${orderId}/${invoiceNumber}.pdf`;
      const up = await supabase.storage.from("invoices").upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("invoices").getPublicUrl(path);

      await updateInvoiceUrl({ data: { orderId, invoiceUrl: pub.publicUrl } });

      const finalRes = await fetchInvoice({ data: { orderId } });
      setInvoice(finalRes.invoice);
      toast.success("Invoice ready");
    } catch (e) {
      console.error("Error regenerating invoice:", e);
      toast.error(e instanceof Error ? e.message : "Could not generate invoice");
    } finally { 
      setInvLoading(false); 
    }
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
              <button 
                onClick={() => runVerify(false)} 
                disabled={verifying}
                className="w-full rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream disabled:opacity-50 hover:bg-saffron-dark transition-colors"
              >
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
              <button 
                onClick={() => navigate("/checkout")}
                className="rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream hover:bg-saffron-dark transition-colors"
              >
                Retry Payment
              </button>
              <Link 
                to="/cart" 
                className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon hover:bg-gold/5 transition-colors"
              >
                Back To Cart
              </Link>
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
          {order.outlet?.address && (
            <p className="mt-0.5 flex items-start gap-1 text-xs text-maroon-deep/60">
              <MapPin className="mt-0.5 h-3 w-3" />
              {order.outlet.address}
            </p>
          )}
          
          <div className="mt-4 space-y-2 border-t border-gold/20 pt-4">
            <p className="mb-2 text-xs font-semibold tracking-wider text-maroon-deep/70 uppercase">
              Order Items
            </p>
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="flex gap-2 text-maroon">
                  <span className="font-semibold text-saffron-deep">{item.quantity}x</span>
                  <span>{item.itemName}</span>
                </div>
                <span className="font-semibold text-maroon">₹{item.totalPrice}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gold/20 pt-3 flex items-center justify-between text-sm">
            <span className="text-maroon-deep/70">Amount Paid</span>
            <span className="text-display text-lg text-maroon">₹{order.order.grandTotal}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-maroon-deep/70">Payment method</span>
            <span className="font-semibold text-maroon">
              {isCod ? "Cash On Delivery" : "PhonePe / UPI"}
            </span>
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
                <p className="text-xs text-maroon-deep/70">
                  No. <span className="font-semibold text-maroon">{invoice.invoice_number}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-maroon-deep/60">
                  Generated {new Date(invoice.generated_at).toLocaleString()}
                </p>
                <div className="mt-3 flex gap-2">
                  {invoice.invoice_url ? (
                    <a 
                      href={invoice.invoice_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 rounded-xl bg-saffron px-3 py-2 text-center text-xs font-semibold text-cream hover:bg-saffron-dark transition-colors"
                    >
                      Download Invoice
                    </a>
                  ) : (
                    <button 
                      onClick={regenerate} 
                      disabled={invLoading}
                      className="flex-1 rounded-xl bg-saffron px-3 py-2 text-center text-xs font-semibold text-cream hover:bg-saffron-dark transition-colors"
                    >
                      {invLoading ? "Generating..." : "Generate PDF"}
                    </button>
                  )}
                  <button 
                    onClick={refreshInvoice} 
                    className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon hover:bg-gold/5 transition-colors"
                  >
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
                  <button 
                    onClick={refreshInvoice} 
                    disabled={invLoading}
                    className="flex-1 rounded-xl bg-saffron px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60 hover:bg-saffron-dark transition-colors"
                  >
                    Refresh Invoice
                  </button>
                  <button 
                    onClick={regenerate} 
                    disabled={invLoading}
                    className="rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon hover:bg-gold/5 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => navigate(`/customer/order/${order.order.id}`)}
            className="flex items-center justify-center gap-2 rounded-xl bg-maroon px-3 py-2 text-xs font-semibold text-cream hover:bg-maroon-dark transition-colors"
          >
            <ReceiptText className="h-3.5 w-3.5" /> Track Order
          </button>
          <Link 
            to="/customer/orders"
            className="flex items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon hover:bg-gold/5 transition-colors"
          >
            My Orders
          </Link>
          <Link 
            to="/customer/menu"
            className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-xs font-semibold text-maroon hover:bg-gold/5 transition-colors"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Continue Shopping
          </Link>
          <button 
            onClick={refresh}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-cream-warm/40 px-3 py-2 text-[11px] font-medium text-maroon-deep/70 hover:bg-cream-warm/60 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh status
          </button>
        </div>
      </div>
    </main>
  );
}

function StateCard({
  icon, title, subtitle, color, children,
}: { 
  icon: React.ReactNode; 
  title: string; 
  subtitle: string; 
  color: string; 
  children?: React.ReactNode 
}) {
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