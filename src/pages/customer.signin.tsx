import { Link, useNavigate } from "react-router-dom";;
import { useEffect, useState, type FormEvent } from "react";
import { ChefHat, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentRole } from "@/lib/auth-helpers";



function CustomerSignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Role-based redirect for already-authenticated visitors.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const role = await getCurrentRole();
      if (cancelled || !role) return;
      if (role === "admin") {
        toast.info("You're signed in as admin. Redirecting to dashboard.");
        nav("/admin/dashboard", { replace: true });
      } else {
        nav("/customer/outlets", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [nav]);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError || !auth?.user) {
        throw new Error("Invalid email or password.");
      }

      let { data: customer, error: profileError } = await supabase
        .from("customers")
        .select("id, is_active, is_deleted, full_name")
        .eq("supabase_user_id", auth.user.id)
        .eq("is_deleted", false)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error("Could not load your profile. Please try again.");
      }
      
      // Auto-create missing customer profile to recover "stuck" accounts
      if (!customer) {
        const metadata = auth.user.user_metadata || {};
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert({
            supabase_user_id: auth.user.id,
            full_name: metadata.full_name || auth.user.email?.split("@")[0] || "Customer",
            phone: metadata.phone || null,
            email: auth.user.email,
            is_active: true,
          })
          .select("id, is_active, is_deleted, full_name")
          .single();

        if (insertError || !newCustomer) {
          await supabase.auth.signOut();
          throw new Error("Customer profile not found and could not be created. Please contact support.");
        }
        customer = newCustomer;
      }

      if (!customer.is_active) {
        await supabase.auth.signOut();
        throw new Error("Your account is inactive. Please contact support.");
      }

      toast.success(`Welcome back${customer.full_name ? `, ${customer.full_name.split(" ")[0]}` : ""}!`);
      nav("/customer/outlets");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-cream via-cream-warm/40 to-saffron/15 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow-lg">
            <ChefHat className="h-8 w-8" />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-saffron-deep">Telugu Food Club</p>
          <h1 className="text-display mt-1 text-3xl text-maroon">Welcome Back</h1>
          <p className="mt-1 text-xs text-maroon-deep/70">Sign in to continue your food journey</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-3xl border border-gold/30 bg-white/80 p-5 shadow-xl backdrop-blur-xl"
        >
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Field label="Email Address" icon={Mail} error={errors.email}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </Field>

          <Field label="Password" icon={Lock} error={errors.password}>
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="text-maroon-deep/50">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 text-maroon-deep/70">
              <input type="checkbox" className="h-3.5 w-3.5 accent-saffron" /> Remember me
            </label>
            <button type="button" className="font-semibold text-saffron-deep">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-bold text-cream shadow disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <p className="pt-1 text-center text-xs text-maroon-deep/70">
            New here?{" "}
            <Link to="/customer/signup" className="font-semibold text-saffron-deep">
              Create New Account
            </Link>
          </p>
        </form>

        <p className="text-center text-[11px] text-maroon-deep/60">
          Staff member?{" "}
          <Link to="/admin/login" className="font-semibold text-saffron-deep">
            Admin Login
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label, icon: Icon, error, prefix, children,
}: {
  label: string; icon: typeof Mail; error?: string; prefix?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-maroon-deep/60">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 ${
          error ? "border-destructive/50" : "border-gold/30"
        }`}
      >
        <Icon className="h-4 w-4 text-saffron-deep" />
        {prefix && <span className="text-sm font-semibold text-maroon-deep/70">{prefix}</span>}
        {children}
      </div>
      {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

export default CustomerSignIn;
