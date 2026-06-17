import { Link } from "react-router-dom";;
import { ArrowLeft, Bell } from "lucide-react";
import type { ReactNode } from "react";
import kostaLogo from "@/assets/kosta-rajula-ruchulu-logo.asset.json";

/**
 * AdminHeader: page header rendered ABOVE the page content.
 * The global responsive shell (sidebar + mobile drawer) lives in AdminLayout.
 * This header is now fluid full-width so admin pages look right on desktop.
 */
export function AdminHeader({ title, subtitle, back = "/admin/dashboard" }: { title: string; subtitle: string; back?: string }) {
  return (
    <header className="header-gradient sticky top-0 z-20 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5 sm:gap-3">
        <Link
          to={back}
          aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/40 bg-card/60 text-maroon transition-colors hover:bg-saffron/10 sm:h-10 sm:w-10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-display truncate text-[15px] leading-tight text-maroon sm:text-lg">{title}</h1>
          <p className="truncate text-[10px] leading-tight text-maroon-deep/65 sm:text-xs">{subtitle}</p>
        </div>
        <img
          src={kostaLogo.url}
          alt="Kosta Rajula Ruchulu"
          className="hidden h-9 w-9 rounded-full object-cover ring-1 ring-gold/40 sm:block"
        />
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold/40 bg-card/60 text-maroon transition-colors hover:bg-saffron/10 sm:h-10 sm:w-10"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-saffron" />
        </button>
      </div>
    </header>
  );
}

/** Deprecated: global responsive sidebar from AdminLayout replaces this. Kept as no-op for backwards compatibility. */
export function AdminBottomNav() {
  return null;
}

export function StatCard({ label, value, tone = "saffron" }: { label: string; value: string | number; tone?: "saffron" | "maroon" | "emerald" | "amber" | "blue" }) {
  const map = {
    saffron: "from-saffron/20 to-saffron/5 text-saffron-deep",
    maroon: "from-maroon/15 to-maroon/5 text-maroon",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-700",
    blue: "from-blue-500/15 to-blue-500/5 text-blue-700",
  };
  return (
    <div className={`rounded-2xl border border-gold/25 bg-gradient-to-br ${map[tone]} p-3 shadow-sm`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-display mt-1 text-2xl">{value}</p>
    </div>
  );
}

export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream pb-8">
      <div className="mx-auto w-full max-w-6xl px-0 sm:px-4">{children}</div>
    </div>
  );
}

export function Fab({ onClick, label }: { onClick?: () => void; label: string }) {
  return (
    <button onClick={onClick} className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl">
      {label}
    </button>
  );
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${active ? "border-saffron bg-saffron text-cream" : "border-gold/30 bg-card text-maroon"}`}>
      {children}
    </button>
  );
}
