import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader, AdminPage } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, Search, Printer, CheckCircle2, Smartphone, Banknote, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import {
  listWalkinOutlets,
  listWalkinMenu,
  createWalkinOrder,
  confirmCounterPayment,
  verifyWalkinUpi,
} from "@/lib/admin-walkin.functions";

export const Route = createFileRoute("/admin/walkin")({
  head: () => ({ meta: [{ title: "Walk-in Order — Admin" }] }),
  component: () => (
    <AdminGuard>
      <AdminLayout>
        <WalkinPage />
      </AdminLayout>
    </AdminGuard>
  ),
});

type CartLine = {
  variantId: string;
  itemId: string;
  itemName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
};
type PayMode = "cash" | "card_machine" | "upi";

type PlacedOrder = {
  orderId: string;
  orderNumber: string;
  paymentMode: PayMode;
  redirectUrl?: string;
  // local state machine
  status: "awaiting_collection" | "awaiting_upi" | "upi_pending" | "paid" | "upi_failed";
  invoiceId?: string;
};

function WalkinPage() {
  const navigate = useNavigate();
  const outletsFn = useServerFn(listWalkinOutlets);
  const menuFn = useServerFn(listWalkinMenu);
  const createFn = useServerFn(createWalkinOrder);
  const confirmFn = useServerFn(confirmCounterPayment);
  const verifyFn = useServerFn(verifyWalkinUpi);

  const outletsQ = useQuery({ queryKey: ["walkin-outlets"], queryFn: () => outletsFn() });
  const [outletId, setOutletId] = useState<string>("");
  const effectiveOutletId = outletId || outletsQ.data?.defaultOutletId || outletsQ.data?.outlets[0]?.id || "";

  const menuQ = useQuery({
    queryKey: ["walkin-menu", effectiveOutletId],
    queryFn: () => menuFn({ data: { outletId: effectiveOutletId } }),
    enabled: !!effectiveOutletId,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [table, setTable] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<PayMode>("cash");
  const [taxPct, setTaxPct] = useState<number>(5);
  const [discount, setDiscount] = useState<number>(0);

  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const items = menuQ.data?.items ?? [];
  const categories = menuQ.data?.categories ?? [];

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return items.filter((it) => {
      if (category && it.category !== category) return false;
      if (t && !it.name.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, search, category]);

  function addLine(item: typeof items[number], variant: typeof items[number]["variants"][number]) {
    setCart((c) => {
      const idx = c.findIndex((l) => l.variantId === variant.id);
      if (idx >= 0) {
        const next = c.slice();
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...c,
        {
          variantId: variant.id,
          itemId: item.id,
          itemName: item.name,
          variantName: variant.name,
          unitPrice: variant.price,
          quantity: 1,
        },
      ];
    });
  }
  function setQty(variantId: string, delta: number) {
    setCart((c) =>
      c.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
  }
  function removeLine(variantId: string) {
    setCart((c) => c.filter((l) => l.variantId !== variantId));
  }
  function resetCart() {
    setCart([]); setName(""); setPhone(""); setTable(""); setNotes("");
    setDiscount(0); setPlaced(null); setPaymentMode("cash");
  }

  const subtotal = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const taxable = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = Math.round(taxable * ((Number(taxPct) || 0) / 100) * 100) / 100;
  const grand = Math.round((taxable + tax) * 100) / 100;

  const placeMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          outletId: effectiveOutletId,
          items: cart,
          walkInName: name || null,
          walkInPhone: phone || null,
          tableNumber: table || null,
          paymentMode,
          discountAmount: Number(discount) || 0,
          taxPercent: Number(taxPct) || 0,
          notes: notes || null,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Order ${res.orderNumber} placed`);
      setPlaced({
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        paymentMode: res.paymentMode,
        redirectUrl: res.redirectUrl,
        status: res.paymentMode === "upi" ? "awaiting_upi" : "awaiting_collection",
      });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to place order"),
  });

  const collectMut = useMutation({
    mutationFn: () =>
      confirmFn({
        data: {
          orderId: placed!.orderId,
          mode: placed!.paymentMode === "cash" ? "cash" : "card_machine",
        },
      }),
    onSuccess: (res: any) => {
      toast.success("Payment collected, invoice generated");
      setPlaced((p) => (p ? { ...p, status: "paid", invoiceId: res.invoiceId } : p));
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to confirm payment"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verifyFn({ data: { orderId: placed!.orderId } }),
    onSuccess: (res: any) => {
      if (res.paymentStatus === "success") {
        toast.success("UPI payment verified");
        setPlaced((p) => (p ? { ...p, status: "paid" } : p));
      } else if (res.paymentStatus === "failed") {
        toast.error("Payment failed");
        setPlaced((p) => (p ? { ...p, status: "upi_failed" } : p));
      } else {
        toast.message("Still pending — retry verify after customer pays");
        setPlaced((p) => (p ? { ...p, status: "upi_pending" } : p));
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Verification failed"),
  });

  const printDisabled = !placed || placed.status !== "paid";

  return (
    <AdminPage>
      <AdminHeader title="Walk-in Order" subtitle="Counter / dine-in order with state-based billing" />
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_400px]">
        {/* MENU SIDE */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={effectiveOutletId} onValueChange={setOutletId} disabled={!!placed}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Select outlet" /></SelectTrigger>
              <SelectContent>
                {(outletsQ.data?.outlets ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}{o.city ? ` — ${o.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="pl-8" />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCategory("")} className={`rounded-full border px-3 py-1 text-xs ${!category ? "border-saffron bg-saffron text-cream" : "border-gold/30 bg-card text-maroon"}`}>All</button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-3 py-1 text-xs ${category === c ? "border-saffron bg-saffron text-cream" : "border-gold/30 bg-card text-maroon"}`}>{c}</button>
            ))}
          </div>

          {menuQ.isLoading && <p className="text-sm text-muted-foreground">Loading menu…</p>}
          {menuQ.isError && <p className="text-sm text-destructive">Failed to load menu</p>}
          {!menuQ.isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No items available for this outlet.</p>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((it) => (
              <div key={it.id} className="rounded-xl border border-gold/20 bg-card p-3">
                <p className="text-sm font-semibold text-maroon">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">{it.category}</p>
                <div className="mt-2 space-y-1">
                  {it.variants.map((v) => (
                    <button
                      key={v.id}
                      disabled={!!placed}
                      onClick={() => addLine(it, v)}
                      className="flex w-full items-center justify-between rounded-md border border-gold/15 bg-cream px-2 py-1.5 text-xs hover:bg-saffron/10 disabled:opacity-50"
                    >
                      <span className="truncate text-left">
                        {v.name}{v.label ? ` · ${v.label}` : ""}
                      </span>
                      <span className="ml-2 font-semibold text-maroon">₹{v.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CART / BILLING SIDE */}
        <div className="space-y-3 rounded-2xl border border-gold/20 bg-card p-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-display text-lg text-maroon">
              {placed ? `Order ${placed.orderNumber}` : `Cart (${cart.length})`}
            </h2>
            {placed && (
              <Button size="sm" variant="ghost" onClick={resetCart}>New order</Button>
            )}
          </div>

          {!placed && (
            <>
              <div className="max-h-[40vh] space-y-2 overflow-auto">
                {cart.length === 0 && <p className="text-xs text-muted-foreground">No items added yet.</p>}
                {cart.map((l) => (
                  <div key={l.variantId} className="rounded-md border border-gold/15 bg-cream p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-maroon">{l.itemName}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{l.variantName} · ₹{l.unitPrice.toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeLine(l.variantId)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQty(l.variantId, -1)} className="rounded border px-1.5"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-semibold">{l.quantity}</span>
                        <button onClick={() => setQty(l.variantId, 1)} className="rounded border px-1.5"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-xs font-semibold text-maroon">₹{(l.unitPrice * l.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Customer name (opt.)" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Phone (opt.)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input placeholder="Table # (opt.)" value={table} onChange={(e) => setTable(e.target.value)} />
                <Input type="number" min={0} placeholder="Discount ₹" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                <Input type="number" min={0} step="0.01" placeholder="Tax %" value={taxPct} onChange={(e) => setTaxPct(Number(e.target.value))} />
              </div>
              <Input placeholder="Order notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase text-muted-foreground">Payment method</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["cash", "card_machine", "upi"] as const).map((m) => {
                    const active = paymentMode === m;
                    const Icon = m === "cash" ? Banknote : m === "card_machine" ? CreditCard : Smartphone;
                    return (
                      <button
                        key={m}
                        onClick={() => setPaymentMode(m)}
                        className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] ${active ? "border-saffron bg-saffron text-cream" : "border-gold/30 bg-cream text-maroon"}`}
                      >
                        <Icon className="h-4 w-4" />
                        {m === "cash" ? "Cash" : m === "card_machine" ? "Card Machine" : "UPI / PhonePe"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Totals */}
          <div className="space-y-1 border-t border-gold/20 pt-2 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>− ₹{(Number(discount) || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax ({taxPct}%)</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold text-maroon"><span>Total</span><span>₹{grand.toFixed(2)}</span></div>
          </div>

          {/* STEP 1: Place Order */}
          {!placed && (
            <Button
              disabled={!cart.length || !effectiveOutletId || placeMut.isPending}
              onClick={() => placeMut.mutate()}
              className="w-full bg-gradient-to-br from-maroon to-maroon/80 text-cream"
            >
              {placeMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Place Order
            </Button>
          )}

          {/* STEP 2: Cash / Card → confirm collected */}
          {placed && placed.status === "awaiting_collection" && (
            <Button
              disabled={collectMut.isPending}
              onClick={() => collectMut.mutate()}
              className="w-full bg-gradient-to-br from-saffron to-saffron-deep text-cream"
            >
              {collectMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {placed.paymentMode === "cash" ? "Confirm Cash Collected" : "Confirm Card Payment Collected"}
            </Button>
          )}

          {/* STEP 2: UPI → open PhonePe + verify */}
          {placed && (placed.status === "awaiting_upi" || placed.status === "upi_pending") && (
            <div className="space-y-2">
              <div className="rounded-md bg-saffron/10 p-2 text-[11px] text-maroon">
                Customer pays via PhonePe. Open the checkout page below, then verify once paid.
              </div>
              {placed.redirectUrl && (
                <a
                  href={placed.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-md border border-saffron bg-cream px-3 py-2 text-center text-xs font-semibold text-maroon hover:bg-saffron/10"
                >
                  Open PhonePe Checkout ↗
                </a>
              )}
              <Button
                disabled={verifyMut.isPending}
                onClick={() => verifyMut.mutate()}
                className="w-full bg-gradient-to-br from-saffron to-saffron-deep text-cream"
              >
                {verifyMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Verify Payment
              </Button>
            </div>
          )}

          {/* UPI failed */}
          {placed && placed.status === "upi_failed" && (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Payment failed
              </div>
              <p>Please retry or choose another payment method.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => verifyMut.mutate()}>Retry Verify</Button>
                <Button size="sm" variant="outline" onClick={resetCart}>New Order</Button>
              </div>
            </div>
          )}

          {/* Paid → show Print Invoice */}
          {placed && placed.status === "paid" && (
            <div className="rounded-md border border-saffron/30 bg-saffron/10 p-2 text-[11px] text-maroon">
              <div className="flex items-center gap-1 font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Payment confirmed · Invoice generated</div>
            </div>
          )}

          <Button
            disabled={printDisabled}
            onClick={() =>
              navigate({
                to: "/admin/invoice/$orderId",
                params: { orderId: placed!.orderId },
                search: { format: "thermal" as const, print: 1 as const },
              })
            }
            variant={printDisabled ? "outline" : "default"}
            className="w-full"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
        </div>
      </div>
    </AdminPage>
  );
}
