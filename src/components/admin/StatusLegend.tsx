import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import {
  ORDER_STATUS_META,
  ORDER_PAYMENT_STATUS_META,
  PAYMENT_STATUS_META,
  type StatusMeta,
} from "@/lib/order-status";

const TONE: Record<StatusMeta["tone"], string> = {
  amber: "bg-amber-500/15 text-amber-700",
  red: "bg-red-500/15 text-red-700",
  saffron: "bg-saffron/20 text-saffron-deep",
  blue: "bg-blue-500/15 text-blue-700",
  indigo: "bg-indigo-500/15 text-indigo-700",
  emerald: "bg-emerald-500/15 text-emerald-700",
  slate: "bg-slate-500/15 text-slate-700",
  maroon: "bg-maroon/15 text-maroon",
};

function Group({ title, entries }: { title: string; entries: [string, StatusMeta][] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-maroon-deep/60">{title}</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {entries.map(([key, m]) => (
          <li key={key} className="flex items-start gap-2 rounded-xl border border-gold/20 bg-cream/40 p-2">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[m.tone]}`}>
              {m.label}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-maroon-deep/60">{key}</p>
              <p className="text-[11px] leading-snug text-maroon-deep/80">{m.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-gold/25 bg-card shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-saffron/15 text-saffron-deep">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-display text-sm text-maroon">Status Legend</p>
            <p className="text-[10px] text-maroon-deep/60">DB enum values used across orders & payments</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-maroon transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-gold/20 px-4 py-4">
          <Group title="Order Status (orders.order_status)" entries={Object.entries(ORDER_STATUS_META)} />
          <Group
            title="Order Payment Status (orders.payment_status)"
            entries={Object.entries(ORDER_PAYMENT_STATUS_META)}
          />
          <Group title="Payment Record (payments.payment_status)" entries={Object.entries(PAYMENT_STATUS_META)} />
        </div>
      )}
    </div>
  );
}
