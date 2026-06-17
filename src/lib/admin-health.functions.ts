import { createServerFn } from "@/lib/react-start-mock";

/**
 * Unauthenticated, side-effect-free server check that simply reports which
 * required server-side env vars are missing. Used by the admin shell to show
 * a clear UI error instead of crashing inside the first admin RPC.
 */
export const checkAdminServerEnv = createServerFn({ method: "GET" }).handler(async () => {
  const required = ["SUPABASE_URL"] as const;
  const missing: string[] = [];
  for (const k of required) {
    if (!process.env[k]) missing.push(k);
  }
  // Service role is read as SUPABASE_SERVICE_ROLE_KEY OR SERVICE_ROLE_KEY in client.server.ts
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SERVICE_ROLE_KEY) {
    missing.push("SERVICE_ROLE_KEY");
  }
  return { ok: missing.length === 0, missing };
});
