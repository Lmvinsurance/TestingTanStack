import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve the current visitor's role based on Supabase session and DB rows.
 * Returns "admin" if an active admin_users row exists, "customer" if an
 * active, non-deleted customers row exists, otherwise null.
 */
export async function getCurrentRole(): Promise<"admin" | "customer" | null> {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("is_active")
    .eq("supabase_user_id", user.id)
    .maybeSingle();
  if (admin?.is_active) return "admin";

  const { data: customer } = await supabase
    .from("customers")
    .select("is_active, is_deleted")
    .eq("supabase_user_id", user.id)
    .eq("is_deleted", false)
    .maybeSingle();
  if (customer?.is_active) return "customer";
  return null;
}

/**
 * Sign out the current customer with a confirmation dialog and toast feedback.
 * Returns true if the user signed out, false if they cancelled.
 */
export async function customerSignOut(opts?: { confirm?: boolean }): Promise<boolean> {
  const needsConfirm = opts?.confirm !== false;
  if (needsConfirm && typeof window !== "undefined") {
    const ok = window.confirm("Sign out of your account? You will need to sign in again to place orders.");
    if (!ok) return false;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast.error("Could not sign out. Please try again.");
    return false;
  }
  toast.success("Signed out. See you soon!", {
    description: "You can sign back in anytime to continue ordering.",
  });
  return true;
}

/**
 * Sign out the current admin with confirmation + toast.
 */
export async function adminSignOut(opts?: { confirm?: boolean }): Promise<boolean> {
  const needsConfirm = opts?.confirm !== false;
  if (needsConfirm && typeof window !== "undefined") {
    const ok = window.confirm("Sign out of the admin console?");
    if (!ok) return false;
  }
  const { error } = await supabase.auth.signOut();
  if (error) {
    toast.error("Could not sign out. Please try again.");
    return false;
  }
  toast.success("Signed out of the admin console.");
  return true;
}
