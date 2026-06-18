import React, { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@/lib/react-start-mock";
import { createCustomerProfile } from "@/lib/customers.functions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-cream border-gold/30 p-0 overflow-hidden sm:rounded-2xl">
        <div className="p-4 sm:p-6 pb-2">
          <DialogHeader className="mb-2 text-center flex flex-col items-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow-md mb-2">
              <ChefHat className="h-6 w-6" />
            </div>
            <DialogTitle className="text-display text-2xl text-maroon">
              {activeTab === "signin" ? "Welcome Back" : "Create Account"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-cream-warm border border-gold/30 rounded-xl">
              <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-maroon data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-maroon data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>
            
            <div className="max-h-[60vh] overflow-y-auto px-1 pb-4">
              <TabsContent value="signin" className="mt-0 outline-none">
                <SignInForm onSuccess={onSuccess} />
              </TabsContent>
              <TabsContent value="signup" className="mt-0 outline-none">
                <SignUpForm onSuccess={onSuccess} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Sign In Form ---

function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      const { data: customer, error: profileError } = await supabase
        .from("customers")
        .select("id, is_active, is_deleted, full_name")
        .eq("supabase_user_id", auth.user.id)
        .eq("is_deleted", false)
        .maybeSingle();

      if (profileError) throw new Error("Could not load your profile. Please try again.");
      if (!customer) throw new Error("Customer profile not found. Please sign up first.");
      if (!customer.is_active) throw new Error("Your account is inactive. Please contact support.");

      toast.success(`Welcome back${customer.full_name ? `, ${customer.full_name.split(" ")[0]}` : ""}!`);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {formError && <ErrorAlert message={formError} />}

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

      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-bold text-cream shadow disabled:opacity-70"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

// --- Sign Up Form ---

function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
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
          data: { full_name: fullName.trim(), phone: e164 ?? null },
        },
      });
      if (signUpErr) {
        const msg = /already|registered|exists/i.test(signUpErr.message)
          ? "An account already exists with this email."
          : signUpErr.message || "Could not create account.";
        throw new Error(msg);
      }

      if (!signUpData.session) {
        toast.success("Account created. Please verify your email, then sign in.");
        // Normally we'd wait for verification, but depending on supabase settings, they might be logged in.
        // If require email verification is on, they can't continue here.
        return;
      }

      await createProfile({
        data: { fullName: fullName.trim(), phone: e164, email: cleanEmail },
      });
      toast.success("Account created successfully");
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron to-saffron-deep py-3 text-sm font-bold text-cream shadow disabled:opacity-70"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}

function Field({ label, icon: Icon, error, prefix, children }: { label: string; icon: typeof Mail; error?: string; prefix?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-maroon-deep/60">{label}</p>
      <div className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 ${error ? "border-destructive/50" : "border-gold/30"}`}>
        <Icon className="h-4 w-4 text-saffron-deep" />
        {prefix && <span className="text-sm font-semibold text-maroon-deep/70">{prefix}</span>}
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
