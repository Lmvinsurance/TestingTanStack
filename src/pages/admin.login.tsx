import { Link, useNavigate } from "react-router-dom";;
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail, Lock, Eye, EyeOff, ChefHat, AlertCircle, Loader2,
  Shield, Wallet, Store,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormField } from "@/components/admin/FormField";



const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(255, "Email is too long"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password is too long"),
});
type LoginValues = z.infer<typeof loginSchema>;

function AdminLoginScreen() {
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: admin } = await supabase
        .from("admin_users")
        .select("is_active")
        .eq("supabase_user_id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (admin?.is_active) {
        nav("/admin/dashboard", { replace: true });
        return;
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      if (signInErr || !signIn.user) throw new Error("Invalid email or password.");

      const { data: admin, error: adminErr } = await supabase
        .from("admin_users")
        .select("is_active")
        .eq("supabase_user_id", signIn.user.id)
        .maybeSingle();
      if (adminErr) {
        await supabase.auth.signOut();
        throw new Error("Could not verify admin profile. Please try again.");
      }
      if (!admin) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Please contact administrator.");
      }
      if (!admin.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your admin account is inactive. Please contact administrator.");
      }
      toast.success("Signed in successfully");
      nav("/admin/dashboard");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-cream via-white to-gold-soft/40 px-4 py-10">
      <div className="mx-auto max-w-md space-y-6 sm:max-w-lg">
        <div className="text-center">
          <div className="emerald-surface mx-auto grid h-16 w-16 place-items-center rounded-2xl shadow-lg ring-1 ring-gold/40">
            <ChefHat className="h-8 w-8 text-gold-soft" />
          </div>
          <h1 className="text-display mt-4 text-3xl text-maroon">Admin Portal</h1>
          <p className="mt-1 text-xs text-maroon-deep/65">
            Manage orders, payments, kitchen and outlets
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] gold-text font-semibold">Telugu Food Club</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="premium-card rounded-3xl p-6 sm:p-7"
        >
          {formError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="space-y-4">
            <FormField
              label="Email Address"
              required
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="admin@telugufoodclub.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <FormField
              label="Password"
              required
              icon={Lock}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="text-maroon-deep/50 hover:text-maroon"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register("password")}
            />
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-maroon-deep/70">
                <input type="checkbox" className="h-3.5 w-3.5 accent-gold" /> Remember me
              </label>
              <button type="button" className="font-semibold text-saffron-deep hover:text-maroon">
                Forgot Password?
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-premium mt-1 w-full py-3 text-sm tracking-wide"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Signing in…" : "Sign In"}
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-display mb-2 text-sm text-maroon">Authorized Roles</h3>
          <div className="grid grid-cols-2 gap-2">
            <Role icon={Shield} title="Super Admin" desc="Full system control" />
            <Role icon={Store} title="Outlet Manager" desc="Per-outlet operations" />
            <Role icon={ChefHat} title="Kitchen Manager" desc="Prep & dispatch" />
            <Role icon={Wallet} title="Cashier" desc="Billing & payments" />
          </div>
        </div>

        <p className="text-center text-[11px] text-maroon-deep/60">
          Are you a customer?{" "}
          <Link to="/customer/signin" className="font-semibold text-saffron-deep hover:text-maroon">
            Customer Sign In
          </Link>
        </p>

        <footer className="pt-2 text-center text-[10px] text-maroon-deep/50">
          v1.0 • Powered by Telugu Food Club
        </footer>
      </div>
    </main>
  );
}

function Role({ icon: Icon, title, desc }: { icon: typeof Mail; title: string; desc: string }) {
  return (
    <div className="premium-card premium-card-hover rounded-2xl p-3 text-left">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-gold/15 text-saffron-deep">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-1.5 text-xs font-bold text-maroon">{title}</p>
      <p className="text-[10px] text-maroon-deep/60">{desc}</p>
    </div>
  );
}

export default AdminLoginScreen;
