import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Utensils, Store, ShoppingCart, ClipboardList, User, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { customerSignOut } from "@/lib/auth-helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Tab = { to: string; label: string; icon: typeof Utensils; badge?: boolean };
const TABS: Tab[] = [
  { to: "/customer/menu", label: "Menu", icon: Utensils },
  { to: "/customer/outlets", label: "Outlets", icon: Store },
  { to: "/cart", label: "Cart", icon: ShoppingCart, badge: true },
  { to: "/customer/orders", label: "Orders", icon: ClipboardList },
];

export function CustomerLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const cart = useCart();
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);

  const [customer, setCustomer] = useState<{ full_name: string | null; email: string | null; phone: string | null; } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      
      const { data: profile } = await supabase
        .from("customers")
        .select("full_name, email, phone")
        .eq("supabase_user_id", user.id)
        .eq("is_deleted", false)
        .maybeSingle();
      
      if (!cancelled && profile) {
        setCustomer(profile);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = async () => {
    const ok = await customerSignOut({ confirm: true });
    if (ok) {
      setCustomer(null);
      navigate("/customer/menu", { replace: true });
    }
  };

  const AccountItem = ({ mobile }: { mobile?: boolean }) => {
    const active = pathname === "/customer/signin";
    
    if (customer) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`relative flex items-center ${
                mobile 
                  ? "flex-col gap-0.5 rounded-full px-2 py-1 text-maroon-deep/70 flex-1" 
                  : "gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition text-maroon-deep/80 hover:bg-saffron/10"
              }`}
            >
              <User className="h-4 w-4" />
              <span className={mobile ? "text-[9px] font-semibold" : ""}>Account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side={mobile ? "top" : "bottom"}>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{customer.full_name || 'Customer'}</p>
                <p className="text-xs leading-none text-muted-foreground">{customer.email}</p>
                {customer.phone && (
                  <p className="text-xs leading-none text-muted-foreground">{customer.phone}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link
        to="/customer/signin"
        className={`relative flex items-center ${
          mobile
            ? `flex-col gap-0.5 flex-1 rounded-full px-2 py-1 ${active ? "text-saffron-deep" : "text-maroon-deep/70"}`
            : `gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? "bg-saffron text-cream" : "text-maroon-deep/80 hover:bg-saffron/10"}`
        }`}
      >
        <User className="h-4 w-4" />
        <span className={mobile ? "text-[9px] font-semibold" : ""}>Account</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop top nav */}
      <header className="sticky top-0 z-30 hidden border-b border-gold/20 bg-cream/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link to="/customer/menu" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-saffron to-saffron-deep font-bold text-cream">
              K
            </div>
            <span className="text-display text-base text-maroon">Kosia Rajula Ruchulu</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {TABS.map(({ to, label, icon: Icon, badge }) => {
              const active = pathname === to || (to === "/customer/menu" && pathname.startsWith("/customer/item-detail")) || (to === "/customer/my-orders" && pathname.startsWith("/customer/order-detail"));
              return (
                <Link
                  key={to}
                  to={to as any}
                  className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-saffron text-cream" : "text-maroon-deep/80 hover:bg-saffron/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  {badge && cartCount > 0 && (
                    <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1 text-[10px] font-bold text-cream">
                      {cartCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <AccountItem />
          </nav>
        </div>
      </header>

      <div className="md:mx-auto md:max-w-6xl md:px-6 md:py-4">
        <main className="min-h-screen pb-24 md:min-h-0 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-around rounded-full border border-gold/30 bg-card/95 px-2 py-2 shadow-2xl backdrop-blur">
          {TABS.map(({ to, label, icon: Icon, badge }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to as any}
                className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1 ${
                  active ? "text-saffron-deep" : "text-maroon-deep/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-semibold">{label}</span>
                {badge && cartCount > 0 && (
                  <span className="absolute right-1 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-maroon px-1 text-[9px] font-bold text-cream">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          })}
          <AccountItem mobile />
        </div>
      </nav>
    </div>
  );
}
