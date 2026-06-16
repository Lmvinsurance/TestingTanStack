import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Search, ShoppingCart, ChefHat, Flame, Leaf, Star, AlertCircle, MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireCustomer } from "@/lib/use-require-customer";
import { CustomerSignOutButton } from "@/components/customer/CustomerSignOutButton";
import { useCart, useOutlet, cartTotal, addToCart } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/customer/menu")({
  head: () => ({ meta: [{ title: "Menu — Kosia Rajula Ruchulu" }] }),
  component: CustomerMenuScreen,
});

type Category = { id: string; category_name: string; display_order: number | null };
type Subcategory = { id: string; category_id: string; subcategory_name: string };
type Dietary = { id: string; dietary_name: string; dietary_code: string | null };
type Cuisine = { id: string; cuisine_name: string };
type Variant = { id: string; item_id: string; variant_name: string };
type Availability = { item_id: string; is_available: boolean; stock_status: string | null };
type Price = { item_id: string; variant_id: string; selling_price: number; mrp_price: number | null; is_available: boolean };
type Image = { item_id: string; image_url: string; is_primary: boolean | null; display_order: number | null };
type MenuItem = {
  id: string;
  category_id: string | null;
  subcategory_id: string | null;
  cuisine_id: string | null;
  dietary_type_id: string | null;
  item_name: string;
  short_description: string | null;
  spice_level: string | null;
  is_bestseller: boolean | null;
  is_recommended: boolean | null;
  is_new: boolean | null;
};

const FILTERS = ["Veg", "Non-Veg", "Bestseller", "Recommended", "Spicy", "New"];

