import { Link, useNavigate } from "react-router-dom";;
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Clock, MapPin, Search, Navigation, ChefHat, Phone, Mail, AlertCircle,
} from "lucide-react";
import { useRequireCustomer } from "@/lib/use-require-customer";
import { CustomerSignOutButton } from "@/components/customer/CustomerSignOutButton";
import { supabase } from "@/integrations/supabase/client";
import { setOutlet } from "@/lib/cart-store";
import { toast } from "sonner";



type OutletRow = {
  id: string;
  outlet_name: string;
  outlet_code: string | null;
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
};

function formatTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h ?? "0", 10);
  const ap = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${m ?? "00"} ${ap}`;
}

function CustomerOutletsScreen() {
  const ready = useRequireCustomer();
  const navigate = useNavigate();
  const [outlets, setOutlets] = useState<OutletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("outlets")
        .select(
          "id, outlet_name, outlet_code, phone, email, address, city, state, pincode, latitude, longitude, opening_time, closing_time"
        )
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("outlet_name", { ascending: true });
      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setOutlets((data ?? []) as OutletRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return outlets;
    return outlets.filter((o) =>
      [o.outlet_name, o.city, o.state, o.address, o.pincode, o.outlet_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [outlets, q]);

  const selectedOutlet = outlets.find((o) => o.id === selected);

  const onContinue = () => {
    if (!selectedOutlet) {
      toast.error("Please select an outlet to continue.");
      return;
    }
    setOutlet({
      id: selectedOutlet.id,
      name: selectedOutlet.outlet_name,
      short: selectedOutlet.outlet_name,
      address: [selectedOutlet.address, selectedOutlet.city, selectedOutlet.pincode]
        .filter(Boolean)
        .join(", "),
    });
    navigate("/customer/menu");
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-cream pb-32">
      <motion.header
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-gold/20 bg-cream/95 px-5 py-4 backdrop-blur"
      >
        <Link to="/brands" aria-label="Back"
          className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon transition hover:bg-cream-warm/50">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow-sm">
          <ChefHat className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-display truncate text-lg leading-tight text-maroon">
            Choose Your Nearest Outlet
          </h1>
          <p className="truncate text-[11px] text-maroon-deep/60">
            Select an outlet to browse menu items.
          </p>
        </div>
        <CustomerSignOutButton />
      </motion.header>

      <div className="mx-auto max-w-md px-5 py-5 sm:max-w-lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by outlet name, city, area or pincode"
              className="w-full rounded-2xl border border-gold/30 bg-card py-3 pl-11 pr-4 text-sm text-maroon-deep placeholder:text-maroon-deep/40 shadow-sm focus:border-saffron focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => toast("Location-based search coming soon")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-saffron/40 bg-saffron/10 py-2.5 text-sm font-medium text-saffron-deep transition hover:bg-saffron/20"
          >
            <Navigation className="h-4 w-4" />
            Use Current Location
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-6 flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
                <div className="h-32 animate-pulse bg-gradient-to-br from-gold/10 to-saffron/10" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-gold/20" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gold/10" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gold/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-red-700">Couldn't load outlets</p>
            <p className="mt-1 text-xs text-red-600/80">{error}</p>
            <button onClick={() => window.location.reload()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white">
              Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-gold/40 bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-saffron/15 text-saffron-deep">
              <MapPin className="h-6 w-6" />
            </div>
            <p className="text-display mt-3 text-base text-maroon">
              {outlets.length === 0 ? "No active outlets" : "No outlets match your search"}
            </p>
            <p className="text-xs text-maroon-deep/60">
              {outlets.length === 0 ? "Please check back later." : "Try a different name, city, or pincode."}
            </p>
          </div>
        )}

        {/* Outlets */}
        {!loading && !error && filtered.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {filtered.map((o, i) => {
              const isSel = selected === o.id;
              return (
                <motion.button
                  type="button" key={o.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(o.id)}
                  className={`overflow-hidden rounded-3xl border bg-card text-left shadow-sm transition ${
                    isSel ? "border-saffron ring-2 ring-saffron/30" : "border-gold/25 hover:border-gold/40"
                  }`}
                >
                  <div className="relative h-28 bg-gradient-to-br from-saffron/30 to-gold/20">
                    <div className="absolute inset-0 grid place-items-center text-maroon/30">
                      <ChefHat className="h-12 w-12" />
                    </div>
                    {o.outlet_code && (
                      <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-2.5 py-1 text-[10px] font-semibold text-maroon shadow">
                        {o.outlet_code}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-display text-base text-maroon">{o.outlet_name}</h3>
                    {o.address && (
                      <p className="mt-1 text-xs text-maroon-deep/60">
                        {[o.address, o.city, o.state, o.pincode].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-maroon-deep/70">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-saffron" />
                        {formatTime(o.opening_time)} – {formatTime(o.closing_time)}
                      </span>
                      {o.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3 text-saffron" /> {o.phone}
                        </span>
                      )}
                      {o.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 text-saffron" /> {o.email}
                        </span>
                      )}
                      {o.latitude != null && o.longitude != null && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-saffron" />
                          {o.latitude.toFixed(2)}, {o.longitude.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky selected preview */}
      {selectedOutlet && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-cream/95 px-4 py-3 backdrop-blur"
        >
          <div className="mx-auto flex max-w-md items-center gap-3 sm:max-w-lg">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-saffron/20 text-saffron-deep">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-maroon-deep/50">Selected</p>
              <p className="truncate text-sm font-semibold text-maroon">{selectedOutlet.outlet_name}</p>
            </div>
            <button onClick={() => setSelected(null)}
              className="rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-medium text-maroon">
              Change
            </button>
            <button onClick={onContinue}
              className="rounded-lg bg-gradient-to-r from-saffron to-saffron-deep px-4 py-2 text-xs font-semibold text-cream shadow">
              Continue
            </button>
          </div>
        </motion.div>
      )}
    </main>
  );
}

export default CustomerOutletsScreen;
