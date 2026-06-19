;
import { useServerFn } from "@/lib/react-start-mock";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Edit, Power, Loader2, RefreshCw, Leaf } from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  listDietary,
  upsertDietary,
  setDietaryActive,
  type DietaryRow,
} from "@/lib/admin-master.functions";



type StatusFilter = "All" | "Active" | "Inactive";

function DietaryAdmin() {
  const fetchList = useServerFn(listDietary);
  const mutateSave = useServerFn(upsertDietary);
  const mutateToggle = useServerFn(setDietaryActive);

  const [role, setRole] = useState("");
  const [items, setItems] = useState<DietaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DietaryRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<DietaryRow | null>(null);

  const canManage = role === "super_admin";

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchList();
      setRole(res.role);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dietary types");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchList]);

  useEffect(() => {
    load();
  }, [load]);

  const accessDenied = !loading && role && !["super_admin", "outlet_admin"].includes(role);

  const filtered = items.filter((c) => {
    const term = q.trim().toLowerCase();
    const matchesQ =
      !term ||
      c.dietary_name.toLowerCase().includes(term) ||
      c.dietary_code.toLowerCase().includes(term);
    const matchesStatus =
      filter === "All" ||
      (filter === "Active" && c.is_active) ||
      (filter === "Inactive" && !c.is_active);
    return matchesQ && matchesStatus;
  });

  const total = items.length;
  const active = items.filter((c) => c.is_active).length;

  async function handleSave(input: {
    id?: string | null;
    dietary_name: string;
    dietary_code: string;
    is_active: boolean;
  }) {
    try {
      await mutateSave({ data: input });
      toast.success(input.id ? "Dietary type updated" : "Dietary type created");
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleToggle(row: DietaryRow) {
    try {
      await mutateToggle({ data: { id: row.id, is_active: !row.is_active } });
      toast.success(!row.is_active ? "Activated" : "Deactivated");
      setConfirmToggle(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (accessDenied) {
    return (
      <AdminPage>
        <AdminHeader title="Dietary Types" subtitle="Access restricted" />
        <div className="mx-auto max-w-md px-4 py-10 text-center sm:max-w-lg">
          <div className="rounded-3xl border border-gold/30 bg-card p-8">
            <p className="text-display text-lg text-maroon">Access denied</p>
            <p className="mt-2 text-xs text-maroon-deep/60">
              Dietary management is available to admins only.
            </p>
          </div>
        </div>
        <AdminBottomNav />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader title="Dietary Types" subtitle="Manage food preference classifications" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total" value={total} tone="saffron" />
          <StatCard label="Active" value={active} tone="emerald" />
          <StatCard label="Inactive" value={total - active} tone="amber" />
          <StatCard label="Latest" value={items[0]?.dietary_name ?? "—"} tone="maroon" />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or code"
              className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-gold/30 bg-card text-maroon"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Active", "Inactive"] as StatusFilter[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card/70" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm font-semibold text-red-700">Couldn't load</p>
            <p className="mt-1 text-xs text-red-600/80">{error}</p>
            <button
              onClick={load}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-gold/25 bg-card p-8 text-center">
            <Leaf className="mx-auto h-8 w-8 text-saffron-deep/60" />
            <p className="mt-2 text-display text-base text-maroon">
              {items.length === 0 ? "No dietary types yet" : "No matching types"}
            </p>
            <p className="mt-1 text-xs text-maroon-deep/60">
              {items.length === 0 ? "Create your first dietary type." : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-gold/25 bg-card p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-display text-sm text-maroon">{c.dietary_name}</h3>
                    <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-maroon">
                      {c.dietary_code}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        c.is_active ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"
                      }`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[10px] text-maroon-deep/40">
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gold/40 py-1.5 text-[11px] font-semibold text-maroon"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => setConfirmToggle(c)}
                      className={`flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold ${
                        c.is_active
                          ? "border border-red-300 bg-red-50 text-red-700"
                          : "bg-gradient-to-r from-saffron to-saffron-deep text-cream"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      {c.is_active ? "Disable" : "Enable"}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl"
        >
          <Plus className="h-4 w-4" /> Add Dietary
        </button>
      )}

      <AdminBottomNav />

      <AnimatePresence>
        {formOpen && (
          <DietaryFormModal
            initial={editing}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSave={handleSave}
          />
        )}
        {confirmToggle && (
          <ConfirmModal
            title={confirmToggle.is_active ? "Disable dietary type?" : "Enable dietary type?"}
            message={`${confirmToggle.dietary_name} will be ${
              confirmToggle.is_active ? "hidden from new menu items" : "available for menu items"
            }.`}
            confirmLabel={confirmToggle.is_active ? "Disable" : "Enable"}
            danger={confirmToggle.is_active}
            onCancel={() => setConfirmToggle(null)}
            onConfirm={() => handleToggle(confirmToggle)}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} className="fixed inset-0 z-50 bg-black/40" />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="fixed left-1/2 top-1/2 z-50 w-[88%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-cream p-5 shadow-2xl"
      >
        <h3 className="text-display text-lg text-maroon">{title}</h3>
        <p className="mt-1 text-xs text-maroon-deep/70">{message}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-gold/40 py-2.5 text-sm font-semibold text-maroon">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white shadow disabled:opacity-60 ${
              danger ? "bg-red-600" : "bg-gradient-to-r from-saffron to-saffron-deep"
            }`}
          >
            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function DietaryFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: DietaryRow | null;
  onClose: () => void;
  onSave: (input: {
    id?: string | null;
    dietary_name: string;
    dietary_code: string;
    is_active: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.dietary_name ?? "");
  const [code, setCode] = useState(initial?.dietary_code ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim() || !code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        id: initial?.id ?? null,
        dietary_name: name,
        dietary_code: code,
        is_active: active,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-cream p-5"
      >
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
        <div className="flex items-center justify-between">
          <h2 className="text-display text-xl text-maroon">
            {initial ? "Edit Dietary Type" : "Add Dietary Type"}
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">Dietary Name *</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vegetarian"
              className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">Dietary Code *</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VEG"
              className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs"
            />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setActive(v)}
                  className={`rounded-xl border py-2 text-[11px] font-semibold ${
                    active === v
                      ? "border-saffron bg-saffron/15 text-saffron-deep"
                      : "border-gold/30 bg-card text-maroon"
                  }`}
                >
                  {v ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">
              Cancel
            </button>
            <button
              disabled={busy}
              onClick={submit}
              className="flex-1 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-semibold text-cream shadow disabled:opacity-60"
            >
              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : initial ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export default DietaryAdmin;
