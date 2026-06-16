import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";

// PhonePe V2 webhook: Authorization header = sha256(hex)(username:password) configured in dashboard.
// Payload includes `payload.merchantOrderId` and `payload.state`.
export const Route = createFileRoute("/api/public/phonepe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = process.env.PHONEPE_WEBHOOK_USERNAME;
        const pass = process.env.PHONEPE_WEBHOOK_PASSWORD;
        if (!user || !pass) {
          return new Response("Webhook credentials not configured", { status: 500 });
        }
        const auth = request.headers.get("authorization") ?? "";
        const expected = createHash("sha256").update(`${user}:${pass}`).digest("hex");
        if (auth.toLowerCase() !== expected.toLowerCase()) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const merchantOrderId: string | undefined = body?.payload?.merchantOrderId ?? body?.merchantOrderId;
        if (!merchantOrderId) {
          return new Response("Missing merchantOrderId", { status: 400 });
        }

        // Find our order via the payments row we wrote when creating the attempt.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: pay } = await supabaseAdmin
          .from("payments")
          .select("order_id")
          .eq("merchant_transaction_id", merchantOrderId)
          .maybeSingle();
        if (!pay) {
          // Always 200 to acknowledge — don't make PhonePe retry forever on unknown ids.
          return new Response(JSON.stringify({ ok: true, unknown: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Authoritative re-check via Order Status API.
        const { phonepeOrderStatus, applyPhonePeStatus } = await import("@/lib/phonepe.server");
        try {
          const status = await phonepeOrderStatus(merchantOrderId);
          await applyPhonePeStatus(pay.order_id, status);
        } catch (err) {
          console.error("phonepe-webhook applyStatus error", err);
          return new Response("Status check failed", { status: 500 });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