function CustomerMenuScreen() {
  const ready = useRequireCustomer();
  const outlet = useOutlet();
  const navigate = useNavigate();
  const cart = useCart();
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [dietaries, setDietaries] = useState<Dietary[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [filter, setFilter] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // Redirect if no outlet
  useEffect(() => {
    if (!ready) return;
    if (!outlet) navigate({ to: "/customer/outlets", replace: true });
  }, [ready, outlet, navigate]);

  useEffect(() => {
    if (!ready || !outlet) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, sc, it, v, a, p, im, d, cu] = await Promise.all([
          supabase.from("menu_categories").select("id, category_name, display_order").eq("is_active", true).eq("is_deleted", false).order("display_order", { ascending: true }),
          supabase.from("menu_subcategories").select("id, category_id, subcategory_name").eq("is_active", true).eq("is_deleted", false),
          supabase.from("menu_items").select("id, category_id, subcategory_id, cuisine_id, dietary_type_id, item_name, short_description, spice_level, is_bestseller, is_recommended, is_new").eq("is_active", true).eq("is_deleted", false),
          supabase.from("item_variants").select("id, item_id, variant_name").eq("is_active", true),
          supabase.from("outlet_item_availability").select("item_id, is_available, stock_status").eq("outlet_id", outlet.id).eq("is_available", true),
          supabase.from("outlet_variant_prices").select("item_id, variant_id, selling_price, mrp_price, is_available").eq("outlet_id", outlet.id).eq("is_available", true),
          supabase.from("item_images").select("item_id, image_url, is_primary, display_order"),
          supabase.from("dietary_types").select("id, dietary_name, dietary_code").eq("is_active", true),
          supabase.from("cuisine_types").select("id, cuisine_name").eq("is_active", true),
        ]);
        if (cancelled) return;
        const first = [c, sc, it, v, a, p, im, d, cu].find((r) => r.error);
        if (first?.error) {
          setError(first.error.message);
          return;
        }
        setCats((c.data ?? []) as Category[]);
        setSubs((sc.data ?? []) as Subcategory[]);
        setItems((it.data ?? []) as MenuItem[]);
        setVariants((v.data ?? []) as Variant[]);
        setAvail((a.data ?? []) as Availability[]);
        setPrices((p.data ?? []) as Price[]);
        setImages((im.data ?? []) as Image[]);
        setDietaries((d.data ?? []) as Dietary[]);
        setCuisines((cu.data ?? []) as Cuisine[]);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ready, outlet]);

  const availableItemIds = useMemo(() => {
    return new Set(
      avail
        .filter((a) => a.is_available && (a.stock_status ?? "").toLowerCase() !== "sold_out")
        .map((a) => a.item_id)
    );
  }, [avail]);

  const pricesByItem = useMemo(() => {
    const m = new Map<string, Price[]>();
    const activeVariantIds = new Set(variants.map((v) => v.id));
    prices.filter((p) => p.is_available && activeVariantIds.has(p.variant_id)).forEach((p) => {
      const arr = m.get(p.item_id) ?? [];
      arr.push(p);
      m.set(p.item_id, arr);
    });
    return m;
  }, [prices, variants]);

  const imageByItem = useMemo(() => {
    const m = new Map<string, string>();
    [...images].sort((a, b) => {
      const ap = a.is_primary ? 0 : 1;
      const bp = b.is_primary ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (a.display_order ?? 999) - (b.display_order ?? 999);
    }).forEach((img) => {
      if (!m.has(img.item_id)) m.set(img.item_id, img.image_url);
    });
    return m;
  }, [images]);

  const dietaryById = useMemo(() => new Map(dietaries.map((d) => [d.id, d])), [dietaries]);
  const cuisineById = useMemo(() => new Map(cuisines.map((c) => [c.id, c])), [cuisines]);
  const categoryById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const subcategoryById = useMemo(() => new Map(subs.map((s) => [s.id, s])), [subs]);

  const isVegDietary = (id: string | null) => {
    if (!id) return false;
    const d = dietaryById.get(id);
    const code = (d?.dietary_code ?? d?.dietary_name ?? "").toLowerCase();
    return code.includes("veg") && !code.includes("non");
  };

  const visibleItems = useMemo(() => {
    return items.filter((i) => {
      if (!availableItemIds.has(i.id)) return false;
      const pr = pricesByItem.get(i.id);
      if (!pr || pr.length === 0) return false;
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (filter === "Veg" && !isVegDietary(i.dietary_type_id)) return false;
      if (filter === "Non-Veg" && isVegDietary(i.dietary_type_id)) return false;
      if (filter === "Bestseller" && !i.is_bestseller) return false;
      if (filter === "Recommended" && !i.is_recommended) return false;
      if (filter === "New" && !i.is_new) return false;
      if (filter === "Spicy" && !["spicy", "hot", "extra spicy"].includes((i.spice_level ?? "").toLowerCase())) return false;
      if (q.trim()) {
        const term = q.toLowerCase();
        const cat = categoryById.get(i.category_id ?? "")?.category_name ?? "";
        const sub = subcategoryById.get(i.subcategory_id ?? "")?.subcategory_name ?? "";
        const cui = cuisineById.get(i.cuisine_id ?? "")?.cuisine_name ?? "";
        const die = dietaryById.get(i.dietary_type_id ?? "")?.dietary_name ?? "";
        if (![i.item_name, cat, sub, cui, die].join(" ").toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [items, availableItemIds, pricesByItem, activeCat, filter, q, categoryById, subcategoryById, cuisineById, dietaryById]);

  const grouped = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    visibleItems.forEach((i) => {
      const k = i.category_id ?? "uncategorized";
      const arr = m.get(k) ?? [];
      arr.push(i);
      m.set(k, arr);
    });
    return m;
  }, [visibleItems]);

  const startingPrice = (itemId: string) => {
    const pr = pricesByItem.get(itemId);
    if (!pr || pr.length === 0) return null;
    return pr.reduce((min, p) => (p.selling_price < min ? p.selling_price : min), pr[0].selling_price);
  };

  const onAddDirect = (it: MenuItem) => {
    if (!outlet) return;
    const pr = pricesByItem.get(it.id) ?? [];
    if (pr.length === 0) return;
    if (pr.length > 1) {
      navigate({ to: "/customer/item-detail/$itemId", params: { itemId: it.id } });
      return;
    }
    const p = pr[0];
    const v = variants.find((x) => x.id === p.variant_id);
    addToCart({
      id: "",
      outletId: outlet.id,
      itemId: it.id,
      variantId: p.variant_id,
      name: it.item_name,
      variant: v?.variant_name ?? "Standard",
      price: p.selling_price,
      qty: 1,
      image: imageByItem.get(it.id),
    });
    toast.success("Item added to cart", { description: it.item_name });
  };

  if (!ready) return null;
  if (!outlet) return null;

  return (
    <main className="min-h-screen bg-cream pb-28">
      <header className="header-gradient sticky top-0 z-30 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/customer/outlets" aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Delivering from</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-maroon">{outlet.short}</p>
              <Link to="/customer/outlets" className="text-[11px] font-medium text-saffron-deep underline-offset-2 hover:underline">
                Change
              </Link>
            </div>
          </div>
          <Link to="/cart" className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-saffron px-1 text-[10px] font-bold text-cream">
                {cartCount}
              </span>
            )}
          </Link>
          <CustomerSignOutButton />
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search dishes, cuisines, categories"
              className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-11 pr-4 text-sm text-maroon-deep placeholder:text-maroon-deep/40 shadow-sm focus:border-saffron focus:outline-none"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl">
        {/* Category chips */}
        {!loading && !error && cats.length > 0 && (
          <div className="mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 pb-2">
              <button onClick={() => setActiveCat("all")}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeCat === "all" ? "border-saffron bg-saffron text-cream"
                    : "border-gold/30 bg-card text-maroon hover:border-gold/50"
                }`}>All</button>
              {cats.map((c) => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                    activeCat === c.id ? "border-saffron bg-saffron text-cream"
                      : "border-gold/30 bg-card text-maroon hover:border-gold/50"
                  }`}>{c.category_name}</button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && (
          <div className="overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 pb-3">
              {FILTERS.map((f) => (
                <button key={f} onClick={() => setFilter(filter === f ? null : f)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                    filter === f ? "border-maroon bg-maroon text-cream"
                      : "border-gold/30 bg-cream-warm/30 text-maroon-deep"
                  }`}>
                  {f === "Veg" && <Leaf className="mr-1 inline h-3 w-3" />}
                  {f === "Spicy" && <Flame className="mr-1 inline h-3 w-3" />}
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 px-4 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-gold/25 bg-card p-3">
                <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-gold/15" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gold/20" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gold/10" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gold/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="m-4 rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-red-700">Couldn't load menu</p>
            <p className="mt-1 text-xs text-red-600/80">{error}</p>
            <button onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visibleItems.length === 0 && (
          <div className="m-4 rounded-3xl border border-dashed border-gold/40 bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
              <Search className="h-6 w-6" />
            </div>
            <p className="text-display mt-3 text-base text-maroon">No items found</p>
            <p className="text-xs text-maroon-deep/60">Try another category or filter.</p>
          </div>
        )}

        {/* Menu list */}
        {!loading && !error && visibleItems.length > 0 && (
          <section className="mt-2 space-y-6 px-4 pb-4">
            {[...grouped.entries()].map(([catId, list]) => (
              <div key={catId}>
                <h3 className="text-display text-lg text-maroon">
                  {categoryById.get(catId)?.category_name ?? "Other"}
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {list.map((it) => {
                    const veg = isVegDietary(it.dietary_type_id);
                    const start = startingPrice(it.id);
                    const img = imageByItem.get(it.id);
                    return (
                      <motion.div key={it.id} whileTap={{ scale: 0.99 }}
                        className="flex gap-3 overflow-hidden rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-saffron/20 to-gold/20">
                          {img ? (
                            <img src={img} alt={it.item_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-maroon/30">
                              <ChefHat className="h-7 w-7" />
                            </div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`grid h-3.5 w-3.5 place-items-center rounded-sm border ${veg ? "border-emerald-600" : "border-red-600"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
                            </span>
                            {it.is_bestseller && (
                              <span className="rounded-full bg-saffron/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-saffron-deep">
                                <Star className="mr-0.5 inline h-2.5 w-2.5" />Bestseller
                              </span>
                            )}
                            {it.is_recommended && (
                              <span className="rounded-full bg-maroon/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-maroon">
                                Recommended
                              </span>
                            )}
                            {it.is_new && (
                              <span className="rounded-full bg-gold/25 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-maroon-deep">
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-display mt-0.5 text-sm text-maroon">{it.item_name}</p>
                          {it.short_description && (
                            <p className="line-clamp-2 mt-0.5 text-[11px] text-maroon-deep/60">{it.short_description}</p>
                          )}
                          {it.spice_level && (
                            <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-maroon-deep/60">
                              <Flame className="h-3 w-3 text-saffron" /> {it.spice_level}
                            </p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <span className="text-sm font-semibold text-maroon">
                              {start != null && <><span className="text-[10px] text-maroon-deep/50">from </span>₹{start}</>}
                            </span>
                            <div className="flex gap-1.5">
                              <Link to="/customer/item-detail/$itemId" params={{ itemId: it.id }}
                                className="rounded-lg border border-gold/40 px-2.5 py-1 text-[10px] font-medium text-maroon">
                                Details
                              </Link>
                              <button onClick={() => onAddDirect(it)}
                                className="rounded-lg bg-gradient-to-r from-saffron to-saffron-deep px-3 py-1 text-[11px] font-semibold text-cream shadow-sm">
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-cream/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron text-cream">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">{cartCount} item{cartCount > 1 ? "s" : ""}</p>
              <p className="text-sm font-semibold text-maroon">₹{cartTotal(cart)}</p>
            </div>
            <Link to="/cart"
              className="rounded-xl bg-gradient-to-r from-saffron to-saffron-deep px-5 py-2.5 text-sm font-semibold text-cream shadow">
              View Cart →
            </Link>
          </div>
        </motion.div>
      )}
      {/* Hidden marker */}
      <span className="hidden"><MapPin /></span>
    </main>
  );
}
