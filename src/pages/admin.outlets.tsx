;
import { useServerFn } from "@/lib/react-start-mock";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  X,
  Phone,
  Mail,
  Clock,
  MapPin,
  Store,
  Loader2,
  RefreshCw,
  Edit,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import {
  listOutlets,
  upsertOutlet,
  setOutletActive,
  type OutletRow,
} from "@/lib/admin-master.functions";



type StatusFilter = "All" | "Active" | "Inactive";

function OutletAdmin() {
  const fetchList = useServerFn(listOutlets);
  const mutateSave = useServerFn(upsertOutlet);
  const mutateToggle = useServerFn(setOutletActive);

  const [role, setRole] = useState<string>("");
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OutletRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<OutletRow | null>(null);

  const canManage = role === "super_admin";

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchList();
      setRole(res.role);
      setOutlets(res.outlets);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load outlets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchList]);

  useEffect(() => {
    load();
  }, [load]);

  const accessDenied =
    !loading && role && role !== "super_admin" && role !== "outlet_admin";

  const filtered = outlets.filter((o) => {
    const term = q.trim().toLowerCase();
    const matchesQ =
      !term ||
      o.outlet_name.toLowerCase().includes(term) ||
      o.outlet_code.toLowerCase().includes(term) ||
      (o.city ?? "").toLowerCase().includes(term) ||
      (o.pincode ?? "").toLowerCase().includes(term);
    const matchesStatus =
      filter === "All" ||
      (filter === "Active" && o.is_active) ||
      (filter === "Inactive" && !o.is_active);
    return matchesQ && matchesStatus;
  });

  const total = outlets.length;
  const active = outlets.filter((o) => o.is_active).length;

  async function handleSave(input: Parameters<typeof mutateSave>[0]["data"]) {
    try {
      await mutateSave({ data: input });
      toast.success(input.id ? "Outlet updated" : "Outlet created");
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleToggle(row: OutletRow) {
    try {
      await mutateToggle({ data: { id: row.id, is_active: !row.is_active } });
      toast.success(!row.is_active ? "Outlet activated" : "Outlet deactivated");
      setConfirmToggle(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (accessDenied) {
    return (
      <AdminPage>
        <AdminHeader title="Outlets" subtitle="Access restricted" />
        <div className="mx-auto max-w-md px-4 py-10 text-center sm:max-w-lg">
          <div className="rounded-3xl border border-gold/30 bg-card p-8">
            <p className="text-display text-lg text-maroon">Access denied</p>
            <p className="mt-2 text-xs text-maroon-deep/60">
              Outlet management is available to super admins and outlet admins only.
            </p>
          </div>
        </div>
        <AdminBottomNav />
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHeader title="Outlet Management" subtitle="Manage all restaurant outlets" />
      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Outlets" value={total} tone="saffron" />
          <StatCard label="Active" value={active} tone="emerald" />
          <StatCard label="Inactive" value={total - active} tone="amber" />
          <StatCard label="Your Role" value={pretty(role || "—")} tone="maroon" />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code, city, pincode"
              className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs text-maroon-deep placeholder:text-maroon-deep/40 shadow-sm focus:border-saffron focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-gold/30 bg-card text-maroon"
            aria-label="Refresh"
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
          <SkeletonList />
        ) : error ? (
          <ErrorPanel message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyPanel
            title={outlets.length === 0 ? "No outlets yet" : "No matching outlets"}
            hint={outlets.length === 0 ? "Create your first outlet to get started." : "Try a different search or filter."}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="overflow-hidden rounded-3xl border border-gold/25 bg-card/80 shadow-sm backdrop-blur"
              >
                <div className="relative h-20 bg-gradient-to-br from-saffron/30 to-gold/20">
                  <div className="absolute inset-0 grid place-items-center text-maroon/30">
                    <Store className="h-8 w-8" />
                  </div>
                  <span
                    className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow ${
                      o.is_active ? "bg-emerald-500/90" : "bg-red-500/90"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    {o.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-2 py-1 text-[10px] font-bold text-maroon shadow">
                    {o.outlet_code}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="text-display text-base text-maroon">{o.outlet_name}</h3>
                  {(o.address || o.city) && (
                    <p className="mt-0.5 inline-flex items-start gap-1 text-[11px] text-maroon-deep/60">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {[o.address, o.city, o.state, o.pincode].filter(Boolean).join(", ")}
                      </span>
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-maroon-deep/70">
                    {o.phone && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3 text-saffron" /> {o.phone}
                      </span>
                    )}
                    {o.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 text-saffron" /> {o.email}
                      </span>
                    )}
                    {(o.opening_time || o.closing_time) && (
                      <span className="col-span-2 inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-saffron" />
                        {fmtTime(o.opening_time)} – {fmtTime(o.closing_time)}
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setEditing(o);
                          setFormOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-gold/40 py-2 text-xs font-semibold text-maroon"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => setConfirmToggle(o)}
                        className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold ${
                          o.is_active
                            ? "border border-red-300 bg-red-50 text-red-700"
                            : "bg-gradient-to-r from-saffron to-saffron-deep text-cream shadow"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {o.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </div>
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
          <Plus className="h-4 w-4" /> Add Outlet
        </button>
      )}

      <AdminBottomNav />

      <AnimatePresence>
        {formOpen && (
          <OutletFormModal
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
            title={confirmToggle.is_active ? "Deactivate outlet?" : "Activate outlet?"}
            message={`${confirmToggle.outlet_name} will be ${
              confirmToggle.is_active ? "hidden from customers and ordering" : "visible and accept orders"
            }.`}
            confirmLabel={confirmToggle.is_active ? "Deactivate" : "Activate"}
            danger={confirmToggle.is_active}
            onCancel={() => setConfirmToggle(null)}
            onConfirm={() => handleToggle(confirmToggle)}
          />
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

function fmtTime(t: string | null) {
  if (!t) return "—";
  // t is "HH:MM:SS"
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m} ${ampm}`;
}

function pretty(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-3xl bg-card/70" />
      ))}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm font-semibold text-red-700">Couldn't load outlets</p>
      <p className="mt-1 text-xs text-red-600/80">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
      >
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );
}

function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-gold/25 bg-card p-8 text-center">
      <Store className="mx-auto h-8 w-8 text-saffron-deep/60" />
      <p className="mt-2 text-display text-base text-maroon">{title}</p>
      <p className="mt-1 text-xs text-maroon-deep/60">{hint}</p>
    </div>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-50 bg-black/40"
      />
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        className="fixed left-1/2 top-1/2 z-50 w-[88%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-cream p-5 shadow-2xl"
      >
        <h3 className="text-display text-lg text-maroon">{title}</h3>
        <p className="mt-1 text-xs text-maroon-deep/70">{message}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gold/40 py-2.5 text-sm font-semibold text-maroon"
          >
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

function OutletFormModal({
  initial,
  onClose,
  onSave,
}: {
  initial: OutletRow | null;
  onClose: () => void;
  onSave: (input: {
    id?: string | null;
    outlet_name: string;
    outlet_code: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    opening_time: string | null;
    closing_time: string | null;
    is_active: boolean;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    outlet_name: initial?.outlet_name ?? "",
    outlet_code: initial?.outlet_code ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    pincode: initial?.pincode ?? "",
    latitude: initial?.latitude != null ? String(initial.latitude) : "",
    longitude: initial?.longitude != null ? String(initial.longitude) : "",
    opening_time: (initial?.opening_time ?? "").slice(0, 5),
    closing_time: (initial?.closing_time ?? "").slice(0, 5),
    is_active: initial?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setBusy(true);
    try {
      await onSave({
        id: initial?.id ?? null,
        outlet_name: form.outlet_name.trim(),
        outlet_code: form.outlet_code.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        opening_time: form.opening_time || null,
        closing_time: form.closing_time || null,
        is_active: form.is_active,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
          <h2 className="text-display text-xl text-maroon">
            {initial ? "Edit Outlet" : "Add New Outlet"}
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Outlet Name *" full value={form.outlet_name} onChange={(v) => set("outlet_name", v)} />
          <Field label="Outlet Code *" full value={form.outlet_code} onChange={(v) => set("outlet_code", v)} />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Address" full value={form.address} onChange={(v) => set("address", v)} />
          <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
          <Field label="Pincode" value={form.pincode} onChange={(v) => set("pincode", v)} />
          <Field label="Latitude" value={form.latitude} onChange={(v) => set("latitude", v)} />
          <Field label="Longitude" value={form.longitude} onChange={(v) => set("longitude", v)} />
          <Field label="Opening Time" type="time" value={form.opening_time} onChange={(v) => set("opening_time", v)} />
          <Field label="Closing Time" type="time" value={form.closing_time} onChange={(v) => set("closing_time", v)} />
          <div className="col-span-2">
            <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set("is_active", v)}
                  className={`rounded-xl border py-2 text-xs font-semibold ${
                    form.is_active === v
                      ? "border-saffron bg-saffron/15 text-saffron-deep"
                      : "border-gold/30 bg-card text-maroon"
                  }`}
                >
                  {v ? "Active" : "Inactive"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-gold/20 bg-cream px-5 pb-2 pt-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon"
          >
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
      </motion.div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  type?: string;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs text-maroon focus:border-saffron focus:outline-none"
      />
    </div>
  );
}

export default OutletAdmin;
