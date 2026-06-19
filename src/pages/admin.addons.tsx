// @ts-nocheck
;
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Edit, Eye, Users, Power, Loader2, AlertCircle, Inbox } from "lucide-react";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import {
  listAdminAddons,
  createAdminAddon,
  updateAdminAddon,
  setAdminAddonActive,
  saveAddonAssignments,
} from "@/lib/admin-addons.functions";



type Addon = {
  id: string;
  addon_name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
};
type Mapping = { id: string; item_id: string; addon_id: string; is_required: boolean; max_quantity: number };
type Item = { id: string; item_name: string; category_id: string | null; is_active: boolean };

type FormState = {
  id?: string;
  addon_name: string;
  description: string;
  price: string;
  is_active: boolean;
};
const emptyForm = (): FormState => ({ addon_name: "", description: "", price: "", is_active: true });

function AddonsAdmin() {
  const list = useServerFn(listAdminAddons);
  const create = useServerFn(createAdminAddon);
  const update = useServerFn(updateAdminAddon);
  const toggle = useServerFn(setAdminAddonActive);
  const assign = useServerFn(saveAddonAssignments);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await list();
      setData(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [list]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [confirm, setConfirm] = useState<Addon | null>(null);
  const [assignFor, setAssignFor] = useState<Addon | null>(null);
  const [usageFor, setUsageFor] = useState<Addon | null>(null);
  const [assignSel, setAssignSel] = useState<Record<string, { is_required: boolean; max_quantity: number }>>({});

  const role = data?.role;
  const canManage = role === "super_admin";
  const noAccess = role && !canManage && role !== "outlet_admin";

  const itemsById = useMemo(() => {
    const m = new Map<string, Item>();
    (data?.items ?? []).forEach((i: any) => m.set(i.id, i as Item));
    return m;
  }, [data]);

  const usageByAddon = useMemo(() => {
    const m = new Map<string, Mapping[]>();
    (data?.mappings ?? []).forEach((map: any) => {
      const arr = m.get(map.addon_id) ?? [];
      arr.push(map as Mapping);
      m.set(map.addon_id, arr);
    });
    return m;
  }, [data]);

  const visible = useMemo(() => {
    const all = (data?.addons ?? []) as Addon[];
    const needle = search.trim().toLowerCase();
    return all.filter((a) => {
      if (filter === "Active" && !a.is_active) return false;
      if (filter === "Inactive" && a.is_active) return false;
      if (!needle) return true;
      return [a.addon_name, a.description].filter(Boolean).some((s) => s!.toLowerCase().includes(needle));
    });
  }, [data, search, filter]);

  const totals = useMemo(() => {
    const all = (data?.addons ?? []) as Addon[];
    return {
      total: all.length,
      active: all.filter((a) => a.is_active).length,
      inactive: all.filter((a) => !a.is_active).length,
      assigned: new Set((data?.mappings ?? []).map((m: any) => m.addon_id)).size,
    };
  }, [data]);

  const [isSaving, setIsSaving] = useState(false);
  const saveAddon = async (f: FormState) => {
    setIsSaving(true);
    try {
      const payload = {
        addon_name: f.addon_name,
        description: f.description || null,
        price: Number(f.price),
        is_active: f.is_active,
      };
      if (f.id) await update({ data: { id: f.id, ...payload } });
      else await create({ data: payload });
      toast.success(form.id ? "Add-on updated" : "Add-on created");
      setOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const [isToggling, setIsToggling] = useState(false);
  const toggleAddon = async (p: { id: string; is_active: boolean }) => {
    setIsToggling(true);
    try {
      await toggle({ data: p });
      toast.success("Status updated");
      setConfirm(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setIsToggling(false);
    }
  };

  const [isAssigning, setIsAssigning] = useState(false);
  const saveAssign = async () => {
    setIsAssigning(true);
    try {
      const r = await assign({
        data: {
          addon_id: assignFor!.id,
          items: Object.entries(assignSel).map(([item_id, v]) => ({
            item_id,
            is_required: v.is_required,
            max_quantity: v.max_quantity,
          })),
        },
      });
      toast.success(`Saved: +${r.added} −${r.removed} ~${r.updated}`);
      setAssignFor(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setIsAssigning(false);
    }
  };

  const openAdd = () => {
    setForm(emptyForm());
    setOpen(true);
  };
  const openEdit = (a: Addon) => {
    setForm({
      id: a.id,
      addon_name: a.addon_name,
      description: a.description ?? "",
      price: String(a.price ?? ""),
      is_active: a.is_active,
    });
    setOpen(true);
  };
  const openAssign = (a: Addon) => {
    const existing = usageByAddon.get(a.id) ?? [];
    const sel: Record<string, { is_required: boolean; max_quantity: number }> = {};
    existing.forEach((m) => (sel[m.item_id] = { is_required: m.is_required, max_quantity: m.max_quantity }));
    setAssignSel(sel);
    setAssignFor(a);
  };

  if (noAccess) {
    return (
      <AdminPage>
        <AdminHeader title="Add-ons" subtitle="Access denied" back="/admin/dashboard" />
        <div className="mx-auto max-w-md px-4 py-10 text-center sm:max-w-lg">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-2 text-display text-lg text-maroon">Access denied</p>
          <p className="text-xs text-maroon-deep/70">Your role does not have access to add-ons.</p>
        </div>
        <AdminBottomNav />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader title="Add-ons Management" subtitle="Manage upsell products and customizations" back="/admin/items" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 pb-32 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Add-ons" value={totals.total} tone="saffron" />
          <StatCard label="Active" value={totals.active} tone="emerald" />
          <StatCard label="Inactive" value={totals.inactive} tone="maroon" />
          <StatCard label="Assigned" value={totals.assigned} tone="blue" />
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search add-on name or description"
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

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-card/60" />
            ))}
          </div>
        )}
        {!!error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            <AlertCircle className="mx-auto mb-1 h-5 w-5" />
            {error?.message || "Failed to load"}
            <button onClick={() => loadData()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}
        {(!isLoading && !error) && visible.length === 0 && (
          <div className="rounded-3xl border border-gold/25 bg-card/70 p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-maroon-deep/30" />
            <p className="mt-2 text-display text-base text-maroon">No add-ons found</p>
          </div>
        )}

        {visible.map((a) => {
          const used = usageByAddon.get(a.id)?.length ?? 0;
          return (
            <div key={a.id} className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-display truncate text-sm text-maroon">{a.addon_name}</p>
                  {a.description && <p className="line-clamp-2 text-[11px] text-maroon-deep/60">{a.description}</p>}
                  <p className="mt-1 text-[10px] text-maroon-deep/60">Used on {used} item{used === 1 ? "" : "s"}</p>
                </div>
                <div className="text-right">
                  <p className="text-display text-base text-saffron-deep">₹{Number(a.price).toFixed(0)}</p>
                  <span className={`text-[9px] font-bold ${a.is_active ? "text-emerald-700" : "text-red-700"}`}>
                    {a.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] font-semibold">
                <button
                  disabled={!canManage}
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-maroon disabled:opacity-40"
                >
                  <Edit className="h-3 w-3" /> Edit
                </button>
                <button
                  disabled={!canManage}
                  onClick={() => openAssign(a)}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-maroon disabled:opacity-40"
                >
                  <Users className="h-3 w-3" /> Assign
                </button>
                <button
                  onClick={() => setUsageFor(a)}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-maroon"
                >
                  <Eye className="h-3 w-3" /> Usage
                </button>
                <button
                  disabled={!canManage}
                  onClick={() => setConfirm(a)}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/30 py-1 text-red-700 disabled:opacity-40"
                >
                  <Power className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {canManage && (
        <button
          onClick={openAdd}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      )}
      <AdminBottomNav />

      {/* Add/Edit modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">{form.id ? "Edit Add-on" : "Add Add-on"}</h2>
                <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <Field label="Name *">
                  <input value={form.addon_name} onChange={(e) => setForm({ ...form, addon_name: e.target.value })} placeholder="Extra Raita" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" />
                </Field>
                <Field label="Description">
                  <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" />
                </Field>
                <Field label="Price (₹) *">
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="20" className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs" />
                </Field>
                <label className="flex items-center justify-between rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs text-maroon">
                  <span>Active</span>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
                  <button disabled={isSaving} onClick={() => saveAddon(form)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60">
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirm toggle */}
      <AnimatePresence>
        {confirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-cream p-5 shadow-2xl">
              <h3 className="text-display text-lg text-maroon">{confirm.is_active ? "Deactivate" : "Activate"} add-on?</h3>
              <p className="mt-1 text-xs text-maroon-deep/70">{confirm.addon_name}</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 rounded-xl border border-gold/40 py-2.5 text-sm font-semibold text-maroon">Cancel</button>
                <button disabled={isToggling} onClick={() => toggleAddon({ id: confirm.id, is_active: !confirm.is_active })} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-2.5 text-sm font-semibold text-cream disabled:opacity-60">
                  {isToggling && <Loader2 className="h-4 w-4 animate-spin" />} Confirm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Assign Items drawer */}
      <AnimatePresence>
        {assignFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAssignFor(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Assign to items</h2>
                <button onClick={() => setAssignFor(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-xs text-maroon-deep/70">{assignFor.addon_name}</p>
              <div className="mt-3 space-y-2">
                {(data?.items ?? []).filter((i: any) => i.is_active).map((i: any) => {
                  const sel = assignSel[i.id];
                  const checked = !!sel;
                  return (
                    <div key={i.id} className="rounded-xl border border-gold/25 bg-card p-2">
                      <label className="flex items-center justify-between gap-2 text-xs text-maroon">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = { ...assignSel };
                              if (e.target.checked) next[i.id] = { is_required: false, max_quantity: 1 };
                              else delete next[i.id];
                              setAssignSel(next);
                            }}
                          />
                          <span className="truncate">{i.item_name}</span>
                        </span>
                      </label>
                      {checked && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 rounded-md border border-gold/20 bg-cream/50 px-2 py-1 text-[10px] text-maroon">
                            <input
                              type="checkbox"
                              checked={sel.is_required}
                              onChange={(e) => setAssignSel({ ...assignSel, [i.id]: { ...sel, is_required: e.target.checked } })}
                            />
                            Required
                          </label>
                          <label className="flex items-center gap-1 rounded-md border border-gold/20 bg-cream/50 px-2 py-1 text-[10px] text-maroon">
                            Max:
                            <input
                              type="number"
                              min={1}
                              value={sel.max_quantity}
                              onChange={(e) => setAssignSel({ ...assignSel, [i.id]: { ...sel, max_quantity: Math.max(1, Number(e.target.value) || 1) } })}
                              className="w-12 rounded-md border border-gold/30 px-1 py-0.5"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 mt-4 flex gap-2 bg-cream pt-2">
                <button onClick={() => setAssignFor(null)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
                <button disabled={isAssigning} onClick={() => saveAssign()} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60">
                  {isAssigning && <Loader2 className="h-4 w-4 animate-spin" />} Save Assignments
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Usage drawer */}
      <AnimatePresence>
        {usageFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUsageFor(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Usage</h2>
                <button onClick={() => setUsageFor(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-xs text-maroon-deep/70">{usageFor.addon_name}</p>
              {(() => {
                const maps = usageByAddon.get(usageFor.id) ?? [];
                const items = maps.map((m) => itemsById.get(m.item_id)).filter(Boolean) as Item[];
                const active = items.filter((i) => i.is_active).length;
                return (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <StatCard label="Assigned items" value={maps.length} tone="saffron" />
                      <StatCard label="Active items" value={active} tone="emerald" />
                    </div>
                    <div className="mt-3 space-y-1">
                      {items.length === 0 && <p className="text-center text-xs text-maroon-deep/60">Not assigned to any item</p>}
                      {items.map((it) => (
                        <div key={it.id} className="rounded-xl border border-gold/25 bg-card px-3 py-2 text-xs text-maroon">
                          {it.item_name} {!it.is_active && <span className="text-[10px] text-red-700">(inactive)</span>}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-center text-[10px] text-maroon-deep/50">Revenue analytics coming soon</p>
                  </>
                );
              })()}
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

export default AddonsAdmin;