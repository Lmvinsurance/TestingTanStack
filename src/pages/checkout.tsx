import { Link, useNavigate } from "react-router-dom";;
import { useRequireCustomer } from "@/lib/use-require-customer";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@/lib/react-start-mock";
import {
  ArrowLeft, Home, ShoppingBag, ChefHat, MapPin, Phone, Clock,
  Smartphone, Wallet, BadgeCheck, Loader2, Plus,
} from "lucide-react";
import { useCart, useOutlet, cartTotal, clearCart } from "@/lib/cart-store";
import { useCheckout, setCheckout, type OrderType, type PaymentMethod } from "@/lib/checkout-store";
import { listMyAddresses, createOrder } from "@/lib/orders.functions";
import { createPhonePePayment } from "@/lib/payments.functions";
import { supabase } from "@/integrations/supabase/client";



type Address = {
  id: string; address_label: string | null; full_address: string;
  city: string | null; state: string | null; pincode: string | null; is_default: boolean;
};

type Outlet = { outlet_name: string; phone: string | null; address: string | null; city: string | null; state: string | null; pincode: string | null };

const OPTIONS: { key: OrderType; label: string; icon: typeof Home }[] = [
  { key: "delivery", label: "Delivery", icon: Home },
  { key: "pickup", label: "Pickup", icon: ShoppingBag },
  { key: "dine_in", label: "Dine In", icon: ChefHat },
];

const PAYMENTS: { key: PaymentMethod; label: string; sub: string; icon: typeof Smartphone; recommended?: boolean }[] = [
  { key: "phonepe", label: "PhonePe", sub: "UPI, Cards, Wallets", icon: Smartphone, recommended: true },
  { key: "upi", label: "UPI", sub: "Any UPI app", icon: BadgeCheck },
  { key: "cod", label: "Cash On Delivery", sub: "Pay when you receive", icon: Wallet },
];

