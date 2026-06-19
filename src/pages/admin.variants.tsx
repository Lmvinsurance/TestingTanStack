import { Link } from "react-router-dom";;
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Edit, Copy, Power, TrendingUp, Loader2, AlertCircle, Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import {
  listAdminVariants,
  createAdminVariant,
  updateAdminVariant,
  setAdminVariantActive,
} from "@/lib/admin-variants.functions";



type VariantRow = {
  id: string;
  item_id: string;
  variant_name: string;
  quantity_label: string | null;
  serves_count: number | null;
  base_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
type ItemRow = { id: string; item_name: string; category_id: string | null; is_active: boolean };

type FormState = {
  id?: string;
  item_id: string;
  variant_name: string;
  quantity_label: string;
  serves_count: string;
  base_price: string;
  is_active: boolean;
};

const emptyForm = (item_id = ""): FormState => ({
  item_id,
  variant_name: "",
  quantity_label: "",
  serves_count: "",
  base_price: "",
  is_active: true,
});

function VariantsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listAdminVariants);
  const create = useServerFn(createAdminVariant);
  const update = useServerFn(updateAdminVariant);
  const toggle = useServerFn(setAdminVariantActive);

  const q = useQuery({
    queryKey: ["admin", "variants"],
    queryFn: () => list(),
    retry: 1,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [confirm, setConfirm] = useState<{ v: VariantRow } | null>(null);

  const itemsById = useMemo(() => {
    const m = new Map<string, ItemRow>();
    (q.data?.items ?? []).forEach((i) => m.set(i.id, i as ItemRow));
    return m;
  }, [q.data]);

  const grouped = useMemo(() => {
    const variants = (q.data?.variants ?? []) as VariantRow[];
    const needle = search.trim().toLowerCase();
    const filtered = variants.filter((v) => {
      if (filter === "Active" && !v.is_active) return false;
      if (filter === "Inactive" && v.is_active) return false;
      if (!needle) return true;
      const item = itemsById.get(v.item_id);
      return [item?.item_name, v.variant_name, v.quantity_label]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(needle));
    });
    const groups = new Map<string, VariantRow[]>();
    filtered.forEach((v) => {
      const arr = groups.get(v.item_id) ?? [];
      arr.push(v);
      groups.set(v.item_id, arr);
    });
    return Array.from(groups.entries()).map(([itemId, vs]) => ({
      itemId,
      item: itemsById.get(itemId),
      variants: vs,
    }));
  }, [q.data, search, filter, itemsById]);

  const totals = useMemo(() => {
    const all = (q.data?.variants ?? []) as VariantRow[];
    return {
      total: all.length,
      active: all.filter((v) => v.is_active).length,
      inactive: all.filter((v) => !v.is_active).length,
      items: new Set(all.map((v) => v.item_id)).size,
    };
  }, [q.data]);

  const role = q.data?.role;
  const canManage = role === "super_admin";
  const noAccess = role && role !== "super_admin" && role !== "outlet_admin";

  const saveMut = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = {
        item_id: f.item_id,
        variant_name: f.variant_name,
        quantity_label: f.quantity_label || null,
        serves_count: f.serves_count === "" ? null : Number(f.serves_count),
        base_price: Number(f.base_price),
        is_active: f.is_active,
      };
      if (f.id) return update({ data: { id: f.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(form.id ? "Variant updated" : "Variant added");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "variants"] });
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const toggleMut = useMutation({
    mutationFn: (p: { id: string; is_active: boolean }) => toggle({ data: p }),
    onSuccess: () => {
      toast.success("Status updated");
      setConfirm(null);
      qc.invalidateQueries({ queryKey: ["admin", "variants"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const openAdd = (item_id = "") => {
    setForm(emptyForm(item_id));
    setOpen(true);
  };
  const openEdit = (v: VariantRow) => {
    setForm({
      id: v.id,
      item_id: v.item_id,
      variant_name: v.variant_name,
      quantity_label: v.quantity_label ?? "",
      serves_count: v.serves_count != null ? String(v.serves_count) : "",
      base_price: String(v.base_price ?? ""),
      is_active: v.is_active,
    });
    setOpen(true);
  };
  const openDuplicate = (v: VariantRow) => {
    setForm({
      item_id: v.item_id,
      variant_name: `${v.variant_name} (Copy)`,
      quantity_label: v.quantity_label ?? "",
      serves_count: v.serves_count != null ? String(v.serves_count) : "",
      base_price: String(v.base_price ?? ""),
      is_active: v.is_active,
    });
    setOpen(true);
  };

  if (noAccess) {
    return (
      <AdminPage>
        <AdminHeader title="Item Variants" subtitle="Access denied" back="/admin/dashboard" />
        <div className="mx-auto max-w-md px-4 py-10 text-center sm:max-w-lg">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-2 text-display text-lg text-maroon">Access denied</p>
          <p className="text-xs text-maroon-deep/70">Your role does not have access to item variants.</p>
        </div>
        <AdminBottomNav />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader title="Item Variants" subtitle="Manage product sizes, quantities and pricing" back="/admin/items" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 pb-32 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Variants" value={totals.total} tone="saffron" />
          <StatCard label="Active" value={totals.active} tone="emerald" />
          <StatCard label="Inactive" value={totals.inactive} tone="maroon" />
          <StatCard label="Items" value={totals.items} tone="blue" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item or variant"
            className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Active", "Inactive"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        {q.isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-card/60" />
            ))}
          </div>
        )}

        {q.isError && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            <AlertCircle className="mx-auto mb-1 h-5 w-5" />
            {(q.error as Error)?.message || "Failed to load variants"}
            <button onClick={() => q.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {q.isSuccess && grouped.length === 0 && (
          <div className="rounded-3xl border border-gold/25 bg-card/70 p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-maroon-deep/30" />
            <p className="mt-2 text-display text-base text-maroon">No variants found</p>
            <p className="text-xs text-maroon-deep/60">
              {search || filter !== "All" ? "Try changing the search or filter." : "Add your first variant to get started."}
            </p>
          </div>
        )}

        {grouped.map((g, ii) => (
          <motion.section
            key={g.itemId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ii * 0.04 }}
            className="overflow-hidden rounded-3xl border border-gold/25 bg-card/80 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-gold/20 bg-gradient-to-r from-saffron/15 to-gold/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-display truncate text-base text-maroon">
                  {g.item?.item_name ?? "Unknown item"}
                </p>
                <p className="text-[10px] text-maroon-deep/60">
                  {g.item?.is_active ? "Active item" : "Inactive item"}
                </p>
              </div>
              <span className="rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-cream">
                {g.variants.length}
              </span>
            </div>
            <div className="space-y-2 p-3">
              {g.variants.map((v) => (
                <div key={v.id} className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-display truncate text-sm text-maroon">{v.variant_name}</p>
                      <p className="text-[10px] text-maroon-deep/60">
                        {v.quantity_label || "—"}
                        {v.serves_count ? ` • Serves ${v.serves_count}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-display text-base text-saffron-deep">₹{Number(v.base_price).toFixed(0)}</p>
                      <span className={`text-[9px] font-bold ${v.is_active ? "text-emerald-700" : "text-red-700"}`}>
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] font-semibold">
                    <button
                      disabled={!canManage}
                      onClick={() => openEdit(v)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-maroon disabled:opacity-40"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button
                      disabled={!canManage}
                      onClick={() => openDuplicate(v)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-maroon disabled:opacity-40"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      disabled={!canManage}
                      onClick={() => setConfirm({ v })}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-red-700 disabled:opacity-40"
                    >
                      <Power className="h-3 w-3" />
                    </button>
                    <Link
                      to="/admin/pricing"
                      className="inline-flex items-center justify-center gap-1 rounded-md bg-saffron/15 py-1 text-saffron-deep"
                    >
                      <TrendingUp className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      {canManage && (
        <button
          onClick={() => openAdd()}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl"
        >
          <Plus className="h-4 w-4" /> Add Variant
        </button>
      )}
      <AdminBottomNav />

      {/* Add/Edit modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5"
            >
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">{form.id ? "Edit Variant" : "Add Variant"}</h2>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Parent Item *">
                  <select
                    value={form.item_id}
                    onChange={(e) => setForm({ ...form, item_id: e.target.value })}
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  >
                    <option value="">Select item…</option>
                    {(q.data?.items ?? [])
                      .filter((i) => i.is_active)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.item_name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Variant Name *">
                  <input
                    value={form.variant_name}
                    onChange={(e) => setForm({ ...form, variant_name: e.target.value })}
                    placeholder="Half Plate"
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  />
                </Field>
                <Field label="Quantity Label">
                  <input
                    value={form.quantity_label}
                    onChange={(e) => setForm({ ...form, quantity_label: e.target.value })}
                    placeholder="500g / Half / Family Pack"
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  />
                </Field>
                <Field label="Serves Count">
                  <input
                    type="number"
                    value={form.serves_count}
                    onChange={(e) => setForm({ ...form, serves_count: e.target.value })}
                    placeholder="2"
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  />
                </Field>
                <Field label="Base Price (₹) *">
                  <input
                    type="number"
                    step="0.01"
                    value={form.base_price}
                    onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    placeholder="350"
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  />
                </Field>
                <label className="flex items-center justify-between rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs text-maroon">
                  <span>Active</span>
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saveMut.isPending}
                    onClick={() => saveMut.mutate(form)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60"
                  >
                    {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Activate/Deactivate confirm */}
      <AnimatePresence>
        {confirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirm(null)}
              className="fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-cream p-5 shadow-2xl"
            >
              <h3 className="text-display text-lg text-maroon">
                {confirm.v.is_active ? "Deactivate variant?" : "Activate variant?"}
              </h3>
              <p className="mt-1 text-xs text-maroon-deep/70">
                {confirm.v.variant_name} ({itemsById.get(confirm.v.item_id)?.item_name ?? "—"})
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border border-gold/40 py-2.5 text-sm font-semibold text-maroon"
                >
                  Cancel
                </button>
                <button
                  disabled={toggleMut.isPending}
                  onClick={() => toggleMut.mutate({ id: confirm.v.id, is_active: !confirm.v.is_active })}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
                >
                  {toggleMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold text-maroon-deep/60">{label}</p>
      {children}
    </div>
  );
}

export default VariantsAdmin;
