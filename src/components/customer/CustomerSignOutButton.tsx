import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Loader2 } from "lucide-react";
import { customerSignOut } from "@/lib/auth-helpers";

type Props = {
  className?: string;
  /** Where to redirect after sign-out. Defaults to /customer/signin */
  redirectTo?: string;
  /** If false, no confirm() prompt. Default true. */
  confirm?: boolean;
};

export function CustomerSignOutButton({
  className,
  redirectTo = "/customer/signin",
  confirm = true,
}: Props) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const ok = await customerSignOut({ confirm });
        setBusy(false);
        if (ok) navigate({ to: redirectTo, replace: true });
      }}
      aria-label="Sign out"
      title="Sign out"
      className={
        className ??
        "grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon transition hover:bg-cream-warm/50 disabled:opacity-50"
      }
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
    </button>
  );
}