function CheckoutScreen() {
  const ready = useRequireCustomer();
  const navigate = useNavigate();
  const cart = useCart();
  const outlet = useOutlet();
  const checkout = useCheckout();
  const fetchAddresses = useServerFn(listMyAddresses);
  const placeOrder = useServerFn(createOrder);
  const initPhonePe = useServerFn(createPhonePePayment);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [outletInfo, setOutletInfo] = useState<Outlet | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAddr, setLoadingAddr] = useState(true);

  const cartOutletId = cart[0]?.outletId ?? null;
  const mismatch = !!cartOutletId && !!outlet && cartOutletId !== outlet.id;

  // Redirect rules
  useEffect(() => {
    if (!ready) return;
    if (!outlet) { navigate("/customer/outlets", { replace: true }); return; }
    if (cart.length === 0) { navigate("/cart", { replace: true }); return; }
    if (mismatch) { navigate("/cart", { replace: true }); }
  }, [ready, outlet, cart, mismatch, navigate]);

  // Load addresses
  useEffect(() => {
    if (!ready) return;
    let c = false;
    (async () => {
      setLoadingAddr(true);
      try {
        const res = await fetchAddresses();
        if (!c) {
          setAddresses(res.addresses as Address[]);
          if (!checkout.addressId) {
            const def = res.addresses.find((a) => a.is_default) ?? res.addresses[0];
            if (def) setCheckout({ addressId: def.id });
          }
        }
      } catch (e) {
        if (!c) toast.error(e instanceof Error ? e.message : "Failed to load addresses");
      } finally {
        if (!c) setLoadingAddr(false);
      }
    })();
    return () => { c = true; };
  }, [ready, fetchAddresses]);

  // Load outlet info
  useEffect(() => {
    if (!outlet) return;
    let c = false;
    (async () => {
      const { data } = await supabase
        .from("outlets")
        .select("outlet_name, phone, address, city, state, pincode")
        .eq("id", outlet.id)
        .maybeSingle();
      if (!c) setOutletInfo(data as Outlet | null);
    })();
    return () => { c = true; };
  }, [outlet]);

  // Bill calculation
  const itemsTotal = useMemo(() => cartTotal(cart), [cart]);
  const addonsTotal = useMemo(
    () => cart.reduce((s, it) => s + (it.addons?.reduce((a, b) => a + b.price, 0) ?? 0) * it.qty, 0),
    [cart],
  );
  const COUPONS = { FIRSTORDER: { flat: false, value: 0.1 }, FESTIVE100: { flat: true, value: 100 } } as const;
  const coupon = checkout.coupon && checkout.coupon in COUPONS ? COUPONS[checkout.coupon as keyof typeof COUPONS] : null;
  const discount = coupon ? (coupon.flat ? Math.min(coupon.value, itemsTotal) : Math.round(itemsTotal * coupon.value)) : 0;
  const taxes = Math.round((itemsTotal - discount) * 0.05);
  const packing = 1;
  const delivery = checkout.orderType === "delivery" ? 40 : 0;
  const grand = Math.max(0, itemsTotal - discount + taxes + packing + delivery);

  const selectedAddress = addresses.find((a) => a.id === checkout.addressId) ?? null;

  const handlePlace = async () => {
    if (!outlet) return;
    if (checkout.orderType === "delivery" && !checkout.addressId) {
      toast.error("Please add a delivery address");
      return;
    }
    if (!agree) {
      toast.error("Please accept the terms to continue");
      return;
    }
    setSubmitting(true);

    try {
      // 1. Outlet active
      const { data: outletData } = await supabase
        .from("outlets")
        .select("is_active")
        .eq("id", outlet.id)
        .single();
        
      if (!outletData?.is_active) {
        toast.error("This outlet is currently inactive.");
        setSubmitting(false);
        return;
      }

      // 2. Variants and Pricing
      const variantIds = cart.map((c) => c.variantId);
      const itemIds = cart.map((c) => c.itemId);
      
      const [pricesRes, availabilityRes] = await Promise.all([
        supabase.from("outlet_variant_prices").select("variant_id, selling_price, is_available").eq("outlet_id", outlet.id).in("variant_id", variantIds),
        supabase.from("outlet_item_availability").select("item_id, is_available, stock_status").eq("outlet_id", outlet.id).in("item_id", itemIds)
      ]);
      
      const prices = pricesRes.data || [];
      const availability = availabilityRes.data || [];
      
      for (const item of cart) {
        const p = prices.find((x) => x.variant_id === item.variantId);
        const a = availability.find((x) => x.item_id === item.itemId);
        
        if (!p) {
          toast.error(`${item.name} (${item.variant}) is no longer available at this outlet.`);
          setSubmitting(false); return;
        }
        if (!p.is_available) {
          toast.error(`${item.name} (${item.variant}) variant is currently unavailable.`);
          setSubmitting(false); return;
        }
        if (Number(p.selling_price) !== item.price) {
          toast.error(`Price updated for ${item.name}. Please clear cart and add again.`);
          setSubmitting(false); return;
        }
        if (!a || !a.is_available || a.stock_status === 'sold_out') {
          toast.error(`${item.name} is currently sold out.`);
          setSubmitting(false); return;
        }
      }
    } catch (e) {
      toast.error("Error validating cart items.");
      setSubmitting(false);
      return;
    }

    try {
      const result = await placeOrder({
        data: {
          outletId: outlet.id,
          orderType: checkout.orderType,
          paymentMethod: checkout.paymentMethod,
          addressId: checkout.orderType === "delivery" ? checkout.addressId : null,
          customerNotes: checkout.notes || undefined,
          items: cart.map((it) => ({
            itemId: it.itemId,
            variantId: it.variantId,
            itemName: it.name,
            variantName: it.variant,
            unitPrice: it.price,
            quantity: it.qty,
            specialInstructions: it.notes ?? null,
            addons: (it.addons ?? []).map((a) => ({ name: a.name, price: a.price, quantity: 1 })),
          })),
          totals: {
            subtotal: itemsTotal,
            taxAmount: taxes,
            deliveryCharge: delivery,
            discountAmount: discount,
            grandTotal: grand,
          },
        },
      });
      // For online methods, kick off PhonePe via Edge Function
      if (checkout.paymentMethod === "phonepe" || checkout.paymentMethod === "upi") {
        const amountPaise = Math.round(grand * 100);
        const redirectUrl = `${window.location.origin}/payment-status?orderId=${encodeURIComponent(result.orderId)}&method=${encodeURIComponent(checkout.paymentMethod)}&merchantTxnId=${encodeURIComponent(result.merchantTransactionId || '')}`;

        try {
          const axios = (await import("axios")).default;
          const SUPABASE_EDGE_FUNCTION_URL = 'https://aynfbxixpviadworsbmk.supabase.co/functions/v1/phonepe';
          
          const payload = {
            action: 'create',
            merchantOrderId: result.merchantTransactionId,
            amountPaise: amountPaise,
            redirectUrl: redirectUrl,
            message: `Payment for Order #${result.orderNumber || result.orderId.slice(0, 8)}`,
            metaInfo: {
              orderId: result.orderId,
              customerName: 'Customer',
              customerPhone: '',
              outletId: outlet.id
            }
          };

          const response = await axios.post(SUPABASE_EDGE_FUNCTION_URL, payload);

          if (response.status === 200 && response.data?.redirectUrl) {
            window.location.href = response.data.redirectUrl;
            return;
          } else {
            toast.error("PhonePe payment initiation failed.");
          }
        } catch (err: any) {
          toast.error("Failed to initiate payment: " + err.message);
        }
      }
      
      navigate(
        `/payment-status?orderId=${encodeURIComponent(result.orderId)}&method=${encodeURIComponent(checkout.paymentMethod)}`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;
  if (!outlet || cart.length === 0 || mismatch) return null;

  const payBtnLabel = checkout.paymentMethod === "cod" ? "Place Order" : "Proceed to Payment";

  return (
    <main className="min-h-screen bg-cream pb-32">
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <Link to="/cart" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-display text-lg leading-tight text-maroon">Checkout</h1>
            <p className="truncate text-[11px] text-maroon-deep/60">Review your order before payment · {outlet.short}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md space-y-5 px-4 py-4 sm:max-w-lg">
        {/* Order type */}
        <Section title="Order Type">
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setCheckout({ orderType: key })}
                className={`rounded-2xl border p-3 text-center transition ${
                  checkout.orderType === key ? "border-saffron bg-saffron/10 ring-2 ring-saffron/30" : "border-gold/30 bg-card"
                }`}>
                <Icon className="mx-auto h-5 w-5 text-saffron-deep" />
                <p className="mt-1 text-[11px] font-semibold text-maroon">{label}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Delivery address */}
        {checkout.orderType === "delivery" && (
          <Section title="Delivery Address">
            {loadingAddr ? (
              <div className="h-20 animate-pulse rounded-2xl bg-gold/10" />
            ) : addresses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-red-300 bg-red-50/40 p-4 text-center">
                <p className="text-sm font-semibold text-red-700">No saved address</p>
                <p className="mt-1 text-xs text-red-700/80">Please add a delivery address to continue.</p>
                <button className="mt-3 inline-flex items-center gap-1 rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream"
                  onClick={() => toast.message("Add address coming soon")}>
                  <Plus className="h-3.5 w-3.5" /> Add New Address
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <button key={a.id} onClick={() => setCheckout({ addressId: a.id })}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      checkout.addressId === a.id ? "border-saffron bg-saffron/10" : "border-gold/30 bg-card"
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-maroon">
                          {a.address_label ?? "Address"} {a.is_default && <span className="ml-1 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] uppercase text-maroon-deep">Default</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-maroon-deep/70">{a.full_address}</p>
                        <p className="text-[11px] text-maroon-deep/50">
                          {[a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
                <button className="w-full rounded-xl border border-dashed border-gold/40 px-4 py-2 text-xs font-medium text-maroon"
                  onClick={() => toast.message("Add address coming soon")}>
                  + Add New Address
                </button>
              </div>
            )}
          </Section>
        )}

        {/* Pickup */}
        {checkout.orderType === "pickup" && (
          <Section title="Pickup From">
            <div className="rounded-2xl border border-gold/25 bg-card p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-maroon">{outletInfo?.outlet_name ?? outlet.short}</p>
                  <p className="mt-0.5 text-xs text-maroon-deep/70">
                    {outletInfo?.address}
                    {outletInfo && [outletInfo.city, outletInfo.state, outletInfo.pincode].filter(Boolean).length > 0 && (
                      <span> · {[outletInfo.city, outletInfo.state, outletInfo.pincode].filter(Boolean).join(", ")}</span>
                    )}
                  </p>
                  {outletInfo?.phone && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-maroon-deep/60"><Phone className="h-3 w-3" />{outletInfo.phone}</p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-saffron-deep"><Clock className="h-3 w-3" /> Ready in ~25 mins</p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Dine-in */}
        {checkout.orderType === "dine_in" && (
          <Section title="Dine-In Details">
            <div className="space-y-3 rounded-2xl border border-gold/25 bg-card p-3">
              <Field label="Number of Guests">
                <input type="number" min={1} max={20} value={checkout.guests}
                  onChange={(e) => setCheckout({ guests: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-full rounded-xl border border-gold/30 bg-cream-warm/20 px-3 py-2 text-sm focus:border-saffron focus:outline-none" />
              </Field>
              <Field label="Expected Arrival Time">
                <input type="time" value={checkout.arrivalTime}
                  onChange={(e) => setCheckout({ arrivalTime: e.target.value })}
                  className="w-full rounded-xl border border-gold/30 bg-cream-warm/20 px-3 py-2 text-sm focus:border-saffron focus:outline-none" />
              </Field>
              <Field label="Special Request">
                <textarea rows={2} value={checkout.dineInRequest}
                  onChange={(e) => setCheckout({ dineInRequest: e.target.value })}
                  placeholder="e.g. window seat, high chair"
                  className="w-full resize-none rounded-xl border border-gold/30 bg-cream-warm/20 px-3 py-2 text-sm focus:border-saffron focus:outline-none" />
              </Field>
            </div>
          </Section>
        )}

        {/* Summary */}
        <Section title="Order Summary" right={<Link to="/cart" className="text-[11px] font-semibold text-saffron-deep">Edit Cart</Link>}>
          <div className="rounded-2xl border border-gold/25 bg-card divide-y divide-gold/15">
            {cart.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-maroon">{it.name} <span className="text-[11px] text-maroon-deep/60">× {it.qty}</span></p>
                  <p className="text-[11px] text-maroon-deep/60">{it.variant}</p>
                  {it.addons && it.addons.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-maroon-deep/50">+ {it.addons.map((a) => a.name).join(", ")}</p>
                  )}
                </div>
                <p className="text-sm font-bold text-maroon">
                  ₹{(it.price + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0)) * it.qty}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Payment method */}
        <Section title="Payment Method">
          <div className="space-y-2">
            {PAYMENTS.map((p) => (
              <button key={p.key} onClick={() => setCheckout({ paymentMethod: p.key })}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  checkout.paymentMethod === p.key ? "border-saffron bg-saffron/10" : "border-gold/30 bg-card"
                }`}>
                <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-maroon">
                    {p.label} {p.recommended && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] uppercase text-emerald-700">Recommended</span>}
                  </p>
                  <p className="text-[11px] text-maroon-deep/60">{p.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Customer notes */}
        <Section title="Notes for Restaurant">
          <textarea rows={2} value={checkout.notes} onChange={(e) => setCheckout({ notes: e.target.value })}
            placeholder="Any final instructions for restaurant or delivery partner?"
            className="w-full resize-none rounded-2xl border border-gold/30 bg-card p-3 text-sm focus:border-saffron focus:outline-none" />
        </Section>

        {/* Bill */}
        <Section title="Bill Summary">
          <div className="rounded-2xl border border-gold/25 bg-card p-4 space-y-2 text-sm text-maroon-deep">
            <Row label="Items Total" value={`₹${itemsTotal - addonsTotal}`} />
            {addonsTotal > 0 && <Row label="Add-ons Total" value={`₹${addonsTotal}`} />}
            {discount > 0 && <Row label={`Discount (${checkout.coupon})`} value={`-₹${discount}`} accent />}
            <Row label="Taxes (5%)" value={`₹${taxes}`} />
            <Row label="Packing Charges" value={`₹${packing}`} />
            {checkout.orderType === "delivery" && <Row label="Delivery Charges" value={`₹${delivery}`} />}
            <div className="my-2 border-t border-dashed border-gold/40" />
            <div className="flex items-center justify-between">
              <span className="text-display text-base text-maroon">Grand Total</span>
              <span className="text-display text-lg text-maroon">₹{grand}</span>
            </div>
          </div>
        </Section>

        {/* Terms */}
        <label className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-card p-3 text-xs text-maroon-deep">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gold/40 text-saffron" />
          <span>I agree to the <span className="font-semibold text-maroon">cancellation policy</span> and <span className="font-semibold text-maroon">terms of service</span>.</span>
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Grand Total</p>
            <p className="text-display text-lg text-maroon">₹{grand}</p>
          </div>
          <button onClick={handlePlace}
            disabled={submitting || !agree || (checkout.orderType === "delivery" && !checkout.addressId)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow disabled:opacity-50">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {payBtnLabel}
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-display text-base text-maroon">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-maroon-deep/60">{label}</p>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-maroon-deep/70">{label}</span>
      <span className={accent ? "font-semibold text-emerald-700" : "font-medium text-maroon"}>{value}</span>
    </div>
  );
}
export default CheckoutScreen;
