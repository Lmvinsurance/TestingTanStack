import { Link, useNavigate } from "react-router-dom";;
import { useRequireCustomer } from "@/lib/use-require-customer";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Trash2, Plus, Minus, ChefHat, Tag, MapPin, ShoppingBag,
  Home, AlertTriangle,
} from "lucide-react";
import {
  useCart, useOutlet, updateQty, removeItem, cartTotal, addToCart,
  clearCart,
} from "@/lib/cart-store";
import { useCheckout, setCheckout, type OrderType } from "@/lib/checkout-store";
import { supabase } from "@/integrations/supabase/client";



type Reco = { itemId: string; itemName: string; variantId: string; price: number; image: string | null };

const COUPONS = [
  { code: "FIRSTORDER", desc: "10% OFF on your first order", value: 0.1, flat: false },
  { code: "FESTIVE100", desc: "Flat ₹100 OFF", value: 100, flat: true },
];

const OPTIONS: { key: OrderType; label: string; icon: typeof Home }[] = [
  { key: "delivery", label: "Delivery", icon: Home },
  { key: "pickup", label: "Pickup", icon: ShoppingBag },
  { key: "dine_in", label: "Dine In", icon: ChefHat },
];

function CartScreen() {
  const ready = useRequireCustomer();
  const cart = useCart();
  const outlet = useOutlet();
  const checkout = useCheckout();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [reco, setReco] = useState<Reco[]>([]);

  const cartOutletId = cart[0]?.outletId ?? null;
  const outletMismatch = !!cartOutletId && !!outlet && cartOutletId !== outlet.id;

  const itemsTotal = useMemo(() => cartTotal(cart), [cart]);
  const addonsTotal = useMemo(
    () => cart.reduce((s, it) => s + (it.addons?.reduce((a, b) => a + b.price, 0) ?? 0) * it.qty, 0),
    [cart],
  );
  const coupon = checkout.coupon ? COUPONS.find((c) => c.code === checkout.coupon) ?? null : null;
  const discount = coupon ? (coupon.flat ? Math.min(coupon.value, itemsTotal) : Math.round(itemsTotal * coupon.value)) : 0;
  const taxes = Math.round((itemsTotal - discount) * 0.05);
  const packing = cart.length ? 1 : 0;
  const delivery = checkout.orderType === "delivery" && cart.length ? 40 : 0;
  const grand = Math.max(0, itemsTotal - discount + taxes + packing + delivery);

  useEffect(() => {
    if (!ready || !outlet || outletMismatch) return;
    let cancelled = false;
    (async () => {
      const { data: prices } = await supabase
        .from("outlet_variant_prices")
        .select("item_id, variant_id, selling_price, is_available")
        .eq("outlet_id", outlet.id)
        .eq("is_available", true)
        .limit(40);
      if (cancelled || !prices) return;
      const inCart = new Set(cart.map((c) => c.itemId));
      const seen = new Map<string, { itemId: string; variantId: string; price: number }>();
      for (const p of prices) {
        if (inCart.has(p.item_id)) continue;
        if (!seen.has(p.item_id)) seen.set(p.item_id, { itemId: p.item_id, variantId: p.variant_id, price: Number(p.selling_price) });
      }
      const ids = Array.from(seen.keys()).slice(0, 6);
      if (!ids.length) { setReco([]); return; }
      const [itemsRes, imgsRes] = await Promise.all([
        supabase.from("menu_items").select("id, item_name").in("id", ids).eq("is_active", true).eq("is_deleted", false),
        supabase.from("item_images").select("item_id, image_url, is_primary").in("item_id", ids),
      ]);
      const imgMap = new Map<string, string>();
      (imgsRes.data ?? []).forEach((i) => {
        if (!imgMap.has(i.item_id) || i.is_primary) imgMap.set(i.item_id, i.image_url);
      });
      if (cancelled) return;
      setReco(
        (itemsRes.data ?? []).map((it) => {
          const p = seen.get(it.id)!;
          return { itemId: it.id, itemName: it.item_name, variantId: p.variantId, price: p.price, image: imgMap.get(it.id) ?? null };
        }),
      );
    })();
    return () => { cancelled = true; };
  }, [ready, outlet, outletMismatch, cart]);

  if (!ready) return null;

  const applyCode = () => {
    const found = COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (found) { setCheckout({ coupon: found.code }); toast.success(`${found.code} applied`); }
    else toast.error("Invalid coupon code");
  };

  if (outletMismatch) {
    return (
      <main className="min-h-screen bg-cream">
        <Header />
        <div className="mx-auto max-w-md px-4 pt-6 sm:max-w-lg">
          <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Cart belongs to a different outlet.</p>
                <p className="mt-1 text-xs">Your cart contains items from another outlet. Please clear cart to continue with this outlet.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { clearCart(); toast.success("Cart cleared"); }}
                className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-cream">Clear Cart</button>
              <Link to="/customer/menu"
                className="rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-maroon">Continue Browsing</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-cream">
        <Header />
        <div className="mx-auto max-w-md px-6 pt-24 text-center sm:max-w-lg">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="text-display mt-5 text-2xl text-maroon">Your Cart Is Empty</h2>
          <p className="mt-2 text-sm text-maroon-deep/60">Add delicious Telugu dishes to get started.</p>
          <Link to="/customer/menu"
            className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-6 py-3 text-sm font-semibold text-cream shadow">
            Browse Menu
          </Link>
        </div>
      </main>
    );
  }

  const canCheckout = cart.length > 0 && !outletMismatch && !!outlet;

  return (
    <main className="min-h-screen bg-cream pb-32">
      <Header />
      <div className="mx-auto max-w-md px-4 py-4 sm:max-w-lg">
        {/* Outlet */}
        <div className="flex items-center gap-3 rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Order from</p>
            <p className="truncate text-sm font-semibold text-maroon">{outlet?.short ?? "Select outlet"}</p>
          </div>
          <Link to="/customer/outlets" className="rounded-lg border border-gold/40 px-2.5 py-1 text-[11px] font-medium text-maroon">
            Change
          </Link>
        </div>

        {/* Items */}
        <div className="mt-4 flex flex-col gap-3">
          {cart.map((it) => (
            <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
              <div className="flex gap-3">
                <div className="grid h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-saffron/40 to-maroon/20 text-maroon/30">
                  {it.image ? (
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <ChefHat className="m-auto h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-display text-sm text-maroon">{it.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {it.dietary && (
                      <span className="rounded-sm border border-emerald-600/60 px-1 text-[9px] font-semibold uppercase text-emerald-700">
                        {it.dietary}
                      </span>
                    )}
                    <p className="text-[11px] text-maroon-deep/60">{it.variant}</p>
                  </div>
                  <p className="text-[11px] text-saffron-deep">₹{it.price} each</p>
                </div>
                <button onClick={() => removeItem(it.id)} aria-label="Remove"
                  className="grid h-8 w-8 place-items-center rounded-lg text-maroon-deep/50 hover:bg-cream-warm/30 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {it.addons && it.addons.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-dashed border-gold/30 pt-2">
                  {it.addons.map((a, idx) => (
                    <span key={idx} className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] text-maroon">
                      + {a.name} ₹{a.price}
                    </span>
                  ))}
                </div>
              )}
              {it.notes && (
                <p className="mt-2 rounded-lg bg-cream-warm/40 p-2 text-[11px] italic text-maroon-deep/70">
                  Note: {it.notes}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-cream-warm/30 p-1">
                  <button onClick={() => updateQty(it.id, it.qty - 1)}
                    className="grid h-7 w-7 place-items-center text-maroon"><Minus className="h-3 w-3" /></button>
                  <span className="w-5 text-center text-xs font-semibold text-maroon">{it.qty}</span>
                  <button onClick={() => updateQty(it.id, it.qty + 1)}
                    className="grid h-7 w-7 place-items-center text-maroon"><Plus className="h-3 w-3" /></button>
                </div>
                <p className="text-sm font-bold text-maroon">
                  ₹{(it.price + (it.addons?.reduce((s, a) => s + a.price, 0) ?? 0)) * it.qty}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recommended */}
        {reco.length > 0 && (
          <section className="mt-6">
            <h3 className="text-display text-base text-maroon">Customers Also Added</h3>
            <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3">
                {reco.map((r) => (
                  <div key={r.itemId} className="w-32 shrink-0 overflow-hidden rounded-2xl border border-gold/25 bg-card shadow-sm">
                    <div className="grid h-16 place-items-center overflow-hidden bg-gradient-to-br from-saffron/30 to-maroon/20 text-maroon/30">
                      {r.image ? <img src={r.image} alt={r.itemName} className="h-full w-full object-cover" /> : <ChefHat className="h-5 w-5" />}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-[11px] font-semibold text-maroon">{r.itemName}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-maroon-deep">₹{r.price}</span>
                        <button onClick={() => {
                          if (!outlet) return;
                          addToCart({
                            id: "", outletId: outlet.id, itemId: r.itemId, variantId: r.variantId,
                            name: r.itemName, variant: "Standard", price: r.price, qty: 1,
                            image: r.image ?? undefined,
                          });
                          toast.success("Added");
                        }}
                          className="rounded-full bg-saffron px-2 py-0.5 text-[9px] font-bold text-cream">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Coupons */}
        <section className="mt-6 rounded-2xl border border-gold/25 bg-card p-4 shadow-sm">
          <h3 className="text-display text-base text-maroon">Offers & Discounts</h3>
          <div className="mt-3 flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="Enter Coupon Code"
              className="flex-1 rounded-xl border border-gold/30 bg-cream-warm/20 px-3 py-2 text-sm text-maroon-deep placeholder:text-maroon-deep/40 focus:border-saffron focus:outline-none" />
            <button onClick={applyCode}
              className="rounded-xl bg-maroon px-4 py-2 text-xs font-semibold text-cream">Apply</button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {COUPONS.map((c) => (
              <button key={c.code} onClick={() => { setCheckout({ coupon: c.code }); toast.success(`${c.code} applied`); }}
                className={`flex items-center justify-between rounded-xl border border-dashed p-2.5 text-left transition ${
                  checkout.coupon === c.code ? "border-saffron bg-saffron/10" : "border-gold/40 hover:bg-cream-warm/30"
                }`}>
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-saffron-deep" />
                  <div>
                    <p className="text-xs font-bold text-maroon">{c.code}</p>
                    <p className="text-[10px] text-maroon-deep/60">{c.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-saffron-deep">
                  {checkout.coupon === c.code ? "APPLIED" : "TAP TO APPLY"}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Order type */}
        <section className="mt-6">
          <h3 className="text-display text-base text-maroon">Order Type</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
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
        </section>

        {/* Notes */}
        <section className="mt-4">
          <h3 className="text-display text-base text-maroon">Order Notes</h3>
          <textarea value={checkout.notes} onChange={(e) => setCheckout({ notes: e.target.value })} rows={2}
            placeholder="Any delivery or preparation instructions?"
            className="mt-2 w-full resize-none rounded-2xl border border-gold/30 bg-card p-3 text-sm focus:border-saffron focus:outline-none" />
        </section>

        {/* Bill */}
        <section className="mt-6 rounded-2xl border border-gold/25 bg-card p-4 shadow-sm">
          <h3 className="text-display text-base text-maroon">Bill Summary</h3>
          <div className="mt-3 space-y-2 text-sm text-maroon-deep">
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
        </section>
      </div>

      {/* Sticky checkout */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Grand Total</p>
            <p className="text-display text-lg text-maroon">₹{grand}</p>
          </div>
          <button onClick={() => navigate("/customer/checkout")} disabled={!canCheckout}
            className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow disabled:opacity-50">
            Continue To Checkout
          </button>
        </div>
      </div>
    </main>
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

function Header() {
  const outlet = useOutlet();
  return (
    <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
      <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
        <Link to="/customer/menu" aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-display text-lg leading-tight text-maroon">My Cart</h1>
          <p className="truncate text-[11px] text-maroon-deep/60">{outlet?.short ?? "No outlet selected"}</p>
        </div>
        <Link to="/customer/outlets" className="text-[11px] font-medium text-saffron-deep">Change Outlet</Link>
      </div>
    </header>
  );
}
export default CartScreen;
