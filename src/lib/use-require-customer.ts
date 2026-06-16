import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Client-side guard for customer-only pages.
 * Shows an error toast explaining why before redirecting to /customer/signin.
 */
export function useRequireCustomer() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const redirect = (message: string) => {
      if (cancelled) return;
      toast.error(message);
      nav({ to: "/customer/signin", replace: true });
    };

    const check = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;
      if (!user) {
        redirect("Please sign in to continue.");
        return;
      }
      const { data: customer, error } = await supabase
        .from("customers")
        .select("id, is_active, is_deleted")
        .eq("supabase_user_id", user.id)
        .eq("is_deleted", false)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        await supabase.auth.signOut();
        redirect("Could not verify your session. Please sign in again.");
        return;
      }
      if (!customer) {
        await supabase.auth.signOut();
        redirect("Customer profile not found. Please sign up first.");
        return;
      }
      if (!customer.is_active) {
        await supabase.auth.signOut();
        redirect("Your account is inactive. Please contact support.");
        return;
      }
      setReady(true);
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        nav({ to: "/customer/signin", replace: true });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [nav]);

  return ready;
}
