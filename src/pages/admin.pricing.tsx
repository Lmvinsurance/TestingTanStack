// @ts-nocheck
;
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Edit, ChevronDown, AlertTriangle, Loader2, AlertCircle, Inbox, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import {
  listOutletPricing,
  upsertOutletPrice,
  setOutletPriceAvailable,
} from "@/lib/admin-pricing.functions";



type PriceRow = {
  id: string;
  outlet_id: string;
  item_id: string;
  variant_id: string;
  selling_price: number;
  mrp_price: number | null;
  is_available: boolean;
  updated_at: string;
};
type FormState = {
  id?: string;
  outlet_id: string;
  item_id: string;
  variant_id: string;
  selling_price: string;
  mrp_price: string;
  is_available: boolean;
};

const emptyForm: FormState = {
  outlet_id: "",
  item_id: "",
  variant_id: "",
  selling_price: "",
  mrp_price: "",
  is_available: true,
};

function PricingAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listOutletPricing);
  const upsert = useServerFn(upsertOutletPrice);
  const toggle = useServerFn(setOutletPriceAvailable);

  const q = useQuery({ queryKey: ["admin", "pricing"], queryFn: () => list(), retry: 1 });

  const [outletTab, setOutletTab] = useState<string>("ALL");
  const [filter, setFilter] = useState<"All" | "Available" | "Unavailable">("All");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<FormState | null>(null);

  const itemsById = useMemo(() => new Map((q.data?.items ?? []).map((i) => [i.id, i])), [q.data]);
  const variantsById = useMemo(() => new Map((q.data?.variants ?? []).map((v) => [v.id, v])), [q.data]);
  const outletsById = useMemo(() => new Map((q.data?.outlets ?? []).map((o) => [o.id, o])), [q.data]);

  const role = q.data?.role;
  const canManage = role === "super_admin" || role === "outlet_admin";

  // Apply outlet/search/filter then group by item
  const grouped = useMemo(() => {
    const prices = (q.data?.prices ?? []) as PriceRow[];
    const needle = search.trim().toLowerCase();
    const filtered = prices.filter((p) => {
      if (outletTab !== "ALL" && p.outlet_id !== outletTab) return false;
      if (filter === "Available" && !p.is_available) return false;
      if (filter === "Unavailable" && p.is_available) return false;
      if (!needle) return true;
      const item = itemsById.get(p.item_id);
      const variant = variantsById.get(p.variant_id);
      const outlet = outletsById.get(p.outlet_id);
      return [item?.item_name, variant?.variant_name, variant?.quantity_label, outlet?.outlet_name]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(needle));
    });
    const byItem = new Map<string, PriceRow[]>();
    filtered.forEach((p) => {
      const arr = byItem.get(p.item_id) ?? [];
      arr.push(p);
      byItem.set(p.item_id, arr);
    });
    return Array.from(byItem.entries()).map(([itemId, rows]) => ({
      itemId,
      item: itemsById.get(itemId),
      rows,
    }));
  }, [q.data, outletTab, filter, search, itemsById, variantsById, outletsById]);

  // Missing prices: active variants × outlets that have no price row
  const missing = useMemo(() => {
    const prices = (q.data?.prices ?? []) as PriceRow[];
    const variants = (q.data?.variants ?? []).filter((v) => v.is_active);
    const outlets = (q.data?.outlets ?? []).filter((o) =>
      outletTab === "ALL" ? true : o.id === outletTab,
    );
    const have = new Set(prices.map((p) => `${p.outlet_id}:${p.variant_id}`));
    const out: { outlet_id: string; variant_id: string; item_id: string }[] = [];
    for (const o of outlets) {
      for (const v of variants) {
        if (!have.has(`${o.id}:${v.id}`)) {
          out.push({ outlet_id: o.id, variant_id: v.id, item_id: v.item_id });
        }
      }
      if (out.length > 20) break;
    }
    return out.slice(0, 20);
  }, [q.data, outletTab]);

  const totals = useMemo(() => {
    const all = (q.data?.prices ?? []) as PriceRow[];
    return {
      total: all.length,
      available: all.filter((p) => p.is_available).length,
      unavailable: all.filter((p) => !p.is_available).length,
      outlets: (q.data?.outlets ?? []).length,
    };
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: (f: FormState) =>
      upsert({
        data: {
          outlet_id: f.outlet_id,
          item_id: f.item_id,
          variant_id: f.variant_id,
          selling_price: Number(f.selling_price),
          mrp_price: f.mrp_price === "" ? null : Number(f.mrp_price),
          is_available: f.is_available,
        },
      }),
    onSuccess: () => {
      toast.success("Price saved");
      setModal(null);
      qc.invalidateQueries({ queryKey: ["admin", "pricing"] });
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const toggleMut = useMutation({
    mutationFn: (p: { id: string; is_available: boolean }) => toggle({ data: p }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "pricing"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  const openAdd = (preset?: Partial<FormState>) => {
    setModal({ ...emptyForm, ...(preset || {}) });
  };
  const openEdit = (p: PriceRow) => {
    setModal({
      id: p.id,
      outlet_id: p.outlet_id,
      item_id: p.item_id,
      variant_id: p.variant_id,
      selling_price: String(p.selling_price),
      mrp_price: p.mrp_price != null ? String(p.mrp_price) : "",
      is_available: p.is_available,
    });
  };

  return (
    <AdminPage>
      <AdminHeader title="Outlet Pricing" subtitle="Manage outlet-wise variant pricing" back="/admin/items" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 pb-32 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Records" value={totals.total} tone="saffron" />
          <StatCard label="Available" value={totals.available} tone="emerald" />
          <StatCard label="Unavailable" value={totals.unavailable} tone="maroon" />
          <StatCard label="Outlets" value={totals.outlets} tone="amber" />
        </div>

        {/* outlet tabs */}
        <div className="rounded-2xl border border-gold/25 bg-card p-1.5">
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setOutletTab("ALL")}
              className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${outletTab === "ALL" ? "bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow" : "text-maroon"}`}
            >
              All
            </button>
            {(q.data?.outlets ?? []).map((o) => (
              <button
                key={o.id}
                onClick={() => setOutletTab(o.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold transition ${outletTab === o.id ? "bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow" : "text-maroon"}`}
              >
                {o.outlet_name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search outlet, item or variant"
            className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Available", "Unavailable"] as const).map((f) => (
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
            {(q.error as Error)?.message || "Failed to load pricing"}
            <button onClick={() => q.refetch()} className="ml-2 underline">Retry</button>
          </div>
        )}
        {q.isSuccess && grouped.length === 0 && missing.length === 0 && (
          <div className="rounded-3xl border border-gold/25 bg-card/70 p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-maroon-deep/30" />
            <p className="mt-2 text-display text-base text-maroon">No pricing records</p>
            <p className="text-xs text-maroon-deep/60">Add your first outlet price.</p>
          </div>
        )}

        {grouped.map((g) => {
          const isOpen = open[g.itemId] ?? true;
          return (
            <motion.div key={g.itemId} layout className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
              <button
                onClick={() => setOpen({ ...open, [g.itemId]: !isOpen })}
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <div className="min-w-0">
                  <h3 className="text-display truncate text-sm text-maroon">{g.item?.item_name ?? "Unknown item"}</h3>
                  <p className="text-[10px] text-saffron-deep">{g.rows.length} price record(s)</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-maroon transition ${isOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-gold/20">
                    {g.rows.map((p) => {
                      const variant = variantsById.get(p.variant_id);
                      const outlet = outletsById.get(p.outlet_id);
                      const off = p.mrp_price && p.mrp_price > 0 ? Math.round(((p.mrp_price - p.selling_price) / p.mrp_price) * 100) : 0;
                      return (
                        <div key={p.id} className="border-b border-gold/15 p-3 last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-display truncate text-sm text-maroon">{variant?.variant_name ?? "—"} <span className="text-[10px] text-maroon-deep/60">• {outlet?.outlet_name ?? "—"}</span></p>
                              <p className="text-[10px] text-maroon-deep/60">{variant?.quantity_label || ""}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${p.is_available ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"}`}>
                                {p.is_available ? "Available" : "Unavailable"}
                              </span>
                              <button
                                disabled={!canManage}
                                onClick={() => openEdit(p)}
                                className="grid h-7 w-7 place-items-center rounded-full border border-gold/30 text-maroon disabled:opacity-40"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px]">
                            {p.mrp_price != null && p.mrp_price > p.selling_price && (
                              <span className="text-maroon-deep/60 line-through">₹{Number(p.mrp_price).toFixed(0)}</span>
                            )}
                            <span className="text-display text-base text-saffron-deep">₹{Number(p.selling_price).toFixed(0)}</span>
                            {off > 0 && (
                              <span className="rounded-full bg-saffron/15 px-1.5 py-0.5 text-[9px] font-bold text-saffron-deep">{off}% OFF</span>
                            )}
                          </div>
                          {canManage && (
                            <button
                              onClick={() => toggleMut.mutate({ id: p.id, is_available: !p.is_available })}
                              className="mt-2 text-[10px] font-semibold text-saffron-deep"
                            >
                              {p.is_available ? "Deactivate" : "Activate"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {missing.length > 0 && (
          <div className="rounded-3xl border border-gold/25 bg-card p-3">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="text-display text-sm text-maroon">Missing Prices</p></div>
            <div className="mt-2 space-y-1.5">
              {missing.map((m, i) => {
                const item = itemsById.get(m.item_id);
                const variant = variantsById.get(m.variant_id);
                const outlet = outletsById.get(m.outlet_id);
                return (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900">
                    <span className="truncate">{item?.item_name} • {variant?.variant_name} • {outlet?.outlet_name}</span>
                    {canManage && (
                      <button
                        onClick={() =>
                          openAdd({
                            outlet_id: m.outlet_id,
                            item_id: m.item_id,
                            variant_id: m.variant_id,
                            selling_price: variant ? String(variant.base_price ?? "") : "",
                          })
                        }
                        className="shrink-0 rounded-full bg-saffron px-2 py-0.5 text-[10px] font-bold text-cream"
                      >
                        Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {canManage && (
        <button
          onClick={() => openAdd()}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl"
        >
          <Plus className="h-4 w-4" /> Add Price
        </button>
      )}
      <AdminBottomNav />

      <AnimatePresence>
        {modal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModal(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">{modal.id ? "Edit Price" : "Add / Update Price"}</h2>
                <button onClick={() => setModal(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Outlet *">
                  <select value={modal.outlet_id} onChange={(e) => setModal({ ...modal, outlet_id: e.target.value })} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs">
                    <option value="">Select outlet…</option>
                    {(q.data?.outlets ?? []).map((o) => (
                      <option key={o.id} value={o.id}>{o.outlet_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Item *">
                  <select
                    value={modal.item_id}
                    onChange={(e) => setModal({ ...modal, item_id: e.target.value, variant_id: "" })}
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                  >
                    <option value="">Select item…</option>
                    {(q.data?.items ?? []).filter((i) => i.is_active).map((i) => (
                      <option key={i.id} value={i.id}>{i.item_name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Variant *">
                  <select
                    value={modal.variant_id}
                    onChange={(e) => {
                      const v = variantsById.get(e.target.value);
                      setModal({
                        ...modal,
                        variant_id: e.target.value,
                        selling_price: modal.selling_price || (v ? String(v.base_price ?? "") : ""),
                      });
                    }}
                    className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
                    disabled={!modal.item_id}
                  >
                    <option value="">Select variant…</option>
                    {(q.data?.variants ?? [])
                      .filter((v) => v.item_id === modal.item_id && v.is_active)
                      .map((v) => (
                        <option key={v.id} value={v.id}>{v.variant_name}{v.quantity_label ? ` (${v.quantity_label})` : ""}</option>
                      ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="MRP Price (₹)">
                    <input type="number" step="0.01" value={modal.mrp_price} onChange={(e) => setModal({ ...modal, mrp_price: e.target.value })} placeholder="0" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" />
                  </Field>
                  <Field label="Selling Price (₹) *">
                    <input type="number" step="0.01" value={modal.selling_price} onChange={(e) => setModal({ ...modal, selling_price: e.target.value })} placeholder="0" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" />
                  </Field>
                </div>
                <label className="flex items-center justify-between rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs text-maroon">
                  <span>Available</span>
                  <input type="checkbox" checked={modal.is_available} onChange={(e) => setModal({ ...modal, is_available: e.target.checked })} />
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
                  <button disabled={saveMut.isPending} onClick={() => saveMut.mutate(modal)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60">
                    {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </button>
                </div>
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
      <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">{label}</p>
      {children}
    </div>
  );
}

export default PricingAdmin;