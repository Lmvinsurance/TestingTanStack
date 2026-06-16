// PhonePe V2 Standard Checkout helper — SERVER ONLY.
// Never import this from client-reachable modules at top level; use `await import()` inside handlers.

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
  const env = (process.env.PHONEPE_ENV ?? "prod").toLowerCase();
  return env === "uat" ? PHONEPE_HOSTS.uat : PHONEPE_HOSTS.prod;
}

// In-memory token cache (best-effort; workers are stateless across instances).
let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getPhonePeAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.token;

  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION ?? "1";
  if (!clientId || !clientSecret) throw new Error("PhonePe credentials not configured");

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
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.access_token) {
    throw new Error(`PhonePe OAuth failed: ${res.status} ${JSON.stringify(json)}`);
  }
  const expiresAt =
    typeof json.expires_at === "number"
      ? json.expires_at
      : now + Number(json.expires_in ?? 3000);
  cachedToken = { token: json.access_token as string, expiresAt };
  return cachedToken.token;
}

export type PhonePeCreatePayload = {
  merchantOrderId: string;
  amountPaise: number;
  redirectUrl: string;
  message?: string;
  metaInfo?: Record<string, string>;
};

export async function phonepeCreatePayment(p: PhonePeCreatePayload) {
  const token = await getPhonePeAccessToken();
  const res = await fetch(`${hosts().pg}/checkout/v2/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `O-Bearer ${token}`,
    },
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.redirectUrl) {
    throw new Error(`PhonePe create failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json as {
    orderId: string;
    state: string;
    expireAt: number;
    redirectUrl: string;
  };
}

export async function phonepeOrderStatus(merchantOrderId: string) {
  const token = await getPhonePeAccessToken();
  const res = await fetch(
    `${hosts().pg}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=true`,
    { headers: { Authorization: `O-Bearer ${token}` } },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PhonePe status failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json as {
    orderId: string;
    state: "COMPLETED" | "FAILED" | "PENDING" | string;
    amount: number;
    paymentDetails?: Array<{
      transactionId?: string;
      paymentMode?: string;
      state?: string;
      amount?: number;
      timestamp?: number;
    }>;
  };
}

// Maps PhonePe state → our DB enums.
export function mapPhonePeState(state: string): {
  paymentStatus: "success" | "failed" | "pending";
  orderStatus: "received" | "pending_payment" | "payment_failed";
} {
  const s = (state || "").toUpperCase();
  if (s === "COMPLETED") return { paymentStatus: "success", orderStatus: "received" };
  if (s === "FAILED") return { paymentStatus: "failed", orderStatus: "payment_failed" };
  return { paymentStatus: "pending", orderStatus: "pending_payment" };
}

// Apply a PhonePe status response to our DB (idempotent).
export async function applyPhonePeStatus(
  orderId: string,
  status: Awaited<ReturnType<typeof phonepeOrderStatus>>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mapped = mapPhonePeState(status.state);
  const pd = status.paymentDetails?.[0];
  const txnId = pd?.transactionId ?? status.orderId;

  // Read current order
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, grand_total, payment_status, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("Order not found");
  if (order.payment_status === "paid" && mapped.paymentStatus !== "failed") {
    return { ok: true, alreadyPaid: true, paymentStatus: order.payment_status };
  }

  // Upsert a payment row keyed by transaction_id (best effort: insert; if dup, update).
  const paymentRow = {
    order_id: orderId,
    payment_gateway: "phonepe",
    transaction_id: txnId,
    merchant_transaction_id: status.orderId,
    amount: (status.amount ?? 0) / 100 || Number(order.grand_total),
    payment_status: mapped.paymentStatus,
    payment_mode: "upi",
    gateway_response_snapshot: JSON.parse(JSON.stringify(status)),
    paid_at: mapped.paymentStatus === "success" ? new Date().toISOString() : null,
  };
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("transaction_id", txnId)
    .maybeSingle();
  if (existing) {
    await supabaseAdmin.from("payments").update(paymentRow).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("payments").insert(paymentRow);
  }

  if (mapped.paymentStatus === "success") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "paid", order_status: "received" })
      .eq("id", orderId);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.order_status,
      new_status: "received",
      remarks: "PhonePe payment confirmed",
      changed_by_role: "system",
    });
    const { tryEnsureInvoice } = await import("./invoices.server");
    await tryEnsureInvoice(orderId);
  } else if (mapped.paymentStatus === "failed") {
    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "failed", order_status: "payment_failed" })
      .eq("id", orderId);
    await supabaseAdmin.from("order_status_history").insert({
      order_id: orderId,
      old_status: order.order_status,
      new_status: "payment_failed",
      remarks: "PhonePe payment failed",
      changed_by_role: "system",
    });
  }

  return { ok: true, paymentStatus: mapped.paymentStatus };
}

