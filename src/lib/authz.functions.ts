import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side helpers that enforce role-based access for the authenticated
 * Supabase user. These complement client guards: the client guard handles
 * UX (redirects/toasts), the server checks guarantee data isolation.
 *
 * Use from any server function that needs to gate data by role:
 *
 *   export const myCustomerFn = createServerFn({ method: "POST" })
 *     .middleware([requireSupabaseAuth])
 *     .handler(async ({ context }) => {
 *       const customer = await assertActiveCustomer(context);
 *       // ... safe to read/write customer-scoped data
 *     });
 */

type AuthCtx = { userId: string };

export async function assertActiveCustomer(context: AuthCtx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, phone, is_active, is_deleted")
    .eq("supabase_user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error("Failed to verify customer profile.");
  if (!data || data.is_deleted) {
    throw new Error("FORBIDDEN: Customer profile not found.");
  }
  if (!data.is_active) {
    throw new Error("FORBIDDEN: Customer account is inactive.");
  }
  return data;
}

export async function assertActiveAdmin(context: AuthCtx) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, role, is_active")
    .eq("supabase_user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error("Failed to verify admin profile.");
  if (!data) throw new Error("FORBIDDEN: Admin access required.");
  if (!data.is_active) throw new Error("FORBIDDEN: Admin account is inactive.");
  return data;
}

/** Returns the current active customer; throws if not authorized. */
export const getActiveCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const customer = await assertActiveCustomer(context);
    return {
      id: customer.id,
      fullName: customer.full_name,
      phone: customer.phone,
    };
  });

/** Returns the current active admin; throws if not authorized. */
export const getActiveAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertActiveAdmin(context);
    return { id: admin.id, role: admin.role };
  });
