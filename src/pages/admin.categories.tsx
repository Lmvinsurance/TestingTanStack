;
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Tag, Loader2, Power, Edit } from "lucide-react";
import { AdminHeader, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";



type Category = {
  id: string;
  category_name: string;
  slug: string | null;
  description: string | null;
  display_order: number | null;
  is_active: boolean;
};

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [q, setQ] = useState("");

  const { data: categories = [], isLoading, error } = useQuery<Category[]>({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("id, category_name, slug, description, display_order, is_active")
        .eq("is_deleted", false)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("category_name");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const { data: itemCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin", "categories", "item-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("category_id")
        .eq("is_deleted", false);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
      });
      return counts;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; category_name: string; slug: string; description: string | null; display_order: number }) => {
      if (payload.id) {
        const { error } = await supabase
          .from("menu_categories")
          .update({
            category_name: payload.category_name,
            slug: payload.slug,
            description: payload.description ?? undefined,
            display_order: payload.display_order,
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("menu_categories").insert({
          category_name: payload.category_name,
          slug: payload.slug,
          description: payload.description ?? undefined,
          display_order: payload.display_order,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const toggleMut = useMutation({
    mutationFn: async (cat: Category) => {
      const { error } = await supabase
        .from("menu_categories")
        .update({ is_active: !cat.is_active })
        .eq("id", cat.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const filtered = categories.filter((c) => {
    if (filter === "Active" && !c.is_active) return false;
    if (filter === "Inactive" && c.is_active) return false;
    return c.category_name.toLowerCase().includes(q.toLowerCase());
  });

  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.is_active).length,
    items: Object.values(itemCounts).reduce((a, b) => a + b, 0),
  };

  const openAdd = () => { setEditing(null); setOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setOpen(true); };

  return (
    <AdminPage>
      <AdminHeader title="Categories" subtitle="Manage menu categories" />
      <div className="w-full max-w-6xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <StatCard label="Total" value={stats.total} tone="saffron" />
          <StatCard label="Active" value={stats.active} tone="emerald" />
          <StatCard label="Items" value={stats.items} tone="maroon" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Active", "Inactive"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-maroon-deep/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700">{(error as Error).message}</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-card p-8 text-center text-sm text-maroon-deep/60">
            No categories found
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-saffron/15 text-saffron-deep">
                  <Tag className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-display truncate text-sm text-maroon">{c.category_name}</h3>
                  <p className="truncate text-[10px] text-maroon-deep/60">{c.slug ?? "—"}</p>
                  <p className="mt-1 text-[11px] text-maroon-deep/70">{itemCounts[c.id] ?? 0} items</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${c.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>{c.is_active ? "Active" : "Inactive"}</span>
              </div>
              {c.description && <p className="mt-2 line-clamp-2 text-[11px] text-maroon-deep/60">{c.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-gold/15 pt-2 text-[11px] font-semibold">
                <button onClick={() => openEdit(c)} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-maroon"><Edit className="h-3 w-3" /> Edit</button>
                <button onClick={() => toggleMut.mutate(c)} disabled={toggleMut.isPending} className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-saffron-deep"><Power className="h-3 w-3" /> {c.is_active ? "Disable" : "Enable"}</button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <button onClick={openAdd} className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl">
        <Plus className="h-4 w-4" /> Add Category
      </button>

      <AnimatePresence>
        {open && (
          <CategoryFormSheet
            initial={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
            onSave={(payload) => saveMut.mutate(payload)}
            saving={saveMut.isPending}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function CategoryFormSheet({ initial, onClose, onSave, saving }: {
  initial: Category | null;
  onClose: () => void;
  onSave: (p: { id?: string; category_name: string; slug: string; description: string | null; display_order: number }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.category_name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [order, setOrder] = useState<string>(String(initial?.display_order ?? 0));

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40" />
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:top-6 sm:w-[480px] sm:rounded-3xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40 sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl text-maroon">{initial ? "Edit Category" : "Add Category"}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" /></Field>
          <Field label="Slug"><input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. biryani" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" /></Field>
          <Field label="Description"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" /></Field>
          <Field label="Display Order"><input value={order} onChange={(e) => setOrder(e.target.value)} type="number" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" /></Field>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
            <button
              onClick={() => {
                if (!name.trim()) return toast.error("Name required");
                const finalSlug = slug.trim() || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                onSave({ id: initial?.id, category_name: name.trim(), slug: finalSlug, description: desc.trim() || null, display_order: Number(order) || 0 });
              }}
              disabled={saving}
              className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-50"
            >{saving ? "Saving…" : "Save"}</button>
          </div>
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

export default CategoriesAdmin;
