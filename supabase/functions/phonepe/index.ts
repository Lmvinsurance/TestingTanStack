// PhonePe V2 Standard Checkout proxy.
// Actions: "create" (initiate checkout), "status" (get order status).
// Credentials live in edge function secrets — never expose to the browser.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PHONEPE_HOSTS = {
  prod: {
    oauth: "https://api.phonepe.com/apis/identity-manager/v1/oauth/token",
    pg: "https://api.phonepe.com/apis/pg",
  },
  uat: {
    oauth: "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token",
    pg: "https://api-preprod.phonepe.com/apis/pg-sandbox",
  },
};

function hosts() {
  const env = (Deno.env.get("PHONEPE_ENV") ?? "prod").toLowerCase();
  return env === "uat" ? PHONEPE_HOSTS.uat : PHONEPE_HOSTS.prod;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const clientId = Deno.env.get("PHONEPE_CLIENT_ID");
  const clientSecret = Deno.env.get("PHONEPE_CLIENT_SECRET");
  const clientVersion = Deno.env.get("PHONEPE_CLIENT_VERSION") ?? "1";
  if (!clientId || !clientSecret) {
    throw new Error("PhonePe credentials not configured (PHONEPE_CLIENT_ID / PHONEPE_CLIENT_SECRET)");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_version: clientVersion,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(hosts().oauth, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json?.access_token) {
    throw new Error(`PhonePe OAuth failed: ${res.status} ${JSON.stringify(json)}`);
  }
  const expiresAt =
    typeof json.expires_at === "number" ? json.expires_at : now + Number(json.expires_in ?? 3000);
  // PhonePe accepts both `O-Bearer <token>` and `<token_type> <access_token>`; use the
  // token_type returned by the server (usually "O-Bearer").
  const tokenType = json.token_type || "O-Bearer";
  cachedToken = { token: `${tokenType} ${json.access_token}`, expiresAt };
  return cachedToken.token;
}

async function createPayment(p: {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  message?: string;
  metaInfo?: Record<string, string>;
}) {
  const token = await getToken();
  const res = await fetch(`${hosts().pg}/checkout/v2/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({
      merchantOrderId: p.merchantOrderId,
      amount: p.amountPaise,
      expireAfter: 1200,
      metaInfo: p.metaInfo ?? {},
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: p.message ?? "Order payment",
        merchantUrls: { redirectUrl: p.redirectUrl },
      },
    }),
  });
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json?.redirectUrl) {
    throw new Error(`PhonePe create failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function orderStatus(merchantOrderId: string) {
  const token = await getToken();
  const res = await fetch(
    `${hosts().pg}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=true`,
    { headers: { Authorization: token } },
  );
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(`PhonePe status failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const action = body?.action;

    if (action === "create") {
      const { merchantOrderId, amountPaise, redirectUrl, message, metaInfo } = body;
      if (!merchantOrderId || !amountPaise || !redirectUrl) {
        return new Response(
          JSON.stringify({ error: "merchantOrderId, amountPaise, redirectUrl required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const result = await createPayment({ merchantOrderId, amountPaise, redirectUrl, message, metaInfo });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const { merchantOrderId } = body;
      if (!merchantOrderId) {
        return new Response(JSON.stringify({ error: "merchantOrderId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await orderStatus(merchantOrderId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("phonepe edge error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
