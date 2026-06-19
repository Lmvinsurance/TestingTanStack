import { assertActiveAdmin } from "@/lib/authz.functions";

/** Loads the full admin row (id, role, outlet_id). Throws FORBIDDEN if absent. */
export async function getAdminRow(userId: string) {
  const a = await assertActiveAdmin({ userId });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, outlet_id")
    .eq("id", a.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("FORBIDDEN: Admin not found");
  return data as { id: string; role: string; outlet_id: string | null };
}

export function isSuper(role: string) {
  return role === "super_admin";
}
export function canViewOps(role: string) {
  return ["super_admin", "outlet_admin", "cashier"].includes(role);
}
export function canViewAll(role: string) {
  return ["super_admin", "outlet_admin", "cashier", "kitchen"].includes(role);
}
