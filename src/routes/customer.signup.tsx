import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ChefHat, Mail, Phone, Lock, Eye, EyeOff, User, AlertCircle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createCustomerProfile } from "@/lib/customers.functions";

export const Route = createFileRoute("/customer/signup")({
  head: () => ({ meta: [{ title: "Create Account — Telugu Food Club" }] }),
  component: CustomerSignUp,
});

function CustomerSignUp() {
  const nav = useNavigate();
  const createProfile = useServerFn(createCustomerProfile);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [showC, setShowC] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email address";
    if (phone && !/^\d{10}$/.test(phone)) e.phone = "Phone number must be 10 digits";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const e164 = phone ? `+91${phone}` : undefined;

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/customer/signin`,
          data: { full_name: fullName.trim(), phone: e164 ?? null },
        },
      });
      if (signUpErr) {
        const msg = /already|registered|exists/i.test(signUpErr.message)
          ? "An account already exists with this email. Please sign in."
          : signUpErr.message || "Could not create account.";
        throw new Error(msg);
      }

      // If email confirmation is required, no session exists yet → skip profile.
      if (!signUpData.session) {
        toast.success("Account created. Please check your email to confirm, then sign in.");
        nav({ to: "/customer/signin" });
        return;
      }

      // Session is live → create the customers profile row.
      await createProfile({
        data: { fullName: fullName.trim(), phone: e164, email: cleanEmail },
      });
      toast.success("Account created successfully");
      nav({ to: "/customer/outlets" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
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
          <h1 className="text-display mt-1 text-3xl text-maroon">Create Account</h1>
          <p className="mt-1 text-xs text-maroon-deep/70">
            Sign up to order fresh Telugu food and traditional products
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-3xl border border-gold/30 bg-white/80 p-5 shadow-xl backdrop-blur-xl"
        >
          {formError && <ErrorAlert message={formError} />}

          <Field label="Full Name" icon={User} error={errors.fullName}>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </Field>

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

          <Field label="Phone (optional)" icon={Phone} error={errors.phone} prefix="+91">
            <input
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="10 digit mobile"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </Field>

          <Field label="Password" icon={Lock} error={errors.password}>
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="text-maroon-deep/50">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          <Field label="Confirm Password" icon={Lock} error={errors.confirm}>
            <input
              type={showC ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShowC((v) => !v)} className="text-maroon-deep/50">
              {showC ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-bold text-cream shadow disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account…" : "Create Account"}
          </button>

          <p className="pt-1 text-center text-xs text-maroon-deep/70">
            Already have an account?{" "}
            <Link to="/customer/signin" className="font-semibold text-saffron-deep">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function Field({
  label, icon: Icon, error, prefix, children,
}: {
  label: string;
  icon: typeof Mail;
  error?: string;
  prefix?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-maroon-deep/60">{label}</p>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white/80 px-3 py-2.5 ${
          error ? "border-destructive/50" : "border-gold/30"
        }`}
      >
        <Icon className="h-4 w-4 text-saffron-deep" />
        {prefix && <span className="text-xs text-maroon-deep/60">{prefix}</span>}
        {children}
      </div>
      {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
