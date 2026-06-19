import { Link } from "react-router-dom";;
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Utensils, Edit, Eye, Layers, Image as ImageIcon, Star, Award, Loader2, Power } from "lucide-react";
import { AdminHeader, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";



type Item = {
  id: string;
  item_name: string;
  short_description: string | null;
  full_description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  cuisine_id: string | null;
  dietary_type_id: string | null;
  spice_level: string | null;
  is_bestseller: boolean | null;
  is_recommended: boolean | null;
  is_new: boolean | null;
  is_active: boolean;
};
type Lookup = { id: string; name: string };

function ItemsAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Item | null>(null);
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive" | "Bestseller" | "Recommended" | "New">("All");
  const [catFilter, setCatFilter] = useState("");
  const [q, setQ] = useState("");

  const { data: items = [], isLoading, error } = useQuery<Item[]>({
    queryKey: ["admin", "items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, item_name, short_description, full_description, category_id, subcategory_id, cuisine_id, dietary_type_id, spice_level, is_bestseller, is_recommended, is_new, is_active")
        .eq("is_deleted", false)
        .order("item_name");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: cats = [] } = useQuery<Lookup[]>({
    queryKey: ["lookup", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_categories").select("id, category_name").eq("is_deleted", false).order("category_name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.category_name }));
    },
  });
  const { data: subs = [] } = useQuery<(Lookup & { category_id: string })[]>({
    queryKey: ["lookup", "subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_subcategories").select("id, category_id, subcategory_name").eq("is_deleted", false).order("subcategory_name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.subcategory_name, category_id: r.category_id }));
    },
  });
  const { data: cuisines = [] } = useQuery<Lookup[]>({
    queryKey: ["lookup", "cuisines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cuisine_types").select("id, cuisine_name").order("cuisine_name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.cuisine_name }));
    },
  });
  const { data: diets = [] } = useQuery<Lookup[]>({
    queryKey: ["lookup", "dietary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("dietary_types").select("id, dietary_name").order("dietary_name");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, name: r.dietary_name }));
    },
  });

  const lookupName = (arr: Lookup[], id: string | null) => arr.find((r) => r.id === id)?.name ?? "—";

  const toggleMut = useMutation({
    mutationFn: async (it: Item) => {
      const { error } = await supabase.from("menu_items").update({ is_active: !it.is_active }).eq("id", it.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "items"] }),
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const saveMut = useMutation({
    mutationFn: async (payload: Partial<Item> & { item_name: string }) => {
      if (!payload.category_id) throw new Error("Category is required");
      const slug = payload.item_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error } = await supabase.from("menu_items").insert({
        item_name: payload.item_name,
        slug,
        short_description: payload.short_description ?? undefined,
        category_id: payload.category_id,
        subcategory_id: payload.subcategory_id ?? undefined,
        cuisine_id: payload.cuisine_id ?? undefined,
        dietary_type_id: payload.dietary_type_id ?? undefined,
        spice_level: payload.spice_level ?? undefined,
        is_bestseller: payload.is_bestseller ?? false,
        is_recommended: payload.is_recommended ?? false,
        is_new: payload.is_new ?? false,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item added");
      qc.invalidateQueries({ queryKey: ["admin", "items"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const filtered = items.filter((it) => {
    if (filter === "Active" && !it.is_active) return false;
    if (filter === "Inactive" && it.is_active) return false;
    if (filter === "Bestseller" && !it.is_bestseller) return false;
    if (filter === "Recommended" && !it.is_recommended) return false;
    if (filter === "New" && !it.is_new) return false;
    if (catFilter && it.category_id !== catFilter) return false;
    return it.item_name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <AdminPage>
      <AdminHeader title="Menu Items" subtitle="Manage menu items, variants, pricing" back="/admin/dashboard" />
      <div className="w-full max-w-6xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCard label="Total Items" value={items.length} tone="saffron" />
          <StatCard label="Active" value={items.filter((i) => i.is_active).length} tone="emerald" />
          <StatCard label="Bestsellers" value={items.filter((i) => i.is_bestseller).length} tone="maroon" />
          <StatCard label="New" value={items.filter((i) => i.is_new).length} tone="blue" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item name" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-gold/30 bg-card px-3 py-1.5 text-[11px] text-maroon">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(["All", "Active", "Inactive", "Bestseller", "Recommended", "New"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>

        {isLoading && <div className="flex items-center justify-center gap-2 py-12 text-sm text-maroon-deep/60"><Loader2 className="h-4 w-4 animate-spin" /> Loading items…</div>}
        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">{(error as Error).message}</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-card p-8 text-center text-sm text-maroon-deep/60">No items found</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it, i) => (
            <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="overflow-hidden rounded-2xl border border-gold/25 bg-card shadow-sm">
              <div className="flex gap-3 p-3">
                <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-saffron/30 to-saffron/10 text-maroon/40">
                  <Utensils className="h-7 w-7" />
                  {it.is_bestseller && <span className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-saffron px-1.5 py-0.5 text-[8px] font-bold text-cream shadow"><Star className="h-2.5 w-2.5" />Best</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-display truncate text-sm text-maroon">{it.item_name}</h3>
                  <p className="mt-0.5 truncate text-[10px] text-maroon-deep/60">{lookupName(cats, it.category_id)} • {lookupName(cuisines, it.cuisine_id)}</p>
                  {it.short_description && <p className="mt-1 line-clamp-2 text-[10px] text-maroon-deep/60">{it.short_description}</p>}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-maroon/10 px-1.5 py-0.5 text-[9px] font-semibold text-maroon">{lookupName(diets, it.dietary_type_id)}</span>
                    {it.is_recommended && <span className="inline-flex items-center gap-0.5 rounded-full bg-gold/30 px-1.5 py-0.5 text-[8px] font-bold text-maroon"><Award className="h-2.5 w-2.5" />Recommended</span>}
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${it.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>{it.is_active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold">
                <button onClick={() => setView(it)} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-maroon"><Eye className="h-3 w-3" />View</button>
                <button onClick={() => toggleMut.mutate(it)} disabled={toggleMut.isPending} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-saffron-deep"><Power className="h-3 w-3" />{it.is_active ? "Off" : "On"}</button>
                <Link to="/admin/pricing" className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-saffron-deep"><Layers className="h-3 w-3" />Price</Link>
                <Link to="/admin/images" className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-saffron-deep"><ImageIcon className="h-3 w-3" />Images</Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl">
        <Plus className="h-4 w-4" /> Add Item
      </button>

      <AnimatePresence>
        {view && <ViewSheet item={view} cats={cats} subs={subs} cuisines={cuisines} diets={diets} onClose={() => setView(null)} />}
        {open && (
          <ItemFormSheet
            cats={cats} subs={subs} cuisines={cuisines} diets={diets}
            onClose={() => setOpen(false)}
            onSave={(p) => saveMut.mutate(p)}
            saving={saveMut.isPending}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function ViewSheet({ item, cats, subs, cuisines, diets, onClose }: { item: Item; cats: Lookup[]; subs: (Lookup & { category_id: string })[]; cuisines: Lookup[]; diets: Lookup[]; onClose: () => void }) {
  const n = (a: Lookup[], id: string | null) => a.find((r) => r.id === id)?.name ?? "—";
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-6 sm:w-[520px] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl text-maroon">{item.item_name}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3 text-sm text-maroon-deep">
          <Row k="Category" v={n(cats, item.category_id)} />
          <Row k="Subcategory" v={n(subs, item.subcategory_id)} />
          <Row k="Cuisine" v={n(cuisines, item.cuisine_id)} />
          <Row k="Dietary" v={n(diets, item.dietary_type_id)} />
          <Row k="Spice" v={item.spice_level ?? "—"} />
          <Row k="Status" v={item.is_active ? "Active" : "Inactive"} />
          {item.short_description && <div className="rounded-xl bg-card p-3 text-xs">{item.short_description}</div>}
          {item.full_description && <div className="rounded-xl bg-card p-3 text-xs">{item.full_description}</div>}
        </div>
      </motion.div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-gold/15 py-1 text-xs"><span className="text-maroon-deep/60">{k}</span><span className="font-semibold text-maroon">{v}</span></div>;
}

function ItemFormSheet({ cats, subs, cuisines, diets, onClose, onSave, saving }: {
  cats: Lookup[]; subs: (Lookup & { category_id: string })[]; cuisines: Lookup[]; diets: Lookup[];
  onClose: () => void;
  onSave: (p: Partial<Item> & { item_name: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState("");
  const [subId, setSubId] = useState("");
  const [cuisineId, setCuisineId] = useState("");
  const [dietId, setDietId] = useState("");
  const [spice, setSpice] = useState("");
  const [best, setBest] = useState(false);
  const [rec, setRec] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const subOpts = subs.filter((s) => !catId || s.category_id === catId);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-6 sm:w-[520px] sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl text-maroon">Add Menu Item</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3 text-xs">
          <Field label="Item Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5" /></Field>
          <Field label="Short Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category"><select value={catId} onChange={(e) => { setCatId(e.target.value); setSubId(""); }} className="w-full rounded-xl border border-gold/30 bg-card px-2 py-2.5"><option value="">Select</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Subcategory"><select value={subId} onChange={(e) => setSubId(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-2 py-2.5"><option value="">Select</option>{subOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Cuisine"><select value={cuisineId} onChange={(e) => setCuisineId(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-2 py-2.5"><option value="">Select</option>{cuisines.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Dietary"><select value={dietId} onChange={(e) => setDietId(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-2 py-2.5"><option value="">Select</option>{diets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
          </div>
          <Field label="Spice Level">
            <div className="grid grid-cols-4 gap-1.5">
              {["mild", "medium", "spicy", "extra_spicy"].map((s) => (
                <button key={s} onClick={() => setSpice(s)} className={`rounded-xl border py-2 text-[10px] font-semibold ${spice === s ? "border-saffron bg-saffron/15 text-saffron-deep" : "border-gold/30 bg-card text-maroon"}`}>{s}</button>
              ))}
            </div>
          </Field>
          {[
            { l: "Bestseller", v: best, set: setBest },
            { l: "Recommended", v: rec, set: setRec },
            { l: "New Arrival", v: isNew, set: setIsNew },
          ].map(({ l, v, set }) => (
            <label key={l} className="flex items-center justify-between rounded-xl border border-gold/30 bg-card px-3 py-2 text-maroon"><span>{l}</span><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /></label>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
            <button
              onClick={() => {
                if (!name.trim()) return toast.error("Name required");
                onSave({
                  item_name: name.trim(),
                  short_description: desc.trim() || null,
                  category_id: catId || null,
                  subcategory_id: subId || null,
                  cuisine_id: cuisineId || null,
                  dietary_type_id: dietId || null,
                  spice_level: spice || null,
                  is_bestseller: best,
                  is_recommended: rec,
                  is_new: isNew,
                });
              }}
              disabled={saving}
              className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-50"
            >{saving ? "Saving…" : "Save"}</button>
          </div>
          <p className="pt-1 text-[10px] text-maroon-deep/60">After saving, set outlet pricing in <Link to="/admin/pricing" className="underline">Pricing</Link>, add variants in <Link to="/admin/variants" className="underline">Variants</Link>, and upload photos in <Link to="/admin/images" className="underline">Images</Link>.</p>
        </div>
      </motion.div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">{label}</p>
      {children}
    </div>
  );
}

export default ItemsAdmin;
