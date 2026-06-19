import { useNavigate } from "react-router-dom";;
import { useEffect, useState, type ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { checkAdminServerEnv } from "@/lib/admin-health.functions";

/**
 * Wrap admin pages with <AdminGuard> to enforce:
 *  1. An authenticated Supabase session.
 *  2. A matching, active row in admin_users.
 *
 * Unauthenticated users → /admin/login
 * Non-admin or inactive admin users → signed out and sent to /admin/login.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ok">("checking");
  const [envMissing, setEnvMissing] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // 1. Server env health probe — surfaces a clear UI error if SERVICE_ROLE_KEY etc. are missing.
      try {
        const health = await checkAdminServerEnv();
        if (cancelled) return;
        if (!health.ok) {
          setEnvMissing(health.missing);
          return;
        }
      } catch {
        if (!cancelled) setEnvMissing(["server unreachable"]);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        if (!cancelled) navigate("/admin/login", { replace: true });
        return;
      }
      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("is_active")
        .eq("supabase_user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !admin || !admin.is_active) {
        await supabase.auth.signOut();
        toast.error(
          !admin
            ? "Access denied. Please contact administrator."
            : "Your admin account is inactive. Please contact administrator.",
        );
        navigate("/admin/login", { replace: true });
        return;
      }
      setStatus("ok");
    };

    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate("/admin/login", { replace: true });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (envMissing) {
    return (
      <div className="admin-surface grid min-h-screen place-items-center bg-cream px-4 text-maroon">
        <div className="max-w-md rounded-2xl border border-red-300 bg-red-50 p-6 text-sm shadow">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">Server configuration error</p>
          </div>
          <p className="mt-2 text-red-700/90">
            The admin app cannot reach Supabase with elevated privileges. The following server
            secret(s) are missing or unreadable:
          </p>
          <ul className="mt-2 list-disc pl-5 font-mono text-xs text-red-800">
            {envMissing.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <p className="mt-3 text-xs text-red-700/80">
            Add the missing secret in Project Settings → Secrets, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div className="admin-surface grid min-h-screen place-items-center bg-cream text-maroon">
        <div className="flex flex-col items-center gap-2 text-sm">
          <Loader2 className="h-6 w-6 animate-spin text-saffron-deep" />
          Verifying admin session…
        </div>
      </div>
    );
  }
  return <AdminLayout>{children}</AdminLayout>;
}

export { adminSignOut } from "@/lib/auth-helpers";
