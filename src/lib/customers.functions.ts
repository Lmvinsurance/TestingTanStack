import { createServerFn } from "@/lib/react-start-mock";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Kept as a no-op for backward compatibility with any callers.
 * Signup is email+password now; uniqueness is enforced by Supabase Auth.
 */
export const checkCustomerPhoneExists = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => {
    if (!data || typeof data.phone !== "string") throw new Error("Invalid phone");
    return { phone: data.phone };
  })
  .handler(async () => ({ exists: false }));

/**
 * Create the customers profile row after the user is authenticated.
 * Uses the authenticated supabase client (RLS scoped to auth.uid()).
 */
export const createCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fullName: string; phone?: string; email?: string }) => {
    if (!data?.fullName?.trim()) throw new Error("Full name is required");
    const phone =
      data.phone && /^\+?\d{10,15}$/.test(data.phone) ? data.phone : null;
    const email =
      data.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
        ? data.email.toLowerCase()
        : null;
    return { fullName: data.fullName.trim().slice(0, 120), phone, email };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: selErr } = await supabase
      .from("customers")
      .select("id, is_active")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (existing) return { id: existing.id, created: false };

    const { data: inserted, error } = await supabase
      .from("customers")
      .insert({
        supabase_user_id: userId,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id, created: true };
  });
