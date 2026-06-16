import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Utensils, Edit, Grid3x3, Check, Loader2, AlertCircle, Inbox } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import {
  listOutletAvailability,
  upsertAvailability,
  bulkAvailability,
} from "@/lib/admin-availability.functions";

export const Route = createFileRoute("/admin/availability")({
  head: () => ({ meta: [{ title: "Outlet Availability — Telugu Food Club Admin" }] }),
  component: () => (
    <AdminGuard>
      <AvailabilityAdmin />
    </AdminGuard>
  ),
});

type AvailRow = {
  id: string;
  outlet_id: string;
  item_id: string;
  is_available: boolean;
  stock_status: string;
  available_from: string | null;
  available_to: string | null;
};
type FormState = {
  outlet_id: string;
  item_id: string;
  is_available: boolean;
  stock_status: "available" | "limited" | "sold_out" | "unavailable";
  available_from: string;
  available_to: string;
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  limited: "Limited Stock",
  sold_out: "Sold Out",
  unavailable: "Unavailable",
};

function toneFor(status: string, on: boolean) {
  if (!on || status === "sold_out") return "bg-red-500/15 text-red-700";
  if (status === "limited") return "bg-amber-500/15 text-amber-700";
  if (status === "unavailable") return "bg-red-500/15 text-red-700";
  return "bg-emerald-500/15 text-emerald-700";
}

function AvailabilityAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listOutletAvailability);
  const upsert = useServerFn(upsertAvailability);
  const bulkFn = useServerFn(bulkAvailability);

  const q = useQuery({ queryKey: ["admin", "availability"], queryFn: () => list(), retry: 1 });

  const [outletTab, setOutletTab] = useState<string>("ALL");
  const [filter, setFilter] = useState<"All" | "Available" | "Unavailable" | "Limited" | "Sold Out">("All");
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<FormState | null>(null);
  const [matrix, setMatrix] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const itemsById = useMemo(() => new Map((q.data?.items ?? []).map((i) => [i.id, i])), [q.data]);
  const outletsById = useMemo(() => new Map((q.data?.outlets ?? []).map((o) => [o.id, o])), [q.data]);
  const availMap = useMemo(() => {
    const m = new Map<string, AvailRow>();
    (q.data?.availability ?? []).forEach((a) => m.set(`${a.outlet_id}:${a.item_id}`, a as AvailRow));
    return m;
  }, [q.data]);

  const role = q.data?.role;
  const canManage = role === "super_admin" || role === "outlet_admin" || role === "kitchen";
  const isCashier = role === "cashier";

  // Build list rows: each (outlet,item) for selected outlet; if ALL → list all availability rows
  const rows = useMemo(() => {
    const outlets = (q.data?.outlets ?? []).filter((o) =>
      outletTab === "ALL" ? true : o.id === outletTab,
    );
    const items = (q.data?.items ?? []).filter((i) => i.is_active);
    const needle = search.trim().toLowerCase();
    const out: { key: string; outlet_id: string; item_id: string; avail: AvailRow | null }[] = [];
    for (const o of outlets) {
      for (const it of items) {
        const a = availMap.get(`${o.id}:${it.id}`) ?? null;
        // filter
        if (filter === "Available" && (!a || !a.is_available)) continue;
        if (filter === "Unavailable" && (!a || a.is_available)) continue;
        if (filter === "Limited" && a?.stock_status !== "limited") continue;
        if (filter === "Sold Out" && a?.stock_status !== "sold_out") continue;
        if (needle) {
          const hay = `${it.item_name} ${o.outlet_name}`.toLowerCase();
          if (!hay.includes(needle)) continue;
        }
        out.push({ key: `${o.id}:${it.id}`, outlet_id: o.id, item_id: it.id, avail: a });
      }
    }
    return out;
  }, [q.data, outletTab, filter, search, availMap]);

  const totals = useMemo(() => {
    const all = (q.data?.availability ?? []) as AvailRow[];
    return {
      total: all.length,
      available: all.filter((a) => a.is_available && a.stock_status !== "sold_out").length,
      unavailable: all.filter((a) => !a.is_available).length,
      outlets: (q.data?.outlets ?? []).length,
    };
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: (f: FormState) =>
      upsert({
        data: {
          outlet_id: f.outlet_id,
          item_id: f.item_id,
          is_available: f.is_available,
          stock_status: f.stock_status,
          available_from: f.available_from || null,
          available_to: f.available_to || null,
        },
      }),
    onSuccess: () => {
      toast.success("Availability saved");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin", "availability"] });
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  const bulkMut = useMutation({
    mutationFn: (p: { outlet_id: string; item_ids: string[]; action: FormState["stock_status"] }) =>
      bulkFn({ data: p }),
    onSuccess: (_r, vars) => {
      toast.success(`Updated ${vars.item_ids.length} item(s)`);
      setBulk(false);
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["admin", "availability"] });
    },
    onError: (e: Error) => toast.error(e.message || "Bulk update failed"),
  });

  const openEdit = (outlet_id: string, item_id: string, a: AvailRow | null) => {
    setEdit({
      outlet_id,
      item_id,
      is_available: a?.is_available ?? true,
      stock_status: ((a?.stock_status as FormState["stock_status"]) ?? "available"),
      available_from: a?.available_from ? a.available_from.slice(0, 5) : "",
      available_to: a?.available_to ? a.available_to.slice(0, 5) : "",
    });
  };

  const quickMark = (
    outlet_id: string,
    item_id: string,
    a: AvailRow | null,
    action: FormState["stock_status"],
  ) => {
    saveMut.mutate({
      outlet_id,
      item_id,
      is_available: action === "available" || action === "limited",
      stock_status: action,
      available_from: a?.available_from ? a.available_from.slice(0, 5) : "",
      available_to: a?.available_to ? a.available_to.slice(0, 5) : "",
    });
  };

  const bulkOutlet = outletTab !== "ALL" ? outletTab : (q.data?.outlets?.[0]?.id ?? "");

  return (
    <AdminPage>
      <AdminHeader title="Outlet Availability" subtitle="Control item availability across outlets" back="/admin/items" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 pb-32 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Records" value={totals.total} tone="saffron" />
          <StatCard label="Available" value={totals.available} tone="emerald" />
          <StatCard label="Unavailable" value={totals.unavailable} tone="amber" />
          <StatCard label="Outlets" value={totals.outlets} tone="maroon" />
        </div>

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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item or outlet" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Available", "Unavailable", "Limited", "Sold Out"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setMatrix(true)} className="flex-1 rounded-xl border border-gold/30 bg-card py-2 text-[11px] font-semibold text-maroon">
            <Grid3x3 className="mr-1 inline h-3 w-3" /> Matrix
          </button>
          {canManage && (
            <button
              onClick={() => setBulk(true)}
              disabled={selected.length === 0}
              className="flex-1 rounded-xl border border-gold/30 bg-card py-2 text-[11px] font-semibold text-maroon disabled:opacity-50"
            >
              Bulk Actions ({selected.length})
            </button>
          )}
        </div>

        {q.isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-card/60" />)}
          </div>
        )}
        {q.isError && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            <AlertCircle className="mx-auto mb-1 h-5 w-5" />
            {(q.error as Error)?.message || "Failed to load availability"}
            <button onClick={() => q.refetch()} className="ml-2 underline">Retry</button>
          </div>
        )}
        {q.isSuccess && rows.length === 0 && (
          <div className="rounded-3xl border border-gold/25 bg-card/70 p-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-maroon-deep/30" />
            <p className="mt-2 text-display text-base text-maroon">No items</p>
            <p className="text-xs text-maroon-deep/60">Try a different outlet or filter.</p>
          </div>
        )}

        <div className="space-y-3">
          {rows.map((r, idx) => {
            const it = itemsById.get(r.item_id);
            const o = outletsById.get(r.outlet_id);
            const a = r.avail;
            const status = a?.stock_status ?? "available";
            const isOn = a?.is_available ?? true;
            const checked = selected.includes(r.key);
            return (
              <motion.div
                key={r.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 10) * 0.02 }}
                className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm"
              >
                <div className="flex gap-3 p-3">
                  {canManage && outletTab !== "ALL" && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelected(e.target.checked ? [...selected, r.key] : selected.filter((s) => s !== r.key))
                      }
                      className="mt-1 h-4 w-4 accent-saffron"
                    />
                  )}
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-saffron/30 to-gold/20 text-saffron-deep">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-display truncate text-sm text-maroon">{it?.item_name ?? "Unknown item"}</h3>
                        <p className="text-[10px] text-maroon-deep/60">{o?.outlet_name ?? "—"}</p>
                      </div>
                      {canManage && (
                        <button
                          onClick={() => quickMark(r.outlet_id, r.item_id, a, isOn ? "unavailable" : "available")}
                          className="relative inline-flex h-6 w-11 cursor-pointer items-center"
                          aria-label="Toggle availability"
                        >
                          <span className={`h-6 w-11 rounded-full transition ${isOn ? "bg-emerald-500" : "bg-gold/30"}`} />
                          <span className={`absolute h-5 w-5 rounded-full bg-cream shadow transition ${isOn ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${toneFor(status, isOn)}`}>
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      {a?.available_from && a?.available_to && (
                        <span className="rounded-full bg-cream px-1.5 py-0.5 text-[9px] text-maroon">
                          {a.available_from.slice(0, 5)} – {a.available_to.slice(0, 5)}
                        </span>
                      )}
                      {!a && (
                        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] text-maroon-deep/70">No record</span>
                      )}
                    </div>
                  </div>
                </div>
                {!isCashier && (
                  <div className="grid grid-cols-3 gap-1 border-t border-gold/20 bg-cream/50 p-2 text-[10px] font-semibold">
                    <button
                      disabled={!canManage}
                      onClick={() => quickMark(r.outlet_id, r.item_id, a, "limited")}
                      className="rounded-lg py-1.5 text-amber-700 disabled:opacity-40"
                    >
                      Limited
                    </button>
                    <button
                      disabled={!canManage}
                      onClick={() => quickMark(r.outlet_id, r.item_id, a, "sold_out")}
                      className="rounded-lg py-1.5 text-red-700 disabled:opacity-40"
                    >
                      Sold Out
                    </button>
                    <button
                      disabled={!canManage}
                      onClick={() => openEdit(r.outlet_id, r.item_id, a)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-maroon disabled:opacity-40"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AdminBottomNav />

      <AnimatePresence>
        {edit && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEdit(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Edit Availability</h2>
                <button onClick={() => setEdit(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-1 text-[11px] text-maroon-deep/60">
                {itemsById.get(edit.item_id)?.item_name} • {outletsById.get(edit.outlet_id)?.outlet_name}
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-gold/25 bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-saffron-deep">Status</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["available", "limited", "sold_out", "unavailable"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          setEdit({
                            ...edit,
                            stock_status: s,
                            is_available: s === "available" || s === "limited",
                          })
                        }
                        className={`rounded-xl border py-2 text-[11px] font-semibold ${edit.stock_status === s ? "border-saffron bg-saffron/15 text-saffron-deep" : "border-gold/30 bg-cream/50 text-maroon"}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gold/25 bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase text-saffron-deep">Time Window (optional)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="mb-1 text-[10px] text-maroon-deep/60">From</p>
                      <input type="time" value={edit.available_from} onChange={(e) => setEdit({ ...edit, available_from: e.target.value })} className="w-full rounded-xl border border-gold/30 bg-cream/50 px-3 py-2 text-xs" />
                    </div>
                    <div>
                      <p className="mb-1 text-[10px] text-maroon-deep/60">To</p>
                      <input type="time" value={edit.available_to} onChange={(e) => setEdit({ ...edit, available_to: e.target.value })} className="w-full rounded-xl border border-gold/30 bg-cream/50 px-3 py-2 text-xs" />
                    </div>
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-xl border border-gold/30 bg-card px-3 py-2 text-xs text-maroon">
                  <span>Available</span>
                  <input type="checkbox" checked={edit.is_available} onChange={(e) => setEdit({ ...edit, is_available: e.target.checked })} />
                </label>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEdit(null)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
                  <button
                    disabled={saveMut.isPending}
                    onClick={() => saveMut.mutate(edit)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60"
                  >
                    {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

        {bulk && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBulk(false)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <h2 className="text-display text-xl text-maroon">Bulk Actions</h2>
              <p className="text-[11px] text-maroon-deep/60">{selected.length} item(s) selected</p>
              <div className="mt-3 space-y-2">
                {(
                  [
                    ["available", "Mark Available"],
                    ["limited", "Mark Limited"],
                    ["sold_out", "Mark Sold Out"],
                    ["unavailable", "Mark Unavailable"],
                  ] as const
                ).map(([action, label]) => (
                  <button
                    key={action}
                    disabled={bulkMut.isPending}
                    onClick={() =>
                      bulkMut.mutate({
                        outlet_id: bulkOutlet,
                        item_ids: selected.map((k) => k.split(":")[1]),
                        action,
                      })
                    }
                    className="flex w-full items-center justify-between rounded-2xl border border-gold/25 bg-card px-4 py-3 text-left text-sm font-semibold text-maroon disabled:opacity-50"
                  >
                    <span>{label}</span>
                    {bulkMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {matrix && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMatrix(false)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <h2 className="text-display text-xl text-maroon">Availability Matrix</h2>
              <div className="mt-3 overflow-x-auto">
                <div className="min-w-[480px] overflow-hidden rounded-2xl border border-gold/25 bg-card">
                  <div
                    className="grid gap-1 border-b border-gold/20 bg-gold/10 px-3 py-2 text-[10px] font-bold uppercase text-maroon"
                    style={{ gridTemplateColumns: `1.4fr repeat(${(q.data?.outlets ?? []).length || 1}, 1fr)` }}
                  >
                    <span>Item</span>
                    {(q.data?.outlets ?? []).map((o) => (
                      <span key={o.id} className="text-center truncate">{o.outlet_name.slice(0, 6)}</span>
                    ))}
                  </div>
                  {(q.data?.items ?? []).filter((i) => i.is_active).slice(0, 50).map((it) => (
                    <div
                      key={it.id}
                      className="grid items-center gap-1 border-b border-gold/15 px-3 py-2.5 text-[11px] text-maroon last:border-0"
                      style={{ gridTemplateColumns: `1.4fr repeat(${(q.data?.outlets ?? []).length || 1}, 1fr)` }}
                    >
                      <span className="truncate font-semibold">{it.item_name}</span>
                      {(q.data?.outlets ?? []).map((o) => {
                        const a = availMap.get(`${o.id}:${it.id}`);
                        const on = a?.is_available;
                        return (
                          <button
                            key={o.id}
                            onClick={() => openEdit(o.id, it.id, a ?? null)}
                            className="grid place-items-center"
                          >
                            {on ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}
