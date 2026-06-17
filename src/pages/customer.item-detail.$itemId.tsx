import { Link, useNavigate } from "react-router-dom";;
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft, ShoppingCart, Star, Clock, Flame, ChefHat, Plus, Minus, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireCustomer } from "@/lib/use-require-customer";
import { useOutlet, useCart, addToCart } from "@/lib/cart-store";



type Item = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  cuisine_id: string | null;
  dietary_type_id: string | null;
  item_name: string;
  short_description: string | null;
  full_description: string | null;
  ingredients: string | null;
  spice_level: string | null;
  preparation_type: string | null;
  is_bestseller: boolean | null;
  is_recommended: boolean | null;
  is_new: boolean | null;
};
type Variant = { id: string; item_id: string; variant_name: string; quantity_label: string | null; serves_count: number | null };
type Price = { variant_id: string; selling_price: number; mrp_price: number | null; is_available: boolean };
type Addon = { id: string; addon_name: string; description: string | null; price: number };
type ItemAddon = { addon_id: string; is_required: boolean | null; max_quantity: number | null };
type Image = { image_url: string; is_primary: boolean | null; display_order: number | null };

function ItemDetailScreen() {
  const ready = useRequireCustomer();
  const outlet = useOutlet();
  const navigate = useNavigate();
  const { itemId } = Route.useParams();
  const cart = useCart();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const [item, setItem] = useState<Item | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [addons, setAddons] = useState<(Addon & ItemAddon)[]>([]);
  const [related, setRelated] = useState<{ id: string; item_name: string; image: string | null; price: number | null }[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [subcategoryName, setSubcategoryName] = useState<string | null>(null);
  const [cuisineName, setCuisineName] = useState<string | null>(null);
  const [dietaryName, setDietaryName] = useState<string | null>(null);
  const [dietaryIsVeg, setDietaryIsVeg] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!outlet) navigate("/customer/outlets", { replace: true });
  }, [ready, outlet, navigate]);

  useEffect(() => {
    if (!ready || !outlet || !itemId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setUnavailable(false);
      try {
        const { data: itm, error: itmErr } = await supabase
          .from("menu_items")
          .select("id, category_id, subcategory_id, cuisine_id, dietary_type_id, item_name, short_description, full_description, ingredients, spice_level, preparation_type, is_bestseller, is_recommended, is_new")
          .eq("id", itemId)
          .eq("is_active", true)
          .eq("is_deleted", false)
          .maybeSingle();
        if (cancelled) return;
        if (itmErr) { setError(itmErr.message); return; }
        if (!itm) { setNotFound(true); return; }
        setItem(itm as Item);

        const [img, vars, av, pr, ia, allAddons, cat, sub, cui, die] = await Promise.all([
          supabase.from("item_images").select("image_url, is_primary, display_order").eq("item_id", itemId),
          supabase.from("item_variants").select("id, item_id, variant_name, quantity_label, serves_count").eq("item_id", itemId).eq("is_active", true),
          supabase.from("outlet_item_availability").select("is_available, stock_status").eq("outlet_id", outlet.id).eq("item_id", itemId).maybeSingle(),
          supabase.from("outlet_variant_prices").select("variant_id, selling_price, mrp_price, is_available").eq("outlet_id", outlet.id).eq("item_id", itemId).eq("is_available", true),
          supabase.from("item_addons").select("addon_id, is_required, max_quantity").eq("item_id", itemId),
          supabase.from("addons").select("id, addon_name, description, price").eq("is_active", true),
          itm.category_id ? supabase.from("menu_categories").select("category_name").eq("id", itm.category_id).maybeSingle() : Promise.resolve({ data: null, error: null } as const),
          itm.subcategory_id ? supabase.from("menu_subcategories").select("subcategory_name").eq("id", itm.subcategory_id).maybeSingle() : Promise.resolve({ data: null, error: null } as const),
          itm.cuisine_id ? supabase.from("cuisine_types").select("cuisine_name").eq("id", itm.cuisine_id).maybeSingle() : Promise.resolve({ data: null, error: null } as const),
          itm.dietary_type_id ? supabase.from("dietary_types").select("dietary_name, dietary_code").eq("id", itm.dietary_type_id).maybeSingle() : Promise.resolve({ data: null, error: null } as const),
        ]);
        if (cancelled) return;

        const sortedImg = ((img.data ?? []) as Image[]).sort((a, b) => {
          const ap = a.is_primary ? 0 : 1, bp = b.is_primary ? 0 : 1;
          if (ap !== bp) return ap - bp;
          return (a.display_order ?? 999) - (b.display_order ?? 999);
        });
        setImages(sortedImg);
        setVariants((vars.data ?? []) as Variant[]);
        setPrices((pr.data ?? []) as Price[]);

        const availRow = av.data as { is_available: boolean; stock_status: string | null } | null;
        const isUnavail =
          !availRow ||
          !availRow.is_available ||
          (availRow.stock_status ?? "").toLowerCase() === "sold_out" ||
          (pr.data ?? []).length === 0;
        if (isUnavail) setUnavailable(true);

        const addonMap = new Map((allAddons.data ?? []).map((a: any) => [a.id, a as Addon]));
        const itemAddons = ((ia.data ?? []) as ItemAddon[])
          .map((rel) => {
            const a = addonMap.get(rel.addon_id);
            return a ? { ...a, ...rel } : null;
          })
          .filter(Boolean) as (Addon & ItemAddon)[];
        setAddons(itemAddons);

        setCategoryName((cat.data as any)?.category_name ?? null);
        setSubcategoryName((sub.data as any)?.subcategory_name ?? null);
        setCuisineName((cui.data as any)?.cuisine_name ?? null);
        const dietary = die.data as { dietary_name: string; dietary_code: string | null } | null;
        setDietaryName(dietary?.dietary_name ?? null);
        const code = (dietary?.dietary_code ?? dietary?.dietary_name ?? "").toLowerCase();
        setDietaryIsVeg(code.includes("veg") && !code.includes("non"));

        // Default-select lowest priced available variant
        const activeVariantIds = new Set(((vars.data ?? []) as Variant[]).map((v) => v.id));
        const validPrices = ((pr.data ?? []) as Price[]).filter((p) => activeVariantIds.has(p.variant_id));
        if (validPrices.length > 0) {
          const lowest = validPrices.reduce((m, p) => (p.selling_price < m.selling_price ? p : m), validPrices[0]);
          setSelectedVariant(lowest.variant_id);
        }

        // Recommended
        if (itm.category_id || itm.cuisine_id) {
          const recQ = supabase
            .from("menu_items")
            .select("id, item_name, category_id, cuisine_id")
            .eq("is_active", true)
            .eq("is_deleted", false)
            .neq("id", itemId)
            .limit(8);
          const { data: recItems } = itm.category_id
            ? await recQ.eq("category_id", itm.category_id)
            : await recQ.eq("cuisine_id", itm.cuisine_id!);
          if (recItems && recItems.length > 0) {
            const recIds = recItems.map((r: any) => r.id);
            const [avRec, prRec, imRec] = await Promise.all([
              supabase.from("outlet_item_availability").select("item_id, is_available, stock_status").eq("outlet_id", outlet.id).in("item_id", recIds).eq("is_available", true),
              supabase.from("outlet_variant_prices").select("item_id, selling_price").eq("outlet_id", outlet.id).in("item_id", recIds).eq("is_available", true),
              supabase.from("item_images").select("item_id, image_url, is_primary").in("item_id", recIds),
            ]);
            const okIds = new Set((avRec.data ?? []).filter((a: any) => (a.stock_status ?? "").toLowerCase() !== "sold_out").map((a: any) => a.item_id));
            const prMap = new Map<string, number>();
            (prRec.data ?? []).forEach((p: any) => {
              const cur = prMap.get(p.item_id);
              if (cur == null || p.selling_price < cur) prMap.set(p.item_id, p.selling_price);
            });
            const imMap = new Map<string, string>();
            (imRec.data ?? []).forEach((im: any) => {
              if (!imMap.has(im.item_id) || im.is_primary) imMap.set(im.item_id, im.image_url);
            });
            setRelated(
              recItems
                .filter((r: any) => okIds.has(r.id) && prMap.has(r.id))
                .slice(0, 6)
                .map((r: any) => ({
                  id: r.id,
                  item_name: r.item_name,
                  image: imMap.get(r.id) ?? null,
                  price: prMap.get(r.id) ?? null,
                }))
            );
          }
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, outlet, itemId]);

  const availableVariants = useMemo(() => {
    const priceMap = new Map(prices.map((p) => [p.variant_id, p]));
    return variants
      .filter((v) => priceMap.has(v.id))
      .map((v) => ({ ...v, price: priceMap.get(v.id)! }));
  }, [variants, prices]);

  const selectedVariantData = availableVariants.find((v) => v.id === selectedVariant);
  const addonsTotal = addons.reduce((s, a) => s + (addonQty[a.id] ?? 0) * a.price, 0);
  const total = ((selectedVariantData?.price.selling_price ?? 0) + addonsTotal) * qty;

  const onAddToCart = () => {
    if (!item || !selectedVariantData || !outlet) return;
    const selectedAddons = addons
      .filter((a) => (addonQty[a.id] ?? 0) > 0)
      .flatMap((a) => Array.from({ length: addonQty[a.id] }, () => ({ name: a.addon_name, price: a.price })));
    addToCart({
      id: "",
      outletId: outlet.id,
      itemId: item.id,
      variantId: selectedVariantData.id,
      name: item.item_name,
      variant: selectedVariantData.variant_name,
      price: selectedVariantData.price.selling_price,
      qty,
      addons: selectedAddons,
      notes: notes || undefined,
      image: images[0]?.image_url,
      dietary: dietaryName ?? null,
    });
    toast.success("Item added to cart", { description: `${item.item_name} • Qty ${qty}` });
    navigate("/cart");
  };

  if (!ready || !outlet) return null;

  // Loading skeleton
  if (loading) {
    return (
      <main className="min-h-screen bg-cream pb-32">
        <div className="h-72 animate-pulse bg-gradient-to-br from-saffron/30 to-gold/20" />
        <div className="space-y-3 p-5">
          <div className="h-6 w-1/2 animate-pulse rounded bg-gold/20" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gold/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gold/10" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gold/10" />)}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream p-5">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm font-semibold text-red-700">Couldn't load item</p>
          <p className="mt-1 text-xs text-red-600/80">{error}</p>
          <Link to="/customer/menu" className="mt-4 inline-block rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">
            Back to Menu
          </Link>
        </div>
      </main>
    );
  }

  if (notFound || !item) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream p-5">
        <div className="rounded-3xl border border-gold/40 bg-card p-8 text-center">
          <p className="text-display text-base text-maroon">Item not found</p>
          <p className="mt-1 text-xs text-maroon-deep/60">This item is no longer available.</p>
          <Link to="/customer/menu" className="mt-4 inline-block rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">
            Back to Menu
          </Link>
        </div>
      </main>
    );
  }

  if (unavailable || availableVariants.length === 0) {
    return (
      <main className="min-h-screen bg-cream">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gold/20 bg-cream/95 px-5 py-4 backdrop-blur">
          <Link to="/customer/menu" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-display text-lg text-maroon">{item.item_name}</h1>
        </header>
        <div className="m-5 rounded-3xl border border-dashed border-gold/40 bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-saffron-deep" />
          <p className="text-display mt-3 text-base text-maroon">Currently unavailable</p>
          <p className="mt-1 text-xs text-maroon-deep/60">
            This item is currently unavailable at the selected outlet.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link to="/customer/menu" className="rounded-xl border border-gold/40 px-4 py-2 text-xs font-semibold text-maroon">
              Back to Menu
            </Link>
            <Link to="/customer/outlets" className="rounded-xl bg-saffron px-4 py-2 text-xs font-semibold text-cream">
              Change Outlet
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const heroImg = images[activeImg]?.image_url ?? images[0]?.image_url;

  return (
    <main className="min-h-screen bg-cream pb-32">
      {/* Hero image */}
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-saffron/50 to-maroon/30">
        {heroImg ? (
          <img src={heroImg} alt={item.item_name} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-maroon/30">
            <ChefHat className="h-24 w-24" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link to="/customer/menu" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-maroon shadow backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full bg-cream/90 text-maroon shadow backdrop-blur">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-saffron px-1 text-[10px] font-bold text-cream">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-2">
          {item.is_bestseller && (
            <span className="rounded-full bg-saffron px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream shadow">Bestseller</span>
          )}
          {item.is_recommended && (
            <span className="rounded-full bg-maroon px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cream shadow">Recommended</span>
          )}
          {item.is_new && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-maroon-deep shadow">New</span>
          )}
          {dietaryName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cream/95 px-2 py-1 text-[10px] font-semibold shadow">
              <span className={`grid h-3 w-3 place-items-center rounded-sm border ${dietaryIsVeg ? "border-emerald-600" : "border-red-600"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dietaryIsVeg ? "bg-emerald-600" : "bg-red-600"}`} />
              </span>
              <span className={dietaryIsVeg ? "text-emerald-700" : "text-red-700"}>{dietaryName}</span>
            </span>
          )}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`h-1.5 rounded-full transition-all ${i === activeImg ? "w-6 bg-cream" : "w-1.5 bg-cream/60"}`} />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-md px-5 pt-5 sm:max-w-lg">
        {/* Details */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] uppercase tracking-wider text-saffron-deep">
            {[categoryName, subcategoryName, cuisineName].filter(Boolean).join(" • ") || "—"}
          </p>
          <h1 className="text-display mt-1 text-2xl text-maroon">{item.item_name}</h1>
          {item.short_description && (
            <p className="mt-2 text-sm text-maroon-deep/70">{item.short_description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-maroon-deep/70">
            {item.spice_level && (
              <span className="inline-flex items-center gap-1 rounded-full bg-maroon/10 px-2.5 py-1 text-maroon">
                <Flame className="h-3 w-3" /> {item.spice_level}
              </span>
            )}
            {item.preparation_type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-maroon">
                <Clock className="h-3 w-3" /> {item.preparation_type}
              </span>
            )}
            {item.is_bestseller && (
              <span className="inline-flex items-center gap-1 rounded-full bg-saffron/15 px-2.5 py-1 text-saffron-deep">
                <Star className="h-3 w-3 fill-current" /> Bestseller
              </span>
            )}
          </div>
          {item.full_description && (
            <p className="mt-3 text-sm text-maroon-deep/80">{item.full_description}</p>
          )}
          {item.ingredients && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider text-maroon-deep/60">Ingredients</p>
              <p className="mt-1 text-xs text-maroon-deep/70">{item.ingredients}</p>
            </div>
          )}
        </motion.section>

        {/* Variants */}
        <section className="mt-6">
          <h2 className="text-display text-lg text-maroon">Choose Quantity</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {availableVariants.map((v) => {
              const sel = selectedVariant === v.id;
              const hasDiscount = v.price.mrp_price != null && v.price.mrp_price > v.price.selling_price;
              const discount = hasDiscount
                ? Math.round(((v.price.mrp_price! - v.price.selling_price) / v.price.mrp_price!) * 100)
                : 0;
              return (
                <button key={v.id} onClick={() => setSelectedVariant(v.id)}
                  className={`relative rounded-2xl border p-3 text-left transition ${
                    sel ? "border-saffron bg-saffron/10 ring-2 ring-saffron/30" : "border-gold/30 bg-card"
                  }`}>
                  <p className="text-display text-sm text-maroon">{v.variant_name}</p>
                  {(v.quantity_label || v.serves_count) && (
                    <p className="text-[10px] text-maroon-deep/60">
                      {v.quantity_label}{v.quantity_label && v.serves_count ? " • " : ""}
                      {v.serves_count ? `Serves ${v.serves_count}` : ""}
                    </p>
                  )}
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold text-saffron-deep">₹{v.price.selling_price}</p>
                    {hasDiscount && (
                      <>
                        <p className="text-[10px] text-maroon-deep/50 line-through">₹{v.price.mrp_price}</p>
                        <p className="text-[10px] font-semibold text-emerald-600">{discount}% off</p>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Add-ons */}
        {addons.length > 0 && (
          <section className="mt-6">
            <h2 className="text-display text-lg text-maroon">Add-ons</h2>
            <div className="mt-2 flex flex-col gap-2">
              {addons.map((a) => {
                const q = addonQty[a.id] ?? 0;
                const max = a.max_quantity ?? 10;
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-gold/25 bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-maroon">{a.addon_name}</p>
                        {a.is_required ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-700">Required</span>
                        ) : (
                          <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-maroon-deep">Optional</span>
                        )}
                      </div>
                      {a.description && <p className="text-[11px] text-maroon-deep/60">{a.description}</p>}
                      <p className="text-[11px] text-saffron-deep">+₹{a.price}</p>
                    </div>
                    {q === 0 ? (
                      <button onClick={() => setAddonQty({ ...addonQty, [a.id]: 1 })}
                        className="rounded-lg bg-saffron/15 px-3 py-1.5 text-xs font-semibold text-saffron-deep">Add</button>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-gold/30 px-1">
                        <button onClick={() => setAddonQty({ ...addonQty, [a.id]: Math.max(0, q - 1) })}
                          className="grid h-7 w-7 place-items-center text-maroon"><Minus className="h-3 w-3" /></button>
                        <span className="w-4 text-center text-xs font-semibold text-maroon">{q}</span>
                        <button
                          disabled={q >= max}
                          onClick={() => setAddonQty({ ...addonQty, [a.id]: Math.min(max, q + 1) })}
                          className="grid h-7 w-7 place-items-center text-maroon disabled:opacity-30"><Plus className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="mt-6">
          <h2 className="text-display text-lg text-maroon">Special Instructions</h2>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Add cooking instructions, less oil, extra spicy, etc."
            className="mt-2 w-full resize-none rounded-2xl border border-gold/30 bg-card p-3 text-sm text-maroon-deep placeholder:text-maroon-deep/40 focus:border-saffron focus:outline-none"
          />
        </section>

        {/* Recommended */}
        {related.length > 0 && (
          <section className="mt-6">
            <h2 className="text-display text-lg text-maroon">Recommended For You</h2>
            <div className="mt-3 -mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex gap-3">
                {related.map((r) => (
                  <Link key={r.id} to={`/customer/item/${r.id}`}
                    className="w-36 shrink-0 overflow-hidden rounded-2xl border border-gold/25 bg-card shadow-sm">
                    <div className="h-20 bg-gradient-to-br from-gold/30 to-saffron/20">
                      {r.image ? (
                        <img src={r.image} alt={r.item_name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-maroon/30"><ChefHat className="h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold text-maroon">{r.item_name}</p>
                      {r.price != null && <p className="mt-1 text-xs text-maroon-deep">from ₹{r.price}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-cream/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-card p-1">
            <button onClick={() => setQty(Math.max(1, qty - 1))}
              className="grid h-8 w-8 place-items-center text-maroon"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-5 text-center text-sm font-semibold text-maroon">{qty}</span>
            <button onClick={() => setQty(qty + 1)}
              className="grid h-8 w-8 place-items-center text-maroon"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Total</p>
            <p className="text-sm font-bold text-maroon">₹{total}</p>
          </div>
          <button onClick={onAddToCart}
            className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-4 py-3 text-sm font-semibold text-cream shadow">
            Add to Cart
          </button>
        </div>
      </div>
    </main>
  );
}

export default ItemDetailScreen;
